import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  ProgressCircleCompleteIcon,
  ProgressCircleActiveIcon,
  ProgressCirclePendingIcon,
} from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { api } from '../../services/api';
import appLifecycleService from '../../services/appLifecycleService';
import { useInvalidateNotes } from '../../hooks/queries';
import { AIConsentModal } from '../../components/AIConsentModal';
import { checkAIConsent, saveAIConsent } from '../../hooks/useAIConsent';
import { PoweredByFooter } from '../../components/PoweredByFooter';

type YouTubeGeneratingRouteProp = RouteProp<MainStackParamList, 'YouTubeGenerating'>;
type YouTubeGeneratingNavigationProp = NativeStackNavigationProp<MainStackParamList, 'YouTubeGenerating'>;

interface ProgressStep {
  id: string;
  title: string;
  subtitle: string;
  status: 'completed' | 'active' | 'pending' | 'error';
  progress?: number;
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 60; // 4 min max

export const YouTubeGeneratingScreen = () => {
  const navigation = useNavigation<YouTubeGeneratingNavigationProp>();
  const route = useRoute<YouTubeGeneratingRouteProp>();
  const { youtubeUrl, videoId, videoTitle, thumbnail, channelTitle } = route.params;

  const [steps, setSteps] = useState<ProgressStep[]>([
    { id: 'fetch',      title: 'Fetching video',       subtitle: 'Getting video details',         status: 'active',  progress: 0 },
    { id: 'transcribe', title: 'Extracting transcript', subtitle: 'Converting audio to text',      status: 'pending', progress: 0 },
    { id: 'generate',   title: 'Generating your note',  subtitle: 'AI is summarising the content', status: 'pending', progress: 0 },
  ]);

  const [isComplete, setIsComplete] = useState(false);
  const [generatedNoteId, setGeneratedNoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const invalidateNotes = useInvalidateNotes();

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptsRef = useRef(0);
  const simulatedProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Slowly animate a step's progress toward a cap while real work happens in background
  const startSimulatedProgress = (stepId: string, from: number, cap: number) => {
    if (simulatedProgressRef.current) clearInterval(simulatedProgressRef.current);
    let current = from;
    simulatedProgressRef.current = setInterval(() => {
      current = Math.min(current + 2, cap);
      setSteps(prev =>
        prev.map(step =>
          step.id === stepId && step.status === 'active'
            ? { ...step, progress: current }
            : step
        )
      );
      if (current >= cap) {
        clearInterval(simulatedProgressRef.current!);
        simulatedProgressRef.current = null;
      }
    }, 1800);
  };

  const stopSimulatedProgress = () => {
    if (simulatedProgressRef.current) {
      clearInterval(simulatedProgressRef.current);
      simulatedProgressRef.current = null;
    }
  };

  useEffect(() => {
    checkAIConsent().then((hasConsented) => {
      if (hasConsented) {
        processYouTubeVideo();
      } else {
        setShowConsentModal(true);
      }
    });
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      stopSimulatedProgress();
    };
  }, []);

  const updateStep = (
    stepId: string,
    status: ProgressStep['status'],
    progress?: number
  ) => {
    setSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status, progress: progress ?? step.progress } : step
      )
    );
  };

  const markCurrentStepError = () => {
    setSteps(prev =>
      prev.map(step => step.status === 'active' ? { ...step, status: 'error' } : step)
    );
  };

  /** Poll until note is completed or failed. */
  const pollNoteStatus = (noteId: string) => {
    if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
      handleError('Processing is taking too long. Please try again.');
      return;
    }

    pollTimerRef.current = setTimeout(async () => {
      try {
        pollAttemptsRef.current += 1;
        const res = await api.getYouTubeNoteStatus(noteId);

        if (!res.success || !res.data) {
          pollNoteStatus(noteId);
          return;
        }

        const { processingStatus, processingProgress } = res.data;

        // Update transcribe step progress while audio is being extracted
        if (
          processingStatus === 'audio_extraction' ||
          processingStatus === 'transcribing' ||
          processingStatus === 'processing_transcription'
        ) {
          pollNoteStatus(noteId);
          return;
        }

        // Generating step — transcribe done, kick off simulated progress for generate
        if (processingStatus === 'generating') {
          stopSimulatedProgress();
          updateStep('transcribe', 'completed', 100);
          updateStep('generate', 'active', 10);
          startSimulatedProgress('generate', 10, 85);
          pollNoteStatus(noteId);
          return;
        }

        if (processingStatus === 'completed') {
          stopSimulatedProgress();
          updateStep('transcribe', 'completed', 100);
          updateStep('generate', 'completed', 100);
          setGeneratedNoteId(noteId);
          setIsComplete(true);
          invalidateNotes();
          return;
        }

        if (processingStatus === 'failed') {
          handleError(res.data.error || 'Note generation failed. Please try again.');
          return;
        }

        // Unknown status — keep polling
        pollNoteStatus(noteId);
      } catch {
        // Network hiccup — keep polling
        pollNoteStatus(noteId);
      }
    }, POLL_INTERVAL_MS);
  };

  const handleError = (message: string) => {
    stopSimulatedProgress();
    setError(message);
    markCurrentStepError();
    Alert.alert(
      'Processing Failed',
      message,
      [
        { text: 'Go Back', onPress: () => navigation.goBack() },
        {
          text: 'Retry',
          onPress: () => {
            setError(null);
            pollAttemptsRef.current = 0;
            setSteps([
              { id: 'fetch',      title: 'Fetching video',       subtitle: 'Getting video details',         status: 'active',  progress: 0 },
              { id: 'transcribe', title: 'Extracting transcript', subtitle: 'Converting audio to text',      status: 'pending', progress: 0 },
              { id: 'generate',   title: 'Generating your note',  subtitle: 'AI is summarising the content', status: 'pending', progress: 0 },
            ]);
            processYouTubeVideo();
          },
        },
      ]
    );
  };

  const processYouTubeVideo = async () => {
    try {
      // Step 1 — already have video info from previous screen
      updateStep('fetch', 'active', 50);
      await new Promise(resolve => setTimeout(resolve, 400));
      updateStep('fetch', 'completed', 100);

      // Step 2 — hand off to backend, which handles transcript + Whisper fallback
      updateStep('transcribe', 'active', 10);
      startSimulatedProgress('transcribe', 10, 85);

      const response = await api.generateNoteFromYouTube(youtubeUrl);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to start note generation');
      }

      const { noteId, processingStatus } = response.data;

      // Track in-flight job for background processing
      await appLifecycleService.trackInFlightJob(noteId, 'youtube');

      if (processingStatus === 'completed') {
        // Transcript was available — note is ready immediately
        stopSimulatedProgress();
        updateStep('transcribe', 'completed', 100);
        updateStep('generate', 'completed', 100);
        setGeneratedNoteId(noteId);
        setIsComplete(true);
        invalidateNotes();
      } else {
        // Async Whisper fallback — poll until done, simulated progress already running
        pollNoteStatus(noteId);
      }
    } catch (err: any) {
      handleError(err.message || 'Failed to process YouTube video. Please try again.');
    }
  };

  const handleGoBack = () => {
    if (!isComplete) {
      Alert.alert(
        'Cancel Processing',
        'Are you sure you want to cancel? Your progress will be lost.',
        [
          { text: 'Continue Processing', style: 'cancel' },
          { text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleGoToNote = () => {
    if (generatedNoteId) {
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'MainTabs' },
            { name: 'NoteDetail', params: { noteId: generatedNoteId, title: videoTitle || 'YouTube Note' } },
          ],
        })
      );
    }
  };

  const renderProgressIcon = (status: string) => {
    switch (status) {
      case 'completed': return <ProgressCircleCompleteIcon size={24} />;
      case 'active':    return <ProgressCircleActiveIcon size={24} />;
      case 'error':     return <View style={styles.errorIcon}><Text>❌</Text></View>;
      default:          return <ProgressCirclePendingIcon size={24} />;
    }
  };

  const renderProgressBar = (progress: number, isActive: boolean) => {
    if (!isActive) return null;
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressPercentage}>{progress}%</Text>
      </View>
    );
  };

  const handleConsentAccept = async () => {
    await saveAIConsent();
    setShowConsentModal(false);
    processYouTubeVideo();
  };

  const handleConsentDecline = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AIConsentModal
        visible={showConsentModal}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ChevronLeftIcon size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isComplete ? 'Note Generated' : 'Generating note'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {videoTitle && (
          <View style={styles.videoInfoCard}>
            <Text style={styles.videoTitle} numberOfLines={2}>{videoTitle}</Text>
            {channelTitle && <Text style={styles.channelTitle}>{channelTitle}</Text>}
          </View>
        )}

        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepIconColumn}>
                {renderProgressIcon(step.status)}
                {index < steps.length - 1 && (
                  <View style={[
                    styles.stepLine,
                    step.status === 'completed' && styles.stepLineCompleted,
                    step.status === 'error'     && styles.stepLineError,
                  ]} />
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={[
                  styles.stepTitle,
                  step.status === 'completed' && styles.stepTitleCompleted,
                  step.status === 'error'     && styles.stepTitleError,
                ]}>
                  {step.title}
                </Text>
                <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                {step.status === 'active' && renderProgressBar(step.progress || 0, true)}
              </View>
            </View>
          ))}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <PoweredByFooter />
        {isComplete || generatedNoteId ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoToNote} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Go to note</Text>
          </TouchableOpacity>
        ) : error ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background.primary },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border.light },
  backButton:       { padding: spacing[1] },
  headerTitle:      { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: colors.text.primary },
  headerSpacer:     { width: 32 },
  content:          { flex: 1, paddingHorizontal: spacing[5], paddingTop: spacing[6] },
  videoInfoCard:    { backgroundColor: colors.neutral[50], borderRadius: 12, padding: spacing[4], marginBottom: spacing[6], borderWidth: 1, borderColor: colors.border.light },
  videoTitle:       { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[1] },
  channelTitle:     { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  stepsContainer:   { paddingLeft: spacing[2] },
  stepRow:          { flexDirection: 'row', marginBottom: spacing[2] },
  stepIconColumn:   { alignItems: 'center', marginRight: spacing[4] },
  stepLine:         { width: 2, flex: 1, backgroundColor: colors.neutral[200], marginTop: spacing[2], minHeight: 40 },
  stepLineCompleted:{ backgroundColor: '#10B981' },
  stepLineError:    { backgroundColor: '#DC2626' },
  stepContent:      { flex: 1, paddingBottom: spacing[6] },
  stepTitle:        { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: colors.text.primary, marginBottom: spacing[1] },
  stepTitleCompleted:{ color: '#10B981' },
  stepTitleError:   { color: '#DC2626' },
  stepSubtitle:     { fontSize: typography.fontSize.sm, color: colors.text.tertiary },
  progressBarContainer: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[3] },
  progressBarBackground:{ flex: 1, height: 6, backgroundColor: colors.neutral[200], borderRadius: 3, marginRight: spacing[3], overflow: 'hidden' },
  progressBarFill:  { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },
  progressPercentage:{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary, width: 40, textAlign: 'right' },
  errorIcon:        { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  errorContainer:   { backgroundColor: '#FEE2E2', borderRadius: 12, padding: spacing[4], marginTop: spacing[4] },
  errorText:        { fontSize: typography.fontSize.sm, color: '#DC2626', textAlign: 'center' },
  footer:           { paddingHorizontal: spacing[5], paddingVertical: spacing[4], paddingBottom: spacing[8] },
  primaryButton:    { backgroundColor: '#10B981', paddingVertical: spacing[4], borderRadius: 12, alignItems: 'center' },
  primaryButtonText:{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: '#FFFFFF' },
  secondaryButton:  { borderWidth: 1, borderColor: colors.border.light, paddingVertical: spacing[4], borderRadius: 12, alignItems: 'center' },
  secondaryButtonText:{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
});
