// Measures where a chat answer's time goes: each retrieval source, web search, and Gemini's first token.
// Run: npx ts-node src/scripts/chat-latency.ts "what is the mechanism of action of metformin"
import 'dotenv/config';
import { performance } from 'perf_hooks';
import europePmcService from '../services/europePmc.service';
import semanticScholarService from '../services/semanticScholar.service';
import pubmedService from '../services/pubmed.service';
import openFdaService from '../services/openFda.service';
import aiService from '../services/ai.service';

const query = process.argv[2] || 'what is the mechanism of action of metformin';

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  const t0 = performance.now();
  try {
    const value = await fn();
    const n = Array.isArray(value) ? ` (${value.length} results)` : '';
    console.log(`${label.padEnd(22)} ${(performance.now() - t0).toFixed(0).padStart(6)} ms${n}`);
    return value;
  } catch (e: any) {
    console.log(`${label.padEnd(22)} ${(performance.now() - t0).toFixed(0).padStart(6)} ms  FAILED: ${e.message}`);
  }
}

(async () => {
  console.log(`Query: ${query}\n`);
  const start = performance.now();
  await Promise.allSettled([
    timed('Europe PMC', () => europePmcService.search(query, 5)),
    timed('Semantic Scholar', () => semanticScholarService.search(query, 5)),
    timed('PubMed', () => pubmedService.search(query, 5)),
    timed('openFDA', () => openFdaService.search(query, 3)),
  ]);
  console.log(`${'ALL retrieval (parallel)'.padEnd(22)} ${(performance.now() - start).toFixed(0).padStart(6)} ms\n`);

  const t1 = performance.now();
  const { stream, groundingSources } = await aiService.chatWithGroundingStream(
    [{ role: 'user', content: query }],
    'You are a concise medical tutor. Answer in HTML.'
  );
  console.log(`${'Tavily web search'.padEnd(22)} ${(performance.now() - t1).toFixed(0).padStart(6)} ms (${groundingSources.length} results)`);

  const t2 = performance.now();
  let first = 0;
  let total = '';
  for await (const piece of stream) {
    if (!first) first = performance.now() - t2;
    total += piece;
  }
  console.log(`${'Gemini first token'.padEnd(22)} ${first.toFixed(0).padStart(6)} ms`);
  console.log(`${'Gemini full answer'.padEnd(22)} ${(performance.now() - t2).toFixed(0).padStart(6)} ms (${total.length} chars)`);
  process.exit(0);
})();
