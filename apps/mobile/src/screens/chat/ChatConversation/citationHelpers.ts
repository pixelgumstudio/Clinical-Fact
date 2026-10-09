import { MedicalChatSource } from '../../../services/api';

const CITATION_MARKER = /\[(\d+)\]/g;

/** Removes "[n]" citation markers from a block's raw text so they never render as literal
 *  bracketed numbers — the matching source is instead surfaced as a pill (see CitationPillsRow). */
export const stripCitationMarkers = (html: string): string => html.replace(CITATION_MARKER, '').trim();

/** Which sources a single RichText block's "[n]" markers refer to, in the same relative order
 *  as `sources` (not marker-appearance order) so grouping/pill labels stay stable. Markers with
 *  no matching entry (off-by-one or hallucinated numbering) are silently dropped rather than
 *  shown as a broken pill. */
export const citationsForBlock = (html: string, sources: MedicalChatSource[]): MedicalChatSource[] => {
  const indices = new Set(Array.from(html.matchAll(CITATION_MARKER), (m) => Number(m[1])));
  if (indices.size === 0) return [];
  return sources.filter((s) => indices.has(s.index));
};

const hasRealJournal = (s: MedicalChatSource) => !!s.journal && !/^unknown/i.test(s.journal);
const hasRealYear = (s: MedicalChatSource) => !!s.year && !/^unknown/i.test(s.year);

const pillLabelFor = (s: MedicalChatSource): string => {
  if (s.type === 'drug_label') return 'FDA';
  if (s.type === 'attached') return 'Attached';
  return hasRealJournal(s) ? s.journal! : (s.provider || 'Source');
};

/** Groups sources by pillLabelFor for the pill row ("Journal +N" / "FDA +N" / "Attached +N"). */
export const groupSourcesForPills = (sources: MedicalChatSource[]) => {
  const byKey = new Map<string, MedicalChatSource[]>();
  sources.forEach((s) => {
    const key = pillLabelFor(s);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(s);
  });
  return Array.from(byKey.entries()).map(([label, group]) => ({
    label: group.length > 1 ? `${label} +${group.length - 1}` : label,
    sources: group,
  }));
};

/** Meta line for a citation card ("Journal · Year" for literature, a fixed tag for the other
 *  two types) — omits journal/year when they're the generic "Unknown ..." placeholder and
 *  falls back to the provider name instead of showing "Unknown journal · Unknown year" verbatim. */
export const formatSourceMeta = (source: MedicalChatSource): string => {
  if (source.type === 'drug_label') return 'FDA drug label';
  if (source.type === 'attached') return 'From your attached material';
  const parts = [
    hasRealJournal(source) ? source.journal : null,
    hasRealYear(source) ? source.year : null,
  ].filter((p): p is string => !!p);
  if (parts.length === 0) return source.provider || '';
  return parts.join(' · ');
};
