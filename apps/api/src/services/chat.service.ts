import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import embeddingService from './embedding.vertexai.service';
import vectorDbService from './vectorDb.service';
import geminiService from './gemini.service';
import europePmcService, { EuropePmcResult, EuropePmcFilters } from './europePmc.service';
import wikimediaImageSearchService, { WikimediaImageResult } from './wikimediaImageSearch.service';
import openFdaService, { OpenFdaDrugResult } from './openFda.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  response: string;
  sources: Array<{
    text: string;
    score: number;
    title?: string;
    sourceType?: string;
    url?: string;
  }>;
}

interface MedicalLiveChatResponse {
  text: string;
  sources: EuropePmcResult[];
  images: WikimediaImageResult[];
  groundingSources: { uri: string; title: string }[];
  drugLabels: OpenFdaDrugResult[];
}

class ChatService {
  /**
   * Embed document for RAG chat
   */
  async embedDocument(
    documentText: string,
    sessionId: string,
    metadata: any = {}
  ): Promise<{
    chunksCount: number;
    sessionId: string;
  }> {
    try {
      console.log(`📄 Embedding document for session ${sessionId}...`);

      // Split document into larger chunks for better semantic coherence
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1500, // Increased from 1000 for better context
        chunkOverlap: 300, // Increased from 200 for better continuity
        separators: ['\n\n', '\n', '. ', ' ', ''],
      });

      const chunks = await textSplitter.splitText(documentText);
      console.log(`✂️ Split document into ${chunks.length} chunks (1500 char size, 300 overlap)`);

      // Generate embeddings for all chunks
      const embeddings = await embeddingService.generateEmbeddings(chunks);
      console.log(`✅ Generated ${embeddings.length} embeddings`);

      // Store in vector database
      await vectorDbService.storeEmbeddings(sessionId, chunks, embeddings, metadata);

      return {
        chunksCount: chunks.length,
        sessionId,
      };
    } catch (error: any) {
      console.error('❌ Error embedding document:', error);
      throw new Error(`Document embedding failed: ${error.message}`);
    }
  }

  /**
   * Chat with document using RAG
   */
  async chat(
    sessionId: string,
    userMessage: string,
    chatHistory: ChatMessage[] = [],
    deepResearch = false
  ): Promise<ChatResponse> {
    try {
      console.log(`💬 Processing chat message for session ${sessionId}...`);

      // Generate embedding for user question
      const queryEmbedding = await embeddingService.generateQueryEmbedding(userMessage);

      // Search for relevant chunks in vector database with improved thresholds
      // Retrieve top 10 chunks with lower similarity threshold for better recall
      const relevantChunks = await vectorDbService.searchSimilar(
        queryEmbedding,
        sessionId,
        10, // Increased from 5 to get more context
        0.15 // Lowered from 0.25 for better recall (more lenient matching)
      );

      if (relevantChunks.length === 0) {
        // Fallback: Try with even lower threshold
        const fallbackChunks = await vectorDbService.searchSimilar(
          queryEmbedding,
          sessionId,
          5,
          0.05 // Very low threshold as fallback
        );

        if (fallbackChunks.length === 0) {
          return {
            response: "I couldn't find relevant information in this document to answer your question. Could you rephrase your question or ask about something else in the document?",
            sources: [],
          };
        }

        // Use fallback chunks if found
        relevantChunks.push(...fallbackChunks);
      }

      // Filter chunks by quality and remove duplicates
      const uniqueChunks = relevantChunks
        .filter(chunk => chunk.score && chunk.score > 0.05)
        .filter((chunk, index, self) =>
          index === self.findIndex(c => c.text.substring(0, 100) === chunk.text.substring(0, 100))
        );

      const contextChunks = uniqueChunks.slice(0, 8);

      // Build numbered context from local chunks only
      const context = contextChunks
        .map((chunk, i) => {
          // Use note title if available, otherwise generate smart fallback
          let title = chunk.metadata?.noteTitle || chunk.metadata?.title;
          if (!title) {
            // Generate context-aware title based on available metadata
            const sourceType = chunk.metadata?.sourceType || 'text';
            title = `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Passage ${i + 1}`;
          }
          const sourceType = chunk.metadata?.sourceType ? ` [${chunk.metadata.sourceType}]` : '';
          return `[${i + 1}] "${title}"${sourceType} (Relevance: ${(chunk.score * 100).toFixed(0)}%)\n${chunk.text}`;
        })
        .join('\n\n---\n\n');

      const systemInstruction = deepResearch
        ? `You are a knowledgeable tutor. You have access to Google Search — use it to find up-to-date information to supplement the user's local study material.

FORMAT YOUR ANSWER AS HTML:
- Use <p>, <b>, <h3>, <ul><li>, <ol><li>, <strong>

CRITICAL INSTRUCTIONS:
- Do NOT use inline citations (e.g., do not write "[1]", "[2]", or "(Source)").
- Do NOT output a bibliography, reference list, or "Sources" section at the end of your response.
- Do NOT output any markdown links for Google Search results.
- Weave the information naturally into your HTML answer without explicitly referencing where you got it from.

Answer in simple, conversational language. Combine Google Search and local material. Use examples and analogies.

Local study material:
${context}`: `You are a friendly and helpful tutor. Explain things naturally, like you're talking to a friend. Be warm and conversational, not stiff or robotic.

FORMAT YOUR ANSWER AS HTML:
- Use <p>, <b>, <h3>, <ul><li>, <ol><li>, <strong>

How to answer:
- Use simple, everyday language
- Only use information from the material below
- If you don't know from the material, say "I don't see that in the material"
- Break complex ideas into simple pieces; use examples and analogies
- Do NOT use inline citations (e.g., do not write "[1]", "[2]", or "(Source)").
- Do NOT output a bibliography, reference list, or "Sources" section at the end of your response.

Material to answer from:
${context}`;

      const messages = [
        ...chatHistory,
        { role: 'user' as const, content: userMessage },
      ];

      const response = deepResearch
        ? await geminiService.chatWithSearch(messages, systemInstruction)
        : await geminiService.chat(messages, systemInstruction);

      console.log(`✅ Generated chat response (${response.length} chars) using ${uniqueChunks.length} local chunks${deepResearch ? ' + native Google Search' : ''}`);

      // const sources = uniqueChunks.slice(0, 5).map(chunk => ({
      //   text: chunk.text.substring(0, 200) + '...',
      //   score: chunk.score,
      //   title: chunk.metadata?.noteTitle || chunk.metadata?.title,
      //   sourceType: chunk.metadata?.sourceType,
      // }));

      return {
        response,
        sources: [],
      };
    } catch (error: any) {
      console.error('❌ Error in chat:', error);
      throw new Error(`Chat failed: ${error.message}`);
    }
  }

  /**
   * Chat using live medical literature (Europe PMC) and clinical images (Wikimedia Commons)
   * instead of the local Qdrant document store — unless the session has attached sources
   * (see chatController.attachSourceToSession), in which case their embedded chunks are
   * retrieved from Qdrant and merged into the same numbered citation list alongside the
   * live literature results.
   */
  async chatMedicalLive(
    userQuery: string,
    history: ChatMessage[] = [],
    filters?: EuropePmcFilters,
    sessionId?: string,
    excludeImageUrls: string[] = []
  ): Promise<MedicalLiveChatResponse> {
    console.log(`🩺 Processing live medical chat for query: "${userQuery}"...`);

    const attachedChunksPromise = sessionId
      ? (async () => {
          const queryEmbedding = await embeddingService.generateQueryEmbedding(userQuery);
          return vectorDbService.searchSimilar(queryEmbedding, sessionId, 5, 0.15);
        })()
      : Promise.resolve([]);

    const [literatureSettled, imagesSettled, attachedSettled, drugLabelsSettled] = await Promise.allSettled([
      europePmcService.search(userQuery, 5, filters),
      // Cap at 6 — Wikimedia relevance drops off fast past that, and this app isn't compulsory
      // about hitting a fixed count (see excludeImageUrls: only genuinely-matching, not-already-
      // shown images make it into the response at all).
      wikimediaImageSearchService.search(userQuery, 6, excludeImageUrls),
      attachedChunksPromise,
      openFdaService.search(userQuery, 3),
    ]);

    const literatureResults = literatureSettled.status === 'fulfilled' ? literatureSettled.value : [];
    const imageResults = imagesSettled.status === 'fulfilled' ? imagesSettled.value : [];
    const attachedChunks = attachedSettled.status === 'fulfilled' ? attachedSettled.value : [];
    const drugLabelResults = drugLabelsSettled.status === 'fulfilled' ? drugLabelsSettled.value : [];

    if (literatureSettled.status === 'rejected') {
      console.error('❌ Europe PMC search failed:', literatureSettled.reason);
    }
    if (imagesSettled.status === 'rejected') {
      console.error('❌ Wikimedia Commons image search failed:', imagesSettled.reason);
    }
    if (attachedSettled.status === 'rejected') {
      console.error('❌ Attached-source retrieval failed:', attachedSettled.reason);
    }
    if (drugLabelsSettled.status === 'rejected') {
      console.error('❌ openFDA search failed:', drugLabelsSettled.reason);
    }

    // Attached-document chunks are numbered first, then literature results, then FDA drug
    // labels continue the sequence — one unified citation list regardless of where a source
    // came from.
    const attachedContextBlocks = attachedChunks.map((chunk, i) => {
      const title = chunk.metadata?.attachedTitle || chunk.metadata?.noteTitle || 'Attached document';
      return `[${i + 1}] "${title}" (from your attached material)\n${chunk.text}`;
    });
    const literatureContextBlocks = literatureResults.map(
      (r) => `[${attachedContextBlocks.length + r.index}] "${r.title}" (${r.year}, ${r.authors})\nAbstract: ${r.abstract}`
    );
    const drugLabelContextBlocks = drugLabelResults.map((r, i) => {
      const name = r.brandName || r.genericName || 'Unknown drug';
      const num = attachedContextBlocks.length + literatureContextBlocks.length + i + 1;
      const sections = [
        r.indications && `Indications: ${r.indications}`,
        r.dosage && `Dosage: ${r.dosage}`,
        r.warnings && `Warnings: ${r.warnings}`,
        r.interactions && `Interactions: ${r.interactions}`,
      ].filter(Boolean).join('\n');
      return `[${num}] "${name}" (FDA drug label)\n${sections}`;
    });
    const context = [...attachedContextBlocks, ...literatureContextBlocks, ...drugLabelContextBlocks].join('\n\n---\n\n');

    const systemInstruction = `You are Clinical Fact, a medical reference AI built for nursing and medical students. Answer accurately using your own medical knowledge as the foundation, and be straightforward and concise — this is a study tool students read on their phone between classes, not an essay. Answer the actual question directly, then stop. Don't pad with restating the question, generic disclaimers, or covering angles the student didn't ask about.

The sources below are supplementary, not a cap on what you're allowed to say:
- Where a source directly supports a specific claim you make, cite it inline with the matching bracketed number (e.g. [1], [2]).
- Fill in standard, well-established medical knowledge (causes, mechanisms, symptoms, standard treatment) even when none of the sources happen to spell it out — that's expected and normal, not "prior knowledge" you need permission for.
- Never invent a citation: only attach a [n] to a sentence if that specific source actually supports it. Uncited sentences are completely fine.
- Only say the sources are insufficient if the question is itself obscure/unsettled enough that even general medical knowledge can't answer it responsibly — never say that for standard textbook topics just because the retrieved abstracts happen to be narrow research papers.

FORMAT YOUR ANSWER AS HTML:
- Use <p>, <b>, <h3>, <ul><li>, <ol><li>, <strong>
- Default to a short, direct answer — a couple of tight paragraphs or a short list is usually enough. Only reach for multiple <h3> sections when the question truly has several distinct parts (e.g. explicitly asks for causes AND symptoms AND treatment) — and even then keep each section brief, not a full writeup.

PATIENT-SPECIFIC QUESTIONS:
- Case-study or exam-style questions (a hypothetical patient framing, e.g. "a 65-year-old presents with...") are normal study material — answer these fully and directly, this is the core use case and must not be over-blocked.
- If a question reads as a real, active clinical situation asking you to make the care decision for a specific real patient (e.g. "my patient," "what do I give her right now"), answer the general/reference version of the underlying clinical question, then add one brief sentence noting that the specific decision belongs with the patient's treating clinician using their full assessment. Do not refuse outright.
- Never ask for, store, or act on real patient-identifying details (name, MRN, date of birth). If a user includes them, ignore the identifying details and answer only the underlying clinical question.

Some sources below are pulled from medical literature, others are official FDA drug labels (marked "FDA drug label" — authoritative for dosing, indications, warnings, and interactions), and others (marked "from your attached material") are from a note or document the user attached to this conversation. Treat all as valid, citeable context, and prioritize attached material since the user chose to bring it into this specific conversation.

You also have live Google Search access — use it to verify current guidance or fill gaps the sources below don't cover. Do not use bracketed citation numbers for anything found via Google Search; the numbered [n] citations above are reserved for the sources list below. Web-grounded information is shown to the user separately, so just write it naturally into the answer.

Sources:
${context || 'No sources found — answer from your own medical knowledge.'}`;

    const messages = [
      ...history,
      { role: 'user' as const, content: userQuery },
    ];

    // Note: EuropePmcFilters (date range/source categories) only ever apply to the Europe PMC
    // search above — Google Search grounding has no equivalent filter API and always searches
    // the live web unfiltered.
    const { text, groundingSources } = await geminiService.chatWithGrounding(messages, systemInstruction);

    console.log(`✅ Generated live medical chat response (${text.length} chars) using ${literatureResults.length} literature sources, ${attachedChunks.length} attached-source chunks, ${drugLabelResults.length} drug labels, ${imageResults.length} images, ${groundingSources.length} grounding sources`);

    return {
      text,
      sources: literatureResults,
      images: imageResults,
      groundingSources,
      drugLabels: drugLabelResults,
    };
  }

  /**
   * Short, LLM-generated chat title from the first exchange — same pattern every major
   * chat product uses (ChatGPT, Claude, etc.) instead of leaving "New chat" / a raw filename.
   * Called once, right after the first assistant reply, never again for that session.
   */
  async generateChatTitle(userMessage: string, assistantReply: string): Promise<string> {
    const plainReply = assistantReply.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const prompt = `Summarize this chat exchange as a short title, the same way ChatGPT or Claude titles a new conversation.

Rules:
- 3 to 6 words, title case, no trailing punctuation, no quotation marks around it.
- Describe the topic, not "chat about X" or "question regarding X" — just the topic itself.
- Reply with ONLY the title, nothing else.

User: ${userMessage.slice(0, 500)}
Assistant: ${plainReply.slice(0, 500)}`;

    try {
      const raw = await geminiService.chat([{ role: 'user', content: prompt }]);
      const title = raw.replace(/^["']|["']$/g, '').replace(/\.$/, '').trim();
      return title.slice(0, 80) || userMessage.slice(0, 60);
    } catch (error) {
      console.error('❌ Failed to generate chat title, falling back to truncated question:', error);
      return userMessage.slice(0, 60);
    }
  }

  /**
   * Chat without RAG (simple conversation)
   */
  async simpleChat(
    userMessage: string,
    chatHistory: ChatMessage[] = []
  ): Promise<string> {
    try {
      const systemInstruction = `You are a helpful AI tutor assistant. Help users with their learning questions in a friendly, clear, and educational way.`;

      const messages = [
        ...chatHistory,
        { role: 'user' as const, content: userMessage },
      ];

      const response = await geminiService.chat(messages, systemInstruction);

      return response;
    } catch (error: any) {
      console.error('❌ Error in simple chat:', error);
      throw new Error(`Chat failed: ${error.message}`);
    }
  }

  /**
   * Summarize chat history
   */
  async summarizeChat(messages: ChatMessage[]): Promise<string> {
    try {
      const conversationText = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      const prompt = `Summarize this conversation in 2-3 sentences, focusing on the main topics discussed and key takeaways:

${conversationText}`;

      const summary = await geminiService.generateText(prompt);

      return summary;
    } catch (error: any) {
      console.error('❌ Error summarizing chat:', error);
      throw new Error(`Chat summarization failed: ${error.message}`);
    }
  }

  /**
   * Generate suggested follow-up questions
   */
  async generateFollowUpQuestions(
    _sessionId: string,
    chatHistory: ChatMessage[]
  ): Promise<string[]> {
    try {
      const lastMessages = chatHistory.slice(-4);
      const conversationText = lastMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      const prompt = `Based on this conversation, suggest 3 relevant follow-up questions the user might want to ask:

${conversationText}

Return ONLY a JSON array of questions (no markdown):
["Question 1?", "Question 2?", "Question 3?"]`;

      const questions = await geminiService.generateJSON(prompt);

      return Array.isArray(questions) ? questions : [];
    } catch (error: any) {
      console.error('❌ Error generating follow-up questions:', error);
      return [];
    }
  }

  /**
   * Delete chat session and associated embeddings
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await vectorDbService.deleteSession(sessionId);
      console.log(`✅ Deleted chat session ${sessionId}`);
    } catch (error: any) {
      console.error('❌ Error deleting session:', error);
      throw new Error(`Session deletion failed: ${error.message}`);
    }
  }

  /**
   * Check if session has embeddings
   */
  async hasEmbeddings(sessionId: string): Promise<boolean> {
    try {
      const count = await vectorDbService.countSessionPoints(sessionId);
      return count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get session info
   */
  async getSessionInfo(sessionId: string) {
    try {
      const chunksCount = await vectorDbService.countSessionPoints(sessionId);

      return {
        sessionId,
        chunksCount,
        hasEmbeddings: chunksCount > 0,
      };
    } catch (error: any) {
      console.error('❌ Error getting session info:', error);
      throw new Error(`Failed to get session info: ${error.message}`);
    }
  }

  /**
   * Embed document from stored note (uses extractedContent for RAG)
   */
  async embedNoteDocument(
    noteId: string,
    sessionId: string
  ): Promise<{
    chunksCount: number;
    sessionId: string;
  }> {
    try {
      // Import Note model dynamically to avoid circular dependencies
      const NoteModel = (await import('../models/Note')).default;
      
      // Retrieve note from database
      const note = await NoteModel.findById(noteId);
      
      if (!note) {
        throw new Error(`Note not found: ${noteId}`);
      }

      // Use extractedContent if available (raw content before AI enhancement)
      // Falls back to content if extractedContent not set
      const contentToEmbed = note.extractedContent || note.transcriptText || note.content;
      
      if (!contentToEmbed) {
        throw new Error('No content available for embedding');
      }

      console.log(`📄 Embedding note ${noteId} for session ${sessionId} (extracted content: ${contentToEmbed.length} chars)`);

      // Use existing embedDocument method with retrieved content
      return await this.embedDocument(contentToEmbed, sessionId, {
        noteId: noteId.toString(),
        noteTitle: note.title,
        sourceType: note.sourceType,
      });
    } catch (error: any) {
      console.error('❌ Error embedding note document:', error);
      throw new Error(`Note embedding failed: ${error.message}`);
    }
  }
}

export default new ChatService();
