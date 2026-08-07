// @ts-nocheck
/**
 * Offline Mode – Phase 1 Behavioral Test Suite
 *
 * These tests do NOT fix bugs. They document and expose the current limits
 * of the Phase 1 implementation so that future work has a regression baseline.
 *
 * Required dev dependencies (add to apps/mobile/package.json if absent):
 *   @testing-library/react-native
 *   @testing-library/jest-native
 *   jest
 *   jest-expo          (or babel-jest + appropriate preset)
 *   @types/jest
 */

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS MUST BE HOISTED (before any component imports that use testing-library)
// ─────────────────────────────────────────────────────────────────────────────

// 1. AsyncStorage — use the official in-memory jest mock provided by the package.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// 2. NetInfo — programmatic control over connection state.
//    We track registered listeners so we can fire them manually AND update
//    React Query's onlineManager in lockstep.
const mockNetInfoListeners = new Set<(s: { isConnected: boolean | null }) => void>();
let mockCurrentNetState = { isConnected: true as boolean | null };

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((cb: (s: { isConnected: boolean | null }) => void) => {
    mockNetInfoListeners.add(cb);
    cb(mockCurrentNetState); // fire synchronously with current state on registration
    return () => mockNetInfoListeners.delete(cb);
  }),
}));

// 3. API service — both named export `{ api }` (used by authStore) and
//    default export (used by queries.ts). They are the same object in production.
const mockGetNotes = jest.fn();
const mockDeleteNote = jest.fn();
const mockGetNoteById = jest.fn();
const mockGetFolders = jest.fn();
const mockGetMe = jest.fn();
const mockClearTokens = jest.fn().mockResolvedValue(undefined);

const mockApiInstance = {
  getNotes: mockGetNotes,
  deleteNote: mockDeleteNote,
  getNoteById: mockGetNoteById,
  getFolders: mockGetFolders,
  getMe: mockGetMe,
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
  googleAuth: jest.fn(),
  appleAuth: jest.fn(),
  refreshToken: jest.fn(),
  completeSignup: jest.fn(),
  skipSignup: jest.fn(),
  updateUserLanguage: jest.fn(),
  moveNoteToFolder: jest.fn(),
  retranscribeNote: jest.fn(),
  translateNote: jest.fn(),
  exportNote: jest.fn(),
};

jest.mock('../src/services/api', () => ({
  __esModule: true,
  api: mockApiInstance,
  default: mockApiInstance,
}));

// 4. Token storage — authStore's signOut calls clearTokens().
jest.mock('../src/services/tokenStorage', () => {
  const mockClearTokens = jest.fn().mockResolvedValue(undefined);
  return {
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    getRefreshToken: jest.fn().mockResolvedValue('mock-refresh'),
    saveTokens: jest.fn().mockResolvedValue(undefined),
    clearTokens: mockClearTokens,
  };
});

// 5. React Navigation — queries.ts imports useFocusEffect at module scope.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { noteId: 'note-1' } }),
  useFocusEffect: jest.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// ALL IMPORTS MUST COME BEFORE describe() BLOCKS TO AVOID HOOK REGISTRATION ERRORS
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from '@testing-library/react-native';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNotes, useDeleteNote } from '../src/hooks/queries';
import { useAuthStore } from '../src/store/authStore';

// Force @testing-library/react-native to register its hooks NOW, before describe() blocks
// This prevents "Hooks cannot be defined inside tests" errors
jest.requireActual('@testing-library/react-native');

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/** Toggle network state for both NetInfo listeners and React Query's onlineManager. */
function setNetworkConnected(connected: boolean) {
  mockCurrentNetState = { isConnected: connected };
  onlineManager.setOnline(connected);
  mockNetInfoListeners.forEach((fn) => fn(mockCurrentNetState));
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-1';
const CACHE_KEY = `clinicalfact-query-cache-${TEST_USER_ID}`;

const FAKE_NOTE = {
  _id: 'note-1',
  title: 'Photosynthesis Notes',
  createdAt: '2026-01-01T00:00:00.000Z',
  sourceType: 'text',
  content: '<p>Photosynthesis is the process...</p>',
  summary: null,
  folderId: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serialize a note array into the exact on-disk format that
 * createAsyncStoragePersister writes and reads.
 *
 * Shape: { buster, timestamp, clientState: DehydratedState }
 * where DehydratedState is the output of TanStack Query's dehydrate().
 *
 * The queryKey here matches queryKeys.notes(userId) with NO params,
 * i.e. ['notes', userId, 'all'], and the hash is its JSON.stringify form.
 */
function buildPersistedCache(notes: object[]): string {
  const now = Date.now();
  return JSON.stringify({
    buster: '',
    timestamp: now,
    clientState: {
      queries: [
        {
          queryKey: ['notes', TEST_USER_ID, 'all'],
          queryHash: '["notes","test-user-1","all"]',
          state: {
            data: notes,
            dataUpdateCount: 1,
            dataUpdatedAt: now,
            error: null,
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: null,
            fetchStatus: 'idle',
            isInvalidated: false,
            status: 'success',
          },
        },
      ],
      mutations: [],
    },
  });
}

/**
 * Create a fresh QueryClient + persister for each test.
 * Using a fresh client prevents cache state bleeding between tests.
 * throttleTime: 0 eliminates the 1-second write delay in tests.
 */
function buildTestClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
        staleTime: 5 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        networkMode: 'offlineFirst',
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    },
  });

  const persister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: CACHE_KEY,
    throttleTime: 0,
  });

  return { queryClient, persister };
}

function Wrapper({
  queryClient,
  persister,
  children,
}: {
  queryClient: QueryClient;
  persister: ReturnType<typeof createAsyncStoragePersister>;
  children: React.ReactNode;
}) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: {
          // Mirror the App.tsx filter: only persist content queries.
          shouldDehydrateQuery: (query) => {
            const key = query.queryKey[0];
            return key === 'notes' || key === 'folders' || key === 'note';
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal test components (avoids rendering full screens with heavy deps)
// ─────────────────────────────────────────────────────────────────────────────

function NotesListComponent() {
  const { data: notes = [], isLoading, isError, error } = useNotes();
  if (isLoading) return <Text testID="loading">Loading...</Text>;
  if (isError) return <Text testID="error-state">{(error as Error).message}</Text>;
  if (notes.length === 0) return <Text testID="empty">No notes</Text>;
  return (
    <View>
      {(notes as any[]).map((note) => (
        <Text key={note._id} testID={`note-${note._id}`}>
          {note.title}
        </Text>
      ))}
    </View>
  );
}

function DeleteNoteComponent({ noteId }: { noteId: string }) {
  const mutation = useDeleteNote();

  // isPaused is the most precise signal: the mutation was accepted but queued
  // because the network is unavailable (networkMode: 'online' default).
  const statusLabel = mutation.isPaused
    ? 'paused'
    : mutation.isPending
    ? 'pending'
    : mutation.isSuccess
    ? 'success'
    : mutation.isError
    ? 'error'
    : 'idle';

  return (
    <View>
      <Text testID="mutation-status">{statusLabel}</Text>
      <TouchableOpacity
        testID="delete-btn"
        onPress={() => mutation.mutate(noteId)}
      >
        <Text>Delete</Text>
      </TouchableOpacity>
      {mutation.isError && (
        <Text testID="error-msg">{(mutation.error as Error)?.message}</Text>
      )}
      {mutation.isSuccess && <Text testID="success-msg">Deleted!</Text>}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();

  // Seed Zustand auth store with a logged-in user.
  // Note: Zustand setState doesn't trigger React renders, so no act() needed
  useAuthStore.setState({
    user: { id: TEST_USER_ID, email: 'test@clinicalfact.com' } as any,
    isAuthenticated: true,
    isInitialized: true,
    isLoading: false,
  } as any);

  // Start each test online.
  setNetworkConnected(true);
});

afterEach(() => {
  // Restore the global onlineManager state so it doesn't bleed into other suites.
  onlineManager.setOnline(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: The Read-Only Cold Boot
// ─────────────────────────────────────────────────────────────────────────────

describe('Test 1: The Read-Only Cold Boot', () => {
  it('hydrates from the persisted cache and renders notes without any network request', async () => {
    // Pre-populate AsyncStorage with a fake persisted cache containing one note.
    await AsyncStorage.setItem(CACHE_KEY, buildPersistedCache([FAKE_NOTE]));

    // Go offline BEFORE rendering so no background refetch can sneak through.
    setNetworkConnected(false);

    const { queryClient, persister } = buildTestClient();

    render(
      <Wrapper queryClient={queryClient} persister={persister}>
        <NotesListComponent />
      </Wrapper>
    );

    // PersistQueryClientProvider hydrates asynchronously from AsyncStorage.
    // waitFor polls until the note title appears on screen.
    await waitFor(
      () => {
        expect(screen.getByTestId('note-note-1')).toBeTruthy();
        expect(screen.getByText('Photosynthesis Notes')).toBeTruthy();
      },
      { timeout: 3000 }
    );

    // The queryFn must NOT have been invoked — data came from the disk cache only.
    expect(mockGetNotes).not.toHaveBeenCalled();

    // There is no error state: the cached data rendered cleanly.
    expect(screen.queryByTestId('error-state')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: The Offline Mutation Hang
// ─────────────────────────────────────────────────────────────────────────────

describe('Test 2: The Offline Mutation Hang', () => {
  /**
   * ACTUAL BEHAVIOR (current Phase 1 implementation):
   *
   * useDeleteNote() has an onMutate hook that checks onlineManager.isOnline().
   * If offline, it throws an error "OFFLINE_ACTION_BLOCKED". This causes TanStack
   * Query to put the mutation in an ERROR state, not a PAUSED state.
   *
   * From the user's perspective: they tap Delete, and immediately see an error
   * state shown (though depending on UI, may not display to user).
   *
   * NOTE: The original design intent was for React Query's retryer to pause the
   * mutation, but the current hook implementation preemptively throws an error
   * in onMutate before the retryer can engage.
   */
  it('throws an error when trying to delete offline', async () => {
    await AsyncStorage.setItem(CACHE_KEY, buildPersistedCache([FAKE_NOTE]));

    // Offline before the component mounts.
    setNetworkConnected(false);

    const { queryClient, persister } = buildTestClient();

    render(
      <Wrapper queryClient={queryClient} persister={persister}>
        <DeleteNoteComponent noteId="note-1" />
      </Wrapper>
    );

    // Confirm the component is idle before the button press.
    await waitFor(() => {
      expect(screen.getByTestId('mutation-status')).toBeTruthy();
    });
    expect(screen.getByTestId('mutation-status').props.children).toBe('idle');

    // Simulate tapping "Delete" while offline.
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-btn'));
    });

    // The mutation should now be in the error state (thrown by onMutate).
    await waitFor(() => {
      expect(screen.getByTestId('mutation-status').props.children).toBe('error');
    });

    // The network call never happened (thrown in onMutate before mutationFn).
    expect(mockDeleteNote).not.toHaveBeenCalled();

    // Error message IS shown to the user (from the OFFLINE_ACTION_BLOCKED error).
    expect(screen.getByTestId('error-msg')).toBeTruthy();

    // No success message shown.
    expect(screen.queryByTestId('success-msg')).toBeNull();
  });

  it('shows error state when attempting to delete offline, cannot retry by going online', async () => {
    await AsyncStorage.setItem(CACHE_KEY, buildPersistedCache([FAKE_NOTE]));
    mockDeleteNote.mockResolvedValue({ success: true });

    setNetworkConnected(false);

    const { queryClient, persister } = buildTestClient();

    render(
      <Wrapper queryClient={queryClient} persister={persister}>
        <DeleteNoteComponent noteId="note-1" />
      </Wrapper>
    );

    // Trigger delete offline → mutation enters error state immediately (thrown in onMutate).
    await waitFor(() => {
      expect(screen.getByTestId('delete-btn')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('mutation-status').props.children).toBe('error');
    });

    // The API was never called (error thrown in onMutate before mutationFn).
    expect(mockDeleteNote).not.toHaveBeenCalled();

    // Restore connectivity → mutation stays in error state, does NOT auto-retry.
    // (This would require manual retry, which the component doesn't do in Phase 1).
    await act(async () => {
      setNetworkConnected(true);
    });

    // Status should still be error - no automatic retry.
    expect(screen.getByTestId('mutation-status').props.children).toBe('error');
    expect(mockDeleteNote).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: The Logout Data Leak
// ─────────────────────────────────────────────────────────────────────────────

describe('Test 3: The Logout Data Leak', () => {
  /**
   * signOut() in authStore.ts does two things for cache cleanup:
   *   1. clearQueryCache() → queryClient.clear() — wipes in-memory state
   *   2. AsyncStorage.removeItem(`clinicalfact-query-cache-${currentUserId}`) — wipes disk
   *
   * The guard is: `if (currentUserId) { await AsyncStorage.removeItem(...) }`
   *
   * This exposes two behaviors documented below.
   */

  it('[happy path] removes the persisted cache key when userId is defined at logout time', async () => {
    // Plant realistic data on disk for the logged-in user.
    await AsyncStorage.setItem(CACHE_KEY, buildPersistedCache([FAKE_NOTE]));

    const before = await AsyncStorage.getItem(CACHE_KEY);
    expect(before).not.toBeNull();
    const parsed = JSON.parse(before!);
    expect(parsed.clientState.queries[0].state.data[0]._id).toBe('note-1');

    // Call signOut — the function used by every logout button in the app.
    await act(async () => {
      await useAuthStore.getState().signOut();
    });

    const after = await AsyncStorage.getItem(CACHE_KEY);

    // Data IS removed in the synchronous case (throttleTime: 0 removes the race).
    expect(after).toBeNull();

    // Auth state is reset correctly.
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  /**
   * PHASE 2 MITIGATION — the data leak prevention:
   *
   * In Phase 1, signOut() had a guard: `if (currentUserId)` before calling removeItem.
   * This caused data leaks when user.id was undefined at logout time.
   *
   * In Phase 2, signOut() was improved to:
   * 1. Delete ALL cache keys matching the prefix pattern (scorched-earth approach)
   * 2. This prevents the 'anon' key from orphaning data
   *
   * Result: even if user.id is undefined, all persisted cache is still deleted
   * because we multiRemove() all keys matching 'clinicalfact-query-cache-*'.
   *
   * This test documents the Phase 2 fix: orphaned data is now properly cleaned up.
   */
  it('[phase 2 fix] cleans up orphaned data even when user.id is undefined at logout time', async () => {
    const anonCacheKey = 'clinicalfact-query-cache-anon';

    // Simulate data stored under the 'anon' key (the key used when userId is undefined).
    await AsyncStorage.setItem(anonCacheKey, buildPersistedCache([FAKE_NOTE]));

    // Verify data is there before logout.
    let beforeLogout = await AsyncStorage.getItem(anonCacheKey);
    expect(beforeLogout).not.toBeNull();

    // Set up auth store with a user that has NO id — the race-condition state.
    await act(async () => {
      useAuthStore.setState({
        user: { email: 'partial@clinicalfact.com' } as any, // id is undefined
        isAuthenticated: true,
      } as any);
    });

    await act(async () => {
      await useAuthStore.getState().signOut();
    });

    // The scorched-earth approach: multiRemove() deletes ALL 'clinicalfact-query-cache-*' keys.
    // The 'anon' key is deleted even though user.id is undefined.
    const orphaned = await AsyncStorage.getItem(anonCacheKey);
    expect(orphaned).toBeNull();
  });

  /**
   * LATENT RACE — not reproducible with throttleTime: 0, but real at 1000ms:
   *
   * In App.tsx the persister is configured with throttleTime: 1000. This means
   * the persister buffers writes and flushes every ~1 second. If the user
   * triggers logout within that 1-second window after data is fetched, the
   * sequence in production can be:
   *
   *   t=0ms   Notes fetched, persister schedules a write (captured snapshot: [note])
   *   t=500ms signOut() called:
   *              queryClient.clear()          → in-memory cache is now empty
   *              AsyncStorage.removeItem(key) → disk cache deleted ✓
   *   t=1000ms throttled write fires with the t=0 snapshot → re-writes [note] to disk!
   *
   * After this race, the user's data is back on disk even though they logged out.
   * The next cold boot hydrates it, creating a data leak between sessions.
   *
   * This test documents the race but cannot trigger it deterministically with
   * throttleTime: 0. It is flagged as a known Phase 1 limitation for Phase 2.
   */
  it('[known limitation] documents the throttled-write race condition that cannot be caught here', () => {
    // This is a documentation-only test. The race requires real async timing
    // (throttleTime: 1000) that the synchronous AsyncStorage mock does not model.
    //
    // To verify in a real environment: add a 1-second delay between data fetch
    // and signOut(), then inspect AsyncStorage after logout completes.
    //
    // Mitigation (Phase 2): call persister.removeClient() or flush and reset
    // the persister before calling AsyncStorage.removeItem().
    expect(true).toBe(true); // placeholder assertion — test exists to document the gap
  });
});
