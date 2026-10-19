import { performance } from 'perf_hooks';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import embeddingService from './embedding.vertexai.service';
import vectorDbService from './vectorDb.service';
import aiService from './ai.service';
import europePmcService, { EuropePmcResult, EuropePmcFilters } from './europePmc.service';
import semanticScholarService from './semanticScholar.service';
import pubmedService from './pubmed.service';
import { WikimediaImageResult } from './wikimediaImageSearch.service';
import chatImagesService from './chatImages.service';
import openFdaService from './openFda.service';
import { getLanguageName } from '../utils/language';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * One unified, sequentially-numbered citation — attached document chunks, literature results,
 * and FDA drug labels all share this shape and one running `index`, matching exactly the [n]
 * numbers the AI is instructed to cite inline (see the context-block loop in chatMedicalLiveStream).
 * Type-specific fields are optional and only populated for their own `type`.
 */
export interface MedicalCitation {
  index: number;
  type: 'attached' | 'literature' | 'drug_label';
  title: string;
  // literature only
  authors?: string;
  journal?: string;
  year?: string;
  doi?: string;
  abstract?: string;
  provider?: string;
  // drug_label only
  brandName?: string;
  genericName?: string;
  indications?: string;
  dosage?: string;
  warnings?: string;
  interactions?: string;
}

/** Emitted first (after retrieval, before generation starts) so the client can render
 *  citations/images alongside the streamed answer instead of waiting for it to finish. */
export interface ChatStreamMetadata {
  sources: Array<{
    text: string;
    score: number;
    title?: string;
    sourceType?: string;
    url?: string;
  }> | MedicalCitation[];
  images?: WikimediaImageResult[];
  groundingSources?: { uri: string; title: string }[];
}

export type ChatStreamEvent =
  | { type: 'metadata'; metadata: ChatStreamMetadata }
  | { type: 'chunk'; text: string };

/** EuropePmcFilters plus which of the two additional literature APIs to include — Europe PMC
 *  itself always runs (same as before); these two are ADDED alongside it, each independently
 *  toggleable, and merged+deduped into one citation list. Both default on when unset. */
export interface MedicalSearchFilters extends EuropePmcFilters {
  sources?: {
    semanticScholar?: boolean;
    pubmed?: boolean;
    openFda?: boolean;
  };
}

/**
 * Questions about the document as a whole ("summarize this note", "what is this about") need all of it,
 * not the few passages most similar to the question.
 */
// How long a live medical answer waits for outside sources (literature APIs, drug labels, web search).
// They run in parallel and the slowest used to set the pace; anything later than this is skipped.
const SOURCES_BUDGET_MS = Number(process.env.CHAT_SOURCES_BUDGET_MS) || 2500;
const ATTACHED_BUDGET_MS = 10000;

export const WHOLE_DOCUMENT_INTENT =
  /\b(summari[sz]e|summary|overview|outline|key (points|takeaways|ideas|concepts)|main (points|ideas|topics)|tl;?dr|recap|what('?s| is) (this|the) (note|document|file|pdf|lecture|material|text) (about|covering)|explain (this|the) (whole |entire )?(note|document|file|pdf|lecture|material))\b/i;
// ~25,000 tokens: a long lecture fits, and a message stays affordable.
const WHOLE_DOCUMENT_MAX_CHARS = 100000;
// When retrieval fails and we fall back to the stored text, send a smaller slice.
const FALLBACK_DOCUMENT_MAX_CHARS = 40000;

class ChatService {
  /**
   * Embed document for RAG chat
   */
  async embedDocument(
    documentText: string,
    sessionId: string,
    metadata: any = {},
    /** Percent done (0-100), reported as chunks are embedded; stays below 100 until stored. */
    onProgress?: (percent: number) => void
  ): Promise<{
    chunksCount: number;
    sessionId: string;
  }> {
    try {
      console.log(`📄 Embedding document for session ${sessionId}...`);

      // Split document into larger chunks for better semantic coherence
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1500, // Increased from 1000 for better context
        chunkOverlap: 300, // Increased from 200 for better continuity
        separators: ['\n\n', '\n', '. ', ' ', ''],
      });

      const chunks = await textSplitter.splitText(documentText);
      console.log(`✂️ Split document into ${chunks.length} chunks (1500 char size, 300 overlap)`);

      // Generate embeddings for all chunks
      const embeddings = await embeddingService.generateEmbeddings(chunks, (done, total) =>
        onProgress?.(Math.min(95, Math.round((done / total) * 95)))
      );
      console.log(`✅ Generated ${embeddings.length} embeddings`);

      // Store in vector database
      await vectorDbService.storeEmbeddings(sessionId, chunks, embeddings, metadata);

      return {
        chunksCount: chunks.length,
        sessionId,
      };
    } catch (error: any) {
      console.error('❌ Error embedding document:', error);
      throw new Error(`Document embedding failed: ${error.message}`);
    }
  }

  /**
   * Similarity search over the session's indexed chunks, returned as a numbered context block.
   * Null when nothing matched. Throws if embedding or the vector database fails.
   */
  private async retrieveLocalContext(
    sessionId: string,
    userMessage: string,
    retrievalStartedAt: number
  ): Promise<{ context: string; count: number } | null> {
    // Generate embedding for user question
    const queryEmbedding = await embeddingService.generateQueryEmbedding(userMessage);

    // Search for relevant chunks in vector database with improved thresholds
    // Retrieve top 10 chunks with lower similarity threshold for better recall
    let relevantChunks = await vectorDbService.searchSimilar(
      queryEmbedding,
      sessionId,
      10, // Increased from 5 to get more context
      0.15 // Lowered from 0.25 for better recall (more lenient matching)
    );

    if (relevantChunks.length === 0) {
      // Fallback: Try with even lower threshold
      const fallbackChunks = await vectorDbService.searchSimilar(
        queryEmbedding,
        sessionId,
        5,
        0.05 // Very low threshold as fallback
      );

      if (fallbackChunks.length === 0) {
        console.log(`⏱️ Vector retrieval duration (no matches): ${(performance.now() - retrievalStartedAt).toFixed(0)}ms`);
        return null;
      }

      // Use fallback chunks if found
      relevantChunks = [...relevantChunks, ...fallbackChunks];
    }

    console.log(`⏱️ Vector retrieval duration: ${(performance.now() - retrievalStartedAt).toFixed(0)}ms`);

    // Filter chunks by quality and remove duplicates
    const uniqueChunks = relevantChunks
      .filter(chunk => chunk.score && chunk.score > 0.05)
      .filter((chunk, index, self) =>
        index === self.findIndex(c => c.text.substring(0, 100) === chunk.text.substring(0, 100))
      );

    const contextChunks = uniqueChunks.slice(0, 8);

    // Build numbered context from local chunks only
    const context = contextChunks
      .map((chunk, i) => {
        // Use note title if available, otherwise generate smart fallback
        let title = chunk.metadata?.noteTitle || chunk.metadata?.title;
        if (!title) {
          // Generate context-aware title based on available metadata
          const sourceType = chunk.metadata?.sourceType || 'text';
          title = `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Passage ${i + 1}`;
        }
        const sourceType = chunk.metadata?.sourceType ? ` [${chunk.metadata.sourceType}]` : '';
        return `[${i + 1}] "${title}"${sourceType} (Relevance: ${(chunk.score * 100).toFixed(0)}%)\n${this.truncateText(chunk.text, 800)}`;
      })
      .join('\n\n---\n\n');

    return { context, count: uniqueChunks.length };
  }

  /** The stored document text as a context block, capped so very long documents stay affordable. */
  private storedTextContext(text: string, maxChars: number): string {
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[The rest of the document is not shown.]` : text;
  }

  /**
   * Chat with document using RAG — streaming. Yields one `metadata` event (after retrieval,
   * before generation starts), then one `chunk` event per text delta from the LLM. The caller
   * is responsible for accumulating `chunk` text for persistence (see chat.controller.ts).
   */
  async *chatStream(
    sessionId: string,
    userMessage: string,
    chatHistory: ChatMessage[] = [],
    deepResearch = false,
    language = 'en',
    signal?: AbortSignal,
    options: {
      /** The session's stored document text. */
      sourceContent?: string;
      /** More documents were attached later; the stored text covers only the first, so it isn't used. */
      hasAttachedSources?: boolean;
      /** Answer from the stored text (indexing not finished). */
      forceStoredText?: boolean;
    } = {}
  ): AsyncGenerator<ChatStreamEvent, void, unknown> {
    console.log(`💬 Streaming chat message for session ${sessionId}...`);

    const retrievalStartedAt = performance.now();

    // Whole-document mode. "Summarize this note" doesn't resemble any one passage, so retrieving the few
    // passages closest to the question gives a poor summary — send the document itself (up to a cap).
    // Also used while indexing is still running, and as the fallback when retrieval fails or finds nothing.
    const sourceText = (options.sourceContent || '').trim();
    const canUseStoredText = sourceText.length > 0 && !options.hasAttachedSources;
    let context = '';
    let chunkCount = 0;

    if (canUseStoredText && (options.forceStoredText || WHOLE_DOCUMENT_INTENT.test(userMessage))) {
      context = this.storedTextContext(sourceText, WHOLE_DOCUMENT_MAX_CHARS);
      console.log(`📖 Answering from the whole document (${Math.min(sourceText.length, WHOLE_DOCUMENT_MAX_CHARS)} chars)`);
    } else {
      let local: { context: string; count: number } | null = null;
      try {
        local = await this.retrieveLocalContext(sessionId, userMessage, retrievalStartedAt);
      } catch (error: any) {
        if (!canUseStoredText) throw error;
        // e.g. the embedding quota is exhausted or the vector database is down — the document text
        // is stored on the session, so the chat can still answer from it.
        console.warn(`⚠️ Document retrieval failed (${error.message}) — answering from the stored document text instead`);
        context = this.storedTextContext(sourceText, FALLBACK_DOCUMENT_MAX_CHARS);
      }

      if (local) {
        context = local.context;
        chunkCount = local.count;
      } else if (!context) {
        if (canUseStoredText) {
          context = this.storedTextContext(sourceText, FALLBACK_DOCUMENT_MAX_CHARS);
        } else {
          yield { type: 'metadata', metadata: { sources: [] } };
          yield {
            type: 'chunk',
            text: "I couldn't find relevant information in this document to answer your question. Could you rephrase your question or ask about something else in the document?",
          };
          return;
        }
      }
    }

    // Matches the same targetLanguage convention already used by quiz/flashcard generation
    // (see quizGeneration.service.ts) — 'en' needs no instruction since it's the model's default.
    // Spelled out as a full name ("French") rather than the raw code ("fr") and phrased as a
    // standalone directive — a bare code tacked onto the end of an English-heavy prompt is easy
    // for the model to under-weight against all the English source material above it.
    const languageInstruction = language !== 'en'
      ? `\n\nIMPORTANT: Regardless of the language of the material above, you must write your entire response in ${getLanguageName(language)} only. Do not respond in English.`
      : '';

    const systemInstruction = deepResearch
      ? `You are Clinical Fact, a medical reference AI tutor for nursing and medical students. You have access to live web search results — use them to find up-to-date information to supplement the user's local study material.

FORMAT YOUR ANSWER AS HTML:
- Use <p>, <b>, <h3>, <ul><li>, <ol><li>, <strong>

CRITICAL INSTRUCTIONS:
- Do NOT use inline citations (e.g., do not write "[1]", "[2]", or "(Source)").
- Do NOT output a bibliography, reference list, or "Sources" section at the end of your response.
- Do NOT output any markdown links for web search results.
- Do NOT write out image URLs or tell the user to open a link for an image — this chat has no image search feature, so any such link would be fabricated. If asked to show/fetch an image, just answer the underlying question in text and don't mention images at all.
- Weave the information naturally into your HTML answer without explicitly referencing where you got it from.

Answer in simple, conversational language. Combine web search and local material. Use examples and analogies.

Local study material:
${context}${languageInstruction}`: `You are Clinical Fact, a medical reference AI tutor for nursing and medical students. Explain things naturally, like you're talking to a friend — warm and conversational, not stiff or robotic.

FORMAT YOUR ANSWER AS HTML:
- Use <p>, <b>, <h3>, <ul><li>, <ol><li>, <strong>

How to answer:
- Answer from the material below — the user brought this document into the conversation and turned outside medical search off, so what they get back must come from it
- Use simple, everyday language; break complex ideas into pieces and use examples and analogies. You may use your general knowledge to EXPLAIN what the document says (define a term it uses, clarify a mechanism it mentions), but do not add facts, figures, doses or recommendations that the document does not contain
- If the document does not cover the question, say so plainly in one sentence (for example "Your document doesn't cover this.") and tell the user they can turn on "Search medical literature" in the + menu to get cited answers from medical sources. Do not answer from general knowledge instead
- When the document covers part of the question, answer that part fully and say which part it doesn't cover
- Do NOT use inline citations (e.g., do not write "[1]", "[2]", or "(Source)").
- Do NOT output a bibliography, reference list, or "Sources" section at the end of your response.
- Do NOT write out image URLs or tell the user to open a link for an image — this chat has no image search feature, so any such link would be fabricated. If asked to show/fetch an image, just answer the underlying question in text and don't mention images at all.

Material to answer from:
${context}${languageInstruction}`;

    const MAX_HISTORY_MESSAGES = 6;
    const messages = [
      ...chatHistory.slice(-MAX_HISTORY_MESSAGES),
      { role: 'user' as const, content: userMessage },
    ];

    // Sources stay hardcoded empty here, matching the pre-streaming behavior — the real
    // per-chunk source data is computed above but not surfaced to the client on this path.
    yield { type: 'metadata', metadata: { sources: [] } };

    const upstream = deepResearch
      ? await aiService.chatWithSearchStream(messages, systemInstruction, signal)
      : aiService.chatStream(messages, systemInstruction, signal);

    for await (const piece of upstream) {
      yield { type: 'chunk', text: piece };
    }

    console.log(`✅ Finished streaming chat response using ${chunkCount} local chunks${deepResearch ? ' + live web search' : ''}`);
  }

  /**
   * Chat using live medical literature (Europe PMC) and clinical images (Wikimedia Commons)
   * instead of the local Qdrant document store — unless the session has attached sources
   * (see chatController.attachSourceToSession), in which case their embedded chunks are
   * retrieved from Qdrant and merged into the same numbered citation list alongside the
   * live literature results. Streaming: yields one `metadata` event (citations/images/grounding
   * sources — all known before generation starts) then one `chunk` event per text delta.
   */
  async *chatMedicalLiveStream(
    userQuery: string,
    history: ChatMessage[] = [],
    filters?: MedicalSearchFilters,
    sessionId?: string,
    excludeImageUrls: string[] = [],
    language = 'en',
    signal?: AbortSignal,
    options: {
      /** Look for this session's own indexed material (attached/uploaded documents). Skipped for a
       *  plain medical chat with nothing attached, which saves an embedding call and a vector search. */
      searchSession?: boolean;
    } = {}
  ): AsyncGenerator<ChatStreamEvent, void, unknown> {
    console.log(`🩺 Streaming live medical chat for query: "${userQuery}"...`);

    const retrievalStartedAt = performance.now();

    // The answer waits for the sources, but only so long: literature APIs and web search each take
    // 1–6 seconds and used to be waited for one after another. They now all start together and
    // whatever hasn't arrived within the budget is left out — the model answers from its own
    // knowledge, which is the foundation anyway (see the prompt below).
    const withinBudget = <T>(promise: Promise<T>, fallback: T, ms = SOURCES_BUDGET_MS): Promise<T> =>
      Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
    const webPromise = aiService.searchWebWithin(userQuery, SOURCES_BUDGET_MS);

    const attachedChunksPromise = sessionId && options.searchSession !== false
      ? (async () => {
          const queryEmbedding = await embeddingService.generateQueryEmbedding(userQuery);
          return vectorDbService.searchSimilar(queryEmbedding, sessionId, 5, 0.15);
        })()
      : Promise.resolve([]);

    // Europe PMC always runs (unchanged); Semantic Scholar and PubMed are ADDED alongside it,
    // each independently toggleable from the "+" attach sheet, defaulting on when unset.
    const includeSemanticScholar = filters?.sources?.semanticScholar !== false;
    const includePubMed = filters?.sources?.pubmed !== false;
    const includeOpenFda = filters?.sources?.openFda !== false;

    // Images are NOT part of the retrieval below: finding and vetting them takes several
    // seconds, so they start now, run alongside retrieval and the answer, and are delivered
    // afterwards in a second `metadata` event (the app overwrites the message's images from
    // each one). find() never rejects and has its own time limit; it is a no-op unless
    // CHAT_IMAGES_ENABLED=true.
    const imagesPromise = chatImagesService.find(userQuery, excludeImageUrls);

    const [europePmcSettled, semanticScholarSettled, pubmedSettled, attachedSettled, drugLabelsSettled] = await Promise.allSettled([
      withinBudget(europePmcService.search(userQuery, 5, filters), []),
      withinBudget(includeSemanticScholar ? semanticScholarService.search(userQuery, 5) : Promise.resolve([]), []),
      withinBudget(includePubMed ? pubmedService.search(userQuery, 5) : Promise.resolve([]), []),
      // The user's own material is the point of attaching it, so it gets a much longer allowance.
      withinBudget(attachedChunksPromise, [], ATTACHED_BUDGET_MS),
      withinBudget(includeOpenFda ? openFdaService.search(userQuery, 3) : Promise.resolve([]), []),
    ]);
    const webResults = await webPromise;

    console.log(`⏱️ Retrieval duration (literature + attached + drug labels): ${(performance.now() - retrievalStartedAt).toFixed(0)}ms`);

    const europePmcResults = europePmcSettled.status === 'fulfilled' ? europePmcSettled.value : [];
    const semanticScholarResults = semanticScholarSettled.status === 'fulfilled' ? semanticScholarSettled.value : [];
    const pubmedResults = pubmedSettled.status === 'fulfilled' ? pubmedSettled.value : [];
    const attachedChunks = attachedSettled.status === 'fulfilled' ? attachedSettled.value : [];
    const drugLabelResults = drugLabelsSettled.status === 'fulfilled' ? drugLabelsSettled.value : [];

    if (europePmcSettled.status === 'rejected') {
      console.error('❌ Europe PMC search failed:', europePmcSettled.reason);
    }
    if (semanticScholarSettled.status === 'rejected') {
      console.error('❌ Semantic Scholar search failed:', semanticScholarSettled.reason);
    }
    if (pubmedSettled.status === 'rejected') {
      console.error('❌ PubMed search failed:', pubmedSettled.reason);
    }
    if (attachedSettled.status === 'rejected') {
      console.error('❌ Attached-source retrieval failed:', attachedSettled.reason);
    }
    if (drugLabelsSettled.status === 'rejected') {
      console.error('❌ openFDA search failed:', drugLabelsSettled.reason);
    }

    // A paper indexed in more than one source (common — Europe PMC and PubMed both cover
    // MEDLINE) should only appear, and be cited, once. Dedup by DOI where available, falling
    // back to a normalized title; re-numbered sequentially afterward for the citation list.
    const literatureResults = this.mergeLiteratureResults(europePmcResults, semanticScholarResults, pubmedResults);

    // Attached-document chunks are numbered first, then literature results, then FDA drug
    // labels continue the sequence — one unified citation list regardless of where a source
    // came from. Built in a single pass so the numbers the AI is told to cite (in the prompt
    // context block) and the numbers in the `sources` array returned to the client can never
    // drift out of sync with each other.
    let citationIndex = 0;
    const citations: MedicalCitation[] = [];
    const contextBlocks: string[] = [];

    for (const chunk of attachedChunks) {
      citationIndex++;
      const title = chunk.metadata?.attachedTitle || chunk.metadata?.noteTitle || 'Attached document';
      citations.push({ index: citationIndex, type: 'attached', title });
      contextBlocks.push(`[${citationIndex}] "${title}" (from your attached material)\n${this.truncateText(chunk.text, 800)}`);
    }

    for (const r of literatureResults) {
      citationIndex++;
      citations.push({
        index: citationIndex,
        type: 'literature',
        title: r.title,
        authors: r.authors,
        journal: r.journal,
        year: r.year,
        doi: r.doi,
        abstract: r.abstract,
        provider: r.provider,
      });
      contextBlocks.push(`[${citationIndex}] "${r.title}" (${r.year}, ${r.authors})\nAbstract: ${this.truncateText(r.abstract, 500)}`);
    }

    for (const r of drugLabelResults) {
      citationIndex++;
      const name = r.brandName || r.genericName || 'Unknown drug';
      citations.push({
        index: citationIndex,
        type: 'drug_label',
        title: name,
        brandName: r.brandName,
        genericName: r.genericName,
        indications: r.indications,
        dosage: r.dosage,
        warnings: r.warnings,
        interactions: r.interactions,
      });
      const sections = [
        r.indications && `Indications: ${this.truncateText(r.indications, 300)}`,
        r.dosage && `Dosage: ${this.truncateText(r.dosage, 300)}`,
        r.warnings && `Warnings: ${this.truncateText(r.warnings, 300)}`,
        r.interactions && `Interactions: ${this.truncateText(r.interactions, 300)}`,
      ].filter(Boolean).join('\n');
      contextBlocks.push(`[${citationIndex}] "${name}" (FDA drug label)\n${sections}`);
    }

    // Per-item truncation above bounds the common case, but a query that happens to surface
    // the maximum from every source at once (5 attached chunks + ~15 literature results + 3
    // drug labels) could still add up — this is the hard backstop that guarantees the prompt
    // Groq sees never blows the account's 8000 TPM cap regardless of combination. Truncated
    // from the end so it keeps attached material and the earliest (highest-relevance) results,
    // matching the priority the system instruction below already tells the model to use.
    const MAX_CONTEXT_CHARS = 12000;
    let context = contextBlocks.join('\n\n---\n\n');
    if (context.length > MAX_CONTEXT_CHARS) {
      context = `${context.slice(0, MAX_CONTEXT_CHARS)}…`;
    }

    const systemInstruction = `You are Clinical Fact, an expert clinical tutor for nursing and medical students — think of a sharp senior clinician who teaches well. Answer from your own medical knowledge, reason carefully, and be accurate: this is exam and practice preparation, so correctness matters more than anything else.

HOW DEEP TO GO — match the question:
- A simple fact, definition, normal value or yes/no question: answer directly in a few sentences.
- Anything that asks to explain, why/how, compare, pathophysiology, mechanism, differentials, management, nursing care, interpretation or a case: give a complete, well-organised answer a student can learn from. Open with the direct answer in one sentence, then the reasoning step by step, then what matters in practice where it applies — key findings, investigations, treatment or nursing interventions WITH their rationale, complications and red flags, and the high-yield exam points or common mistakes.
- Be thorough on substance, never on filler: no restating the question, no generic disclaimers, no padding, nothing the student didn't need.
- Put exact figures in the answer when they exist (doses, ranges, thresholds, timings) and name the guideline or drug class they come from. If something is uncertain or varies by guideline or region, say so rather than guess.

The sources below are supplementary, not a cap on what you're allowed to say:
- Where a source directly supports a specific claim you make, cite it inline with the matching bracketed number (e.g. [1], [2]).
- Fill in standard, well-established medical knowledge (causes, mechanisms, symptoms, standard treatment) even when none of the sources happen to spell it out — that's expected and normal, not "prior knowledge" you need permission for.
- Never invent a citation: only attach a [n] to a sentence if that specific source actually supports it. Uncited sentences are completely fine.
- Only say the sources are insufficient if the question is itself obscure/unsettled enough that even general medical knowledge can't answer it responsibly — never say that for standard textbook topics just because the retrieved abstracts happen to be narrow research papers.

FORMAT YOUR ANSWER AS HTML:
- Use <p>, <b>, <h3>, <ul><li>, <ol><li>, <strong>
- Make it easy to scan on a phone: short paragraphs, <h3> headings when there are two or more distinct parts, <ul>/<ol> for lists and steps, and <b> on key terms and numbers.
- For a longer answer, finish with a one-line <p><b>Key takeaway:</b> ...</p>.
- Use a mnemonic only when it is a well-known, standard one.

IMAGES:
- Any relevant images are found and shown by the app itself, in a separate row above your answer — you never receive image URLs and have no way to know what, if anything, was found for this specific message.
- Never write out an image URL, a markdown image/link, or instructions like "open this link in a browser" or "here are the direct links" — you cannot see or verify any such link, so it would be fabricated.
- If the user asks to see, fetch, or find images/illustrations, just answer the underlying medical question in text as usual and don't comment on images at all — the app's own image row (or its absence) already tells the user whether anything new was found for this message.

PATIENT-SPECIFIC QUESTIONS:
- Case-study or exam-style questions (a hypothetical patient framing, e.g. "a 65-year-old presents with...") are normal study material — answer these fully and directly, this is the core use case and must not be over-blocked.
- If a question reads as a real, active clinical situation asking you to make the care decision for a specific real patient (e.g. "my patient," "what do I give her right now"), answer the general/reference version of the underlying clinical question, then add one brief sentence noting that the specific decision belongs with the patient's treating clinician using their full assessment. Do not refuse outright.
- Never ask for, store, or act on real patient-identifying details (name, MRN, date of birth). If a user includes them, ignore the identifying details and answer only the underlying clinical question.

Some sources below are pulled from medical literature, others are official FDA drug labels (marked "FDA drug label" — authoritative for dosing, indications, warnings, and interactions), and others (marked "from your attached material") are from a note or document the user attached to this conversation. Treat all as valid, citeable context, and prioritize attached material since the user chose to bring it into this specific conversation.

You also have live web search results (restricted to authoritative medical domains like NIH, CDC, WHO, FDA, and MedlinePlus) — use them to verify current guidance or fill gaps the sources below don't cover. Do not use bracketed citation numbers for anything found via web search; the numbered [n] citations above are reserved for the sources list below. Web-grounded information is shown to the user separately, so just write it naturally into the answer.

Sources:
${context || 'No sources found — answer from your own medical knowledge.'}${language !== 'en' ? `\n\nIMPORTANT: Regardless of the language of the sources above, you must write your entire response in ${getLanguageName(language)} only. Do not respond in English.` : ''}`;

    // Full conversation history stacks on top of the (already capped) sources context above —
    // uncapped, a long-running chat would eventually blow the token budget on history alone.
    // Recent turns matter far more for a follow-up question than turns from many exchanges ago.
    const MAX_HISTORY_MESSAGES = 6;
    const messages = [
      ...history.slice(-MAX_HISTORY_MESSAGES),
      { role: 'user' as const, content: userQuery },
    ];

    // Note: EuropePmcFilters (date range/source categories) only ever apply to the Europe PMC
    // search above — Tavily web grounding has no equivalent filter API and always searches
    // the trusted-domain web unfiltered.
    const { stream, groundingSources } = await aiService.chatWithGroundingStream(messages, systemInstruction, signal, webResults);

    // First metadata event goes out immediately, without images, so citations show right away.
    yield {
      type: 'metadata',
      metadata: { sources: citations, images: [], groundingSources },
    };

    // Images arrive whenever they are ready: checked between answer chunks, and awaited once
    // after the last chunk if still pending (find() bounds the wait). The second metadata event
    // repeats sources/groundingSources because the app overwrites all three fields each time,
    // and the controller persists whichever metadata event came last.
    let imageResults: WikimediaImageResult[] = [];
    let imagesReady = false;
    let imagesSent = false;
    imagesPromise.then((found) => {
      imageResults = found;
      imagesReady = true;
    });
    const imagesEvent = (): ChatStreamEvent | null => {
      if (imagesSent || !imagesReady) return null;
      imagesSent = true;
      return imageResults.length > 0
        ? { type: 'metadata', metadata: { sources: citations, images: imageResults, groundingSources } }
        : null;
    };

    for await (const piece of stream) {
      yield { type: 'chunk', text: piece };
      const early = imagesEvent();
      if (early) yield early;
    }
    if (!imagesSent) {
      await imagesPromise;
      const late = imagesEvent();
      if (late) yield late;
    }

    console.log(`✅ Finished streaming live medical chat using ${literatureResults.length} literature sources (${europePmcResults.length} EuropePMC + ${semanticScholarResults.length} Semantic Scholar + ${pubmedResults.length} PubMed, merged+deduped), ${attachedChunks.length} attached-source chunks, ${drugLabelResults.length} drug labels, ${imageResults.length} images, ${groundingSources.length} grounding sources`);
  }

  /** Hard char cap on any one piece of source text going into the prompt (~125 tokens at the
   *  usual ~4 chars/token) — a single long FDA warnings section or journal abstract shouldn't
   *  be able to crowd out every other citation. */
  private truncateText(text: string, maxChars = 500): string {
    return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
  }

  /**
   * Merges literature results from multiple sources into one deduped, sequentially-numbered
   * list — a paper indexed in more than one source (common: Europe PMC and PubMed both cover
   * MEDLINE) should only appear once. Earlier sources in the argument list win on duplicates.
   */
  private mergeLiteratureResults(...sourceResultSets: EuropePmcResult[][]): EuropePmcResult[] {
    const seenKeys = new Set<string>();
    const merged: Omit<EuropePmcResult, 'index'>[] = [];

    for (const results of sourceResultSets) {
      for (const result of results) {
        const key = result.doi
          ? result.doi.replace(/^https?:\/\/doi\.org\//i, '').toLowerCase()
          : result.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!key || seenKeys.has(key)) continue;
        seenKeys.add(key);
        merged.push(result);
      }
    }

    return merged.map((result, i) => ({ ...result, index: i + 1 }));
  }

  /**
   * Short, LLM-generated chat title from the first exchange — same pattern every major
   * chat product uses (ChatGPT, Claude, etc.) instead of leaving "New chat" / a raw filename.
   * Called once, right after the first assistant reply, never again for that session.
   */
  async generateChatTitle(userMessage: string, assistantReply: string): Promise<string> {
    const plainReply = assistantReply.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const prompt = `Summarize this chat exchange as a short title, the same way ChatGPT or Claude titles a new conversation.

Rules:
- 3 to 6 words, title case, no trailing punctuation, no quotation marks around it.
- Describe the topic, not "chat about X" or "question regarding X" — just the topic itself.
- Reply with ONLY the title, nothing else.

User: ${userMessage.slice(0, 500)}
Assistant: ${plainReply.slice(0, 500)}`;

    try {
      const raw = await aiService.chat([{ role: 'user', content: prompt }], undefined, { fast: true });
      const title = raw.replace(/^["']|["']$/g, '').replace(/\.$/, '').trim();
      return title.slice(0, 80) || userMessage.slice(0, 60);
    } catch (error) {
      console.error('❌ Failed to generate chat title, falling back to truncated question:', error);
      return userMessage.slice(0, 60);
    }
  }

  /**
   * Summarize a conversation into one short line for a chat-history list preview — shown in
   * place of the raw last message so a student can recognize an old session at a glance.
   * Runs on Groq (via aiService.chat), same as the conversation itself: cheap, fast, and this
   * doesn't need OpenAI's stronger reasoning.
   */
  async summarizeChat(messages: ChatMessage[]): Promise<string> {
    try {
      // Only the latest exchanges matter for a one-line list preview — sending a long chat's whole
      // history made this call slower with every message.
      const conversationText = messages
        .slice(-6)
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.slice(0, 600)}`)
        .join('\n\n');

      const prompt = `Summarize this medical study conversation in ONE concise sentence (under 20 words) that would help a nursing or medical student recognize it later in their conversation history. Focus on the specific topic discussed, not generic phrasing like "a conversation about X".

${conversationText}

Reply with ONLY the summary sentence, nothing else.`;

      const raw = await aiService.chat([{ role: 'user', content: prompt }], undefined, { fast: true });
      return raw.replace(/^["']|["']$/g, '').replace(/\.$/, '').trim();
    } catch (error: any) {
      console.error('❌ Error summarizing chat:', error);
      throw new Error(`Chat summarization failed: ${error.message}`);
    }
  }

  /**
   * Suggest follow-up questions that build on what was just discussed, shown as tappable
   * chips beneath the assistant's reply. Runs on Groq (via aiService.chatJSON) — cheap, fast,
   * and follow-up suggestions don't need OpenAI's stronger reasoning either. Never throws:
   * a failure here should never break the actual chat response, so it degrades to no chips.
   */
  async generateFollowUpQuestions(chatHistory: ChatMessage[], language = 'en'): Promise<string[]> {
    try {
      const lastMessages = chatHistory.slice(-4);
      const conversationText = lastMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      const languageInstruction = language !== 'en'
        ? ` Write the questions in ${getLanguageName(language)} only, regardless of the language of the conversation above — do not use English.`
        : '';

      const prompt = `Based on this medical study conversation, suggest 3 relevant follow-up questions a nursing or medical student might naturally want to ask next — questions that build on what was just discussed (e.g. related mechanisms, complications, comparisons, or clinical application). Keep each question short and specific, not generic.${languageInstruction}

${conversationText}

Respond with ONLY a JSON object in this exact shape, nothing else:
{"questions": ["Question 1?", "Question 2?", "Question 3?"]}`;

      const result = await aiService.chatJSON(
        [{ role: 'user', content: prompt }],
        'You are a medical education assistant. Always respond with valid JSON matching the requested shape.',
        { fast: true }
      );

      return Array.isArray(result?.questions) ? result.questions : [];
    } catch (error: any) {
      console.error('❌ Error generating follow-up questions:', error);
      return [];
    }
  }

  /**
   * Delete chat session and associated embeddings
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await vectorDbService.deleteSession(sessionId);
      console.log(`✅ Deleted chat session ${sessionId}`);
    } catch (error: any) {
      console.error('❌ Error deleting session:', error);
      throw new Error(`Session deletion failed: ${error.message}`);
    }
  }

  /**
   * Check if session has embeddings
   */
  async hasEmbeddings(sessionId: string): Promise<boolean> {
    try {
      const count = await vectorDbService.countSessionPoints(sessionId);
      return count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get session info
   */
  async getSessionInfo(sessionId: string) {
    try {
      const chunksCount = await vectorDbService.countSessionPoints(sessionId);

      return {
        sessionId,
        chunksCount,
        hasEmbeddings: chunksCount > 0,
      };
    } catch (error: any) {
      console.error('❌ Error getting session info:', error);
      throw new Error(`Failed to get session info: ${error.message}`);
    }
  }

  /**
   * Embed document from stored note (uses extractedContent for RAG)
   */
  async embedNoteDocument(
    noteId: string,
    sessionId: string,
    onProgress?: (percent: number) => void
  ): Promise<{
    chunksCount: number;
    sessionId: string;
  }> {
    try {
      // Import Note model dynamically to avoid circular dependencies
      const NoteModel = (await import('../models/Note')).default;
      
      // Retrieve note from database
      const note = await NoteModel.findById(noteId);
      
      if (!note) {
        throw new Error(`Note not found: ${noteId}`);
      }

      // Use extractedContent if available (raw content before AI enhancement)
      // Falls back to content if extractedContent not set
      const contentToEmbed = note.extractedContent || note.transcriptText || note.content;
      
      if (!contentToEmbed) {
        throw new Error('No content available for embedding');
      }

      console.log(`📄 Embedding note ${noteId} for session ${sessionId} (extracted content: ${contentToEmbed.length} chars)`);

      // Use existing embedDocument method with retrieved content
      return await this.embedDocument(contentToEmbed, sessionId, {
        noteId: noteId.toString(),
        noteTitle: note.title,
        sourceType: note.sourceType,
      }, onProgress);
    } catch (error: any) {
      console.error('❌ Error embedding note document:', error);
      throw new Error(`Note embedding failed: ${error.message}`);
    }
  }
}

export default new ChatService();
