import axios from 'axios';
import type { WikimediaImageResult } from './wikimediaImageSearch.service';

const OPENI_BASE = 'https://openi.nlm.nih.gov';

// Clinical Fact is a paid product, so only images whose licence allows commercial use are
// shown. Open-i's index is mostly PubMed Central figures, a large share of which are
// NonCommercial (CC BY-NC, BY-NC-ND, BY-NC-SA) or NoDerivatives — those are filtered out.
const COMMERCIAL_OK_LICENSES = new Set(['by', 'bysa', 'cc0']);

const stripHtml = (value?: string): string => (value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/**
 * NIH Open-i: biomedical figures (radiographs, clinical photos, histology, diagrams) from open
 * access papers, each with a caption. Complements Wikimedia Commons, which is strong on
 * anatomy diagrams but thin on real clinical images. Results use the same shape as the
 * Commons search so the rest of the chat pipeline doesn't care where an image came from.
 */
class OpenIImageSearchService {
  async search(query: string, limit: number = 6, excludeUrls: string[] = []): Promise<WikimediaImageResult[]> {
    try {
      const response = await axios.get(`${OPENI_BASE}/api/search`, {
        // it=xg: graphics only. Over-fetch because the licence filter drops many results.
        params: { query, it: 'xg', m: 1, n: Math.min(limit * 3 + excludeUrls.length, 30) },
        timeout: 8000,
        headers: { 'User-Agent': 'Clinical Fact/1.0 (https://clinicalfact.com; support@clinicalfact.com) medical-reference-app' },
      });

      const list: any[] = (response.data as any)?.list || [];
      const excludeSet = new Set(excludeUrls);
      const seen = new Set<string>();
      const results: WikimediaImageResult[] = [];

      for (const item of list) {
        const license = String(item?.ccLicense || '').toLowerCase();
        if (!COMMERCIAL_OK_LICENSES.has(license) || !item?.imgLarge) continue;

        const url = `${OPENI_BASE}${item.imgLarge}`;
        if (excludeSet.has(url) || seen.has(url)) continue;
        seen.add(url);

        const caption = stripHtml(item?.image?.caption);
        const articleTitle = stripHtml(item?.title);
        results.push({
          url,
          // The figure caption is what says what the image shows; the article title gives context.
          title: [caption.slice(0, 160), articleTitle].filter(Boolean).join(' — ').slice(0, 260),
          contextUrl: item.pmc_url || '',
          license: item.licenseType || license.toUpperCase(),
          attribution: [stripHtml(item.authors), item.journal_abbr].filter(Boolean).join(', ') || undefined,
          attributionRequired: true,
        });
        if (results.length >= limit) break;
      }
      return results;
    } catch (error: any) {
      console.warn('⚠️ Open-i image search error:', error.message);
      return [];
    }
  }
}

export default new OpenIImageSearchService();
