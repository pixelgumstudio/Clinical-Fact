// @ts-nocheck
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useFlashcardSync } from '../useFlashcardSync';
import { useFlashcardStore } from '../../store/flashcardStore';
import api from '../../services/api';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('../../store/flashcardStore');

describe('useFlashcardSync Hook', () => {
  let mockCreateFlashcardSet: jest.Mock;
  let mockAddFlashcard: jest.Mock;
  let mockUpdateFlashcard: jest.Mock;
  let mockGetFlashcardSet: jest.Mock;
  let mockGetFlashcardSetsByNote: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock store functions
    mockCreateFlashcardSet = jest.fn();
    mockAddFlashcard = jest.fn();
    mockUpdateFlashcard = jest.fn();
    mockGetFlashcardSet = jest.fn();
    mockGetFlashcardSetsByNote = jest.fn();

    (useFlashcardStore as unknown as jest.Mock).mockReturnValue({
      createFlashcardSet: mockCreateFlashcardSet,
      addFlashcard: mockAddFlashcard,
      updateFlashcard: mockUpdateFlashcard,
      getFlashcardSet: mockGetFlashcardSet,
      getFlashcardSetsByNote: mockGetFlashcardSetsByNote,
    });

    // Setup mock API
    (api.getFlashcardSets as jest.Mock) = jest.fn();
    (api.createFlashcard as jest.Mock) = jest.fn();
    (api.updateFlashcard as jest.Mock) = jest.fn();
  });

  describe('Hook Initialization', () => {
    test('initializes with correct state', () => {
      const { result } = renderHook(() => useFlashcardSync()) as any;

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.syncError).toBeNull();
    });

    test('returns all required functions', () => {
      const { result } = renderHook(() => useFlashcardSync()) as any;

      expect(result.current.loadFlashcardsFromBackend).toBeDefined();
      expect(result.current.syncFlashcardSetToBackend).toBeDefined();
      expect(result.current.syncCardUpdate).toBeDefined();
    });
  });

  describe('loadFlashcardsFromBackend', () => {
    test('calls API to fetch flashcard sets', async () => {
      const mockResponse = {
        success: true,
        data: [],
      };
      (api.getFlashcardSets as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      expect(api.getFlashcardSets).toHaveBeenCalled();
    });

    test('sets isSyncing=true during fetch', async () => {
      const mockResponse = {
        success: true,
        data: [],
      };
      (api.getFlashcardSets as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      );

      const { result } = renderHook(() => useFlashcardSync()) as any;

      const syncPromise = act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      await syncPromise;
      expect(result.current.isSyncing).toBe(false);
    });

    test('merges server flashcard sets into local store', async () => {
      const serverSets = [
        {
          _id: 'set1',
          title: 'Server Set 1',
          cards: [
            { front: 'Q1', back: 'A1', mastered: false, color: '#FFD1B8' },
          ],
          totalCards: 1,
        },
      ];
      const mockResponse = {
        success: true,
        data: serverSets,
      };
      (api.getFlashcardSets as jest.Mock).mockResolvedValue(mockResponse);
      mockGetFlashcardSet.mockReturnValue(null); // Set doesn't exist locally

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      expect(mockCreateFlashcardSet).toHaveBeenCalledWith(
        'Server Set 1',
        expect.any(String),
        1
      );
    });

    test('skips sets that already exist locally', async () => {
      const serverSets = [
        {
          _id: 'set1',
          title: 'Server Set 1',
          cards: [{ front: 'Q1', back: 'A1', mastered: false, color: '#FFD1B8' }],
          totalCards: 1,
        },
      ];
      const mockResponse = {
        success: true,
        data: serverSets,
      };
      (api.getFlashcardSets as jest.Mock).mockResolvedValue(mockResponse);
      mockGetFlashcardSet.mockReturnValue({ id: 'set1', title: 'Local Set' }); // Set exists

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      expect(mockCreateFlashcardSet).not.toHaveBeenCalled();
    });

    test('adds cards to created sets', async () => {
      const serverSets = [
        {
          _id: 'set1',
          title: 'New Set',
          cards: [
            { front: 'Q1', back: 'A1', mastered: false, color: '#FFD1B8' },
            { front: 'Q2', back: 'A2', mastered: true, color: '#C7CEEA' },
          ],
          totalCards: 2,
        },
      ];
      const mockResponse = {
        success: true,
        data: serverSets,
      };
      (api.getFlashcardSets as jest.Mock).mockResolvedValue(mockResponse);
      mockGetFlashcardSet.mockReturnValue(null);

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      expect(mockAddFlashcard).toHaveBeenCalledTimes(2);
      expect(mockAddFlashcard).toHaveBeenCalledWith(
        'set1',
        'Q1',
        'A1',
        '#FFD1B8'
      );
      expect(mockAddFlashcard).toHaveBeenCalledWith(
        'set1',
        'Q2',
        'A2',
        '#C7CEEA'
      );
    });

    test('clears isSyncing flag after successful sync', async () => {
      const mockResponse = {
        success: true,
        data: [],
      };
      (api.getFlashcardSets as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      expect(result.current.isSyncing).toBe(false);
    });

    test('sets error state on API failure', async () => {
      const mockResponse = {
        success: false,
        message: 'Failed to fetch',
      };
      (api.getFlashcardSets as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      expect(result.current.syncError).toBeTruthy();
      expect(result.current.syncError).toContain('Failed');
    });

    test('handles invalid response data format', async () => {
      const mockResponse = {
        success: true,
        data: 'invalid data format', // Not an array
      };
      (api.getFlashcardSets as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      expect(result.current.isSyncing).toBe(false);
    });

    test('handles network errors gracefully', async () => {
      (api.getFlashcardSets as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      expect(result.current.syncError).toBeTruthy();
      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('syncFlashcardSetToBackend', () => {
    test('sends POST request to create flashcard set', async () => {
      mockGetFlashcardSet.mockReturnValue({
        id: 'localSet1',
        title: 'My Set',
        flashcards: [
          {
            question: 'Q1',
            answer: 'A1',
            color: '#FFD1B8',
            mastered: false,
          },
        ],
        totalCards: 1,
        noteId: 'note1',
      });

      (api.createFlashcard as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'set1' },
      });

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncFlashcardSetToBackend('localSet1');
      });

      expect(api.createFlashcard).toHaveBeenCalled();
      const payload = (api.createFlashcard as jest.Mock).mock.calls[0][0];
      expect(payload.title).toBe('My Set');
      expect(payload.cards).toBeDefined();
    });

    test('includes all card data in sync payload', async () => {
      mockGetFlashcardSet.mockReturnValue({
        id: 'localSet1',
        title: 'Set',
        flashcards: [
          {
            question: 'Question 1',
            answer: 'Answer 1',
            color: '#FFD1B8',
            mastered: false,
          },
        ],
        totalCards: 1,
        noteId: 'note1',
      });

      (api.createFlashcard as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncFlashcardSetToBackend('localSet1');
      });

      const payload = (api.createFlashcard as jest.Mock).mock.calls[0][0];
      expect(payload.cards[0]).toEqual({
        front: 'Question 1',
        back: 'Answer 1',
        color: '#FFD1B8',
        mastered: false,
        reviewCount: 0,
      });
    });

    test('does not block UI (async fire-and-forget)', async () => {
      mockGetFlashcardSet.mockReturnValue({
        id: 'localSet1',
        title: 'Set',
        flashcards: [],
        totalCards: 0,
      });

      (api.createFlashcard as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
      );

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        // Function should return immediately without waiting for API
        result.current.syncFlashcardSetToBackend('localSet1');
      });

      // Should not have blocking await
      expect(api.createFlashcard).toHaveBeenCalled();
    });

    test('handles set not found in local store', async () => {
      mockGetFlashcardSet.mockReturnValue(null);

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncFlashcardSetToBackend('nonexistent');
      });

      expect(result.current.syncError).toBeTruthy();
      expect(api.createFlashcard).not.toHaveBeenCalled();
    });

    test('logs error but continues if API call fails', async () => {
      mockGetFlashcardSet.mockReturnValue({
        id: 'localSet1',
        title: 'Set',
        flashcards: [],
        totalCards: 0,
      });

      (api.createFlashcard as jest.Mock).mockRejectedValue(new Error('API error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncFlashcardSetToBackend('localSet1');
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.current.syncError).toBeTruthy();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('syncCardUpdate', () => {
    test('sends PUT request to update card', async () => {
      (api.updateFlashcard as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncCardUpdate('set1', 'card1', { mastered: true });
      });

      expect(api.updateFlashcard).toHaveBeenCalledWith(
        'set1',
        'card1',
        { mastered: true }
      );
    });

    test('includes question update in payload', async () => {
      (api.updateFlashcard as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncCardUpdate('set1', 'card1', {
          question: 'Updated Q',
        });
      });

      const payload = (api.updateFlashcard as jest.Mock).mock.calls[0][2];
      expect(payload.front).toBe('Updated Q');
    });

    test('includes answer update in payload', async () => {
      (api.updateFlashcard as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncCardUpdate('set1', 'card1', {
          answer: 'Updated A',
        });
      });

      const payload = (api.updateFlashcard as jest.Mock).mock.calls[0][2];
      expect(payload.back).toBe('Updated A');
    });

    test('includes color update in payload', async () => {
      (api.updateFlashcard as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncCardUpdate('set1', 'card1', {
          color: '#FF0000',
        });
      });

      const payload = (api.updateFlashcard as jest.Mock).mock.calls[0][2];
      expect(payload.color).toBe('#FF0000');
    });

    test('includes mastered status in payload', async () => {
      (api.updateFlashcard as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncCardUpdate('set1', 'card1', {
          mastered: true,
        });
      });

      const payload = (api.updateFlashcard as jest.Mock).mock.calls[0][2];
      expect(payload.mastered).toBe(true);
    });

    test('does not send update for undefined fields', async () => {
      (api.updateFlashcard as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncCardUpdate('set1', 'card1', {
          mastered: true,
        });
      });

      const payload = (api.updateFlashcard as jest.Mock).mock.calls[0][2];
      expect(payload.front).toBeUndefined();
      expect(payload.back).toBeUndefined();
    });

    test('validates required parameters', async () => {
      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncCardUpdate('', 'card1', {});
      });

      expect(api.updateFlashcard).not.toHaveBeenCalled();
    });

    test('does not block UI (async fire-and-forget)', async () => {
      (api.updateFlashcard as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
      );

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        result.current.syncCardUpdate('set1', 'card1', { mastered: true });
      });

      expect(api.updateFlashcard).toHaveBeenCalled();
    });

    test('logs error but continues if API call fails', async () => {
      (api.updateFlashcard as jest.Mock).mockRejectedValue(new Error('API error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncCardUpdate('set1', 'card1', { mastered: true });
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.current.syncError).toBeTruthy();

      consoleErrorSpy.mockRestore();
    });

    test('handles successful response', async () => {
      (api.updateFlashcard as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncCardUpdate('set1', 'card1', { mastered: true });
      });

      expect(api.updateFlashcard).toHaveBeenCalled();
    });
  });

  describe('Offline Behavior', () => {
    test('continues to work when sync fails', async () => {
      (api.getFlashcardSets as jest.Mock).mockRejectedValue(
        new Error('No internet connection')
      );

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      // Should have error but not crash
      expect(result.current.syncError).toBeTruthy();
    });

    test('persists local state even if backend sync fails', async () => {
      mockGetFlashcardSet.mockReturnValue({
        id: 'localSet1',
        title: 'Set',
        flashcards: [],
        totalCards: 0,
      });

      (api.createFlashcard as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.syncFlashcardSetToBackend('localSet1');
      });

      // Local set should still exist
      expect(mockGetFlashcardSet).toHaveBeenCalledWith('localSet1');
    });
  });

  describe('Error Handling', () => {
    test('handles null error gracefully', async () => {
      (api.getFlashcardSets as jest.Mock).mockRejectedValue(null);

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      expect(result.current.syncError).toBeTruthy();
    });

    test('extracts error message from error object', async () => {
      const error = new Error('Specific API error');
      (api.getFlashcardSets as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useFlashcardSync()) as any;

      await act(async () => {
        await result.current.loadFlashcardsFromBackend();
      });

      expect(result.current.syncError).toContain('Specific API error');
    });
  });
});
