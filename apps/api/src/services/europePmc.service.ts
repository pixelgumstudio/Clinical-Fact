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

export interface EuropePmcFilters {
  /** Inclusive year range, e.g. { from: 2010, to: 2025 }. Either bound may be omitted. */
  dateRange?: { from?: number; to?: number };
  sourceCategories?: {
    /** General MEDLINE/PMC journal articles. Defaults to true when no category is specified. */
    scientificArticles?: boolean;
    /** PUB_TYPE:"book" */
    books?: boolean;
    /**
     * PUB_TYPE:"guideline" — covers both "international health guidelines" and "medicine
     * guidelines" from the PRD's filter UI. Europe PMC does not distinguish between these two
     * categories; both map to the same underlying filter. Verified live (2026-07-25).
     */
    guidelines?: boolean;
    /**
     * Not supported. Europe PMC only indexes scholarly/biomedical literature — there is no
     * consumer-health-site (Healthline-style) source in its index. Accepted here for UI-shape
     * compatibility but intentionally has no effect on the query. See docs/medical-chat/API-RESEARCH.md §2.1.
     */
    healthlineConsumerSources?: boolean;
  };
  /** Only meaningful when scientificArticles is included; ignored otherwise. */
  articleTypes?: {
    metaAnalyses?: boolean;
    reviewArticles?: boolean;
    clinicalTrials?: boolean;
  };
}

class EuropePmcService {
  private baseUrl = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

  /**
   * Builds the Europe PMC boolean filter fragment for a source/article-type combination.
   * Verified live against the real API (2026-07-25) — see docs/medical-chat/API-RESEARCH.md §2.1
   * for the confirmed PUB_TYPE values and their hit counts.
   */
  private buildTypeFilter(filters?: EuropePmcFilters): string {
    const sourceCategories = filters?.sourceCategories;
    const articleTypes = filters?.articleTypes;
    const clauses: string[] = [];

    const includeScientificArticles = sourceCategories?.scientificArticles !== false;
    if (includeScientificArticles) {
      const subTypes: string[] = [];
      if (articleTypes?.metaAnalyses) subTypes.push('PUB_TYPE:"meta-analysis"');
      if (articleTypes?.reviewArticles) subTypes.push('PUB_TYPE:"review"');
      if (articleTypes?.clinicalTrials) subTypes.push('PUB_TYPE:"clinical trial"');

      clauses.push(subTypes.length > 0 ? `(${subTypes.join(' OR ')})` : '(SRC:MED OR SRC:PMC)');
    }

    if (sourceCategories?.books) clauses.push('PUB_TYPE:"book"');
    if (sourceCategories?.guidelines) clauses.push('PUB_TYPE:"guideline"');

    // healthlineConsumerSources intentionally omitted — not supported, see interface doc above.

    return clauses.length > 0 ? `(${clauses.join(' OR ')})` : '(SRC:MED OR SRC:PMC)';
  }

  private buildDateFilter(filters?: EuropePmcFilters): string | null {
    const range = filters?.dateRange;
    if (!range || (range.from === undefined && range.to === undefined)) return null;

    const from = range.from ?? 1900;
    const to = range.to ?? new Date().getFullYear();
    return `PUB_YEAR:[${from} TO ${to}]`;
  }

  async search(query: string, limit: number = 5, filters?: EuropePmcFilters): Promise<EuropePmcResult[]> {
    try {
      const typeFilter = this.buildTypeFilter(filters);
      const dateFilter = this.buildDateFilter(filters);
      const queryParts = [query, 'AND', typeFilter];
      if (dateFilter) queryParts.push('AND', dateFilter);

      const response = await axios.get(this.baseUrl, {
        params: {
          query: queryParts.join(' '),
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
