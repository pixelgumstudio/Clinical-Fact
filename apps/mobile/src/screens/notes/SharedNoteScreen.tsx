import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, ChevronLeftIcon } from '@clinicalfact/design-system';
import { RichText } from '../../components/RichText';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';
import { useInvalidateNotes } from '../../hooks/queries';

type SharedNoteRouteProp = RouteProp<MainStackParamList, 'SharedNote'>;
type SharedNoteNavigationProp = NativeStackNavigationProp<MainStackParamList, 'SharedNote'>;

export const SharedNoteScreen = () => {
  const navigation = useNavigation<SharedNoteNavigationProp>();
  const route = useRoute<SharedNoteRouteProp>();
  const { shareableLink } = route.params;
  const invalidateNotes = useInvalidateNotes();

  const [note, setNote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await api.getSharedNote(shareableLink);
        if (response.success && response.data) {
          setNote(response.data);
        } else {
          Alert.alert('Not Found', 'This shared note link is invalid or has expired.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } catch {
        Alert.alert('Error', 'Failed to load shared note.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [shareableLink]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await api.saveSharedNote(shareableLink);
      if (response.success) {
        setIsSaved(true);
        invalidateNotes();
        Alert.alert('Saved!', 'Note has been added to your library.', [
          {
            text: 'View in Library',
            onPress: () => navigation.navigate('Library' as any),
          },
          { text: 'Stay here' },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to save note.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save note.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.neutral[900]} />
          <Text style={styles.loadingText}>Loading shared note...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!note) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeftIcon size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Shared Note</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <View style={styles.sharedBadge}>
            <Text style={styles.sharedBadgeText}>Shared with you</Text>
          </View>
          <Text style={styles.noteTitle}>{note.title}</Text>
          <Text style={styles.noteDate}>
            {new Date(note.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </Text>
        </View>

        {note.content ? (
          <View style={styles.contentSection}>
            <RichText content={note.content} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, (isSaving || isSaved) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving || isSaved}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isSaved ? 'Saved to library' : 'Save to my library'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
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
  backButton: { padding: spacing[1] },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    textAlign: 'center',
    marginHorizontal: spacing[3],
  },
  headerRight: { width: 32 },
  scrollView: { flex: 1 },
  titleSection: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
  },
  sharedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    marginBottom: spacing[3],
  },
  sharedBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: '#6366F1',
  },
  noteTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
    lineHeight: 28,
  },
  noteDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  contentSection: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  saveButton: {
    backgroundColor: colors.neutral[900],
    borderRadius: 14,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.neutral[400],
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
