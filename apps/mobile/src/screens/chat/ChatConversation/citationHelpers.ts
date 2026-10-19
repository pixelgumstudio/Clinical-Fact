import { MedicalChatGroundingSource, MedicalChatSource } from '../../../services/api';
import i18n from '../../../i18n';

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

/** "nature.com" from "https://www.nature.com/articles/x" — no URL parsing API, since React Native's URL is incomplete. */
export const hostnameOf = (uri: string): string =>
  uri.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i)?.[1].replace(/^www\./i, '') ?? '';

export const MAX_SOURCE_CHIPS = 3;

/**
 * What the compact sources row shows under an answer: the first few sources by name (distinct names
 * first, so it never reads "PubMed PubMed PubMed") and how many more there are. Web sources count
 * as sources too and are named by their site.
 */
export const buildSourceChips = (
  sources: MedicalChatSource[] = [],
  webSources: MedicalChatGroundingSource[] = []
): { visible: { key: string; label: string }[]; more: number; total: number } => {
  const all = [
    ...sources.map((s) => ({ key: `c-${s.index}`, label: pillLabelFor(s) })),
    ...webSources.map((w, i) => ({ key: `w-${i}`, label: hostnameOf(w.uri) || w.title })),
  ];
  const seen = new Set<string>();
  const visible: { key: string; label: string }[] = [];
  for (const item of all) {
    if (visible.length >= MAX_SOURCE_CHIPS) break;
    if (seen.has(item.label)) continue;
    seen.add(item.label);
    visible.push(item);
  }
  return { visible, more: all.length - visible.length, total: all.length };
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
    label: group.length > 1 ? i18n.t('chat.citationHelpers.text', { label, value: group.length - 1 }) : label,
    sources: group,
  }));
};

/** Meta line for a citation card ("Journal · Year" for literature, a fixed tag for the other
 *  two types) — omits journal/year when they're the generic "Unknown ..." placeholder and
 *  falls back to the provider name instead of showing "Unknown journal · Unknown year" verbatim. */
export const formatSourceMeta = (source: MedicalChatSource): string => {
  if (source.type === 'drug_label') return i18n.t('chat.citationHelpers.fdaDrugLabel');
  if (source.type === 'attached') return i18n.t('chat.citationHelpers.fromYourAttachedMaterial');
  const parts = [
    hasRealJournal(source) ? source.journal : null,
    hasRealYear(source) ? source.year : null,
  ].filter((p): p is string => !!p);
  if (parts.length === 0) return source.provider || '';
  return parts.join(' · ');
};
