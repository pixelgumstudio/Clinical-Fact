import { MedicalChatGroundingSource, MedicalChatSource } from '../../../services/api';
import i18n from '../../../i18n';

/** "[1]", "[2]" and lists like "[1, 3]" / "[2-4]". */
const CITATION_MARKER = /\s*\[\d+(?:\s*[,\u2013-]\s*\d+)*\]/g;

/** Removes citation markers from a block's raw text so they never render as literal bracketed
 *  numbers — every source is listed in the sources card under the answer instead. The space that
 *  sat before a marker goes with it, so "differ entirely [1]: ..." reads "differ entirely: ..."
 *  and not "differ entirely : ...". */
export const stripCitationMarkers = (html: string): string => html.replace(CITATION_MARKER, '').trim();

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
