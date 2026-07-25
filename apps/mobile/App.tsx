// apps/mobile/App.tsx
import React, { useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';
import { AppNavigator } from './src/navigation/AppNavigator';
import i18n, { loadUserLanguage } from './src/i18n';
import { useAuthStore } from './src/store/authStore';
import { queryClient } from './src/lib/queryClient';

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
      key: `clinicfact-query-cache-${userId ?? 'anon'}`,
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
  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AppInner />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
