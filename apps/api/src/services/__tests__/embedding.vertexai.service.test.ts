// Vertex AI embeddings are rate limited by *requests* per minute, so indexing a document has to send
// many chunks per request and ride out 429s instead of failing the whole document.
process.env.GOOGLE_PROJECT_ID = 'test-project';
process.env.EMBEDDING_MIN_INTERVAL_MS = '1';
process.env.EMBEDDING_RETRY_BASE_MS = '1';

jest.mock('axios');
// A plain class, not jest.fn(): this project's jest config resets mock implementations before every test.
jest.mock('google-auth-library', () => ({
  GoogleAuth: class {
    async getClient() {
      return { getAccessToken: async () => ({ token: 'test-token' }) };
    }
  },
}));

import axios from 'axios';
import embeddingService from '../embedding.vertexai.service';

const post = axios.post as jest.Mock;

const vectorsFor = (count: number) => ({
  data: { predictions: Array.from({ length: count }, () => ({ embeddings: { values: [0.1, 0.2, 0.3] } })) },
});
const instancesIn = (call: any[]) => call[1].instances.length;
const httpError = (status: number, headers: Record<string, string> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, headers } });

describe('VertexAIEmbeddingService', () => {
  beforeEach(() => {
    post.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  test('sends chunks in batches, not one request per chunk, and keeps their order', async () => {
    post.mockImplementation((_url: string, body: any) => Promise.resolve(vectorsFor(body.instances.length)));

    const out = await embeddingService.generateEmbeddings(Array.from({ length: 60 }, (_, i) => `chunk ${i}`));

    expect(out).toHaveLength(60);
    expect(post).toHaveBeenCalledTimes(3); // 24 + 24 + 12
    expect(post.mock.calls.map(instancesIn)).toEqual([24, 24, 12]);
  });

  test('reports progress after each batch', async () => {
    post.mockImplementation((_url: string, body: any) => Promise.resolve(vectorsFor(body.instances.length)));
    const progress: Array<[number, number]> = [];

    await embeddingService.generateEmbeddings(Array.from({ length: 50 }, () => 'x'), (done, total) => progress.push([done, total]));

    expect(progress).toEqual([[24, 50], [48, 50], [50, 50]]);
  });

  test('retries a rate-limited request (429) instead of failing the document', async () => {
    post.mockRejectedValueOnce(httpError(429)).mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce(vectorsFor(2));

    const out = await embeddingService.generateEmbeddings(['a', 'b']);

    expect(out).toHaveLength(2);
    expect(post).toHaveBeenCalledTimes(3);
  });

  test('retries server errors (5xx)', async () => {
    post.mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce(vectorsFor(1));

    await expect(embeddingService.generateEmbeddings(['a'])).resolves.toHaveLength(1);
    expect(post).toHaveBeenCalledTimes(2);
  });

  test('does not retry a permission error', async () => {
    post.mockRejectedValue(httpError(403));

    await expect(embeddingService.generateEmbeddings(['a'])).rejects.toThrow(/access denied/i);
    expect(post).toHaveBeenCalledTimes(1);
  });

  test('gives up with a clear message when the quota never recovers', async () => {
    post.mockRejectedValue(httpError(429));

    await expect(embeddingService.generateEmbeddings(['a'])).rejects.toThrow(/quota exceeded/i);
    expect(post).toHaveBeenCalledTimes(8);
  });

  test('splits a batch that Google says is too large and still returns every vector in order', async () => {
    post.mockImplementation((_url: string, body: any) =>
      body.instances.length > 2
        ? Promise.reject(Object.assign(new Error('input exceeds the token limit'), { response: { status: 400, headers: {} } }))
        : Promise.resolve(vectorsFor(body.instances.length))
    );

    const out = await embeddingService.generateEmbeddings(['a', 'b', 'c', 'd', 'e']);

    expect(out).toHaveLength(5);
  });

  test('rejects an incomplete response rather than storing a missing vector', async () => {
    post.mockResolvedValue({ data: { predictions: [{ embeddings: { values: [1] } }] } }); // 1 back for 2 sent

    await expect(embeddingService.generateEmbeddings(['a', 'b'])).rejects.toThrow(/incomplete embedding/i);
  });

  test('embeds a query with the RETRIEVAL_QUERY task type', async () => {
    post.mockResolvedValue(vectorsFor(1));

    await embeddingService.generateQueryEmbedding('what is the brachial plexus?');

    expect(post.mock.calls[0][1].instances[0].taskType).toBe('RETRIEVAL_QUERY');
  });
});
