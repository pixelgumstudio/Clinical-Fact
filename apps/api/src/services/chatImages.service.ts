import axios from 'axios';
import aiService from './ai.service';
import wikimediaImageSearchService, { WikimediaImageResult } from './wikimediaImageSearch.service';
import openiImageSearchService from './openiImageSearch.service';

const PER_SOURCE_CANDIDATES = 3;
const MAX_KEPT = 3;
const THUMB_TIMEOUT_MS = 6000;
const THUMB_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_BUDGET_MS = 10000;
const DEFAULT_OPENI_WAIT_MS = 2500;
// Wikimedia Commons hosts huge numbers of scanned old books; their file titles carry a year in
// brackets and/or an 11+ digit Flickr id. Skipped before any model tokens are spent on them.
const BOOK_SCAN_TITLE = /\((1[5-9]\d{2})\)|\(\d{11,}\)/;

/**
 * Finds study images that genuinely fit a chat question. Replaces the old "raw question as a
 * keyword search on Wikimedia Commons, show whatever comes back" approach, which often
 * returned off-point images. Pipeline: a cheap model decides whether an image would help and
 * writes search phrases -> Wikimedia Commons (anatomy/physiology diagrams) and NIH Open-i
 * (radiographs, clinical photos, histology) are searched in parallel, the broader phrase as a
 * fallback -> a vision model keeps only clearly relevant candidates. Showing nothing is the
 * correct outcome when nothing passes.
 *
 * Off unless CHAT_IMAGES_ENABLED=true. find() never throws and never takes longer than
 * CHAT_IMAGES_TIMEOUT_MS (default 10s), so it can't hold up or break a chat answer.
 */
class ChatImagesService {
  get enabled(): boolean {
    return process.env.CHAT_IMAGES_ENABLED === 'true';
  }

  async find(question: string, excludeUrls: string[] = []): Promise<WikimediaImageResult[]> {
    if (!this.enabled) return [];

    const budgetMs = Number(process.env.CHAT_IMAGES_TIMEOUT_MS) || DEFAULT_BUDGET_MS;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Once the budget is spent the caller has moved on, so the rest of the work (searches, and
    // especially the paid model calls) is pointless — run() checks this flag between stages.
    const state = { cancelled: false };
    const timeout = new Promise<WikimediaImageResult[]>((resolve) => {
      timer = setTimeout(() => {
        state.cancelled = true;
        console.warn(`🖼️ Chat images: gave up after ${budgetMs}ms — answering without images`);
        resolve([]);
      }, budgetMs);
    });

    try {
      return await Promise.race([this.run(question, excludeUrls, startedAt, state), timeout]);
    } catch (error: any) {
      console.warn('🖼️ Chat images failed:', error.message);
      return [];
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async run(
    question: string,
    excludeUrls: string[],
    startedAt: number,
    state: { cancelled: boolean }
  ): Promise<WikimediaImageResult[]> {
    const plan = await aiService.planChatImage(question);
    if (!plan.useImage) {
      console.log(`🖼️ Chat images: none needed (${Date.now() - startedAt}ms)`);
      return [];
    }
    if (state.cancelled) return [];

    // Specific phrase first; only fall back to the broader one when that finds too little.
    const commons: WikimediaImageResult[] = [];
    const openi: WikimediaImageResult[] = [];
    const addUnique = (target: WikimediaImageResult[], items: WikimediaImageResult[]) => {
      for (const item of items) {
        if (BOOK_SCAN_TITLE.test(item.title)) continue; // Internet Archive book plates: "Title (1918) (14594439200)"
        if (target.length < PER_SOURCE_CANDIDATES && !target.some((t) => t.url === item.url)) target.push(item);
      }
    };
    const openiWaitMs = Number(process.env.CHAT_IMAGES_OPENI_WAIT_MS) || DEFAULT_OPENI_WAIT_MS;
    for (const term of plan.terms) {
      // Open-i is a best-effort fallback: it is often slow or drops connections, so it is only
      // waited for (at most openiWaitMs) when Commons alone found too little. Both start at
      // once so the wait overlaps with the Commons search.
      const openiPromise = this.bestEffort(openiImageSearchService.search(term, 6, excludeUrls), openiWaitMs);
      addUnique(commons, await wikimediaImageSearchService.search(term, 6, excludeUrls));
      if (commons.length < PER_SOURCE_CANDIDATES) addUnique(openi, await openiPromise);
      if (state.cancelled || commons.length + openi.length >= 3) break;
    }
    if (state.cancelled) return [];

    // Interleave so neither source crowds out the other when the vision check runs.
    const toJudge: WikimediaImageResult[] = [];
    for (let i = 0; i < PER_SOURCE_CANDIDATES; i++) {
      if (commons[i]) toJudge.push(commons[i]);
      if (openi[i]) toJudge.push(openi[i]);
    }
    if (toJudge.length === 0) {
      console.log(`🖼️ Chat images: no candidates for ${JSON.stringify(plan.terms)} (${Date.now() - startedAt}ms)`);
      return [];
    }

    const verdicts = await Promise.all(toJudge.map((c) => this.judge(question, c, state)));
    const kept = toJudge.filter((_, i) => verdicts[i]).slice(0, MAX_KEPT);

    console.log(
      `🖼️ Chat images: terms=${JSON.stringify(plan.terms)} candidates=${toJudge.length} (commons=${commons.length}, openi=${openi.length}) kept=${kept.length} (${Date.now() - startedAt}ms)`
    );
    return kept;
  }

  /** Resolves with the promise's value, or [] if it takes longer than ms (or fails). */
  private bestEffort(promise: Promise<WikimediaImageResult[]>, ms: number): Promise<WikimediaImageResult[]> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve([]), ms);
      promise.then(
        (value) => { clearTimeout(timer); resolve(value); },
        () => { clearTimeout(timer); resolve([]); }
      );
    });
  }

  private async judge(question: string, candidate: WikimediaImageResult, state: { cancelled: boolean }): Promise<boolean> {
    try {
      if (state.cancelled) return false;
      const response = await axios.get(candidate.url, {
        responseType: 'arraybuffer',
        timeout: THUMB_TIMEOUT_MS,
        maxContentLength: THUMB_MAX_BYTES,
        headers: { 'User-Agent': 'Clinical Fact/1.0 (https://clinicalfact.com; support@clinicalfact.com) medical-reference-app' },
      });
      const mimeType = String(response.headers['content-type'] || '').split(';')[0] || 'image/png';
      if (!mimeType.startsWith('image/') || state.cancelled) return false;
      return await aiService.isImageRelevant(question, candidate.title, Buffer.from(response.data), mimeType);
    } catch {
      return false;
    }
  }
}

export default new ChatImagesService();
