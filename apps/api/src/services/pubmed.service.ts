import axios from 'axios';

export interface PubMedResult {
  index: number;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi: string;
  abstract: string;
}

/**
 * Real PubMed search via NCBI's E-utilities (eutils.ncbi.nlm.nih.gov) — free, no paid tiers,
 * run by NIH/NLM. Without NCBI_API_KEY: 3 requests/sec. With one (free, instant via an NCBI
 * account): 10 requests/sec. Works fine without a key, just more rate-limited.
 *
 * Three-step flow per search: esearch (find matching PMIDs) → esummary (title/authors/journal/
 * year/DOI, as JSON) → efetch (abstracts — E-utilities has no JSON abstract field, so this pulls
 * the XML and extracts <AbstractText> directly rather than pulling in an XML parser dependency;
 * that tag's structure has been stable for decades).
 */
class PubMedService {
  private baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  private apiKey = process.env.NCBI_API_KEY;

  async search(query: string, limit: number = 5): Promise<PubMedResult[]> {
    try {
      const ids = await this.esearch(query, limit);
      if (ids.length === 0) return [];

      const [summaries, abstracts] = await Promise.all([
        this.esummary(ids),
        this.efetchAbstracts(ids),
      ]);

      return ids
        .map((id, i) => {
          const summary = summaries[id];
          if (!summary) return null;
          const doiEntry = (summary.articleids || []).find((a: any) => a.idtype === 'doi');
          return {
            index: i + 1,
            title: summary.title || 'Untitled',
            authors: (summary.authors || []).map((a: any) => a.name).filter(Boolean).join(', ') || 'Unknown authors',
            journal: summary.fulljournalname || summary.source || 'Unknown journal',
            year: (summary.pubdate || '').split(' ')[0] || 'Unknown year',
            doi: doiEntry ? `https://doi.org/${doiEntry.value}` : '',
            abstract: abstracts[id] || '',
          };
        })
        .filter((r): r is PubMedResult => r !== null);
    } catch (error: any) {
      console.error('❌ PubMed search error:', error.message);
      return [];
    }
  }

  private authParams() {
    // `tool` identifies the app to NCBI per their usage etiquette — not required, just courtesy.
    return { tool: 'clinicalfact-app', ...(this.apiKey ? { api_key: this.apiKey } : {}) };
  }

  private async esearch(query: string, limit: number): Promise<string[]> {
    const response = await axios.get(`${this.baseUrl}/esearch.fcgi`, {
      params: {
        db: 'pubmed',
        term: query,
        retmax: limit,
        retmode: 'json',
        sort: 'relevance',
        ...this.authParams(),
      },
      timeout: 10000,
    });
    return (response.data as any)?.esearchresult?.idlist || [];
  }

  private async esummary(ids: string[]): Promise<Record<string, any>> {
    const response = await axios.get(`${this.baseUrl}/esummary.fcgi`, {
      params: {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'json',
        ...this.authParams(),
      },
      timeout: 10000,
    });
    const result = (response.data as any)?.result || {};
    const out: Record<string, any> = {};
    for (const id of ids) {
      if (result[id]) out[id] = result[id];
    }
    return out;
  }

  private async efetchAbstracts(ids: string[]): Promise<Record<string, string>> {
    try {
      const response = await axios.get(`${this.baseUrl}/efetch.fcgi`, {
        params: {
          db: 'pubmed',
          id: ids.join(','),
          rettype: 'abstract',
          retmode: 'xml',
          ...this.authParams(),
        },
        timeout: 10000,
      });
      return this.parseAbstractsXml(response.data as string);
    } catch (error: any) {
      console.error('❌ PubMed efetch (abstracts) error:', error.message);
      return {};
    }
  }

  private parseAbstractsXml(xml: string): Record<string, string> {
    const out: Record<string, string> = {};
    const articleBlocks = xml.split('<PubmedArticle>').slice(1);
    for (const block of articleBlocks) {
      const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      if (!pmidMatch) continue;
      const abstractMatches = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)];
      if (abstractMatches.length === 0) continue;
      const text = abstractMatches
        .map((m) => this.decodeXmlEntities(m[1].replace(/<[^>]+>/g, '').trim()))
        .join(' ');
      out[pmidMatch[1]] = text;
    }
    return out;
  }

  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
}

export default new PubMedService();
