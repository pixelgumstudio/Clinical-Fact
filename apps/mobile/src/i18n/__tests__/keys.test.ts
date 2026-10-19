import fs from 'fs';
import path from 'path';

// Guards for the translation system: a key typo, a missing placeholder value, or new hardcoded
// screen text would otherwise only show up on a phone, in someone's language.
//
// The hardcoded-text scan is a ratchet. Text that predates it is listed in
// hardcoded-text.baseline.json; the test fails if any NEW hardcoded text appears, and also if a
// baseline entry has been fixed but not removed — so the list can only shrink. Regenerate it
// (after moving text into the translation files) with:
//   UPDATE_HARDCODED_BASELINE=1 npx jest src/i18n/__tests__/keys.test.ts

const SRC = path.join(__dirname, '../..');
const BASELINE_FILE = path.join(__dirname, 'hardcoded-text.baseline.json');
const en = require('../locales/en.json');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const lookup = (key: string) => key.split('.').reduce((o: any, k) => (o == null ? undefined : o[k]), en);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'locales', 'data', 'node_modules'].includes(entry.name)) continue;
      sourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const parse = (file: string) =>
  parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx'] });

const isTranslateCall = (c: any) =>
  (c.type === 'Identifier' && c.name === 't') || (c.type === 'MemberExpression' && c.object.name === 'i18n' && c.property.name === 't');

describe('translation keys', () => {
  test('every literal key passed to t() / i18n.t() exists in en.json', () => {
    const missing: string[] = [];

    for (const file of sourceFiles(SRC)) {
      traverse(parse(file), {
        CallExpression(p: any) {
          if (!isTranslateCall(p.node.callee)) return;
          const keyNode = p.node.arguments[0];
          if (!keyNode || keyNode.type !== 'StringLiteral') return;
          const key = keyNode.value;
          const plural = typeof lookup(`${key}_other`) === 'string';
          if (typeof lookup(key) !== 'string' && !plural) missing.push(`${path.relative(SRC, file)}: ${key}`);
        },
        // option lists that store a key instead of text, e.g. { id: 'pdf', labelKey: 'components.exportFormat.pdf' }
        ObjectProperty(p: any) {
          const name = p.node.key.name || p.node.key.value;
          const v = p.node.value;
          if (typeof name === 'string' && /Key$/.test(name) && name !== 'storageKey' && v.type === 'StringLiteral' && /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/.test(v.value)) {
            if (typeof lookup(v.value) !== 'string') missing.push(`${path.relative(SRC, file)}: ${v.value} (${name})`);
          }
        },
      });
    }

    expect(missing).toEqual([]);
  });

  test('every {{placeholder}} in a message is given a value where the message is used', () => {
    const problems: string[] = [];

    for (const file of sourceFiles(SRC)) {
      traverse(parse(file), {
        CallExpression(p: any) {
          if (!isTranslateCall(p.node.callee)) return;
          const keyNode = p.node.arguments[0];
          if (!keyNode || keyNode.type !== 'StringLiteral') return;
          const opts = p.node.arguments[1];
          const supplied = new Set<string>();
          let spread = false;
          if (opts && opts.type === 'ObjectExpression') {
            for (const pr of opts.properties) {
              if (pr.type === 'SpreadElement') spread = true;
              else if (pr.key) supplied.add(pr.key.name || pr.key.value);
            }
          }
          let msg = lookup(keyNode.value);
          if (typeof msg !== 'string' && supplied.has('count')) msg = lookup(`${keyNode.value}_other`);
          if (typeof msg !== 'string' || spread) return;
          const needs = [...msg.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map((m: any) => m[1]);
          const missing = needs.filter((n: string) => !supplied.has(n));
          if (missing.length) problems.push(`${path.relative(SRC, file)}:${p.node.loc.start.line} ${keyNode.value} needs ${missing.join(', ')}`);
        },
      });
    }

    expect(problems).toEqual([]);
  });
});

describe('no hardcoded screen text', () => {
  // Props whose value is shown to the user.
  const TEXT_PROP = /^(placeholder|title|label|subtitle|description|message|caption|hint|text)$|(Label|Title|Text|Message|Placeholder|Subtitle|Description|Hint|Caption|Heading)$/;
  // Object properties that hold display text (alert configs, option lists, step definitions).
  const TEXT_KEY = new Set(['question', 'heading', 'title', 'subtitle', 'label', 'message', 'description', 'placeholder', 'buttonText', 'headline', 'body', 'text', 'cta']);
  // Calls whose first arguments are text shown to the user.
  const TEXT_CALLS = new Set(['showAlert', 'setToastMessage', 'showToast', 'toast']);
  // Not display text, or deliberately untranslated.
  const ALLOW = new Set(['i18n/languages.ts']);
  // Deliberate exceptions: identifiers that merely look like text.
  const ALLOWED_ENTRIES = new Set([
    'services/revenuecat.ts|var|Clinical Fact Pro', // RevenueCat entitlement id
    'services/revenuecat.ts|cond|has no packages for this store', // developer log message, never shown
    'services/revenuecat.ts|cond|was not in Purchases.getOfferings()',
  ]);

  const hasWords = (s: string) => /[A-Za-z]{3,}/.test(s);
  // Looks like an identifier / path / url / file name rather than prose.
  const isCodeLike = (s: string) => /^[a-z0-9_.:/#@-]+$/.test(s) || /^https?:/.test(s) || /^[A-Z0-9_]+$/.test(s) || /\.[a-z0-9]{2,4}$/.test(s);
  const textOf = (n: any): string | null => {
    if (!n) return null;
    if (n.type === 'StringLiteral') return n.value;
    if (n.type === 'TemplateLiteral') return n.quasis.map((q: any) => q.value.cooked).join('…');
    return null;
  };
  // Proper nouns and file formats are written the same in every language.
  const PROPER = new Set(['OpenAI', 'Groq', 'Tavily', 'YouTube', 'Gemini', 'Google', 'Apple', 'PubMed', 'NIH', 'CDC', 'WHO', 'PDF', 'DOCX', 'DOC', 'TXT', 'RTF', 'PRO', 'AI']);
  const isBrand = (s: string) => /^clinical ?fact$/i.test(s.trim()) || PROPER.has(s.trim());
  // HTML / RTF / CSS built in code (e.g. note export templates) is not display text.
  const looksLikeMarkup = (s: string) => /^\s*(<|\{\\)|<\/[a-z]|[{;]\s*[a-z-]+\s*:\s*[^;]+;/i.test(s);
  const isProse = (s: string | null) => !!s && hasWords(s) && !isBrand(s) && !isCodeLike(s) && !looksLikeMarkup(s) && (/\s/.test(s) || /^[A-Z]/.test(s));
  // For return values, variables and conditional branches a lone capitalised word is far more
  // likely to be a route or enum name ('Home', 'Intro') than text, so those need to be a phrase.
  const isPhrase = (s: string | null) => isProse(s) && /\s/.test(s!.trim());

  /** Every piece of hardcoded display text, as "file|kind|text" (no line numbers, so the
   *  baseline doesn't churn when code moves). */
  function findHardcoded(): string[] {
    const found: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const rel = path.relative(SRC, file).split(path.sep).join('/');
      if (ALLOW.has(rel) || /\.styles\.ts$/.test(rel)) continue;
      const add = (kind: string, text: string) => found.push(`${rel}|${kind}|${text.replace(/\s+/g, ' ').trim().slice(0, 70)}`);

      traverse(parse(file), {
        JSXText(p: any) {
          const text = p.node.value.replace(/\s+/g, ' ').trim();
          if (/\.[a-z0-9]{2,4}$/.test(text)) return; // a sample file name, not words
          if (isBrand(text)) return; // the brand name stays as written
          if (hasWords(text)) add('jsx', text);
        },
        JSXExpressionContainer(p: any) {
          // {'Some text'} written as a literal inside JSX
          if (p.parent.type === 'JSXElement' && isProse(textOf(p.node.expression))) add('jsx', textOf(p.node.expression)!);
        },
        JSXAttribute(p: any) {
          const name = p.node.name.name;
          if (typeof name !== 'string' || !TEXT_PROP.test(name)) return;
          const v = p.node.value;
          const text = v && v.type === 'JSXExpressionContainer' ? textOf(v.expression) : textOf(v);
          if (isProse(text)) add(`prop:${name}`, text!);
        },
        ConditionalExpression(p: any) {
          for (const branch of [p.node.consequent, p.node.alternate]) {
            const text = textOf(branch);
            if (isPhrase(text)) add('cond', text!);
          }
        },
        ReturnStatement(p: any) {
          const text = textOf(p.node.argument);
          if (isPhrase(text)) add('return', text!);
        },
        VariableDeclarator(p: any) {
          const text = textOf(p.node.init);
          if (isPhrase(text)) add('var', text!);
        },
        LogicalExpression(p: any) {
          const text = textOf(p.node.right);
          if (isPhrase(text)) add('cond', text!);
        },
        ObjectProperty(p: any) {
          const key = p.node.key.name || p.node.key.value;
          if (!TEXT_KEY.has(key)) return;
          const text = textOf(p.node.value);
          if (isProse(text)) add(`obj:${key}`, text!);
        },
        CallExpression(p: any) {
          const c = p.node.callee;
          const isAlert = c.type === 'MemberExpression' && c.object.name === 'Alert' && c.property.name === 'alert';
          const callName = c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' ? c.property.name : '';
          if (!isAlert && !TEXT_CALLS.has(callName)) return;
          p.node.arguments.slice(0, 3).forEach((a: any) => {
            const text = textOf(a);
            if (text && hasWords(text)) add(isAlert ? 'alert' : `call:${callName}`, text);
          });
        },
      });
    }

    return found.filter((entry) => !ALLOWED_ENTRIES.has(entry));
  }

  const count = (items: string[]) => items.reduce((m, s) => m.set(s, (m.get(s) || 0) + 1), new Map<string, number>());

  test('screens, modals, toasts and alerts get their text from the translation files', () => {
    const found = findHardcoded();

    if (process.env.UPDATE_HARDCODED_BASELINE) {
      fs.writeFileSync(BASELINE_FILE, JSON.stringify([...found].sort(), null, 2) + '\n');
      return;
    }

    const baseline: string[] = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    const foundCount = count(found);
    const baseCount = count(baseline);

    const added: string[] = [];
    const fixed: string[] = [];
    for (const [entry, n] of foundCount) if (n > (baseCount.get(entry) || 0)) added.push(entry);
    for (const [entry, n] of baseCount) if (n > (foundCount.get(entry) || 0)) fixed.push(entry);

    // New text must go through t(); text that has been fixed must come off the baseline.
    expect({ newHardcodedText: added, fixedButStillInBaseline: fixed }).toEqual({ newHardcodedText: [], fixedButStillInBaseline: [] });
  });
});
