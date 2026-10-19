// apps/api/src/services/ai.service.ts
import { performance } from 'perf_hooks';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { GoogleGenAI, ThinkingLevel, FileState, createPartFromUri, type Content, type GenerateContentConfig } from '@google/genai';
import { tavily } from '@tavily/core';
import { safeParseJSON } from '../utils/jsonParser';

// Gemini is the default provider. Set AI_PROVIDER=legacy to roll back to the previous
// OpenAI (generation/OCR) + Groq (chat) setup below without a code change.
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
// Output is not artificially capped: every Gemini call is allowed the model's full output limit
// (65,536 tokens for gemini-3.8-flash, thinking included) so answers and long scans are never cut short.
const GEMINI_MAX_OUTPUT_TOKENS = 65536;
const GEMINI_CHAT_MAX_OUTPUT_TOKENS = GEMINI_MAX_OUTPUT_TOKENS;
const GEMINI_GENERATION_MAX_OUTPUT_TOKENS = GEMINI_MAX_OUTPUT_TOKENS;
const GEMINI_PDF_OCR_MAX_OUTPUT_TOKENS = GEMINI_MAX_OUTPUT_TOKENS;
const GEMINI_MAX_INLINE_PDF_BYTES = 14 * 1024 * 1024; // 20 MB request cap minus base64 overhead
const GEMINI_MAX_PDF_BYTES = 50 * 1024 * 1024; // Gemini's per-PDF limit
// Images in this app are study material (slides, textbook pages, labelled diagrams, ECGs, charts,
// clinical photos), and the extracted text is all the chat/quiz/flashcard features ever see. So
// besides transcribing text exactly, visual content is described factually — otherwise an image
// that is mostly a diagram would yield nothing to ask questions about.
const IMAGE_OCR_PROMPT =
  'Transcribe ALL text in this image exactly as it appears, preserving the original wording, order and structure (tables as rows). Do not summarize or correct it. ' +
  'If the image also contains non-text visual content that matters for studying — a diagram, labelled anatomy, chart, graph, ECG/rhythm strip, imaging scan, or clinical photograph — add a section starting with "Visual description:" that factually describes what is shown (structures, labels, axes, values, visible findings). Describe what is visible; do not diagnose or add facts that are not in the image. ' +
  'If there is no text and nothing study-relevant to describe, return an empty response.';
const PDF_OCR_PROMPT =
  'Extract ALL text from this PDF document exactly as it appears. Preserve paragraphs, headings, and structure. Do NOT summarize or interpret — return only the raw extracted text.';

const THINKING_LEVELS: Record<string, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

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
  private gemini: GoogleGenAI | null = null;
  private tvly: TavilyClient | null = null;
  private tavilyWarned = false;

  private get useGemini(): boolean {
    return (process.env.AI_PROVIDER || 'gemini').toLowerCase() !== 'legacy';
  }

  private get geminiModel(): string {
    return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  }

  private get geminiFallbackModel(): string {
    return process.env.GEMINI_FALLBACK_MODEL || DEFAULT_GEMINI_FALLBACK_MODEL;
  }

  private getGemini(): GoogleGenAI {
    if (this.gemini) return this.gemini;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    this.gemini = new GoogleGenAI({ apiKey });
    console.log(`✅ Gemini service initialized (model: ${this.geminiModel}, fallback: ${this.geminiFallbackModel})`);
    return this.gemini;
  }

  /**
   * Shared generation config. Thinking tokens are billed as output, so the level is capped
   * (GEMINI_THINKING_LEVEL, default 'low') — plenty for notes/quiz/flashcard/chat work.
   * thinkingLevel is a Gemini 3+ option; older models would reject it, so it's only sent there.
   */
  private geminiConfig(model: string, extra: GenerateContentConfig = {}): GenerateContentConfig {
    const config: GenerateContentConfig = { ...extra };
    if (/^gemini-3/.test(model)) {
      const level = THINKING_LEVELS[(process.env.GEMINI_THINKING_LEVEL || 'low').toLowerCase()];
      if (level) config.thinkingConfig = { thinkingLevel: level };
    }
    return config;
  }

  /** Runs `fn` on the primary Gemini model, retrying once on the fallback model if it throws. */
  private async withGeminiFallback<T>(label: string, fn: (model: string) => Promise<T>): Promise<T> {
    try {
      return await fn(this.geminiModel);
    } catch (error: any) {
      if (this.geminiFallbackModel === this.geminiModel) throw error;
      console.warn(`⏳ Gemini ${label} failed on ${this.geminiModel} (${error.message}) — retrying on ${this.geminiFallbackModel}`);
      return await fn(this.geminiFallbackModel);
    }
  }

  private async geminiGenerate(
    label: string,
    contents: Content[] | string,
    config: GenerateContentConfig = {}
  ): Promise<string> {
    const ai = this.getGemini();
    return this.withGeminiFallback(label, async (model) => {
      const result = await ai.models.generateContent({ model, contents, config: this.geminiConfig(model, config) });
      this.logGeminiUsage(label, model, result.usageMetadata);
      const text = String(result.text || '').trim();
      if (!text) {
        // Empty text usually means a safety block or a token-limit cut-off during thinking.
        // Throwing here (inside the fallback wrapper) retries once on the fallback model.
        const finishReason = result.candidates?.[0]?.finishReason || result.promptFeedback?.blockReason || 'unknown';
        throw new Error(`Empty response from Gemini (reason: ${finishReason})`);
      }
      return text;
    });
  }

  /** One line per call so real token usage (and therefore cost) is visible in the logs. */
  private logGeminiUsage(
    label: string,
    model: string,
    usage?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }
  ): void {
    if (!usage) return;
    console.log(
      `📊 Gemini usage [${label}] ${model}: in=${usage.promptTokenCount ?? 0} out=${usage.candidatesTokenCount ?? 0} thinking=${usage.thoughtsTokenCount ?? 0}`
    );
  }

  /**
   * Scans a PDF with Gemini. Small files are sent inline; larger ones (up to 50 MB) are uploaded
   * through the Files API first, then deleted afterwards (they also expire on their own).
   */
  private async geminiExtractPdfText(pdfBuffer: Buffer): Promise<string> {
    const ai = this.getGemini();
    const config = { maxOutputTokens: GEMINI_PDF_OCR_MAX_OUTPUT_TOKENS };

    if (pdfBuffer.length <= GEMINI_MAX_INLINE_PDF_BYTES) {
      return this.geminiGenerate(
        'extractTextFromPdf',
        [{ role: 'user', parts: [{ text: PDF_OCR_PROMPT }, { inlineData: { mimeType: 'application/pdf', data: pdfBuffer.toString('base64') } }] }],
        config
      );
    }

    const uploaded = await ai.files.upload({
      file: new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }),
      config: { mimeType: 'application/pdf', displayName: 'document.pdf' },
    });
    try {
      let file = uploaded;
      for (let i = 0; i < 60 && file.state === FileState.PROCESSING; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        file = await ai.files.get({ name: uploaded.name as string });
      }
      if (file.state !== FileState.ACTIVE || !file.uri) {
        throw new Error(`Gemini could not process the uploaded PDF (state: ${file.state})`);
      }
      return await this.geminiGenerate(
        'extractTextFromPdf',
        [{ role: 'user', parts: [{ text: PDF_OCR_PROMPT }, createPartFromUri(file.uri, 'application/pdf')] }],
        config
      );
    } finally {
      ai.files.delete({ name: uploaded.name as string }).catch(() => {});
    }
  }

  /**
   * Cheap utility call for chat images: does this question genuinely benefit from a diagram,
   * scan or clinical photo, and if so what should be searched for? Returns up to two search
   * phrases (specific first, broader second). Never throws — any failure means "no image".
   */
  async planChatImage(question: string): Promise<{ useImage: boolean; terms: string[] }> {
    if (!this.useGemini) return { useImage: false, terms: [] };
    const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_FALLBACK_MODEL;
    try {
      const result = await this.getGemini().models.generateContent({
        model,
        contents:
          `A medical student asked: "${question.slice(0, 500)}"\n` +
          'Would a diagram, anatomical illustration, ECG strip, radiograph or clinical photograph genuinely help explain the answer? ' +
          'Dosing, side effects, lab values, scoring scales, management steps, nursing care and plain definitions do NOT need an image.\n' +
          'Return JSON {"useImage": boolean, "terms": ["specific image search phrase, 2-5 words", "broader fallback phrase, 1-3 words"]}',
        config: { responseMimeType: 'application/json' },
      });
      this.logGeminiUsage('planChatImage', model, result.usageMetadata);
      const parsed = JSON.parse(String(result.text || '{}'));
      const terms = (Array.isArray(parsed.terms) ? parsed.terms : [])
        .map((t: unknown) => String(t || '').trim())
        .filter((t: string) => t.length > 0)
        .slice(0, 2);
      return { useImage: parsed.useImage === true && terms.length > 0, terms };
    } catch (error: any) {
      console.warn('⚠️ planChatImage failed:', error.message);
      return { useImage: false, terms: [] };
    }
  }

  /** Vision check: is this image clearly relevant, legible and helpful for the question? */
  async isImageRelevant(question: string, title: string, image: Buffer, mimeType: string): Promise<boolean> {
    if (!this.useGemini) return false;
    const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_FALLBACK_MODEL;
    try {
      const result = await this.getGemini().models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  `Question from a medical student: "${question.slice(0, 500)}"\nImage title: "${title.slice(0, 200)}"\n` +
                  'Decide whether this image should be shown under the answer. Accept ONLY if ALL are true:\n' +
                  '1. It directly depicts what the question asks about. For "what does X look like" or "X on imaging/ECG" questions, the image must visibly show the abnormality or finding of X — a normal image, or another condition, of the same type is a REJECT. For anatomy/physiology questions it must be a diagram or photo of that structure or process.\n' +
                  '2. It is legible, and any text or labels are in English (or there are none).\n' +
                  '3. It is not a logo, map, person, or scan of an old book page.\n' +
                  'A figure that is only loosely related (for example electrode/lead placement for an ECG-interpretation question) is a REJECT. When unsure, REJECT.\n' +
                  'Return JSON {"ok": boolean}',
              },
              { inlineData: { mimeType, data: image.toString('base64') } },
            ],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });
      this.logGeminiUsage('isImageRelevant', model, result.usageMetadata);
      return JSON.parse(String(result.text || '{}')).ok === true;
    } catch (error: any) {
      console.warn('⚠️ isImageRelevant failed:', error.message);
      return false;
    }
  }

  private toGeminiContents(messages: ChatMessage[]): Content[] {
    return messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  }

  private async *geminiChatStream(
    messages: ChatMessage[],
    systemInstruction?: string,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const ai = this.getGemini();
    const contents = this.toGeminiContents(messages);
    const models = [this.geminiModel, this.geminiFallbackModel].filter((m, i, all) => all.indexOf(m) === i);
    let emittedAny = false;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: this.geminiConfig(model, {
            systemInstruction: systemInstruction || undefined,
            maxOutputTokens: GEMINI_CHAT_MAX_OUTPUT_TOKENS,
            abortSignal: signal,
          }),
        });
        let usage: Parameters<typeof this.logGeminiUsage>[2];
        let finishReason: string | undefined;
        for await (const chunk of stream) {
          if (chunk.usageMetadata) usage = chunk.usageMetadata;
          finishReason = chunk.candidates?.[0]?.finishReason || chunk.promptFeedback?.blockReason || finishReason;
          const piece = chunk.text;
          if (piece) {
            emittedAny = true;
            yield piece;
          }
        }
        this.logGeminiUsage('chatStream', model, usage);
        if (!emittedAny) {
          // Blocked or cut off before any text — handled like an error so the fallback model gets a try.
          throw new Error(`Empty response from Gemini (reason: ${finishReason || 'unknown'})`);
        }
        return;
      } catch (error: any) {
        if (signal?.aborted) return;
        console.error('❌ Gemini Chat Stream Error:', { model, message: error.message, status: error.status });
        // Once text has reached the caller, switching models mid-answer would read as a jarring
        // tone shift — only fail over if nothing has been streamed yet.
        if (emittedAny || i === models.length - 1) {
          throw new Error(`Chat stream failed: ${error.message}`);
        }
        console.warn(`⏳ Gemini stream failed before any tokens — retrying on ${models[i + 1]}`);
      }
    }
  }

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
    if (this.useGemini) {
      try {
        const text = await this.geminiGenerate('generateText', prompt, {
          maxOutputTokens: GEMINI_GENERATION_MAX_OUTPUT_TOKENS,
        });
        console.log('✅ Generated text successfully, length:', text.length);
        return text;
      } catch (error: any) {
        console.error('❌ Gemini API Error:', { message: error.message, status: error.status });
        throw new Error(`AI generation failed: ${error.message}`);
      }
    }

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
    if (this.useGemini) {
      try {
        const text = await this.geminiGenerate('generateJSON', prompt, {
          maxOutputTokens: GEMINI_GENERATION_MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
        });
        console.log('✅ Generated JSON successfully');
        return this.parseJsonFromText(text, 'Gemini');
      } catch (error: any) {
        console.error('❌ Gemini API Error:', { message: error.message, status: error.status });
        throw new Error(`AI generation failed: ${error.message}`);
      }
    }

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
    if (this.useGemini) {
      try {
        const text = await this.geminiGenerate(
          'extractTextFromImage',
          [
            {
              role: 'user',
              parts: [
                {
                  text: IMAGE_OCR_PROMPT,
                },
                { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
              ],
            },
          ],
          { maxOutputTokens: GEMINI_GENERATION_MAX_OUTPUT_TOKENS }
        );
        console.log('✅ Vision OCR completed, length:', text.length);
        return text;
      } catch (error: any) {
        console.error('❌ Vision OCR Error:', error.message);
        throw new Error(`Image text extraction failed: ${error.message}`);
      }
    }

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
    const sizeMb = pdfBuffer.length / 1024 / 1024;
    console.log(`🔍 PDF Vision OCR — ${sizeMb.toFixed(2)} MB PDF`);

    if (this.useGemini) {
      // Inline requests are capped at 20 MB *after* base64 (+33%), so only ~14 MB of PDF fits.
      // Larger files go through the Gemini Files API (up to 50 MB).
      if (pdfBuffer.length > GEMINI_MAX_PDF_BYTES) {
        throw new Error(
          `PDF is ${sizeMb.toFixed(1)} MB — exceeds the 50 MB limit. Please compress or split the PDF and try again.`
        );
      }

      try {
        const text = await this.geminiExtractPdfText(pdfBuffer);
        console.log(`✅ PDF Vision OCR complete — ${text.length} chars extracted`);
        return text;
      } catch (error: any) {
        console.error('❌ PDF Vision OCR Error:', { message: error.message, status: error.status });
        throw new Error(`PDF extraction failed: ${error.message}`);
      }
    }

    const MAX_INLINE_BYTES = 19 * 1024 * 1024; // 19 MB — safe margin under 20 MB API cap
    if (pdfBuffer.length > MAX_INLINE_BYTES) {
      throw new Error(
        `PDF is ${sizeMb.toFixed(1)} MB — exceeds the 19 MB inline limit. ` +
        `Please compress or split the PDF and try again.`
      );
    }

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
    if (this.useGemini) {
      try {
        const text = await this.geminiGenerate('chat', this.toGeminiContents(messages), {
          systemInstruction: systemInstruction || undefined,
          maxOutputTokens: GEMINI_CHAT_MAX_OUTPUT_TOKENS,
        });
        console.log('✅ Generated chat response successfully, length:', text.length);
        return text;
      } catch (error: any) {
        console.error('❌ Gemini Chat API Error:', { message: error.message, status: error.status });
        throw new Error(`Chat generation failed: ${error.message}`);
      }
    }

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

    if (this.useGemini) {
      for await (const piece of this.geminiChatStream(messages, systemInstruction, signal)) {
        if (!emittedAny) {
          console.log(`⏱️ TTFT (Gemini): ${(performance.now() - startedAt).toFixed(0)}ms`);
        }
        emittedAny = true;
        yield piece;
      }
      console.log(`⏱️ Total generation time (Gemini): ${(performance.now() - startedAt).toFixed(0)}ms`);
      return;
    }

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
    if (this.useGemini) {
      try {
        const text = await this.geminiGenerate('chatJSON', this.toGeminiContents(messages), {
          systemInstruction: systemInstruction || undefined,
          maxOutputTokens: GEMINI_CHAT_MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
        });
        return this.parseJsonFromText(text, 'Gemini');
      } catch (error: any) {
        console.error('❌ Gemini JSON Chat Error:', { message: error.message, status: error.status });
        throw new Error(`Chat JSON generation failed: ${error.message}`);
      }
    }

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
   * Web search with a time limit. Chat starts this at the same moment as literature retrieval and
   * takes whatever has arrived by the deadline — a slow search must not hold up the answer.
   */
  async searchWebWithin(query: string, timeoutMs: number): Promise<{ uri: string; title: string; content: string }[]> {
    const timeout = new Promise<never[]>((resolve) => setTimeout(() => resolve([]), timeoutMs));
    return Promise.race([this.searchWeb(query), timeout]);
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
    signal?: AbortSignal,
    /** Web results already fetched by the caller (so the search could run in parallel with other work). */
    prefetchedWebResults?: { uri: string; title: string; content: string }[]
  ): Promise<{ stream: AsyncGenerator<string, void, unknown>; groundingSources: { uri: string; title: string }[] }> {
    const lastMessage = messages[messages.length - 1];
    const webResults = prefetchedWebResults ?? (await this.searchWeb(lastMessage.content));

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
