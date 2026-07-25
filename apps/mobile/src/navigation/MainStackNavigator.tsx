// apps/mobile/src/navigation/MainStackNavigator.tsx

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabNavigator } from './MainTabNavigator';
import { NoteDetailScreen, NoteTranscriptScreen, EditNoteScreen, FolderDetailScreen, CreateFlashcardsScreen, SharedNoteScreen } from '../screens/notes';
import { FlashcardReviewScreen } from '../screens/flashcards';
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
import { QuizScreen, QuizResultsScreen, QuizReviewScreen } from '../screens/quiz';
import { ChatFileSelectScreen, ChatConversationScreen } from '../screens/chat';
import { FolderScreen, QuizHistoryScreen, FlashcardHistoryScreen } from '../screens/main';

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
  CreateNote: undefined;
  UploadAudio: undefined;
  RecordAudio: undefined;
  CustomTextInput: undefined;
  UploadImage: undefined;
  UploadPDF: undefined;
  GeneratingNote: {
    sourceType: string;
    fileName?: string;
    fileUri?: string;
    ocrText?: string;
    ocrConfidence?: number;
    transcription?: string;
  };
  YouTubeInput: undefined;
  YouTubeGenerating: {
    youtubeUrl: string;
    videoId: string;
    videoTitle: string;
    thumbnail?: string;
    channelTitle?: string;
  }
  Quiz: { noteId: string; noteTitle: string; questionCount?: number; timeInMinutes?: number };
  QuizResults: {
    noteId?: string;
    noteTitle?: string;
    totalQuestions: number;
    correctAnswers: number;
    timeTaken: number;
    answers: Record<string, string>;
    questions: QuizQuestion[];
    quizId?: string;
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
  ChatFileSelect: {
    type: 'note' | 'image' | 'document' | 'pdf';
  };
  ChatConversation: {
    chatId?: string;
    noteId?: string;
    title: string;
    type: 'note' | 'image' | 'document' | 'pdf';
    fileName?: string;
  };
  SharedNote: { shareableLink: string };
  QuizHistoryScreen: undefined;
  FlashcardHistoryScreen: undefined;
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
      <Stack.Screen name="ChatFileSelect" component={ChatFileSelectScreen} />
      <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
      <Stack.Screen name="SharedNote" component={SharedNoteScreen} />
      <Stack.Screen name="QuizHistoryScreen" component={QuizHistoryScreen as any} />
      <Stack.Screen name="FlashcardHistoryScreen" component={FlashcardHistoryScreen as any} />
    </Stack.Navigator>
  );
};

