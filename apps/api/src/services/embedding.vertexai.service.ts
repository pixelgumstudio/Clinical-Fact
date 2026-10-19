import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

/**
 * text-embedding-004 is an asymmetric retrieval model — a chunk indexed with
 * RETRIEVAL_DOCUMENT and the query later embedded with RETRIEVAL_QUERY land closer together in
 * vector space than if both used the same task type (or none, which silently falls back to a
 * generic, less accurate embedding). Every caller must specify which one it's doing.
 */
export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

/** Called after each batch with how many texts have been embedded so far, and the total. */
export type EmbeddingProgress = (done: number, total: number) => void;

// Vertex AI's quota here is counted in *requests* per minute (online_prediction_requests_per_base_model),
// not texts, so documents are embedded many chunks per request. A request may carry up to 250 texts
// but only ~20,000 tokens in total; ~1,500-character chunks are ~400 tokens, so 24 per request is safe,
// and the character cap below guards documents in languages that need more tokens per character.
const BATCH_SIZE = Number(process.env.EMBEDDING_BATCH_SIZE) || 24;
const BATCH_MAX_CHARS = 60000;
const MAX_TEXT_CHARS = 12000;
// Floor between request starts across the whole process, so concurrent chats can't burst past the quota.
const MIN_REQUEST_INTERVAL_MS = Number(process.env.EMBEDDING_MIN_INTERVAL_MS) || 1000;
const MAX_ATTEMPTS = 8;
const RETRY_BASE_MS = Number(process.env.EMBEDDING_RETRY_BASE_MS) || 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Embedding service using Vertex AI (text-embedding-004 model)
 * Uses service account credentials from GOOGLE_APPLICATION_CREDENTIALS
 * Calls Vertex AI REST API directly for text embeddings
 */
class VertexAIEmbeddingService {
  private auth: GoogleAuth;
  private projectId: string;
  private location: string;
  private nextRequestAt = 0;

  constructor() {
    try {
      const projectId = process.env.GOOGLE_PROJECT_ID;
      const location = process.env.GOOGLE_LOCATION || 'us-central1';

      if (!projectId) {
        throw new Error('GOOGLE_PROJECT_ID environment variable is required');
      }

      this.projectId = projectId;
      this.location = location;

      // Initialize Google Auth using GOOGLE_APPLICATION_CREDENTIALS
      this.auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      console.log('✅ Vertex AI Embedding service initialized (text-embedding-004)');
    } catch (error) {
      console.error('❌ Error initializing Vertex AI embedding service:', error);
      throw error;
    }
  }

  /** Waits until this process may start another request (keeps request starts >= the interval apart). */
  private async paceRequests(): Promise<void> {
    const now = Date.now();
    const startAt = Math.max(now, this.nextRequestAt);
    this.nextRequestAt = startAt + MIN_REQUEST_INTERVAL_MS;
    if (startAt > now) await sleep(startAt - now);
  }

  /**
   * One Vertex AI predict call for a batch of texts, retried on rate limits (429), server errors
   * (5xx) and network failures with exponential backoff (honouring Retry-After). Other errors, such
   * as a bad request, fail immediately. Returns one vector per text, in order.
   */
  private async predict(texts: string[], taskType: EmbeddingTaskType): Promise<number[][]> {
    const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/text-embedding-004:predict`;
    let lastError: any;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.paceRequests();
        const client = await this.auth.getClient();
        const accessToken = await (client as any).getAccessToken();

        const response = await axios.post(
          url,
          { instances: texts.map((text) => ({ content: text.substring(0, MAX_TEXT_CHARS), taskType })) },
          {
            headers: { Authorization: `Bearer ${accessToken.token}`, 'Content-Type': 'application/json' },
            timeout: 60000,
          }
        );

        const predictions: any[] = (response.data as any)?.predictions || [];
        const vectors = predictions.map((p) => p?.embeddings?.values as number[] | undefined);
        if (vectors.length !== texts.length || vectors.some((v) => !v || v.length === 0)) {
          throw new Error('Vertex AI returned a missing or incomplete embedding');
        }
        return vectors as number[][];
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;
        const retryable = !status || status === 429 || status >= 500;
        if (!retryable || attempt === MAX_ATTEMPTS) break;

        const retryAfter = Number(error.response?.headers?.['retry-after']) * 1000;
        const backoff = Math.min(30000, RETRY_BASE_MS * 2 ** (attempt - 1)) + Math.floor(Math.random() * 500);
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.max(retryAfter, backoff) : backoff;
        console.warn(`⏳ Embedding request ${status || error.code || 'failed'} (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying in ${(wait / 1000).toFixed(1)}s`);
        await sleep(wait);
      }
    }

    const status = lastError.response?.status;
    if (status === 404 || lastError.message?.includes('NOT_FOUND')) {
      throw new Error('Embedding model not available. Please check your Vertex AI setup.');
    } else if (status === 403 || lastError.message?.includes('PERMISSION_DENIED')) {
      throw new Error('Vertex AI access denied. Please check your service account permissions.');
    } else if (status === 429) {
      throw new Error('Vertex AI embedding quota exceeded. Please request a quota increase or try again shortly.');
    }
    throw new Error(`Embedding generation failed: ${lastError.message}`);
  }

  /** Like predict(), but if Google rejects the batch as too large it is split in half and retried. */
  private async predictSplitting(texts: string[], taskType: EmbeddingTaskType): Promise<number[][]> {
    try {
      return await this.predict(texts, taskType);
    } catch (error: any) {
      const tooLarge = /token|too (long|large)|exceed/i.test(String(error.message));
      if (!tooLarge || texts.length === 1) throw error;
      const mid = Math.ceil(texts.length / 2);
      const left = await this.predictSplitting(texts.slice(0, mid), taskType);
      const right = await this.predictSplitting(texts.slice(mid), taskType);
      return [...left, ...right];
    }
  }

  /**
   * Generate embedding for a single text. `taskType` defaults to RETRIEVAL_DOCUMENT (indexing) —
   * generateQueryEmbedding below is the only caller that passes RETRIEVAL_QUERY.
   */
  async generateEmbedding(text: string, taskType: EmbeddingTaskType = 'RETRIEVAL_DOCUMENT'): Promise<number[]> {
    try {
      const [embedding] = await this.predict([text], taskType);
      return embedding;
    } catch (error: any) {
      console.error('❌ Error generating embedding:', error.message);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts — always RETRIEVAL_DOCUMENT, since this is only ever
   * called to index document/note chunks for later retrieval (see chat.service.ts's embedDocument),
   * never for a live search query. Texts are sent in batches (see BATCH_SIZE), in order.
   */
  async generateEmbeddings(texts: string[], onProgress?: EmbeddingProgress): Promise<number[][]> {
    try {
      console.log(`📊 Generating embeddings for ${texts.length} texts...`);

      // Group into batches bounded by count and by total characters.
      const batches: string[][] = [];
      let current: string[] = [];
      let currentChars = 0;
      for (const text of texts) {
        const size = Math.min(text.length, MAX_TEXT_CHARS);
        if (current.length > 0 && (current.length >= BATCH_SIZE || currentChars + size > BATCH_MAX_CHARS)) {
          batches.push(current);
          current = [];
          currentChars = 0;
        }
        current.push(text);
        currentChars += size;
      }
      if (current.length > 0) batches.push(current);

      const embeddings: number[][] = [];
      for (const batch of batches) {
        embeddings.push(...(await this.predictSplitting(batch, 'RETRIEVAL_DOCUMENT')));
        onProgress?.(embeddings.length, texts.length);
      }

      console.log(`✅ Generated ${embeddings.length} embeddings in ${batches.length} request(s)`);
      return embeddings;
    } catch (error: any) {
      console.error('❌ Error generating embeddings:', error.message);
      throw new Error(`Batch embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding for a query — RETRIEVAL_QUERY, so it lands close to chunks indexed with
   * RETRIEVAL_DOCUMENT above in text-embedding-004's asymmetric vector space. Same model either
   * way; only the task type differs.
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    return this.generateEmbedding(query, 'RETRIEVAL_QUERY');
  }
}

export default new VertexAIEmbeddingService();
