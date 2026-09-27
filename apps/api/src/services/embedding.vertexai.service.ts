import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

/**
 * text-embedding-004 is an asymmetric retrieval model — a chunk indexed with
 * RETRIEVAL_DOCUMENT and the query later embedded with RETRIEVAL_QUERY land closer together in
 * vector space than if both used the same task type (or none, which silently falls back to a
 * generic, less accurate embedding). Every caller must specify which one it's doing.
 */
export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

/**
 * Embedding service using Vertex AI (text-embedding-004 model)
 * Uses service account credentials from GOOGLE_APPLICATION_CREDENTIALS
 * Calls Vertex AI REST API directly for text embeddings
 */
class VertexAIEmbeddingService {
  private auth: GoogleAuth;
  private projectId: string;
  private location: string;

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

  /**
   * Generate embedding for a single text. `taskType` defaults to RETRIEVAL_DOCUMENT (indexing) —
   * generateQueryEmbedding below is the only caller that passes RETRIEVAL_QUERY.
   */
  async generateEmbedding(text: string, taskType: EmbeddingTaskType = 'RETRIEVAL_DOCUMENT'): Promise<number[]> {
    try {
      // Truncate text if too long
      const truncatedText = text.substring(0, 12000);

      const client = await this.auth.getClient();
      const accessToken = await (client as any).getAccessToken();

      const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/text-embedding-004:predict`;

      const response = await axios.post(
        url,
        {
          instances: [
            {
              content: truncatedText,
              taskType,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const embedding = (response.data as any)?.predictions?.[0]?.embeddings?.values;

      if (!embedding || embedding.length === 0) {
        throw new Error('No embedding values returned from Vertex AI');
      }

      return embedding;
    } catch (error: any) {
      console.error('❌ Error generating embedding:', error.message);

      if (error.response?.status === 404 || error.message?.includes('NOT_FOUND')) {
        throw new Error('Embedding model not available. Please check your Vertex AI setup.');
      } else if (error.response?.status === 403 || error.message?.includes('PERMISSION_DENIED')) {
        throw new Error('Vertex AI access denied. Please check your service account permissions.');
      }

      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch — always RETRIEVAL_DOCUMENT, since this is
   * only ever called to index document/note chunks for later retrieval (see chat.service.ts's
   * embedDocument), never for a live search query.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      console.log(`📊 Generating embeddings for ${texts.length} texts...`);

      const embeddings: number[][] = [];

      // Process texts sequentially to avoid rate limits
      for (const text of texts) {
        const embedding = await this.generateEmbedding(text, 'RETRIEVAL_DOCUMENT');
        embeddings.push(embedding);

        // Add small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Generated ${embeddings.length} embeddings`);
      return embeddings;
    } catch (error: any) {
      console.error('❌ Error generating embeddings:', error);
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
