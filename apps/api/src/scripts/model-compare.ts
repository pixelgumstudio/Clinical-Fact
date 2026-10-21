// Compares Gemini models on realistic study questions: answer text, time to first word, tokens and cost.
// Run: npx ts-node --transpile-only src/scripts/model-compare.ts [modelA] [modelB]
// (If Node times out reaching Google, add NODE_OPTIONS=--dns-result-order=ipv4first)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const [modelA = 'gemini-3.8-flash', modelB = 'gemini-3.1-flash-lite'] = process.argv.slice(2);

// USD per 1M tokens (input / output), from ai.google.dev/gemini-api/docs/pricing.
const PRICES: Record<string, [number, number]> = {
  'gemini-3.8-flash': [0.75, 3.75],
  'gemini-3.5-flash-lite': [0.3, 2.5],
  'gemini-3.1-flash-lite': [0.25, 1.5],
  'gemini-2.5-flash': [0.3, 2.5],
  'gemini-2.5-flash-lite': [0.1, 0.4],
};

const QUESTIONS = [
  'Explain the pathophysiology of diabetic ketoacidosis and its nursing management.',
  'What is the starting dose and maximum dose of IV furosemide for acute pulmonary edema in an adult?',
  'A 65-year-old presents with crushing chest pain, ST elevation in leads II, III and aVF. What is the diagnosis, which artery is likely involved, and what is the immediate management?',
  'Why does hypomagnesemia cause refractory hypokalemia and hypocalcemia?',
  'How do you differentiate delirium from dementia at the bedside?',
  'Compare loop diuretics and thiazides: mechanism, site of action, electrolyte effects and common indications.',
  'What are the signs of digoxin toxicity and how is it treated?',
  'Explain the Glasgow Coma Scale and how to score a patient who opens eyes to pain, says inappropriate words and withdraws from pain.',
  'What is the difference between Type 1 and Type 2 hypersensitivity reactions? Give examples.',
  'List the contraindications to thrombolysis in acute ischemic stroke.',
];

const SYSTEM =
  'You are Clinical Fact, an expert clinical tutor for nursing and medical students. Answer accurately and completely for the depth the question needs, structured for a phone screen, as HTML (<p>, <h3>, <ul><li>, <b>). Use exact figures where they exist and say when something varies by guideline. Use Unicode for chemistry (Na⁺, Mg²⁺), never LaTeX.';

async function run(ai: GoogleGenAI, model: string, question: string) {
  const t0 = performance.now();
  let first = 0;
  let text = '';
  let usage: any;
  const config: any = { systemInstruction: SYSTEM };
  if (/^gemini-3/.test(model)) config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  const stream = await ai.models.generateContentStream({ model, contents: question, config });
  for await (const chunk of stream) {
    if (chunk.usageMetadata) usage = chunk.usageMetadata;
    if (chunk.text) {
      if (!first) first = performance.now() - t0;
      text += chunk.text;
    }
  }
  const inTok = usage?.promptTokenCount ?? 0;
  const outTok = (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);
  const [pin, pout] = PRICES[model] ?? [0, 0];
  return { text, firstMs: first, totalMs: performance.now() - t0, inTok, outTok, cost: (inTok * pin + outTok * pout) / 1e6 };
}

(async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const rows: string[] = [];
  const totals: Record<string, { cost: number; first: number; total: number; chars: number }> = {
    [modelA]: { cost: 0, first: 0, total: 0, chars: 0 },
    [modelB]: { cost: 0, first: 0, total: 0, chars: 0 },
  };
  let md = `# Model comparison: ${modelA} vs ${modelB}\n\n`;

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    md += `## Q${i + 1}. ${q}\n\n`;
    for (const model of [modelA, modelB]) {
      try {
        const r = await run(ai, model, q);
        const t = totals[model];
        t.cost += r.cost; t.first += r.firstMs; t.total += r.totalMs; t.chars += r.text.length;
        rows.push(`Q${i + 1} ${model.padEnd(24)} first ${r.firstMs.toFixed(0).padStart(5)}ms  total ${r.totalMs.toFixed(0).padStart(6)}ms  in ${r.inTok} out ${r.outTok}  $${r.cost.toFixed(4)}  ${r.text.length} chars`);
        md += `### ${model} — ${r.firstMs.toFixed(0)}ms to first word, ${r.outTok} output tokens, $${r.cost.toFixed(4)}\n\n${r.text}\n\n`;
      } catch (e: any) {
        rows.push(`Q${i + 1} ${model.padEnd(24)} ERROR ${e.status ?? ''} ${String(e.message).slice(0, 100)}`);
        md += `### ${model} — ERROR: ${String(e.message).slice(0, 200)}\n\n`;
      }
    }
  }

  console.log(rows.join('\n'));
  console.log('\nAVERAGES per question:');
  for (const m of [modelA, modelB]) {
    const t = totals[m], n = QUESTIONS.length;
    console.log(`${m.padEnd(24)} first ${(t.first / n).toFixed(0)}ms  total ${(t.total / n).toFixed(0)}ms  ${(t.chars / n).toFixed(0)} chars  $${(t.cost / n).toFixed(4)}/answer  ($${(t.cost / n * 1000).toFixed(2)} per 1,000 answers)`);
  }
  const out = path.join(__dirname, 'model-compare-output.md');
  fs.writeFileSync(out, md);
  console.log(`\nFull answers written to ${out}`);
  process.exit(0);
})();
