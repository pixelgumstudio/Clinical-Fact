import axios from 'axios';

export interface SemanticScholarResult {
  index: number;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi: string;
  abstract: string;
}

/**
 * Semantic Scholar Academic Graph API (api.semanticscholar.org) — free, no paid tiers.
 * Unauthenticated: 100 requests/5 min. With SEMANTIC_SCHOLAR_API_KEY (free, requested via
 * Semantic Scholar's site): higher limits. Works fine without a key, just more rate-limited.
 */
class SemanticScholarService {
  private baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
  private apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;

  async search(query: string, limit: number = 5): Promise<SemanticScholarResult[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          query,
          limit,
          fields: 'title,abstract,year,authors,venue,externalIds',
        },
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : undefined,
        timeout: 10000,
      });

      const results = (response.data as any)?.data || [];

      return results.map((r: any, i: number) => ({
        index: i + 1,
        title: r.title || 'Untitled',
        authors: (r.authors || []).map((a: any) => a.name).filter(Boolean).join(', ') || 'Unknown authors',
        journal: r.venue || 'Unknown journal',
        year: r.year ? String(r.year) : 'Unknown year',
        doi: r.externalIds?.DOI ? `https://doi.org/${r.externalIds.DOI}` : '',
        abstract: r.abstract || '',
      }));
    } catch (error: any) {
      console.error('❌ Semantic Scholar search error:', error.message);
      return [];
    }
  }
}

export default new SemanticScholarService();
