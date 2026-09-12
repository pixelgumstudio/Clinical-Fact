// api/src/services/noteGeneration.service.ts
import aiService from './ai.service';

class NoteGenerationService {
  /**
   * Generate note from content (transcript, text, PDF, etc.)
   */
  async generateNote(
    content: string,
    contentType: string,
    _userPreferences?: any
  ): Promise<{ title: string; summary?: string; content: string }> {
    try {
      const prompt = this.buildNotePrompt(content);

      const parsed = await aiService.generateJSON(prompt);

      let title = '';
      let noteContent = '';
      try {
        title = String(parsed.title || '').trim().substring(0, 50);
        noteContent = String(parsed.content || '');
        if (!noteContent) throw new Error('content field is empty');
      } catch (parseError: any) {
        throw new Error(`Malformed AI response: ${parseError.message}`);
      }

      // Refusal detection outside the parse try/catch so the error propagates cleanly
      const REFUSAL_PATTERNS = ['no material was provided', 'no content was provided', 'nothing to summarize', 'no source material'];
      const isRefusal = REFUSAL_PATTERNS.some(p => noteContent.toLowerCase().includes(p));
      if (isRefusal) {
        throw new Error('AI_REFUSAL: Extracted content was insufficient to generate meaningful notes');
      }

      return {
        title,
        summary: 'Study notes generated from ' + contentType,
        content: noteContent,
      };
    } catch (error: any) {
      console.error('❌ Error generating note:', error);
      throw new Error(`Note generation failed: ${error.message}`);
    }
  }

  /**
   * Build intelligent note generation prompt that adapts based on content type
   */
  private buildNotePrompt(content: string): string {
    // Scale note length to content length
    const wordCount = content.trim().split(/\s+/).length;
    const lengthInstruction =
      wordCount < 100
        ? 'The source is very short. Keep your notes brief — 1 to 2 short sections maximum.'
        : wordCount < 300
        ? 'The source is short. Keep your notes concise — only cover what is explicitly in the material.'
        : wordCount < 800
        ? 'Write notes proportional to the content — do not pad or expand beyond what is in the source.'
        : 'Cover the material thoroughly but stay within what the source contains.';

    return `You are Clinical Fact, a note-taking assistant for nursing and medical students. Your job is to analyze the provided material and create organized, structured study notes that capture the key clinical information.

Respond with a single JSON object matching this exact schema:
{
  "title": "string (max 50 characters — a concise, descriptive title for the notes)",
  "content": "string (HTML-formatted notes body)"
}

CRITICAL RULES:
1. Use ONLY information that is explicitly stated in the source material below.
2. Do NOT add examples, context, explanations, or facts that are not in the source.
3. Do NOT expand on topics beyond what the source covers.
4. ${lengthInstruction}
5. Use simple HTML formatting for the content field — no markdown symbols (**, ##, --, etc).
6. CRITICAL JSON RULES:
   - Output pure JSON only
   - All double quotes INSIDE string values (including inside HTML content) MUST be escaped as \"
   - All newlines INSIDE string values MUST be written as \\n (the literal two-character sequence)
   - Do NOT use actual line breaks inside any JSON string value
   - For HTML attributes, use single quotes: <p class='main'> NOT <p class="main">

HTML formatting rules for the content field:
- <h3> for section headings
- <p> for paragraphs
- <ul><li> for bullet lists
- <b> or <strong> for emphasis
- No markdown, only HTML tags

Focus: Medical concepts and terminology, mechanisms, causes and symptoms, standard treatment and dosing considerations, and clinically relevant details a nursing or medical student would need to retain — not just a paraphrase of the source.

--- SOURCE MATERIAL ---
${content}
--- END OF SOURCE MATERIAL ---

Structure the content value like this (omit sections if the source doesn't have enough material for them):

<h3>Overview</h3>
<p>[1-2 sentences summarising what this material is about, using only what is stated in the source]</p>

<h3>Key Points</h3>
[The main ideas from the source, in clear language]

<h3>Details</h3>
[Specific facts, steps, or details from the source — only if the source contains them]

<h3>Summary</h3>
[The most important takeaways from the source — no new information]

Return ONLY the JSON object. No markdown code blocks, no surrounding text.`;
  }

  /**
   * Generate note from YouTube video
   */
  async generateNoteFromYouTube(
    transcript: string,
    videoTitle: string,
    userPreferences?: any
  ): Promise<{ title: string; summary?: string; content: string }> {
    try {
      const result = await this.generateNote(transcript, 'YouTube video', userPreferences);
      result.title = videoTitle;
      return result;
    } catch (error: any) {
      throw new Error(`YouTube note generation failed: ${error.message}`);
    }
  }

  /**
   * Enhance existing note
   */
  async enhanceNote(existingContent: string): Promise<string> {
    try {
      const prompt = `Enhance and improve these study notes. Make them clearer, better organized, and more comprehensive:

${existingContent}

Keep the same general structure but improve:
- Clarity and readability
- Organization and flow
- Add missing explanations
- Include helpful examples

Return the enhanced notes in standard HTML format using <h3>, <p>, <ul>, <li>, and <b>. Do not use markdown. Do not wrap in JSON.`;

      return await aiService.generateText(prompt);
    } catch (error: any) {
      throw new Error(`Note enhancement failed: ${error.message}`);
    }
  }

  /**
   * Summarize note
   */
  async summarizeNote(noteContent: string, maxLength: number = 500): Promise<string> {
    try {
      const prompt = `Create a clear, informative summary of these study notes in ${maxLength} characters or less.

${noteContent}

Your summary should:
• Capture the main topic and why it matters
• Include the 3-5 most important concepts or takeaways
• Be written in clear, simple language
• Help students quickly understand what these notes cover
• Be engaging and make them want to read the full notes

Write in a friendly, conversational tone. Focus on what students NEED to know, not just listing topics.`;

      return await aiService.generateText(prompt);
    } catch (error: any) {
      throw new Error(`Note summarization failed: ${error.message}`);
    }
  }
}

export default new NoteGenerationService();
