// apps/mobile/src/navigation/MainStackNavigator.tsx

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabNavigator } from './MainTabNavigator';
import { NoteDetailScreen, NoteTranscriptScreen, EditNoteScreen, FolderDetailScreen, CreateFlashcardsScreen, SharedNoteScreen } from '../screens/notes';
import { FlashcardReviewScreen, FlashcardGroupDetailScreen } from '../screens/flashcards';
import {
  UploadAudioScreen,
  GeneratingNoteScreen,
  YouTubeInputScreen,
  YouTubeGeneratingScreen,
  CustomTextInputScreen,
  RecordAudioScreen,
  UploadImageScreen,
  UploadPDFScreen,
} from '../screens/create';
import { QuizScreen, QuizResultsScreen, QuizReviewScreen, QuizGroupDetailScreen } from '../screens/quiz';
import { ChatFileSelectScreen, ChatConversationScreen } from '../screens/chat';
import { FolderScreen, QuizHistoryScreen, FlashcardHistoryScreen, LibraryScreen } from '../screens/main';

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctAnswer: string;
}

export type MainStackParamList = {
  MainTabs: undefined;
  Folder: undefined;
  NoteDetail: { noteId: string; title: string };
  NoteTranscript: { noteId: string; title: string };
  EditNote: { noteId: string; title: string; content?: string };
  FolderDetail: { folderId: string };
  CreateFlashcards: {
    noteId?: string;
    noteTitle?: string;
    setId?: string;
    title?: string;
    mode?: 'create' | 'review';
  };
  FlashcardReview: { setId: string; title: string };
  FlashcardGroupDetail: {
    noteId?: string;
    chatSessionId?: string;
    title: string;
  };
  CreateNote: undefined;
  // `intent` marks the note-creation flow as being on its way to generating a quiz/flashcard
  // set (from CreateFromSourceSheet) rather than just creating a standalone note — it's
  // threaded through to GeneratingNote so "Continue" there can skip the note page and go
  // straight to the question-count drawer instead.
  UploadAudio: { intent?: 'quiz' | 'flashcard' } | undefined;
  RecordAudio: undefined;
  CustomTextInput: { intent?: 'quiz' | 'flashcard' } | undefined;
  UploadImage: { intent?: 'quiz' | 'flashcard' } | undefined;
  UploadPDF: { intent?: 'quiz' | 'flashcard' } | undefined;
  GeneratingNote: {
    sourceType: string;
    fileName?: string;
    fileUri?: string;
    ocrText?: string;
    ocrConfidence?: number;
    transcription?: string;
    intent?: 'quiz' | 'flashcard';
  };
  YouTubeInput: undefined;
  YouTubeGenerating: {
    youtubeUrl: string;
    videoId: string;
    videoTitle: string;
    thumbnail?: string;
    channelTitle?: string;
  }
  Quiz: {
    noteId?: string;
    noteTitle?: string;
    questionCount?: number;
    timeInMinutes?: number;
    /** When set (chat-sourced quiz, no note behind it), the quiz is generated from this transcript instead of a note. */
    chatTranscript?: string;
    /** The originating chat session — links the generated quiz back to it so retakes group
     *  under the same chat instead of appearing as separate quiz history entries. */
    chatSessionId?: string;
    /** When set, load this specific already-generated quiz instead of generating a new one —
     *  used to resume a "Not Started" attempt from the quiz group detail screen. */
    quizId?: string;
    /** Explicit language override for generation — used by the "Translate" action, which
     *  takes priority over the note/user's default study language. */
    targetLanguage?: string;
  };
  QuizResults: {
    noteId?: string;
    noteTitle?: string;
    totalQuestions: number;
    correctAnswers: number;
    timeTaken: number;
    answers: Record<string, string>;
    questions: QuizQuestion[];
    quizId?: string;
    chatTranscript?: string;
    chatSessionId?: string;
  };
  QuizReview: {
    noteId?: string;
    noteTitle?: string;
    answers?: Record<string, string>;
    questions?: QuizQuestion[];
    quizId?: string;
    title?: string;
    mode?: 'review';
  };
  QuizGroupDetail: {
    noteId?: string;
    chatSessionId?: string;
    title: string;
  };
  ChatFileSelect: {
    type: 'note' | 'image' | 'document' | 'pdf' | 'audio';
    /** When set, picking/uploading a file attaches it to this existing session instead of creating a new one. */
    attachToSessionId?: string;
    /** When true, skips the browse-existing-notes screen and opens the upload picker immediately. */
    autoUpload?: boolean;
    /** For type 'image' + autoUpload: which picker to launch. Defaults to 'library'. */
    imageSource?: 'camera' | 'library';
  };
  ChatConversation: {
    chatId?: string;
    noteId?: string;
    title?: string;
    type?: 'note' | 'image' | 'document' | 'pdf' | 'audio' | 'medical_qa';
    fileName?: string;
  } | undefined;
  SharedNote: { shareableLink: string };
  QuizHistoryScreen: undefined;
  FlashcardHistoryScreen: undefined;
  // No longer a bottom tab (replaced by Home/Quiz/Flashcards/Profile), but
  // kept reachable via direct push — e.g. SharedNoteScreen's "View in Library".
  Library: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }} 
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="Folder" component={FolderScreen} />
      <Stack.Screen name="NoteDetail" component={NoteDetailScreen} />
      <Stack.Screen name="NoteTranscript" component={NoteTranscriptScreen} />
      <Stack.Screen name="EditNote" component={EditNoteScreen} />
      <Stack.Screen name="FolderDetail" component={FolderDetailScreen} />
      <Stack.Screen name="CreateFlashcards" component={CreateFlashcardsScreen} />
      <Stack.Screen name="FlashcardReview" component={FlashcardReviewScreen} />
      <Stack.Screen name="FlashcardGroupDetail" component={FlashcardGroupDetailScreen} />
      <Stack.Screen name="UploadAudio" component={UploadAudioScreen} />
      <Stack.Screen name="RecordAudio" component={RecordAudioScreen} />
      <Stack.Screen name="CustomTextInput" component={CustomTextInputScreen} />
      <Stack.Screen name="UploadImage" component={UploadImageScreen} />
      <Stack.Screen name="UploadPDF" component={UploadPDFScreen} />
      <Stack.Screen name="GeneratingNote" component={GeneratingNoteScreen} />
      <Stack.Screen name="YouTubeInput" component={YouTubeInputScreen} />
      <Stack.Screen name="YouTubeGenerating" component={YouTubeGeneratingScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="QuizResults" component={QuizResultsScreen} />
      <Stack.Screen name="QuizReview" component={QuizReviewScreen} />
      <Stack.Screen name="QuizGroupDetail" component={QuizGroupDetailScreen} />
      <Stack.Screen name="ChatFileSelect" component={ChatFileSelectScreen} />
      <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
      <Stack.Screen name="SharedNote" component={SharedNoteScreen} />
      <Stack.Screen name="QuizHistoryScreen" component={QuizHistoryScreen as any} />
      <Stack.Screen name="FlashcardHistoryScreen" component={FlashcardHistoryScreen as any} />
      <Stack.Screen name="Library" component={LibraryScreen} />
    </Stack.Navigator>
  );
};

