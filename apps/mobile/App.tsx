// apps/mobile/App.tsx
import React, { useEffect, useMemo, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Lora_500Medium } from '@expo-google-fonts/lora';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import { AppNavigator } from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import i18n, { loadUserLanguage } from './src/i18n';
import { useAuthStore } from './src/store/authStore';
import { queryClient } from './src/lib/queryClient';
import notificationService from './src/services/notificationService';
import api from './src/services/api';

// Keep splash screen visible until the design system's fonts (Inter/Lora)
// have loaded — every text style in the theme references these families,
// so rendering before they're ready would flash system-font text.
SplashScreen.preventAutoHideAsync().catch(() => {});

// ── Error Boundary ────────────────────────────────────────────────────────────
// Catches JS render errors in production that would otherwise crash the app
// silently (no red screen in production builds).

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            style={errorStyles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={errorStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

// ── Main App ─────────────────────────────────────────────────────────────────

function AppInner() {
  const userId = useAuthStore(state => state.user?.id);

  // Each user gets their own isolated AsyncStorage key.
  // When userId changes, PersistQueryClientProvider remounts (via key prop below)
  // and hydrates from this user's own cache — never seeing another user's data.
  const persister = useMemo(() =>
    createAsyncStoragePersister({
      storage: AsyncStorage,
      key: `clinicalfact-query-cache-${userId ?? 'anon'}`,
      throttleTime: 1000,
    }),
    [userId]
  );

  useEffect(() => {
    const initLanguage = async () => {
      const user = useAuthStore.getState().user;
      await loadUserLanguage(user?.preferredLanguage);
    };

    initLanguage();
  }, []);

  // Register this device for push notifications once the user is signed in — the
  // backend needs a userId to attach the token to, so this can't run before login.
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    (async () => {
      const token = await notificationService.initializeNotifications();
      if (!token || cancelled) return;
      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      try {
        await api.registerDeviceToken(token, platform);
      } catch (error) {
        console.warn('Failed to register push token:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Deep-link into the relevant screen when the user taps a job-completion notification.
  // The notification payload only carries jobId/jobType (see notification.service.ts on the
  // backend), so the actual note/quiz/flashcard id has to be looked up via the job record.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data as
        | { jobId?: string; jobType?: string }
        | undefined;
      if (!data?.jobId || !navigationRef.isReady() || !useAuthStore.getState().isAuthenticated) return;

      try {
        const res = await api.getJobStatus(data.jobId);
        if (!res.success || !res.data?.result) return;
        const result = res.data.result;
        const id = result._id || result.id;
        if (!id) return;

        switch (data.jobType) {
          case 'note':
            navigationRef.navigate('NoteDetail', { noteId: id, title: result.title || 'Note' });
            break;
          case 'quiz':
            navigationRef.navigate('QuizReview', { quizId: id, title: result.title || 'Quiz', mode: 'review' });
            break;
          case 'flashcard':
            navigationRef.navigate('FlashcardReview', { setId: id, title: result.title || 'Flashcards' });
            break;
          case 'chat':
            navigationRef.navigate('ChatConversation', { chatId: id, title: result.title });
            break;
        }
      } catch (error) {
        console.warn('Failed to handle notification tap:', error);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      key={userId ?? 'anon'}
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <I18nextProvider i18n={i18n}>
        <AppNavigator />
        <StatusBar style="auto" />
      </I18nextProvider>
    </PersistQueryClientProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Lora_500Medium,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SafeAreaProvider>
          <AppInner />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
