import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  MoreVerticalIcon,
} from '@clinicalfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';

type NoteTranscriptRouteProp = RouteProp<MainStackParamList, 'NoteTranscript'>;
type NoteTranscriptNavigationProp = NativeStackNavigationProp<MainStackParamList, 'NoteTranscript'>;

interface TranscriptSegment {
  start?: number;
  end?: number;
  text: string;
}

/** Break a raw transcript string into readable paragraphs (~150 words each) */
function formatTranscriptIntoParagraphs(raw: string): TranscriptSegment[] {
  // Normalise whitespace
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  // Split on sentence boundaries
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  const SENTENCES_PER_PARA = 5;
  const paragraphs: TranscriptSegment[] = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARA) {
    const chunk = sentences.slice(i, i + SENTENCES_PER_PARA).join(' ').trim();
    if (chunk) paragraphs.push({ text: chunk });
  }
  return paragraphs.length > 0 ? paragraphs : [{ text: cleaned }];
}

/** Group Whisper/timed segments into paragraph blocks (every 6 segments) */
function groupSegmentsIntoParagraphs(segments: TranscriptSegment[]): TranscriptSegment[] {
  const GROUP_SIZE = 6;
  const grouped: TranscriptSegment[] = [];
  for (let i = 0; i < segments.length; i += GROUP_SIZE) {
    const chunk = segments.slice(i, i + GROUP_SIZE);
    grouped.push({
      start: chunk[0].start,
      text: chunk.map(s => s.text.trim()).join(' '),
    });
  }
  return grouped;
}

/** Detect if content looks like music/song lyrics */
function detectMusic(text: string): boolean {
  const lower = text.toLowerCase();
  // Explicit music keywords
  if (/\b(chorus|verse|hook|bridge|refrain|outro|intro|pre-chorus)\b/i.test(text)) return true;
  // Very short repeated lines — typical of lyrics
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 4) {
    const avgWords = lines.reduce((s, l) => s + l.split(/\s+/).length, 0) / lines.length;
    if (avgWords < 7) return true; // lyrics tend to be < 7 words per line
  }
  // Filler words common in music
  const fillerCount = (lower.match(/\b(yeah|oh|hey|la|na|da|ooh|ah|whoa|baby|babe)\b/g) || []).length;
  if (fillerCount > 4) return true;
  // High repetition of any short phrase
  const phrases = lower.match(/\b\w[\w\s]{2,20}\b/g) || [];
  const freq: Record<string, number> = {};
  phrases.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
  if (Object.values(freq).some(v => v >= 4)) return true;
  return false;
}

export const NoteTranscriptScreen = () => {
  const navigation = useNavigation<NoteTranscriptNavigationProp>();
  const route = useRoute<NoteTranscriptRouteProp>();

  const [, setNoteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transcriptData, setTranscriptData] = useState<TranscriptSegment[]>([]);
  const [, setIsMusic] = useState(false);

  const noteTitle = route.params?.title || 'Note Transcript';
  const noteId = route.params?.noteId;

  useEffect(() => {
    loadNoteData();
  }, [noteId]);

  const loadNoteData = async () => {
    if (!noteId) {
      Alert.alert('Error', 'No note ID provided');
      navigation.goBack();
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.getNoteById(noteId);

      if (response.success && response.data) {
        setNoteData(response.data);

        // Extract transcript from metadata segments or transcriptText field
        const rawText: string = response.data.transcriptText || '';

        if (response.data.metadata?.segments && Array.isArray(response.data.metadata.segments) && response.data.metadata.segments.length > 0) {
          // Whisper timed segments — group into readable paragraphs
          const grouped = groupSegmentsIntoParagraphs(response.data.metadata.segments);
          setTranscriptData(grouped);
          setIsMusic(detectMusic(rawText || grouped.map((s: TranscriptSegment) => s.text).join(' ')));
        } else if (rawText.trim().length > 0) {
          // Plain transcript text — break into paragraphs
          const paragraphs = formatTranscriptIntoParagraphs(rawText);
          setTranscriptData(paragraphs);
          setIsMusic(detectMusic(rawText));
        } else if (response.data.sourceType === 'audio' || response.data.sourceType === 'video') {
          setTranscriptData([{ text: 'No transcript available for this note.' }]);
        } else {
          setTranscriptData([{ text: 'This note was not created from audio/video and does not have a transcript.' }]);
        }
      } else {
        Alert.alert('Error', 'Failed to load note');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load note');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (seconds: number | undefined): string => {
    if (seconds === undefined) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleGoToNote = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          { name: 'NoteDetail', params: { noteId: route.params?.noteId || '1', title: noteTitle } },
        ],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ChevronLeftIcon size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Note transcript</Text>
        <TouchableOpacity style={styles.moreButton}>
          <MoreVerticalIcon size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading transcript...</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Note Title */}
            <View style={styles.titleSection}>
              <Text style={styles.noteTitle}>{noteTitle}</Text>
            </View>

            {/* Music detection banner */}
            {/* {isMusic && (
              <View style={styles.musicBanner}>
                <Text style={styles.musicBannerIcon}>🎵</Text>
                <Text style={styles.musicBannerText}>
                  This transcript appears to be music or song lyrics. Note generation may be limited for copyrighted content.
                </Text>
              </View>
            )} */}

            {/* Transcript Content */}
            <View style={styles.transcriptContent}>
              {transcriptData.map((segment, index) => (
                <View key={index} style={styles.transcriptSegment}>
                  {segment.start !== undefined && (
                    <Text style={styles.timestamp}>{formatTimestamp(segment.start)}</Text>
                  )}
                  <Text style={styles.transcriptText}>{segment.text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Bottom Button */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.goToNoteButton} onPress={handleGoToNote}>
              <Text style={styles.goToNoteButtonText}>Go to note</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    textAlign: 'center',
    marginHorizontal: spacing[3],
  },
  moreButton: {
    padding: spacing[1],
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  titleSection: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
  },
  noteTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    lineHeight: 28,
  },
  musicBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    marginHorizontal: spacing[5],
    marginBottom: spacing[4],
    padding: spacing[3],
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: spacing[2],
  },
  musicBannerIcon: {
    fontSize: 18,
  },
  musicBannerText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: '#92400E',
    lineHeight: 20,
  },
  transcriptContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
  },
  transcriptSegment: {
    marginBottom: spacing[5],
  },
  timestamp: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  transcriptText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  bottomContainer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  goToNoteButton: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 12,
    alignItems: 'center',
  },
  goToNoteButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: '#FFFFFF',
  },
});
