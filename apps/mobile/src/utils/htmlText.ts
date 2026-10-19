// Chat answers arrive as HTML. The model sometimes writes symbols as named entities ("&le;",
// "&rarr;", "&plusmn;") — React Native does not decode those, so they showed up as literal text
// ("... (typically &le; 8–10 mEq/L ...)"). Everything that shows or copies answer text decodes
// through here so it is done one way, in one place.

const NAMED_ENTITIES: Record<string, string> = {
  // markup characters
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  // punctuation
  ndash: '–', mdash: '—', hellip: '…', bull: '•', middot: '·', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  laquo: '«', raquo: '»', prime: '′', Prime: '″', dagger: '†', sect: '§', para: '¶',
  // comparison and maths — common in clinical text (doses, ranges, lab values)
  le: '≤', ge: '≥', ne: '≠', asymp: '≈', plusmn: '±', times: '×', divide: '÷', minus: '−', infin: '∞',
  radic: '√', sum: '∑', permil: '‰', deg: '°', micro: 'µ', sup1: '¹', sup2: '²', sup3: '³',
  frac12: '½', frac14: '¼', frac34: '¾',
  // arrows
  rarr: '→', larr: '←', uarr: '↑', darr: '↓', harr: '↔', rArr: '⇒', lArr: '⇐', hArr: '⇔',
  // Greek letters
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π',
  sigma: 'σ', tau: 'τ', phi: 'φ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω',
  // symbols
  copy: '©', reg: '®', trade: '™', euro: '€', pound: '£', yen: '¥', cent: '¢',
};

/**
 * Decodes HTML entities in a single pass — named ("&le;"), decimal ("&#8804;") and hex
 * ("&#x2264;"). Single pass matters: "&amp;lt;" must become the text "&lt;", not "<". Entities
 * it doesn't know are left exactly as written rather than guessed at.
 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    // Case-sensitive first ("Delta" vs "delta"), then a lower-case fallback ("&LT;").
    return NAMED_ENTITIES[body] ?? NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** HTML to plain text: tags removed first, then entities decoded (so a decoded "<" in "K < 3.5" can't be mistaken for a tag). */
export const stripHtml = (html: string): string =>
  decodeHtmlEntities(html.replace(/<[^>]+>/g, ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
