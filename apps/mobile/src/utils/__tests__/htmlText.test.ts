import { decodeHtmlEntities, stripHtml } from '../htmlText';

describe('decodeHtmlEntities', () => {
  test('decodes the symbols that showed up as text in chat answers', () => {
    expect(decodeHtmlEntities('(typically &le; 8–10 mEq/L in 24 hours)')).toBe('(typically ≤ 8–10 mEq/L in 24 hours)');
    expect(decodeHtmlEntities('urine output &ge; 30 mL/hr')).toBe('urine output ≥ 30 mL/hr');
  });

  test.each([
    ['&plusmn;5 mmHg', '±5 mmHg'],
    ['2 &times; 10', '2 × 10'],
    ['37&deg;C', '37°C'],
    ['K&rarr;Na', 'K→Na'],
    ['&alpha;-blocker, &beta;-blocker', 'α-blocker, β-blocker'],
    ['&Delta; and &delta;', 'Δ and δ'],
    ['5 &ndash; 10', '5 – 10'],
    ['it&rsquo;s', 'it’s'],
    ['a&nbsp;b', 'a b'],
    ['Fish &amp; chips', 'Fish & chips'],
    ['&quot;quoted&quot;', '"quoted"'],
  ])('named entity: %s', (input, expected) => {
    expect(decodeHtmlEntities(input)).toBe(expected);
  });

  test('decodes decimal and hex numeric entities', () => {
    expect(decodeHtmlEntities('&#8804; and &#x2265;')).toBe('≤ and ≥');
    expect(decodeHtmlEntities('&#39;')).toBe("'");
  });

  test('decodes once, so an escaped entity stays as text', () => {
    expect(decodeHtmlEntities('&amp;lt;')).toBe('&lt;');
    expect(decodeHtmlEntities('&amp;le;')).toBe('&le;');
  });

  test('leaves unknown or malformed entities exactly as written', () => {
    expect(decodeHtmlEntities('&notarealentity; & &le')).toBe('&notarealentity; & &le');
    expect(decodeHtmlEntities('&#99999999999;')).toBe('&#99999999999;');
    expect(decodeHtmlEntities('AT&T')).toBe('AT&T');
  });

  test('leaves plain text untouched', () => {
    expect(decodeHtmlEntities('No entities here, just 5 < 6 and 7 > 3.')).toBe('No entities here, just 5 < 6 and 7 > 3.');
  });
});

describe('stripHtml', () => {
  test('removes tags and decodes entities', () => {
    expect(stripHtml('<p>Give <b>10 mg</b> if K+ &lt; 3.5 &amp; Mg &le; 1.2</p>')).toBe('Give 10 mg if K+ < 3.5 & Mg ≤ 1.2');
  });

  test('a decoded "<" in the text is not treated as the start of a tag', () => {
    // Decoding first would let "< 3.5 and Na >" look like a tag and delete the words between.
    expect(stripHtml('<p>Hypokalemia is K &lt; 3.5 and hypernatremia is Na &gt; 145</p>')).toBe(
      'Hypokalemia is K < 3.5 and hypernatremia is Na > 145'
    );
  });

  test('collapses runs of blank lines and trims', () => {
    expect(stripHtml('  <p>a</p>\n\n\n\n<p>b</p>  ')).toBe('a\n\nb');
  });
});
