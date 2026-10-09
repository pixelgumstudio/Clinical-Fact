import { MedicalChatSource, MedicalChatImage, MedicalChatGroundingSource } from '../../../services/api';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: MedicalChatSource[];
  images?: MedicalChatImage[];
  groundingSources?: MedicalChatGroundingSource[];
  /** Tappable follow-up suggestions shown beneath the reply once streaming finishes. */
  followUpQuestions?: string[];
  /** Assistant messages only. 'loading' while a stream (initial or retried) is in flight,
   *  'failed' once it errors out (shows the inline Retry button), absent/undefined once a
   *  reply completes successfully — there's no need to keep tagging a message that worked. */
  status?: 'loading' | 'failed';
  /** The attached image's URL, shown as a tappable thumbnail on the bubble. On the optimistic
   *  send it's the local device URI; once loaded from history it's the server-resolved
   *  (presigned) URL — same field either way, since both render identically. */
  attachedImageUri?: string;
}

/** An image or document picked via the "+" sheet, uploaded in the background, and shown as a
 *  removable thumbnail above the composer until the user sends (or removes) it. */
export interface PendingAttachment {
  uri: string;
  fileName: string;
  kind: 'image' | 'document';
  fileId?: string;
  isUploading: boolean;
}
