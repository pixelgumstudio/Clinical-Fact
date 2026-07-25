import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface ExportOptions {
  title: string;
  format: 'pdf' | 'txt';
  isAnswers?: boolean;
}

/**
 * Save exported file and share
 * Expects structured export data with proper encoding from API
 */
export async function handleExportFile(
  exportData: any,
  options: ExportOptions
): Promise<void> {
  try {
    const { title, format, isAnswers = false } = options;
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileType = isAnswers ? 'answers' : 'questions';
    const filename = `${sanitizedTitle}_${fileType}.${format}`;

    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    // Extract structured data from API response
    const { content, encoding, mimeType } = exportData;

    if (!content) {
      throw new Error('Export content is empty');
    }

    console.log('Export data:', {
      contentLength: content.length,
      encoding,
      mimeType,
      filename
    });

    // Write file with proper encoding
    const writeOptions: any = {};
    if (encoding === 'base64') {
      writeOptions.encoding = FileSystem.EncodingType.Base64;
    } else if (encoding === 'utf8') {
      writeOptions.encoding = FileSystem.EncodingType.UTF8;
    }

    await FileSystem.writeAsStringAsync(fileUri, content, writeOptions);

    console.log('File written successfully:', fileUri);

    // Share file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Export ${title}`,
      });
    } else {
      Alert.alert('Success', `File exported: ${filename}`);
    }
  } catch (error) {
    console.error('Export error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    Alert.alert('Export Failed', errorMessage);
  }
}


/**
 * Show export format selector dialog (PDF or TXT)
 * @returns Promise<'pdf' | 'txt'>
 */
export async function selectExportFormat(): Promise<'pdf' | 'txt'> {
  return new Promise((resolve) => {
    Alert.alert(
      'Export Format',
      'Choose format',
      [
        {
          text: 'PDF',
          onPress: () => resolve('pdf'),
        },
        {
          text: 'Text',
          onPress: () => resolve('txt'),
        },
        {
          text: 'Cancel',
          onPress: () => resolve('pdf'), // Default to PDF
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  });
}
