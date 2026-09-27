// apps/api/src/services/ai.service.ts
import { performance } from 'perf_hooks';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';
import { safeParseJSON } from '../utils/jsonParser';

const OPENAI_MODEL = 'gpt-6-luna';
const GROQ_CHAT_MODEL = 'openai/gpt-oss-120b'; // llama-3.3-70b-versatile was retired from Groq's catalog

// Live web search (via Tavily) is restricted to these domains so grounded answers stay
// citeable and appropriate for a clinical reference app, instead of the open web.
const TRUSTED_MEDICAL_DOMAINS = [
  'nih.gov',
  'ncbi.nlm.nih.gov',
  'cdc.gov',
  'who.int',
  'fda.gov',
  'medlineplus.gov',
  'mayoclinic.org',
  'clevelandclinic.org',
  'uptodate.com',
];

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type TavilyClient = ReturnType<typeof tavily>;

class AiService {
  private openai: OpenAI | null = null;
  private groq: Groq | null = null;
  private tvly: TavilyClient | null = null;
  private tavilyWarned = false;

  private getOpenAI(): OpenAI {
    if (this.openai) return this.openai;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    this.openai = new OpenAI({ apiKey });
    console.log('✅ OpenAI service initialized');
    return this.openai;
  }

  private getGroq(): Groq {
    if (this.groq) return this.groq;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }

    // maxRetries: 0 — the SDK's own retry would otherwise sit and wait out Groq's `retry-after`
    // (often 20s+) internally before chat() ever sees the error, which is exactly the slow
    // behavior chat() is now designed to avoid by failing over to OpenAI immediately instead.
    this.groq = new Groq({ apiKey, maxRetries: 0 });
    console.log('✅ Groq service initialized');
    return this.groq;
  }

  /**
   * Returns null instead of throwing when TAVILY_API_KEY isn't set — grounded chat still
   * works (on literature sources alone), just without live web results, until the key is added.
   */
  private getTavily(): TavilyClient | null {
    if (this.tvly) return this.tvly;

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      if (!this.tavilyWarned) {
        console.warn('⚠️ TAVILY_API_KEY not set — live web search disabled, grounded chat will rely on literature sources only');
        this.tavilyWarned = true;
      }
      return null;
    }

    this.tvly = tavily({ apiKey });
    console.log('✅ Tavily service initialized');
    return this.tvly;
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const openai = this.getOpenAI();
      const result = await openai.responses.create({
        model: OPENAI_MODEL,
        input: prompt,
        max_output_tokens: 8192, // prevent long text cutoffs
      });

      const finalText = String(result.output_text || '').trim();

      if (!finalText) {
        throw new Error('Empty response from OpenAI API');
      }

      console.log('✅ Generated text successfully, length:', finalText.length);
      return finalText;

    } catch (error: any) {
      console.error('❌ OpenAI API Error:', {
        message: error.message,
        status: error.status
      });

      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  async generateJSON(prompt: string): Promise<any> {
    try {
      const openai = this.getOpenAI();
      const result = await openai.responses.create({
        model: OPENAI_MODEL,
        input: prompt,
        max_output_tokens: 8192, // force a large limit to prevent mid-JSON cutoff
      });

      const finalText = String(result.output_text || '').trim();

      if (!finalText) {
        throw new Error('Empty response from OpenAI API');
      }

      console.log('✅ Generated JSON successfully');
      return this.parseJsonFromText(finalText, 'OpenAI');

    } catch (error: any) {
      console.error('❌ OpenAI API Error:', {
        message: error.message,
        status: error.status
      });

      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Extracts and parses a JSON object/array from a model's raw text response, tolerating a
   * markdown code fence or leading/trailing prose around it. Shared by every JSON-returning
   * method regardless of which provider produced the text.
   */
  private parseJsonFromText(text: string, sourceLabel: string): any {
    let cleanText: string;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      cleanText = fenceMatch[1].trim();
    } else {
      const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      cleanText = jsonMatch ? jsonMatch[1] : text;
    }

    try {
      return safeParseJSON<any>(cleanText);
    } catch (parseError: any) {
      console.error(`Malformed JSON from ${sourceLabel}:`, cleanText.substring(0, 500));
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }
  }

  async extractTextFromImage(imageBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<string> {
    try {
      const openai = this.getOpenAI();
      const result = await openai.responses.create({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Extract ALL text from this image exactly as it appears. Preserve the original wording, order, and structure. Do NOT summarize, interpret, or add anything. Return only the raw text found in the image.',
              },
              {
                type: 'input_image',
                image_url: `data:${mimeType};base64,${imageBuffer.toString('base64')}`,
                detail: 'auto',
              },
            ],
          },
        ],
      });

      const text = String(result.output_text || '').trim();
      console.log('✅ Vision OCR completed, length:', text.length);
      return text;
    } catch (error: any) {
      console.error('❌ Vision OCR Error:', error.message);
      throw new Error(`Image text extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract all text from a PDF buffer using GPT-6 Luna's native PDF understanding.
   * Supports scanned/image-based PDFs that pdf-parse cannot handle.
   * Inline limit: ~20 MB. Throws for oversized files so callers can decide.
   */
  async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    const MAX_INLINE_BYTES = 19 * 1024 * 1024; // 19 MB — safe margin under 20 MB API cap
    if (pdfBuffer.length > MAX_INLINE_BYTES) {
      throw new Error(
        `PDF is ${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB — exceeds the 19 MB inline limit. ` +
        `Please compress or split the PDF and try again.`
      );
    }

    console.log(
      `🔍 PDF Vision OCR — ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB PDF`
    );

    try {
      const openai = this.getOpenAI();
      const result = await openai.responses.create({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Extract ALL text from this PDF document exactly as it appears. Preserve paragraphs, headings, and structure. Do NOT summarize or interpret — return only the raw extracted text.',
              },
              {
                type: 'input_file',
                filename: 'document.pdf',
                file_data: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
              },
            ],
          },
        ],
        max_output_tokens: 8192,
      });

      const text = String(result.output_text || '').trim();
      console.log(`✅ PDF Vision OCR complete — ${text.length} chars extracted`);
      return text;
    } catch (error: any) {
      console.error('❌ PDF Vision OCR Error:', {
        message: error.message,
        status: error.status,
      });
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  async chat(
    messages: ChatMessage[],
    systemInstruction?: string
  ): Promise<string> {
    try {
      return await this.chatViaGroq(messages, systemInstruction);
    } catch (error: any) {
      console.error('❌ Groq Chat API Error:', {
        message: error.message,
        status: error.status,
      });

      // Groq is primary for speed and cost — LPU inference is dramatically faster than typical
      // API latency, and openai/gpt-oss-120b is cheaper per-token than gpt-6-luna. OpenAI is
      // kept wired as a fallback for resilience if Groq errors out (rate limit, outage, etc).
      console.warn('⏳ Groq chat failed — falling back to OpenAI for this chat response');
      try {
        return await this.chatViaOpenAI(messages, systemInstruction);
      } catch (fallbackError: any) {
        console.error('❌ OpenAI fallback also failed:', fallbackError.message);
        throw new Error(`Chat generation failed: ${error.message}`);
      }
    }
  }

  /** Primary chat path. */
  private async chatViaGroq(messages: ChatMessage[], systemInstruction?: string): Promise<string> {
    const groq = this.getGroq();
    const groqMessages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      ...(systemInstruction ? [{ role: 'system' as const, content: systemInstruction }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const result = await groq.chat.completions.create({
      model: GROQ_CHAT_MODEL,
      messages: groqMessages,
      max_completion_tokens: 2048, // max_tokens is deprecated on Groq's chat completions API
    });

    const finalText = String(result.choices[0]?.message?.content || '').trim();
    if (!finalText) {
      throw new Error('Empty response from Groq');
    }

    console.log('✅ Generated chat response successfully, length:', finalText.length);
    return finalText;
  }

  /** Fallback path only — used when Groq errors out. */
  private async chatViaOpenAI(messages: ChatMessage[], systemInstruction?: string): Promise<string> {
    const openai = this.getOpenAI();
    const input = [
      ...(systemInstruction ? [{ role: 'system' as const, content: systemInstruction }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const result = await openai.responses.create({
      model: OPENAI_MODEL,
      input,
      max_output_tokens: 2048,
    });

    const finalText = String(result.output_text || '').trim();
    if (!finalText) {
      throw new Error('Empty response from OpenAI fallback');
    }

    console.log('✅ Generated chat response via OpenAI fallback, length:', finalText.length);
    return finalText;
  }

  /**
   * Streaming counterpart of chat() — same primary/fallback shape, but yields text deltas as
   * they arrive instead of waiting for the full response. The OpenAI fallback is only usable
   * before any Groq token has reached the caller: once partial text has already been streamed
   * out, silently continuing on a second provider would read as a jarring tone/style shift
   * mid-answer, so a failure past that point is thrown instead of failed-over.
   */
  async *chatStream(
    messages: ChatMessage[],
    systemInstruction?: string,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const startedAt = performance.now();
    let emittedAny = false;
    try {
      for await (const piece of this.chatStreamViaGroq(messages, systemInstruction, signal)) {
        if (!emittedAny) {
          console.log(`⏱️ TTFT (Groq): ${(performance.now() - startedAt).toFixed(0)}ms`);
        }
        emittedAny = true;
        yield piece;
      }
      console.log(`⏱️ Total generation time (Groq): ${(performance.now() - startedAt).toFixed(0)}ms`);
      return;
    } catch (error: any) {
      if (signal?.aborted) return;
      console.error('❌ Groq Chat Stream Error:', { message: error.message, status: error.status });
      if (emittedAny) {
        throw new Error(`Chat stream failed after partial output: ${error.message}`);
      }
      console.warn('⏳ Groq stream failed before any tokens — falling back to OpenAI');
    }

    for await (const piece of this.chatStreamViaOpenAI(messages, systemInstruction, signal)) {
      if (!emittedAny) {
        console.log(`⏱️ TTFT (OpenAI fallback): ${(performance.now() - startedAt).toFixed(0)}ms`);
      }
      emittedAny = true;
      yield piece;
    }
    console.log(`⏱️ Total generation time (OpenAI fallback): ${(performance.now() - startedAt).toFixed(0)}ms`);
  }

  /** Primary streaming path. */
  private async *chatStreamViaGroq(
    messages: ChatMessage[],
    systemInstruction?: string,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const groq = this.getGroq();
    const groqMessages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      ...(systemInstruction ? [{ role: 'system' as const, content: systemInstruction }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const stream = await groq.chat.completions.create(
      {
        model: GROQ_CHAT_MODEL,
        messages: groqMessages,
        max_completion_tokens: 2048, // max_tokens is deprecated on Groq's chat completions API
        stream: true,
      },
      { signal }
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  /** Fallback streaming path only — used when the Groq stream fails before any output. */
  private async *chatStreamViaOpenAI(
    messages: ChatMessage[],
    systemInstruction?: string,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const openai = this.getOpenAI();
    const input = [
      ...(systemInstruction ? [{ role: 'system' as const, content: systemInstruction }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const stream = await openai.responses.create(
      {
        model: OPENAI_MODEL,
        input,
        max_output_tokens: 2048,
        stream: true,
      },
      { signal }
    );

    for await (const event of stream) {
      if (event.type === 'response.output_text.delta') {
        yield event.delta;
      } else if (event.type === 'response.failed') {
        throw new Error(event.response?.error?.message || 'OpenAI response stream failed');
      } else if (event.type === 'error') {
        throw new Error(event.message || 'OpenAI stream reported an error event');
      }
    }
  }

  /**
   * Like chat(), but for lightweight structured tasks (e.g. suggesting follow-up questions)
   * that don't need OpenAI's stronger reasoning — runs on Groq with JSON mode enabled so the
   * response is guaranteed valid JSON syntax (though not schema-validated).
   */
  async chatJSON(
    messages: ChatMessage[],
    systemInstruction?: string
  ): Promise<any> {
    try {
      const groq = this.getGroq();
      const groqMessages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
        ...(systemInstruction ? [{ role: 'system' as const, content: systemInstruction }] : []),
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const result = await groq.chat.completions.create({
        model: GROQ_CHAT_MODEL,
        messages: groqMessages,
        max_completion_tokens: 2048, // max_tokens is deprecated on Groq's chat completions API
        response_format: { type: 'json_object' },
      });

      const finalText = String(result.choices[0]?.message?.content || '').trim();

      if (!finalText) {
        throw new Error('Empty response from Groq API');
      }

      return this.parseJsonFromText(finalText, 'Groq');

    } catch (error: any) {
      console.error('❌ Groq JSON Chat Error:', {
        message: error.message,
        status: error.status
      });

      throw new Error(`Chat JSON generation failed: ${error.message}`);
    }
  }

  /**
   * Runs a domain-restricted Tavily search for the given query. Returns an empty array
   * (not an error) when TAVILY_API_KEY isn't configured yet, or when the search itself fails —
   * grounded chat should degrade to literature-only sources rather than break entirely.
   */
  private async searchWeb(query: string): Promise<{ uri: string; title: string; content: string }[]> {
    const tvly = this.getTavily();
    if (!tvly) return [];

    try {
      const response = await tvly.search(query, {
        includeDomains: TRUSTED_MEDICAL_DOMAINS,
        maxResults: 5,
      });
      return (response.results || []).map((r: any) => ({
        uri: r.url,
        title: r.title || r.url,
        content: r.content || '',
      }));
    } catch (error: any) {
      console.error('❌ Tavily search error:', error.message);
      return [];
    }
  }

  /**
   * Streaming counterpart of the old chatWithSearch — runs the Tavily search up front (it has
   * to resolve before the prompt can be built), then hands back a text-delta generator for the
   * actual generation. The search itself can't be streamed, only the LLM's answer.
   */
  async chatWithSearchStream(
    messages: ChatMessage[],
    systemInstruction?: string,
    signal?: AbortSignal
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const lastMessage = messages[messages.length - 1];
    const webResults = await this.searchWeb(lastMessage.content);

    const webContext = webResults.length
      ? `\n\nLive web search results (weave naturally into your answer, no citation numbers):\n${webResults
          .map((r) => `- ${r.title}: ${r.content}`)
          .join('\n')}`
      : '';

    console.log(`🔎 Search-grounded chat stream starting, ${webResults.length} web results used`);
    return this.chatStream(messages, `${systemInstruction || ''}${webContext}`, signal);
  }

  /**
   * Streaming counterpart of the old chatWithGrounding — the Tavily search resolves before this
   * returns, so `groundingSources` is available immediately (for an upfront "metadata" event),
   * while `stream` carries the actual answer as text deltas.
   */
  async chatWithGroundingStream(
    messages: ChatMessage[],
    systemInstruction?: string,
    signal?: AbortSignal
  ): Promise<{ stream: AsyncGenerator<string, void, unknown>; groundingSources: { uri: string; title: string }[] }> {
    const lastMessage = messages[messages.length - 1];
    const webResults = await this.searchWeb(lastMessage.content);

    const webContext = webResults.length
      ? `\n\nLive web search results (weave naturally into your answer, no citation numbers — shown to the user separately):\n${webResults
          .map((r) => `- ${r.title}: ${r.content}`)
          .join('\n')}`
      : '';

    const groundingSources = webResults.map((r) => ({ uri: r.uri, title: r.title }));
    console.log(`🔎 Grounded chat stream starting, ${groundingSources.length} grounding sources`);

    return {
      stream: this.chatStream(messages, `${systemInstruction || ''}${webContext}`, signal),
      groundingSources,
    };
  }
}

export default new AiService();
