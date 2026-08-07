import { useQuery, useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

// ── Query Keys ──────────────────────────────────────────────────────────────
// userId is always the second segment so cached data is never shared across accounts.
export const queryKeys = {
  notes: (userId: string, params?: { folderId?: string; limit?: number; page?: number }) =>
    params ? (['notes', userId, params] as const) : (['notes', userId, 'all'] as const),
  note: (userId: string, id: string) => ['note', userId, id] as const,
  folders: (userId: string, folderType: 'note' | 'chat') => ['folders', userId, folderType] as const,
};

// ── Hooks ────────────────────────────────────────────────────────────────────

export const useNotes = (params?: {
  folderId?: string;
  limit?: number;
  page?: number;
}) => {
  const userId = useAuthStore(state => state.user?.id ?? '');
  return useQuery({
    queryKey: queryKeys.notes(userId, params),
    queryFn: async () => {
      const res = await api.getNotes({ limit: params?.limit, page: 1, ...params });
      if (!res.success) throw new Error(res.message || 'Failed to fetch notes');
      return (res.data?.notes as any[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!userId,
  });
};

export const useFolders = (folderType: 'note' | 'chat' = 'note') => {
  const userId = useAuthStore(state => state.user?.id ?? '');
  return useQuery({
    queryKey: queryKeys.folders(userId, folderType),
    queryFn: async () => {
      const res = await api.getFolders({ folderType });
      if (!res.success) throw new Error(res.message || 'Failed to fetch folders');
      return Array.isArray(res.data) ? (res.data as any[]) : [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!userId,
  });
};

export const useNote = (noteId: string) => {
  const userId = useAuthStore(state => state.user?.id ?? '');
  return useQuery({
    queryKey: queryKeys.note(userId, noteId),
    queryFn: async () => {
      const res = await api.getNoteById(noteId);
      if (!res.success) throw new Error(res.message || 'Failed to fetch note');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!userId && !!noteId,
  });
};

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Returns a function to invalidate all note/folder queries (call after create/update mutations).
 * Only marks active queries stale — no blind background refetches.
 */
export const useInvalidateNotes = () => {
  const qc = useQueryClient();
  const userId = useAuthStore(state => state.user?.id ?? '');
  return useCallback((noteId?: string) => {
    qc.invalidateQueries({ queryKey: ['notes', userId] });
    qc.invalidateQueries({ queryKey: ['folders', userId] });
    if (noteId && userId) {
      qc.invalidateQueries({ queryKey: queryKeys.note(userId, noteId) });
    }
  }, [qc, userId]);
};

/**
 * Delete-note mutation with zero-network optimistic updates.
 * Immediately filters the note out of all list caches and decrements the
 * folder's itemCount in the folders cache. Rolls back on server error.
 */
export const useDeleteNote = () => {
  const qc = useQueryClient();
  const userId = useAuthStore(state => state.user?.id ?? '');

  return useMutation({
    mutationFn: (noteId: string) =>
      api.deleteNote(noteId).then((res) => {
        if (!res.success) throw new Error(res.message || 'Failed to delete note');
        return res;
      }),

    onMutate: async (noteId: string) => {
      // Block the optimistic update and the network call together.
      // Throwing here prevents any cache mutation; onError fires with this
      // error and the hook-level onError skips rollback (context is undefined).
      if (!onlineManager.isOnline()) {
        throw new Error('OFFLINE_ACTION_BLOCKED');
      }

      await qc.cancelQueries({ queryKey: ['notes', userId] });
      await qc.cancelQueries({ queryKey: ['folders', userId] });

      const previousNotesEntries = qc.getQueriesData<any[]>({ queryKey: ['notes', userId] });
      const previousFolders = qc.getQueryData<any[]>(queryKeys.folders(userId, 'note'));
      const previousNote = qc.getQueryData(queryKeys.note(userId, noteId));

      // Find the folderId of the note being deleted so we can decrement the right folder
      let deletedNoteFolderId: string | undefined;
      for (const [, data] of previousNotesEntries) {
        if (!Array.isArray(data)) continue;
        const found = data.find((n: any) => (n._id || n.id) === noteId);
        if (found) {
          deletedNoteFolderId = found.folderId;
          break;
        }
      }

      // Remove the note from every list cache variant
      for (const [key] of previousNotesEntries) {
        qc.setQueryData<any[]>(key, (old) =>
          old ? old.filter((n: any) => (n._id || n.id) !== noteId) : old
        );
      }

      // Decrement itemCount on the owning folder
      if (deletedNoteFolderId) {
        qc.setQueryData<any[]>(queryKeys.folders(userId, 'note'), (old) =>
          old
            ? old.map((f: any) => {
                const fId = f._id || f.id;
                if (fId === deletedNoteFolderId) {
                  return { ...f, itemCount: Math.max(0, (f.itemCount ?? 1) - 1) };
                }
                return f;
              })
            : old
        );
      }

      // Drop the single-note cache entry entirely
      qc.removeQueries({ queryKey: queryKeys.note(userId, noteId) });

      return { previousNotesEntries, previousFolders, previousNote };
    },

    onError: (_err, noteId, context) => {
      if (!context) return;
      for (const [key, data] of context.previousNotesEntries) {
        qc.setQueryData(key, data);
      }
      if (context.previousFolders !== undefined) {
        qc.setQueryData(queryKeys.folders(userId, 'note'), context.previousFolders);
      }
      if (context.previousNote !== undefined) {
        qc.setQueryData(queryKeys.note(userId, noteId), context.previousNote);
      }
    },
  });
};

/**
 * Paginated notes list with infinite-scroll support.
 * Manages its own state so it can accumulate pages without React Query.
 * Uses a fetchId ref to discard stale responses when params change mid-flight.
 */
export const useNotesPaginated = (params?: { folderId?: string; limit?: number }) => {
  const userId = useAuthStore(state => state.user?.id ?? '');
  const limit = params?.limit ?? 15;
  const folderId = params?.folderId;

  const [notes, setNotes] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchNotes = useCallback(
    async (pageNum: number, replace: boolean) => {
      if (!userId) return;
      const fetchId = ++fetchIdRef.current;
      replace ? setIsLoading(true) : setIsLoadingMore(true);

      try {
        const res = await api.getNotes({
          page: pageNum,
          limit,
          ...(folderId ? { folderId } : {}),
        });
        if (fetchId !== fetchIdRef.current) return; // stale — a newer request won
        if (!res.success) throw new Error(res.message ?? 'Failed to fetch notes');

        const newNotes = (res.data?.notes ?? []) as any[];
        const pagination = res.data?.pagination;

        setNotes(prev => (replace ? newNotes : [...prev, ...newNotes]));
        setPage(pageNum);
        setTotalCount(pagination?.total ?? newNotes.length);
        setTotalPages(pagination?.pages ?? 1);
      } catch {
        if (fetchId !== fetchIdRef.current) return;
        // keep existing data on error
      } finally {
        if (fetchId === fetchIdRef.current) {
          replace ? setIsLoading(false) : setIsLoadingMore(false);
        }
      }
    },
    [userId, folderId, limit],
  );

  // Reset + reload whenever the fetch scope changes (folderId, userId, or limit).
  // totalCount is intentionally NOT reset to 0 here — retain the previous value so
  // the UI doesn't flicker to "0 items" while the next fetch is in flight.
  useEffect(() => {
    setNotes([]);
    setPage(1);
    setTotalPages(1);
    fetchNotes(1, true);
  }, [fetchNotes]); // fetchNotes identity changes exactly when its deps change

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || page >= totalPages) return;
    fetchNotes(page + 1, false);
  }, [isLoading, isLoadingMore, page, totalPages, fetchNotes]);

  const refresh = useCallback(() => {
    setNotes([]);
    setPage(1);
    fetchNotes(1, true);
  }, [fetchNotes]);

  return {
    notes,
    isLoading,
    isLoadingMore,
    hasMore: page < totalPages,
    totalCount,
    loadMore,
    refresh,
  };
};

// ── Folder Mutations ─────────────────────────────────────────────────────────

export const useAddFolder = () => {
  const qc = useQueryClient();
  const userId = useAuthStore(state => state.user?.id ?? '');
  return useMutation({
    mutationFn: ({ name, color, folderType = 'note' as 'note' | 'chat' }: {
      name: string;
      color: string;
      folderType?: 'note' | 'chat';
    }) =>
      api.createFolder({ name, color, folderType }).then(res => {
        if (!res.success) throw new Error(res.message || 'Failed to create folder');
        return res;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders', userId] });
    },
    retry: 0,
  });
};

export const useDeleteFolder = () => {
  const qc = useQueryClient();
  const userId = useAuthStore(state => state.user?.id ?? '');
  return useMutation({
    mutationFn: (id: string) =>
      api.deleteFolder(id).then(res => {
        if (!res.success) throw new Error(res.message || 'Failed to delete folder');
        return res;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders', userId] });
      qc.invalidateQueries({ queryKey: ['notes', userId] });
    },
    retry: 0,
  });
};

/**
 * Refetch a query every time the screen comes into focus.
 * Data shows instantly from cache; refetch happens silently in background.
 */
export const useRefetchOnFocus = (refetch: () => void) => {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  useFocusEffect(
    useCallback(() => {
      refetchRef.current();
    }, [])
  );
};
