// apps/api/src/services/ai.service.ts
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';
import { safeParseJSON } from '../utils/jsonParser';

const OPENAI_MODEL = 'gpt-5.6-luna';
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

    this.groq = new Groq({ apiKey });
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

      let cleanText: string;
      const fenceMatch = finalText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenceMatch) {
        cleanText = fenceMatch[1].trim();
      } else {
        const jsonMatch = finalText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        cleanText = jsonMatch ? jsonMatch[1] : finalText;
      }

      let jsonData: any;
      try {
        jsonData = safeParseJSON<any>(cleanText);
      } catch (parseError: any) {
        console.error('Malformed JSON from OpenAI:', cleanText.substring(0, 500));
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }

      console.log('✅ Generated JSON successfully');
      return jsonData;

    } catch (error: any) {
      console.error('❌ OpenAI API Error:', {
        message: error.message,
        status: error.status
      });

      throw new Error(`AI generation failed: ${error.message}`);
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
   * Extract all text from a PDF buffer using GPT-5.6 Luna's native PDF understanding.
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
      const groq = this.getGroq();
      const groqMessages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
        ...(systemInstruction ? [{ role: 'system' as const, content: systemInstruction }] : []),
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const result = await groq.chat.completions.create({
        model: GROQ_CHAT_MODEL,
        messages: groqMessages,
        max_tokens: 8192,
      });

      const finalText = String(result.choices[0]?.message?.content || '').trim();

      if (!finalText) {
        throw new Error('Empty response from Groq API');
      }

      console.log('✅ Generated chat response successfully, length:', finalText.length);
      return finalText;

    } catch (error: any) {
      console.error('❌ Groq Chat API Error:', {
        message: error.message,
        status: error.status
      });

      throw new Error(`Chat generation failed: ${error.message}`);
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

  async chatWithSearch(
    messages: ChatMessage[],
    systemInstruction?: string
  ): Promise<string> {
    try {
      const lastMessage = messages[messages.length - 1];
      const webResults = await this.searchWeb(lastMessage.content);

      const webContext = webResults.length
        ? `\n\nLive web search results (weave naturally into your answer, no citation numbers):\n${webResults
            .map((r) => `- ${r.title}: ${r.content}`)
            .join('\n')}`
        : '';

      const text = await this.chat(messages, `${systemInstruction || ''}${webContext}`);

      console.log(`✅ Search-grounded chat response, length: ${text.length}, ${webResults.length} web results used`);
      return text;

    } catch (error: any) {
      console.error('❌ Search Chat Error:', error.message);
      throw new Error(`Search-grounded chat failed: ${error.message}`);
    }
  }

  /**
   * Like chatWithSearch, but also returns the web sources used (instead of discarding them) —
   * needed by callers that want to show real citations to the user, not just a search-informed answer.
   */
  async chatWithGrounding(
    messages: ChatMessage[],
    systemInstruction?: string
  ): Promise<{ text: string; groundingSources: { uri: string; title: string }[] }> {
    try {
      const lastMessage = messages[messages.length - 1];
      const webResults = await this.searchWeb(lastMessage.content);

      const webContext = webResults.length
        ? `\n\nLive web search results (weave naturally into your answer, no citation numbers — shown to the user separately):\n${webResults
            .map((r) => `- ${r.title}: ${r.content}`)
            .join('\n')}`
        : '';

      const text = await this.chat(messages, `${systemInstruction || ''}${webContext}`);
      const groundingSources = webResults.map((r) => ({ uri: r.uri, title: r.title }));

      console.log(`✅ Grounded chat response, length: ${text.length}, ${groundingSources.length} grounding sources`);
      return { text, groundingSources };

    } catch (error: any) {
      console.error('❌ Grounded Chat Error:', error.message);
      throw new Error(`Grounded chat failed: ${error.message}`);
    }
  }
}

export default new AiService();
