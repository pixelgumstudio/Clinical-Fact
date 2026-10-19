#!/usr/bin/env node
/**
 * Fills in whatever is missing from the translation files, using Gemini, from en.json.
 *
 *   node scripts/translate-missing.js                         every locale, every missing key
 *   node scripts/translate-missing.js --only-prefix auth.languageSelect
 *   node scripts/translate-missing.js --locales fr,es,hi      only these locales
 *   node scripts/translate-missing.js --dry-run               report what would be translated
 *   node scripts/translate-missing.js --fix-existing          also redo existing translations that are broken
 *   node scripts/translate-missing.js --force --only-prefix a.b   redo these keys even if translated (after changing the English)
 *
 * By default only keys that are absent from a locale are translated — existing translations are never
 * overwritten. English variants (en-GB, en-AU, en-CA) just copy the English text. Every
 * result is checked before it is written: same keys back, no empty values, and exactly the
 * same {{placeholders}} as the English. Anything that fails twice is reported and skipped.
 *
 * Needs GEMINI_API_KEY (environment, or apps/api/.env).
 */
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const LANGUAGES_TS = path.join(__dirname, '../src/i18n/languages.ts');
const MODEL = process.env.TRANSLATE_MODEL || 'gemini-3.8-flash';

// ── arguments ─────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ONLY_PREFIX = option('only-prefix', '');
const ONLY_LOCALES = option('locales', '') ? option('locales', '').split(',') : null;
const DRY_RUN = flag('dry-run');
const FIX_EXISTING = flag('fix-existing');
const FORCE = flag('force');
const REVERSE = flag('reverse'); // start from the last language, so two runs can meet in the middle
// Translation needs little reasoning; capping it makes each batch several times faster.
const THINKING = option('thinking', 'low');
const CONCURRENCY = Number(option('concurrency', '4'));
const BATCH_SIZE = Number(option('batch', '60'));

function loadApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const env = fs.readFileSync(path.join(__dirname, '../../api/.env'), 'utf8');
    const match = env.match(/^GEMINI_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    /* fall through */
  }
  return null;
}

// ── json helpers (files are 2-space JSON; keep each file's own line endings) ────────────
const readLocale = (file) => {
  const raw = fs.readFileSync(file, 'utf8');
  return { json: JSON.parse(raw.replace(/\r\n/g, '\n')), crlf: raw.includes('\r\n'), endsWithNewline: raw.endsWith('\n') };
};
const writeLocale = (file, json, { crlf, endsWithNewline }) => {
  let out = JSON.stringify(json, null, 2) + (endsWithNewline ? '\n' : '');
  if (crlf) out = out.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, out);
};
const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isObject(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};
/**
 * Adds the missing leaves to `locale` without disturbing it: existing keys keep their order and
 * values, and new keys are appended to the end of their parent object (created if needed), so
 * a run produces a small, reviewable diff.
 */
const addMissing = (locale, filled) => {
  const out = JSON.parse(JSON.stringify(locale));
  for (const [flatKey, value] of Object.entries(filled)) {
    const parts = flatKey.split('.');
    let node = out;
    for (const part of parts.slice(0, -1)) {
      if (!isObject(node[part])) node[part] = {};
      node = node[part];
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
};

// Brand name must stay exactly as written in every language (older machine translations
// translated it, lower-cased it, or swapped in another app's name).
const BRAND = 'Clinical Fact';
// A string identical to the English one that still has real words in it (outside placeholders,
// the brand name and PRO/AI) was never translated — e.g. "{{current}} of {{total}}".
const LANGUAGE_NEUTRAL = new Set(['PRO', 'AI', 'OK']);
const isUntranslated = (english, translated) => {
  if (translated !== english) return false;
  const words = english.replace(/\{\{[^}]+\}\}/g, '').replace(BRAND, '').replace(/[^A-Za-z]/g, '');
  return words.length >= 2 && !LANGUAGE_NEUTRAL.has(words);
};
const isBroken = (english, translated, code) =>
  placeholders(english) !== placeholders(translated) ||
  (english.includes(BRAND) && !String(translated).includes(BRAND)) ||
  (!code.startsWith('en-') && isUntranslated(english, translated));

const placeholders = (text) => [...String(text).matchAll(/\{\{\s*[\w.]+\s*\}\}/g)].map((m) => m[0].replace(/\s+/g, '')).sort().join('|');

// ── language names (English names come from the app's own language list) ─────────────────
function languageNames() {
  const src = fs.readFileSync(LANGUAGES_TS, 'utf8');
  const names = {};
  for (const m of src.matchAll(/code:\s*'([A-Za-z-]+)',\s*name:\s*'([^']+)'/g)) names[m[1]] = m[2];
  return names;
}

// ── translation ────────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildPrompt(languageName, entries) {
  return (
    `You are a professional app-localisation specialist. Translate the English UI strings below into ${languageName}.\n` +
    'The app is "Clinical Fact", a study app for nursing and medical students: notes, quizzes, flashcards, and an AI chat about clinical material.\n\n' +
    'Rules:\n' +
    '- Keep every {{placeholder}} exactly as written (same name, same braces). Keep any HTML or markdown tags.\n' +
    '- Keep "Clinical Fact", "PRO" and "AI" unchanged. Do not translate numbers or emoji.\n' +
    '- Use natural, concise wording suited to buttons, labels and alerts — how a native speaker would see it in a polished app, not a literal word-for-word rendering.\n' +
    '- Use the established clinical terminology a nursing or medical student in that language would use.\n' +
    '- Use the standard friendly register for apps in that language.\n' +
    '- Keep similar length where possible (strings must fit in buttons).\n' +
    '- Return ONLY a JSON object with exactly the same keys, each mapped to its translation.\n\n' +
    JSON.stringify(entries, null, 2)
  );
}

async function translateBatch(ai, languageName, entries) {
  let lastError = 'unknown';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: MODEL,
        contents: buildPrompt(languageName, entries),
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 65536,
          ...(/^gemini-3/.test(MODEL) && THINKING !== 'default' ? { thinkingConfig: { thinkingLevel: THINKING.toUpperCase() } } : {}),
        },
      });
      const parsed = JSON.parse(String(result.text || '{}'));
      const bad = [];
      const good = {};
      for (const [key, english] of Object.entries(entries)) {
        const t = parsed[key];
        if (typeof t !== 'string' || !t.trim()) bad.push(`${key}: missing/empty`);
        else if (placeholders(t) !== placeholders(english)) bad.push(`${key}: placeholders differ`);
        else if (english.includes(BRAND) && !t.includes(BRAND)) bad.push(`${key}: brand name changed`);
        else good[key] = t;
      }
      if (bad.length === 0) return { good, failed: [] };
      lastError = bad.slice(0, 3).join('; ');
      if (attempt === 3) return { good, failed: bad };
    } catch (error) {
      lastError = error.message;
    }
    await sleep(1500 * attempt);
  }
  return { good: {}, failed: [`batch failed: ${lastError}`] };
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey && !DRY_RUN) {
    console.error('GEMINI_API_KEY is not set (environment or apps/api/.env).');
    process.exit(1);
  }
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  const names = languageNames();
  const enFile = path.join(LOCALES_DIR, 'en.json');
  const en = readLocale(enFile).json;
  const enFlat = flatten(en);

  const locales = fs
    .readdirSync(LOCALES_DIR)
    .map((f) => f.replace('.json', ''))
    .filter((code) => code !== 'en' && (!ONLY_LOCALES || ONLY_LOCALES.includes(code)))
    .sort();
  if (REVERSE) locales.reverse();

  const summary = [];
  const queue = [...locales];

  const worker = async () => {
    while (queue.length) {
      const code = queue.shift();
      const file = path.join(LOCALES_DIR, `${code}.json`);
      const loaded = readLocale(file);
      const have = flatten(loaded.json);
      const missing = Object.keys(enFlat).filter(
        (k) => k.startsWith(ONLY_PREFIX) && (!(k in have) || (FORCE && ONLY_PREFIX) || (FIX_EXISTING && isBroken(enFlat[k], have[k], code)))
      );
      if (missing.length === 0) {
        summary.push({ code, missing: 0, filled: 0, failed: 0 });
        continue;
      }
      if (DRY_RUN) {
        summary.push({ code, missing: missing.length, filled: 0, failed: 0 });
        continue;
      }

      const filled = {};
      const failures = [];
      if (code.startsWith('en-')) {
        for (const k of missing) filled[k] = enFlat[k]; // English variants: same text
      } else {
        for (let i = 0; i < missing.length; i += BATCH_SIZE) {
          const chunk = Object.fromEntries(missing.slice(i, i + BATCH_SIZE).map((k) => [k, enFlat[k]]));
          const { good, failed } = await translateBatch(ai, names[code] || code, chunk);
          Object.assign(filled, good);
          failures.push(...failed);
        }
      }

      writeLocale(file, addMissing(loaded.json, filled), loaded);
      summary.push({ code, missing: missing.length, filled: Object.keys(filled).length, failed: failures.length, failures });
      console.log(`${code}: filled ${Object.keys(filled).length}/${missing.length}${failures.length ? `, ${failures.length} failed` : ''}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));

  const totalMissing = summary.reduce((s, r) => s + r.missing, 0);
  const totalFilled = summary.reduce((s, r) => s + r.filled, 0);
  const failedLocales = summary.filter((r) => r.failed > 0);
  console.log(`\n${DRY_RUN ? 'DRY RUN — ' : ''}${locales.length} locales, ${totalMissing} missing strings${DRY_RUN ? '' : `, ${totalFilled} translated`}.`);
  for (const r of failedLocales) console.log(`  ${r.code}: ${r.failed} failed (${r.failures.slice(0, 2).join(' | ')})`);
  if (failedLocales.length) process.exitCode = 2;
}

main();
