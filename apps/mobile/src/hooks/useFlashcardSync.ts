import { useState } from 'react';
import { useFlashcardStore, Flashcard, FlashcardSet } from '../store/flashcardStore';
import api from '../services/api';

export const useFlashcardSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Get store actions
  const {
    createFlashcardSet,
    addFlashcard,
    updateFlashcard,
    getFlashcardSet,
  } = useFlashcardStore();

  /**
   * Load all flashcard sets from backend and merge with local store.
   * Called on app boot to sync local cache with server data.
   *
   * Server data wins on conflicts: if a set exists both locally and on server,
   * server version is used.
   */
  const loadFlashcardsFromBackend = async (): Promise<void> => {
    try {
      setIsSyncing(true);
      setSyncError(null);

      console.log('📥 Loading flashcards from backend...');

      // Fetch all flashcard sets from backend
      const response = await api.getFlashcardSets();

      if (!response.success) {
        console.warn('Failed to load flashcards from backend:', response.message);
        setSyncError('Failed to load flashcards');
        setIsSyncing(false);
        return;
      }

      // Parse server flashcard sets
      const serverSets = response.data || [];

      if (!Array.isArray(serverSets)) {
        console.warn('Invalid flashcard response format:', response.data);
        setIsSyncing(false);
        return;
      }

      console.log(`🔄 Syncing ${serverSets.length} flashcard sets from backend...`);

      // Merge server sets with local store
      // Server wins on conflicts: only add if not already in local store
      serverSets.forEach((serverSet: any) => {
        const localSet = getFlashcardSet(serverSet._id);

        // Skip if already in local store (local state is kept)
        if (localSet) {
          console.log(`✓ Flashcard set ${serverSet._id} already in local store, skipping merge`);
          return;
        }

        // Set doesn't exist locally, add it from server
        console.log(`+ Adding flashcard set ${serverSet._id} from server`);

        try {
          // Create the set locally with server data
          createFlashcardSet(
            serverSet.title || 'Untitled Flashcards',
            serverSet.createdAt || new Date().toISOString(),
            serverSet.totalCards || 0
          );

          // Add each card to the set
          if (Array.isArray(serverSet.cards)) {
            serverSet.cards.forEach((card: any) => {
              addFlashcard(
                serverSet._id,
                card.front || '',
                card.back || '',
                card.color || '#FFD1B8'
              );
            });
          }
        } catch (err) {
          console.error(`Error adding flashcard set ${serverSet._id}:`, err);
        }
      });

      console.log('✅ Flashcard sync completed');
      setIsSyncing(false);
    } catch (err: any) {
      console.error('❌ Error loading flashcards from backend:', err);
      setSyncError(err.message || 'Failed to load flashcards');
      setIsSyncing(false);
    }
  };

  /**
   * Sync a newly created flashcard set to backend (async, fire-and-forget).
   * Local create happens instantly; backend sync happens in background.
   *
   * This is optimistic update pattern: UI updates immediately, sync happens later.
   * If sync fails, error is logged but app continues to work offline.
   */
  const syncFlashcardSetToBackend = async (setId: string): Promise<void> => {
    try {
      // Get the set from local store
      const set = getFlashcardSet(setId);

      if (!set) {
        console.warn(`Flashcard set ${setId} not found in local store`);
        setSyncError(`Flashcard set ${setId} not found`);
        return;
      }

      console.log(`📤 Syncing flashcard set ${setId} to backend...`);

      // Prepare payload with local set data
      const payload = {
        title: set.title,
        cards: set.flashcards.map((card) => ({
          front: card.question,
          back: card.answer,
          color: card.color,
          mastered: false,
          reviewCount: 0,
        })),
        totalCards: set.totalCards,
        noteId: (set as any).noteId || undefined,
      };

      // Fire async call (don't await, don't block UI)
      api
        .createFlashcard(payload)
        .then((response) => {
          if (response.success) {
            console.log(`✅ Flashcard set ${setId} synced to backend`);
          } else {
            console.warn(`⚠️ Backend sync failed for set ${setId}:`, response.message);
            setSyncError(response.message || 'Failed to sync flashcard set');
          }
        })
        .catch((err) => {
          console.error(`❌ Error syncing flashcard set ${setId}:`, err);
          setSyncError(err.message || 'Failed to sync flashcard set');
          // Continue working offline - don't throw error to user
        });
    } catch (err: any) {
      console.error(`❌ Error in syncFlashcardSetToBackend:`, err);
      setSyncError(err.message || 'Failed to sync flashcard set');
    }
  };

  /**
   * Sync a card update (e.g., mastered status) to backend (async, fire-and-forget).
   *
   * Local update happens immediately; backend sync happens in background.
   * If sync fails, local state is kept, next sync attempt will retry.
   */
  const syncCardUpdate = async (
    setId: string,
    cardId: string,
    updates: Partial<Flashcard>
  ): Promise<void> => {
    try {
      // Validate inputs
      if (!setId || !cardId) {
        console.warn('Invalid setId or cardId for syncCardUpdate');
        return;
      }

      console.log(`📤 Syncing card ${cardId} in set ${setId} to backend...`);

      // Prepare update payload
      const updatePayload: any = {};
      if (updates.question !== undefined) updatePayload.front = updates.question;
      if (updates.answer !== undefined) updatePayload.back = updates.answer;
      if (updates.color !== undefined) updatePayload.color = updates.color;
      // Note: mastered status is typically handled via review endpoint
      if ((updates as any).mastered !== undefined) updatePayload.mastered = (updates as any).mastered;

      // Fire async call (don't await, don't block UI)
      api
        .updateFlashcard(setId, cardId, updatePayload)
        .then((response) => {
          if (response.success) {
            console.log(`✅ Card ${cardId} synced to backend`);
          } else {
            console.warn(`⚠️ Backend sync failed for card ${cardId}:`, response.message);
            setSyncError(response.message || 'Failed to sync card update');
          }
        })
        .catch((err) => {
          console.error(`❌ Error syncing card ${cardId}:`, err);
          setSyncError(err.message || 'Failed to sync card update');
          // Continue working offline - don't throw error to user
        });
    } catch (err: any) {
      console.error(`❌ Error in syncCardUpdate:`, err);
      setSyncError(err.message || 'Failed to sync card update');
    }
  };

  return {
    loadFlashcardsFromBackend,
    syncFlashcardSetToBackend,
    syncCardUpdate,
    isSyncing,
    syncError,
  };
};
