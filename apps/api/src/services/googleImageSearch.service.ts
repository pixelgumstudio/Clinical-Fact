import axios from 'axios';

export interface GoogleImageResult {
  url: string;
  title: string;
  contextUrl: string;
}

class GoogleImageSearchService {
  private baseUrl = 'https://www.googleapis.com/customsearch/v1';

  async search(query: string, limit: number = 3): Promise<GoogleImageResult[]> {
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      console.warn('⚠️ Google Custom Search API keys not configured, skipping image search');
      return [];
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: `${query} medical diagram clinical illustration`,
          searchType: 'image',
          num: limit,
          safe: 'active',
        },
        timeout: 8000,
      });

      const items = (response.data as any)?.items || [];

      return items.map((item: any) => ({
        url: item.link,
        title: item.title || '',
        contextUrl: item.image?.contextLink || '',
      }));
    } catch (error: any) {
      console.error('❌ Google Image Search error:', error.message);
      return [];
    }
  }
}

export default new GoogleImageSearchService();
