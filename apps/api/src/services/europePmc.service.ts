import axios from 'axios';

export interface EuropePmcResult {
  index: number;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi: string;
  abstract: string;
}

class EuropePmcService {
  private baseUrl = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

  async search(query: string, limit: number = 5): Promise<EuropePmcResult[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          query: `${query} AND (SRC:MED OR SRC:PMC)`,
          format: 'json',
          pageSize: limit,
          resultType: 'core',
        },
        timeout: 10000,
      });

      const results = (response.data as any)?.resultList?.result || [];

      return results.map((result: any, i: number) => ({
        index: i + 1,
        title: result.title || 'Untitled',
        authors: result.authorString || 'Unknown authors',
        journal: result.journalTitle || 'Unknown journal',
        year: result.pubYear || 'Unknown year',
        doi: result.doi ? `https://doi.org/${result.doi}` : '',
        abstract: result.abstractText || '',
      }));
    } catch (error: any) {
      console.error('❌ Europe PMC search error:', error.message);
      return [];
    }
  }
}

export default new EuropePmcService();
