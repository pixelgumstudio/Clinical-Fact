import axios from 'axios';

export interface OpenFdaDrugResult {
  index: number;
  brandName: string;
  genericName: string;
  indications: string;
  dosage: string;
  warnings: string;
  interactions: string;
}

// Short, generic clinical filler words stripped out before searching — openFDA's label search
// matches against a drug name, not a full sentence, so only plausible name-shaped words remain.
const STOPWORDS = new Set([
  'what', 'whats', 'when', 'where', 'why', 'who', 'which', 'how',
  'much', 'many', 'does', 'do', 'can', 'could', 'would', 'should',
  'is', 'are', 'was', 'were', 'be', 'been', 'the', 'a', 'an', 'for',
  'of', 'to', 'in', 'on', 'and', 'or', 'with', 'this', 'that', 'these',
  'those', 'take', 'taking', 'taken', 'used', 'use', 'using', 'dose',
  'dosage', 'dosing', 'side', 'effect', 'effects', 'adult', 'adults',
  'child', 'children', 'max', 'maximum', 'safe', 'safely', 'give',
  'giving', 'patient', 'patients', 'need', 'about', 'their', 'they',
]);

class OpenFdaService {
  private baseUrl = 'https://api.fda.gov/drug/label.json';

  private extractDrugCandidates(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOPWORDS.has(word));
  }

  /**
   * Searches FDA drug labels (indications, dosage, warnings, interactions) for candidate drug
   * names pulled out of a natural-language question. Returns [] for non-drug questions or when
   * nothing matches — this is a supplementary source, not a required one (see chat.service.ts).
   */
  async search(query: string, limit: number = 3): Promise<OpenFdaDrugResult[]> {
    const candidates = this.extractDrugCandidates(query);
    if (candidates.length === 0) return [];

    const nameClauses = candidates
      .map(
        (word) =>
          `openfda.generic_name:"${word}" OR openfda.brand_name:"${word}" OR openfda.substance_name:"${word}"`
      )
      .join(' OR ');

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          search: `(${nameClauses})`,
          limit,
        },
        timeout: 8000,
      });

      const results = (response.data as any)?.results || [];

      return results.map((r: any, i: number) => ({
        index: i + 1,
        brandName: r.openfda?.brand_name?.[0] || '',
        genericName: r.openfda?.generic_name?.[0] || '',
        indications: (r.indications_and_usage?.[0] || '').slice(0, 800),
        dosage: (r.dosage_and_administration?.[0] || '').slice(0, 800),
        warnings: (r.warnings?.[0] || r.warnings_and_cautions?.[0] || '').slice(0, 800),
        interactions: (r.drug_interactions?.[0] || '').slice(0, 800),
      }));
    } catch (error: any) {
      // openFDA returns a 404 (not a real error) when no label matches the search terms.
      if (error.response?.status !== 404) {
        console.error('❌ openFDA search error:', error.message);
      }
      return [];
    }
  }
}

export default new OpenFdaService();
