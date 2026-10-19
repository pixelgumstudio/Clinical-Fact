import { stripHtml } from './htmlText';

/** Shortest transcript the quiz/flashcard backends accept — mirrors the server-side check. */
export const MIN_TRANSCRIPT_CHARS = 100;

/** Longest transcript sent for generation. Longer chats keep only their most recent part so
 *  the request stays within the AI context window and the client's request timeout. */
export const MAX_TRANSCRIPT_CHARS = 20000;

interface TranscriptMessage {
  role: string;
  content: string;
}

/** Plain-text Q/A transcript of a conversation — the source for whole-chat quiz and
 *  flashcard generation. */
export const buildChatTranscript = (messages: TranscriptMessage[] = []): string => {
  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${stripHtml(m.content)}`)
    .join('\n\n');

  return transcript.length > MAX_TRANSCRIPT_CHARS
    ? transcript.slice(-MAX_TRANSCRIPT_CHARS)
    : transcript;
};
