import axios from 'axios';

export interface WikimediaImageResult {
  url: string;
  title: string;
  contextUrl: string;
  license?: string;
  attribution?: string;
  attributionRequired: boolean;
}

const stripHtml = (value?: string): string | undefined =>
  value ? value.replace(/<[^>]+>/g, '').trim() || undefined : undefined;

class WikimediaImageSearchService {
  private apiUrl = 'https://commons.wikimedia.org/w/api.php';
  // Wikimedia's API usage policy requires a descriptive User-Agent identifying the app and a contact point.
  private userAgent = 'Clinical Fact/1.0 (https://clinicalfact.com; support@clinicalfact.com) medical-reference-app';

  /**
   * @param excludeUrls Thumbnail URLs already shown earlier in this same chat session — filtered
   * out of the results so the same image doesn't reappear across multiple answers. Since every
   * call requests the same iiurlwidth (500), the same source file always resolves to the same
   * thumburl string, so a plain string match is reliable here (no fuzzy matching needed).
   */
  async search(query: string, limit: number = 6, excludeUrls: string[] = []): Promise<WikimediaImageResult[]> {
    try {
      // Fetch extra candidates so that filtering out excluded/duplicate/broken results still
      // leaves close to `limit` — Commons' own relevance ranking degrades past ~10 anyway.
      const searchLimit = Math.min(limit + excludeUrls.length + 3, 10);
      const searchResponse = await axios.get(this.apiUrl, {
        params: {
          action: 'query',
          list: 'search',
          // filetype:bitmap|drawing excludes videos/PDFs/audio that also live in the File namespace —
          // verified live (2026-07-25): without this, results included a .pdf and a .ogv video.
          // Do NOT append extra keywords like "medical" here — verified live that it over-constrains
          // Commons' literal keyword search and kills otherwise-good results (e.g. "warfarin synthesis"
          // diagrams disappeared entirely once "medical" was added). The raw question works well as-is.
          srsearch: `${query} filetype:bitmap|drawing`,
          srnamespace: 6, // File namespace
          format: 'json',
          srlimit: searchLimit,
        },
        headers: { 'User-Agent': this.userAgent },
        timeout: 8000,
      });

      const searchResults = (searchResponse.data as any)?.query?.search || [];
      if (searchResults.length === 0) {
        return [];
      }

      const titles = searchResults.map((r: any) => r.title).join('|');

      const infoResponse = await axios.get(this.apiUrl, {
        params: {
          action: 'query',
          titles,
          prop: 'imageinfo',
          iiprop: 'url|extmetadata',
          // A lot of Commons' best anatomical diagrams (e.g. the LadyofHats skeleton series)
          // are SVGs — React Native's <Image> can't render SVG at all (blank/broken image),
          // and the original files can also just be huge. Requesting a width makes MediaWiki
          // rasterize/resize server-side and return a `thumburl` (PNG) that's always safe to
          // display, for every file type — verified live (2026-07-27) against a real SVG file.
          iiurlwidth: 500,
          format: 'json',
        },
        headers: { 'User-Agent': this.userAgent },
        timeout: 8000,
      });

      const pages = (infoResponse.data as any)?.query?.pages || {};
      const excludeSet = new Set(excludeUrls);
      const seenUrls = new Set<string>();

      const results: WikimediaImageResult[] = Object.values(pages)
        .map((page: any) => {
          const info = page?.imageinfo?.[0];
          if (!info?.url) return null;

          const url = info.thumburl || info.url;
          if (excludeSet.has(url) || seenUrls.has(url)) return null;
          seenUrls.add(url);

          const meta = info.extmetadata || {};
          const title = stripHtml(meta.ObjectName?.value) || (page.title || '').replace(/^File:/, '');
          const attribution = stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value);

          const result: WikimediaImageResult = {
            url,
            title,
            contextUrl: info.descriptionurl || '',
            license: meta.LicenseShortName?.value,
            attribution,
            attributionRequired: meta.AttributionRequired?.value === 'true',
          };
          return result;
        })
        .filter((r): r is WikimediaImageResult => r !== null)
        .slice(0, limit);

      return results;
    } catch (error: any) {
      console.error('❌ Wikimedia Commons image search error:', error.message);
      return [];
    }
  }
}

export default new WikimediaImageSearchService();
