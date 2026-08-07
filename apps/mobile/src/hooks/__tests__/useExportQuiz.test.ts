// @ts-nocheck
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useExportQuiz } from '../useExportQuiz';
import { api } from '../../services/api';

// Mock dependencies
jest.mock('expo-file-system/legacy');
jest.mock('expo-sharing');
jest.mock('../../services/api');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

describe('useExportQuiz Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(FileSystem, 'documentDirectory', { value: '/mock/documents/', configurable: true });
  });

  describe('Hook Initialization', () => {
    test('initializes with correct state', () => {
      const { result } = renderHook(() => useExportQuiz()) as any;

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('exportQuiz - PDF Format', () => {
    test('calls API with correct endpoint for PDF questions export', async () => {
      const mockBuffer = Buffer.from('PDF content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz123', 'Math Quiz', 'pdf', false, false);
      });

      expect(api.getQuizExport).toHaveBeenCalledWith('quiz123', 'questions', 'pdf');
    });

    test('calls API with correct endpoint for PDF answers export', async () => {
      const mockBuffer = Buffer.from('PDF content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz123', 'Math Quiz', 'pdf', true, false);
      });

      expect(api.getQuizExport).toHaveBeenCalledWith('quiz123', 'answers', 'pdf');
    });

    test('saves PDF file to device filesystem', async () => {
      const mockBuffer = Buffer.from('PDF content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz123', 'My Quiz', 'pdf', false, false);
      });

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      const callArgs = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('my_quiz_questions.pdf');
    });

    test('uses Base64 encoding for file save', async () => {
      const mockBuffer = Buffer.from('PDF content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz123', 'Quiz', 'pdf', false, false);
      });

      const callOptions = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][2];
      expect(callOptions.encoding).toBe(FileSystem.EncodingType.Base64);
    });
  });

  describe('exportQuiz - DOCX Format', () => {
    test('calls API with correct endpoint for DOCX questions export', async () => {
      const mockBuffer = Buffer.from('DOCX content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz123', 'Math Quiz', 'docx', false, false);
      });

      expect(api.getQuizExport).toHaveBeenCalledWith('quiz123', 'questions', 'docx');
    });

    test('calls API with correct endpoint for DOCX answers export', async () => {
      const mockBuffer = Buffer.from('DOCX content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz123', 'Math Quiz', 'docx', true, false);
      });

      expect(api.getQuizExport).toHaveBeenCalledWith('quiz123', 'answers', 'docx');
    });

    test('saves DOCX file to device filesystem', async () => {
      const mockBuffer = Buffer.from('DOCX content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz123', 'My Quiz', 'docx', false, false);
      });

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      const callArgs = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('my_quiz_questions.docx');
    });
  });

  describe('Filename Sanitization', () => {
    test('sanitizes special characters in quiz title', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz!@#$%^&*()', 'pdf', false, false);
      });

      const filename = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][0];
      expect(filename).toMatch(/^.*quiz_questions\.pdf$/);
      expect(filename).not.toContain('!');
      expect(filename).not.toContain('@');
    });

    test('converts title to lowercase in filename', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'UPPERCASE QUIZ', 'pdf', false, false);
      });

      const filename = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][0];
      expect(filename).toMatch(/uppercase_quiz_questions\.pdf/);
    });

    test('uses correct format extension', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Test', 'docx', false, false);
      });

      const filename = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][0];
      expect(filename).toMatch(/\.docx$/);
    });
  });

  describe('Share Dialog', () => {
    test('opens share dialog by default', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, true);
      });

      expect(Sharing.shareAsync).toHaveBeenCalled();
    });

    test('does not open share dialog when openShareDialog=false', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, false);
      });

      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    test('passes correct MIME type for PDF sharing', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, true);
      });

      const shareOptions = (Sharing.shareAsync as jest.Mock).mock.calls[0][1];
      expect(shareOptions.mimeType).toBe('application/pdf');
    });

    test('passes correct MIME type for DOCX sharing', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'docx', false, true);
      });

      const shareOptions = (Sharing.shareAsync as jest.Mock).mock.calls[0][1];
      expect(shareOptions.mimeType).toContain('application/vnd.openxmlformats');
    });

    test('handles user canceling share dialog gracefully', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
      (Sharing.shareAsync as jest.Mock).mockRejectedValue(new Error('Share cancelled'));

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, true);
      });

      // Should not set error state when user cancels
      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading State', () => {
    test('sets isLoading=true during export', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockBuffer.buffer), 100))
      );
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      expect(result.current.isLoading).toBe(false);

      const exportPromise = act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, false);
      });

      // isLoading might be true briefly
      await exportPromise;

      // Should be false after completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test('sets isLoading=false after successful export', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    test('sets isLoading=false after failed export', async () => {
      (api.getQuizExport as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('sets error state on network failure', async () => {
      (api.getQuizExport as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain('Check your connection');
    });

    test('sets error state on file save failure', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('ENOENT: file not found')
      );

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain('file');
    });

    test('sets generic error message for unknown failures', async () => {
      (api.getQuizExport as jest.Mock).mockRejectedValue(new Error('Unknown error'));

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, false);
      });

      expect(result.current.error).toBe('Failed to export quiz.');
    });

    test('clears error state before new export', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockRejectedValueOnce(new Error('First error'));
      (api.getQuizExport as jest.Mock).mockResolvedValueOnce(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      // First export fails
      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, false);
      });
      expect(result.current.error).toBeTruthy();

      // Second export succeeds
      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, false);
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty buffer response', async () => {
      const mockBuffer = Buffer.from('');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain('Failed to retrieve');
    });

    test('handles null buffer response', async () => {
      (api.getQuizExport as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useExportQuiz()) as any;

      await act(async () => {
        await result.current.exportQuiz('quiz1', 'Quiz', 'pdf', false, false);
      });

      expect(result.current.error).toBeTruthy();
    });

    test('handles very long quiz title', async () => {
      const mockBuffer = Buffer.from('content');
      (api.getQuizExport as jest.Mock).mockResolvedValue(mockBuffer.buffer);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useExportQuiz()) as any;

      const longTitle = 'A'.repeat(300);
      await act(async () => {
        await result.current.exportQuiz('quiz1', longTitle, 'pdf', false, false);
      });

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      const filename = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][0];
      expect(filename.length).toBeLessThan(500);
    });
  });
});
