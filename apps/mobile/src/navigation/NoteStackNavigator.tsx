import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NoteDetailScreen, NoteTranscriptScreen } from '../screens/notes';

export type NoteStackParamList = {
  NoteDetail: { noteId: string; title: string };
  NoteTranscript: { noteId: string; title: string };
};

const Stack = createNativeStackNavigator<NoteStackParamList>();

export const NoteStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="NoteDetail" component={NoteDetailScreen} />
      <Stack.Screen name="NoteTranscript" component={NoteTranscriptScreen} />
    </Stack.Navigator>
  );
};
