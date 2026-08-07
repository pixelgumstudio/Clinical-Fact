import { useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import api from '../services/api';

export const useExportFlashcard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportFlashcard = async (
    setId: string,
    setTitle: string,
    format: 'pdf' | 'docx',
    includeAnswers: boolean,
    openShareDialog: boolean = true
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Determine endpoint
      const endpoint = includeAnswers ? 'answers' : 'questions';

      // Call API to get binary data
      const arrayBuffer = await api.getFlashcardExport(setId, endpoint, format);

      // Convert ArrayBuffer to Uint8Array
      const buffer = new Uint8Array(arrayBuffer);

      if (!buffer || buffer.length === 0) {
        setError('Failed to retrieve export data from server.');
        setIsLoading(false);
        return;
      }

      // Sanitize filename
      const sanitized = setTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${sanitized}_${includeAnswers ? 'answers' : 'questions'}.${format}`;

      // Create file URI
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Convert Uint8Array to Base64 string
      const base64String = btoa(String.fromCharCode.apply(null, Array.from(buffer)));

      // Write to filesystem
      await FileSystem.writeAsStringAsync(fileUri, base64String, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Show success alert
      Alert.alert('Success', 'Flashcard set exported successfully!');

      // Open share dialog if requested
      if (openShareDialog) {
        try {
          await Sharing.shareAsync(fileUri, {
            mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            dialogTitle: `${setTitle} - ${format.toUpperCase()}`,
          });
        } catch (shareError) {
          // User cancelled share, don't show error
          console.log('Share dialog cancelled');
        }
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Export error:', err);
      let errorMessage = 'Failed to export flashcard set.';

      if (err.message?.includes('network') || err.message?.includes('timeout')) {
        errorMessage = 'Failed to export. Check your connection.';
      } else if (err.message?.includes('ENOENT') || err.message?.includes('File')) {
        errorMessage = 'Failed to save file to device.';
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return { exportFlashcard, isLoading, error };
};
