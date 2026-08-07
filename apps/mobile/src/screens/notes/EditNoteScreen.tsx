import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
} from '@clinicalfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';
import { useInvalidateNotes } from '../../hooks/queries';

type EditNoteRouteProp = RouteProp<MainStackParamList, 'EditNote'>;
type EditNoteNavigationProp = NativeStackNavigationProp<MainStackParamList, 'EditNote'>;

/** Strip HTML tags and decode common entities to plain text for editing. */
function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Wrap plain text paragraphs back into basic HTML for storage. */
function plainTextToHtml(text: string): string {
  if (!text) return '';
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export const EditNoteScreen = () => {
  const navigation = useNavigation<EditNoteNavigationProp>();
  const route = useRoute<EditNoteRouteProp>();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStatusIndex, setSaveStatusIndex] = useState(0);
  const saveProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveStatusRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const NOTE_STATUSES = [
    'Uploading secure file...',
    'Processing content...',
    'Extracting key concepts...',
    'Formatting your note...',
  ];

  const invalidateNotes = useInvalidateNotes();

  useEffect(() => {
    if (route.params?.title) {
      setTitle(route.params.title);
    }
    if (route.params?.content) {
      setContent(htmlToPlainText(route.params.content));
    }
  }, [route.params]);

  // Drive the overlay progress bar and status text while saving
  useEffect(() => {
    if (!isSaving) {
      if (saveProgressRef.current) clearInterval(saveProgressRef.current);
      if (saveStatusRef.current) clearInterval(saveStatusRef.current);
      setSaveProgress(0);
      setSaveStatusIndex(0);
      return;
    }

    setSaveProgress(0);
    setSaveStatusIndex(0);
    const start = Date.now();

    // Progress: 0→50% over 30s, 50→85% over next 60s, then crawls to 95%
    saveProgressRef.current = setInterval(() => {
      const s = (Date.now() - start) / 1000;
      let p: number;
      if (s <= 30) {
        p = (s / 30) * 50;
      } else if (s <= 90) {
        p = 50 + ((s - 30) / 60) * 35;
      } else {
        p = Math.min(95, 85 + ((s - 90) / 120) * 10);
      }
      setSaveProgress(Math.min(95, p));
    }, 200);

    // Status text cycles every 8 seconds
    saveStatusRef.current = setInterval(
      () => setSaveStatusIndex((i) => (i + 1) % NOTE_STATUSES.length),
      8000
    );

    return () => {
      if (saveProgressRef.current) clearInterval(saveProgressRef.current);
      if (saveStatusRef.current) clearInterval(saveStatusRef.current);
    };
  }, [isSaving]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleSaveNote = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a note title');
      return;
    }

    let savedOk = false;
    try {
      setIsSaving(true);
      const response = await api.updateNote(route.params?.noteId, {
        title: title.trim(),
        content: plainTextToHtml(content.trim()),
      });

      if (response.success) {
        invalidateNotes(route.params?.noteId);
        // Flash 100% then let finally dismiss the overlay
        if (saveProgressRef.current) clearInterval(saveProgressRef.current);
        setSaveProgress(100);
        await new Promise<void>((resolve) => setTimeout(resolve, 250));
        savedOk = true;
      } else {
        Alert.alert('Error', response.message || 'Failed to update note');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update note');
    } finally {
      setIsSaving(false);
    }

    if (savedOk) {
      Alert.alert('Success', 'Note updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ChevronLeftIcon size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit note</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Note Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Note title</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter note title"
              placeholderTextColor={colors.text.tertiary}
              maxLength={200}
            />
          </View>

          {/* Note Content Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Note content</Text>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Enter note content"
              placeholderTextColor={colors.text.tertiary}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveNote}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>Save this note</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Full-screen generation overlay */}
      <Modal visible={isSaving} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>AI is generating your note</Text>
            <Text style={styles.overlayStatus}>{NOTE_STATUSES[saveStatusIndex]}</Text>
            <View style={styles.overlayProgressRow}>
              <View style={styles.overlayProgressBar}>
                <View style={[styles.overlayProgressFill, { width: `${saveProgress}%` as any }]} />
              </View>
              <Text style={styles.overlayProgressPct}>{Math.round(saveProgress)}%</Text>
            </View>
            <Text style={styles.overlaySubtext}>
              Large audio and video files may take a few minutes to process. Please keep the app open.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing[1],
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing[5],
  },
  inputGroup: {
    marginTop: spacing[5],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  titleInput: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  contentInput: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 300,
  },
  bottomContainer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  saveButton: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.neutral[400],
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: '#FFFFFF',
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  overlayCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  overlayTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  overlayStatus: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  overlayProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  overlayProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  overlayProgressFill: {
    height: '100%',
    backgroundColor: colors.neutral[900],
    borderRadius: 4,
  },
  overlayProgressPct: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    width: 36,
    textAlign: 'right',
  },
  overlaySubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
