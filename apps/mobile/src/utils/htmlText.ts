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

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ',
};
const SUBSCRIPT: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', h: 'ₕ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', p: 'ₚ', s: 'ₛ', t: 'ₜ',
};
const LATEX_SYMBOLS: Record<string, string> = {
  rightarrow: '→', to: '→', leftarrow: '←', leftrightarrow: '↔', uparrow: '↑', downarrow: '↓',
  geq: '≥', ge: '≥', leq: '≤', le: '≤', neq: '≠', approx: '≈', pm: '±', times: '×', cdot: '·', degree: '°',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', mu: 'μ', sigma: 'σ', pi: 'π', theta: 'θ', lambda: 'λ',
};

/** Maps every character through `table`, or returns null when one has no Unicode form. */
const mapAll = (text: string, table: Record<string, string>): string | null => {
  let out = '';
  for (const ch of text) {
    const mapped = table[ch];
    if (mapped === undefined) return null;
    out += mapped;
  }
  return out;
};

/**
 * The model sometimes writes chemistry as LaTeX ("$Na^+$", "$Mg^{2+}$", "$HCO_3^-$"), which React
 * Native shows literally. Inside a $...$ span that really is math (has ^, _ or a backslash command),
 * this turns superscripts/subscripts and common symbols into Unicode (Na⁺, Mg²⁺, HCO₃⁻, →, ≥) and drops
 * the dollar signs. Plain dollar amounts ("$5 and $10") are left alone.
 */
export function latexToUnicode(text: string): string {
  return text.replace(/\$([^$\n]{1,80})\$/g, (match, inner: string) => {
    if (!/[\^_\\]/.test(inner)) return match;
    let out = inner
      .replace(/\\(?:text|mathrm|mathbf|textbf|ce)\{([^}]*)\}/g, '$1')
      .replace(/\\([A-Za-z]+)/g, (m, name: string) => LATEX_SYMBOLS[name] ?? m);
    out = out.replace(/\^\{([^}]*)\}|\^(.)/g, (m, braced: string | undefined, single: string | undefined) => {
      const body = braced ?? single ?? '';
      return mapAll(body, SUPERSCRIPT) ?? `^${body}`;
    });
    out = out.replace(/_\{([^}]*)\}|_(.)/g, (m, braced: string | undefined, single: string | undefined) => {
      const body = braced ?? single ?? '';
      return mapAll(body, SUBSCRIPT) ?? `_${body}`;
    });
    return out.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  });
}

/** Everything that turns an answer's text into what the user reads: entities decoded, LaTeX replaced. */
export const renderAnswerText = (text: string): string => latexToUnicode(decodeHtmlEntities(text));

/** HTML to plain text: tags removed first, then entities decoded (so a decoded "<" in "K < 3.5" can't be mistaken for a tag). */
export const stripHtml = (html: string): string =>
  renderAnswerText(html.replace(/<[^>]+>/g, ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
