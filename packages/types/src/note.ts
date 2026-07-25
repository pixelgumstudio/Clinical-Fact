export type NoteType = 'AUDIO' | 'VIDEO' | 'PDF' | 'IMAGE' | 'TEXT' | 'YOUTUBE';

export interface Note {
  id: string;
  userId: string;
  name: string;
  type: NoteType;
  content: string;
  formattedContent: string;
  transcription?: string;
  audioUrl?: string;
  pdfUrl?: string;
  imageUrl?: string;
  youtubeUrl?: string;
  folderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoteRequest {
  name: string;
  type: NoteType;
  content?: string;
  folderId?: string;
}

export interface UpdateNoteRequest {
  name?: string;
  content?: string;
  formattedContent?: string;
  folderId?: string;
}
