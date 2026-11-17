import fs from 'fs';
import path from 'path';
import { APP_LANGUAGES } from '../languages';

// Every language must have every string, with its placeholders, and (apart from names, units and
// the like) in its own words. English variants are allowed to match English.
const LOCALES = path.join(__dirname, '../locales');
const read = (code: string) => JSON.parse(fs.readFileSync(path.join(LOCALES, `${code}.json`), 'utf8'));

const flat = (obj: any, prefix = ''): Record<string, string> =>
  Object.entries(obj).reduce((out: Record<string, string>, [k, v]) => {
    if (v && typeof v === 'object') Object.assign(out, flat(v, `${prefix}${k}.`));
    else out[`${prefix}${k}`] = String(v);
    return out;
  }, {});

const en = flat(read('en'));
const placeholders = (s: string) => [...s.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map((m) => m[1]).sort();
const ENGLISH_VARIANTS = new Set(['en', 'en-GB', 'en-AU', 'en-CA']);
const all = APP_LANGUAGES.map((l) => l.code);
const others = all.filter((c) => !ENGLISH_VARIANTS.has(c));

describe('locale files', () => {
  test.each(all)('%s has every key of en.json', (code) => {
    const t = flat(read(code));
    expect(Object.keys(en).filter((k) => !(k in t))).toEqual([]);
  });

  test.each(others)('%s keeps every {{placeholder}}', (code) => {
    const t = flat(read(code));
    const broken = Object.keys(en).filter((k) => k in t && placeholders(en[k]).join() !== placeholders(t[k]).join());
    expect(broken).toEqual([]);
  });

  test.each(others)('%s is translated (under 8 percent of strings still identical to English)', (code) => {
    const t = flat(read(code));
    const same = Object.keys(en).filter((k) => t[k] === en[k] && /[A-Za-z]{4,}/.test(en[k])).length;
    expect(same / Object.keys(en).length).toBeLessThan(0.08);
  });

  test.each(others)('%s keeps exam names written as in English', (code) => {
    const t = flat(read(code));
    for (const [k, v] of Object.entries(en)) {
      if (/\bNCLEX\b/.test(v) && k in t) expect(t[k]).toContain('NCLEX');
    }
  });
});

describe('loadLanguageFile', () => {
  test('has a case for every supported language code', () => {
    const source = fs.readFileSync(path.join(__dirname, '../index.ts'), 'utf8');
    const missing = all.filter((c) => c !== 'en' && !source.includes(`case '${c}':`));
    expect(missing).toEqual([]);
  });
});
