import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  AppState,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Icon,
  IconName,
  theme,
} from '@clinicalfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';
import appLifecycleService from '../../services/appLifecycleService';
import { useInvalidateNotes } from '../../hooks/queries';
import { AIConsentModal } from '../../components/AIConsentModal';
import { CustomAlertModal } from '../../components/CustomAlertModal';
import { checkAIConsent, saveAIConsent } from '../../hooks/useAIConsent';
import { useAuthStore } from '../../store/authStore';
import { PoweredByFooter } from '../../components/PoweredByFooter';
import { showInAppPaywall } from '../../services/revenuecat';
import { incrementNoteCount } from '../../utils/feedbackManager';
import { CreateQuizModal } from '../../components/CreateQuizModal';
import { CreateFlashcardsModal } from '../../components/CreateFlashcardsModal';

type GeneratingNoteRouteProp = RouteProp<MainStackParamList, 'GeneratingNote'>;
type GeneratingNoteNavigationProp = NativeStackNavigationProp<MainStackParamList, 'GeneratingNote'>;

interface ProgressStep {
  id: string;
  title: string;
  subtitle: string;
  status: 'completed' | 'active' | 'pending';
  progress?: number;
  statusMessage?: string; // Dynamic status message
}

export const GeneratingNoteScreen = () => {
  const navigation = useNavigation<GeneratingNoteNavigationProp>();
  const route = useRoute<GeneratingNoteRouteProp>();
  const { sourceType, fileName, ocrText, fileUri, intent } = route.params || {};
  const [generatedNoteId, setGeneratedNoteId] = useState<string | null>(null);
  const [isCreateQuizModalVisible, setCreateQuizModalVisible] = useState(false);
  const [isCreateFlashcardsModalVisible, setCreateFlashcardsModalVisible] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

  // Get content from either ocrText or fileUri depending on source type
  const getContent = () => {
    if (ocrText) return ocrText;
    if (sourceType === 'text' && fileUri) return fileUri; // Custom text passes content in fileUri
    return null;
  };

  const contentText = getContent();

  // Dynamic step configuration based on source type
  const getStepsForSourceType = (source: string): ProgressStep[] => {
    switch (source) {
      case 'audio':
        return [
          {
            id: 'upload',
            title: 'Upload audio',
            subtitle: 'Uploading audio file to server...',
            status: 'active',
            progress: 0,
          },
          {
            id: 'transcribe',
            title: 'Transcribe audio',
            subtitle: 'Converting speech to text...',
            status: 'pending',
            progress: 0,
          },
          {
            id: 'generate',
            title: 'Generate your note',
            subtitle: 'Creating study notes...',
            status: 'pending',
            progress: 0,
          },
        ];

      case 'pdf':
        return [
          {
            id: 'upload',
            title: 'Upload PDF',
            subtitle: 'Uploading PDF document to server...',
            status: 'active',
            progress: 0,
          },
          {
            id: 'transcribe',
            title: 'Extract text',
            subtitle: 'Reading and extracting text from PDF...',
            status: 'pending',
            progress: 0,
          },
          {
            id: 'generate',
            title: 'Generate your note',
            subtitle: 'Creating study notes...',
            status: 'pending',
            progress: 0,
          },
        ];

      case 'image':
        return [
          {
            id: 'upload',
            title: 'Upload image',
            subtitle: 'Uploading image to server...',
            status: 'active',
            progress: 0,
          },
          {
            id: 'transcribe',
            title: 'Extract text (OCR)',
            subtitle: 'Recognizing and extracting text from image...',
            status: 'pending',
            progress: 0,
          },
          {
            id: 'generate',
            title: 'Generate your note',
            subtitle: 'Creating study notes...',
            status: 'pending',
            progress: 0,
          },
        ];

      case 'youtube':
        return [
          {
            id: 'upload',
            title: 'Fetch video',
            subtitle: 'Connecting to YouTube...',
            status: 'active',
            progress: 0,
          },
          {
            id: 'transcribe',
            title: 'Extract transcript',
            subtitle: 'Downloading video transcript...',
            status: 'pending',
            progress: 0,
          },
          {
            id: 'generate',
            title: 'Generate your note',
            subtitle: 'Creating study notes...',
            status: 'pending',
            progress: 0,
          },
        ];

      case 'text':
        return [
          {
            id: 'upload',
            title: 'Process text',
            subtitle: 'Analyzing your content...',
            status: 'active',
            progress: 0,
          },
          {
            id: 'generate',
            title: 'Generate your note',
            subtitle: 'Creating study notes...',
            status: 'pending',
            progress: 0,
          },
        ];

      default:
        return [
          {
            id: 'upload',
            title: 'Upload file',
            subtitle: 'Uploading to server...',
            status: 'active',
            progress: 0,
          },
          {
            id: 'transcribe',
            title: 'Process content',
            subtitle: 'Extracting content...',
            status: 'pending',
            progress: 0,
          },
          {
            id: 'generate',
            title: 'Generate your note',
            subtitle: 'Creating study notes...',
            status: 'pending',
            progress: 0,
          },
        ];
    }
  };

  const [steps, setSteps] = useState<ProgressStep[]>(
    getStepsForSourceType(sourceType || 'text')
  );

  const [isComplete, setIsComplete] = useState(false);
  const [currentStepIndex] = useState(0);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttonText: string;
    onButtonPress?: () => void;
  }>({ visible: false, title: '', message: '', buttonText: 'Got it' });

  const closeAlert = () =>
    setAlertConfig({ visible: false, title: '', message: '', buttonText: 'Got it' });
  const invalidateNotes = useInvalidateNotes();
  const simulatedProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseCleanupRef = useRef<(() => void) | null>(null);
  const earlyCreepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const earlyCreepProgressRef = useRef(0);
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const prevActiveStepRef = useRef(-1);
  const { user, updateUser } = useAuthStore();

  // Reconnection / polling refs
  const jobIdRef = useRef<string | null>(null);
  const streamDisconnectedRef = useRef(false);
  const jobCompleteRef = useRef(false);
  const isPollingRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasProcessingStepRef = useRef(false);
  const jobPromiseRef = useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);

  const startSimulatedProgress = (stepIndex: number, from: number, cap: number, message?: string) => {
    if (simulatedProgressRef.current) clearInterval(simulatedProgressRef.current);
    let current = from;
    simulatedProgressRef.current = setInterval(() => {
      current = Math.min(current + 2, cap);
      setSteps(prev =>
        prev.map((step, i) =>
          i === stepIndex && step.status === 'active'
            ? { ...step, progress: current, ...(message ? { statusMessage: message } : {}) }
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
        generateNote();
      } else {
        setShowConsentModal(true);
      }
    });
    return () => {
      stopSimulatedProgress();
      if (earlyCreepRef.current) clearInterval(earlyCreepRef.current);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      sseCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    const activeIndex = steps.findIndex(s => s.status === 'active');
    if (activeIndex < 0) return;

    const targetProgress = steps[activeIndex].progress ?? 0;

    if (activeIndex !== prevActiveStepRef.current) {
      animatedProgress.setValue(0);
      prevActiveStepRef.current = activeIndex;
    }

    Animated.timing(animatedProgress, {
      toValue: targetProgress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [steps]);

  // When the app returns to the foreground, reconnect if the SSE dropped mid-job
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        nextState === 'active' &&
        jobIdRef.current &&
        streamDisconnectedRef.current &&
        !jobCompleteRef.current &&
        !isPollingRef.current
      ) {
        startJobPolling(jobIdRef.current);
      }
    });
    return () => subscription.remove();
  }, []);

  // Shared success handler — called from both SSE and polling paths
  const handleJobSuccess = (result: any, hasProcessingStep: boolean) => {
    const activeStep = 1;
    const finalStepIndex = hasProcessingStep ? 2 : 1;
    stopSimulatedProgress();
    setSteps((prev) => prev.map((step, i) => {
      if (i < activeStep) return step;
      return {
        ...step,
        status: 'completed',
        progress: 100,
        statusMessage: i === finalStepIndex ? 'Note ready!' : 'Complete!',
      };
    }));
    const noteId = result?._id || result?.id || result?.noteId;
    setGeneratedNoteId(noteId);
    setIsComplete(true);
    jobCompleteRef.current = true;
    incrementNoteCount().catch(() => {});
    const nextNotesCount = (user?.notesCount ?? 0) + 1;
    updateUser({
      notesCount: nextNotesCount,
      freeUsage: {
        ...user?.freeUsage,
        notes: { count: (user?.freeUsage?.notes?.count ?? 0) + 1 },
      },
    });
    invalidateNotes();
  };

  // HTTP polling fallback — used when SSE drops or app was backgrounded
  const startJobPolling = (jobId: string) => {
    if (isPollingRef.current || jobCompleteRef.current) return;
    isPollingRef.current = true;

    const MAX_POLL_MS = 10 * 60 * 1000;
    const startTime = Date.now();

    const poll = async () => {
      if (jobCompleteRef.current) { isPollingRef.current = false; return; }
      if (Date.now() - startTime > MAX_POLL_MS) {
        isPollingRef.current = false;
        // Silently stop — SSE dropped and server never responded.
        // Do NOT show the error modal; only a backend 'failed' status should do that.
        return;
      }

      try {
        const res = await api.getJobStatus(jobId);
        if (!res.success || !res.data) {
          pollTimerRef.current = setTimeout(poll, 3000);
          return;
        }
        const { status, result, error } = res.data;
        if (status === 'completed') {
          isPollingRef.current = false;
          handleJobSuccess(result, hasProcessingStepRef.current);
          jobPromiseRef.current?.resolve();
        } else if (status === 'failed') {
          isPollingRef.current = false;
          jobPromiseRef.current?.reject(new Error(error || 'Note generation failed on the server.'));
        } else {
          pollTimerRef.current = setTimeout(poll, 3000);
        }
      } catch {
        // Network hiccup — keep polling silently
        pollTimerRef.current = setTimeout(poll, 3000);
      }
    };

    poll();
  };

 const generateNote = async () => {
    try {
      const isFileUpload = sourceType === 'pdf' || sourceType === 'audio';

      // Step 1: Upload
      setSteps((prev) => prev.map((step, i) =>
        i === 0 ? { ...step, status: 'active', progress: 0, statusMessage: 'Uploading file to server...' } : step
      ));

      await progressWithUpdates(0, 100, 2, [
        { at: 30, message: 'Preparing file...' },
        { at: 70, message: 'Almost done...' },
      ]);

      setSteps((prev) => prev.map((step, i) =>
        i === 0 ? { ...step, status: 'completed', progress: 100, statusMessage: 'Upload complete!' } : step
      ));

      // --- VALIDATION ---
      if (isFileUpload) {
        if (!fileUri) throw new Error(`Missing file URI for ${sourceType} upload.`);
      } else {
        if (!contentText || contentText.trim().length === 0) {
          throw new Error(`No text content to generate note from. Source: ${sourceType}`);
        }
      }

      const hasProcessingStep = sourceType !== 'text';

      if (hasProcessingStep) {
        setSteps((prev) => prev.map((step, i) =>
          i === 1 ? { ...step, status: 'active', progress: 0, statusMessage: 'Initializing...' } : step
        ));
      }

      // Slowly creep step 1 from 0→10% while the real upload is in-flight
      if (isFileUpload && hasProcessingStep) {
        earlyCreepProgressRef.current = 0;
        let creepVal = 0;
        earlyCreepRef.current = setInterval(() => {
          creepVal = Math.min(creepVal + 1, 10);
          earlyCreepProgressRef.current = creepVal;
          setSteps(prev => prev.map((step, i) =>
            i === 1 && step.status === 'active' ? { ...step, progress: creepVal } : step
          ));
          if (creepVal >= 10) {
            clearInterval(earlyCreepRef.current!);
            earlyCreepRef.current = null;
          }
        }, 1000);
      }

      let response;

      if (isFileUpload) {
        const formData = new FormData();
        formData.append('sourceType', sourceType || 'pdf');
        formData.append('title', fileName || 'Untitled Note');

        const cleanUri = Platform.OS === 'ios' ? fileUri?.replace('file://', '') : fileUri;

        const getFileType = () => {
          if (sourceType === 'pdf') return 'application/pdf';
          const extension = fileName?.split('.').pop()?.toLowerCase();
          const audioMimeTypes: Record<string, string> = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'm4a': 'audio/mp4',
            'mp4': 'audio/mp4',
            'ogg': 'audio/ogg',
            'flac': 'audio/flac',
            'aac': 'audio/aac',
            'webm': 'audio/webm',
          };
          return audioMimeTypes[extension || ''] || 'audio/mpeg';
        };

        formData.append('file', {
          uri: cleanUri,
          type: getFileType(),
          name: fileName || (sourceType === 'pdf' ? 'document.pdf' : 'audio.mp3'),
        } as any);

        response = await api.createNote(formData as any);
      } else {
        response = await api.createNote({
          content: contentText!,
          sourceType: sourceType || 'text',
          title: fileName || 'Untitled Note',
        });
      }

      if (earlyCreepRef.current) {
        clearInterval(earlyCreepRef.current);
        earlyCreepRef.current = null;
      }

      if (!response.success || !response.data) {
        const apiError: any = new Error((response as any).message || 'Failed to generate note');
        apiError.code = (response as any).code;
        apiError.quotaExceeded = (response as any).quotaExceeded === true;
        throw apiError;
      }

      // All source types return 202 + jobId/noteId
      const { jobId, noteId } = response.data as { jobId?: string; noteId?: string };
      const id = jobId || noteId;
      if (!id) throw new Error('Server did not return a job ID');

      // Track in-flight job for background processing
      await appLifecycleService.trackInFlightJob(id, 'note');

      await listenJobStream(id, hasProcessingStep);

    } catch (error: any) {
      console.error('Error generating note:', error);

      if (earlyCreepRef.current) {
        clearInterval(earlyCreepRef.current);
        earlyCreepRef.current = null;
      }

      setSteps((prev) => prev.map((step) =>
        step.status === 'active' ? { ...step, status: 'pending', progress: 0 } : step
      ));

      if (error.quotaExceeded === true) {
        await showInAppPaywall();
        return;
      }

      if (error.code === 'AI_GENERATION_RATE_LIMITED') {
        if (user?.isPro) {
          setAlertConfig({
            visible: true,
            title: 'Whoa, speedy! 🏃💨',
            message: "You're generating content a bit too fast. Take a quick 60-second breather before trying again so our AI can catch up.",
            buttonText: 'Got it',
          });
        } else {
          await showInAppPaywall();
        }
        return;
      }

      if (error.code === 'AUDIO_FREE_LIMIT_EXCEEDED') {
        setAlertConfig({
          visible: true,
          title: 'File Too Large',
          message: 'Your file exceeds the 15MB limit for free users. Upgrade to PRO to upload lectures up to 100MB.',
          buttonText: 'Upgrade to PRO',
          onButtonPress: () => {
            closeAlert();
            showInAppPaywall();
          },
        });
        return;
      }

      setAlertConfig({
        visible: true,
        title: 'Oops, we hit a snag 🚧',
        message: "We couldn't generate that right now. Give it a moment and try again!",
        buttonText: 'Got it',
      });
    }
  };

  const listenJobStream = (jobId: string, hasProcessingStep: boolean): Promise<void> => {
    const activeStep = 1;

    jobIdRef.current = jobId;
    hasProcessingStepRef.current = hasProcessingStep;
    streamDisconnectedRef.current = false;
    jobCompleteRef.current = false;

    const startFrom = earlyCreepProgressRef.current;
    earlyCreepProgressRef.current = 0;
    setSteps((prev) => prev.map((step, i) =>
      i === activeStep
        ? { ...step, status: 'active', progress: startFrom, statusMessage: hasProcessingStep ? 'Processing content...' : 'Generating your note...' }
        : step
    ));
    startSimulatedProgress(activeStep, startFrom, 85, 'AI is working...');

    return new Promise<void>((resolve, reject) => {
      jobPromiseRef.current = { resolve, reject };

      const cleanup = api.listenToJobStream(
        jobId,
        (data) => {
          sseCleanupRef.current = null;
          if (data.status === 'failed') {
            jobCompleteRef.current = true;
            reject(new Error(data.error || 'Note generation failed on the server.'));
          } else {
            handleJobSuccess(data.result, hasProcessingStep);
            resolve();
          }
        },
        () => {
          // SSE dropped (app backgrounded or network blip) — silently fall back to polling
          sseCleanupRef.current = null;
          streamDisconnectedRef.current = true;
          startJobPolling(jobId);
        },
        10 * 60 * 1000
      );
      sseCleanupRef.current = cleanup;
    });
  };

  /**
   * Progress with realistic timing and status updates
   * @param stepIndex - Index of step to update
   * @param target - Target progress percentage (0-100)
   * @param durationSeconds - How long to reach target
   * @param updates - Array of { at: percentage, message: string } for status updates
   */
  const progressWithUpdates = (
    stepIndex: number,
    target: number,
    durationSeconds: number,
    updates: Array<{ at: number; message: string }> = []
  ): Promise<void> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const totalDuration = durationSeconds * 1000; // Convert to ms
      let lastMessageIndex = -1;

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / totalDuration) * target, target);

        // Check for status message updates
        const currentMessageIndex = updates.findIndex(u => progress >= u.at && progress < u.at + 5);
        if (currentMessageIndex !== -1 && currentMessageIndex !== lastMessageIndex) {
          lastMessageIndex = currentMessageIndex;
          setSteps((prev) => prev.map((step, i) =>
            i === stepIndex ? {
              ...step,
              progress: Math.floor(progress),
              statusMessage: updates[currentMessageIndex].message
            } : step
          ));
        } else {
          setSteps((prev) => prev.map((step, i) =>
            i === stepIndex ? {
              ...step,
              progress: Math.floor(progress)
            } : step
          ));
        }

        if (progress >= target) {
          clearInterval(interval);
          resolve();
        }
      }, 100); // Update every 100ms for smooth progress
    });
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleGenerateTranscript = () => {
    navigation.navigate('NoteTranscript', {
      noteId: Date.now().toString(),
      title: fileName || 'Audio Note',
    });
  };

  const handleGoToNote = () => {
    if (generatedNoteId) {
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'MainTabs' },
            {
              name: 'NoteDetail',
              params: { noteId: generatedNoteId, title: fileName || 'Note' },
            },
          ],
        })
      );
    }
  };

  // Reached via CreateFromSourceSheet ("Create Quiz from" / "Create Flashcards from") — instead
  // of dropping the user on the note page, "Continue" goes straight to the question-count
  // drawer, same as the chat-transcript path already does.
  const handleContinueAfterGenerate = () => {
    if (!generatedNoteId) return;
    if (intent === 'quiz') {
      setCreateQuizModalVisible(true);
    } else if (intent === 'flashcard') {
      setCreateFlashcardsModalVisible(true);
    } else {
      handleGoToNote();
    }
  };

  const handleConfirmGenerateQuiz = (questionCount: number, timeInMinutes: number) => {
    if (!generatedNoteId) return;
    setCreateQuizModalVisible(false);
    navigation.navigate('Quiz', {
      noteId: generatedNoteId,
      noteTitle: fileName || 'Note',
      questionCount,
      timeInMinutes,
    });
  };

  const handleConfirmGenerateFlashcards = async (cardCount: number) => {
    if (!generatedNoteId) return;
    setIsGeneratingFlashcards(true);
    try {
      const response = await api.generateFlashcards(generatedNoteId, cardCount, 'medium', []);
      if (response.success && response.data) {
        setCreateFlashcardsModalVisible(false);
        navigation.navigate('FlashcardReview', {
          setId: response.data._id,
          title: response.data.title || fileName || 'Flashcards',
        });
      } else if ((response as any).quotaExceeded) {
        setCreateFlashcardsModalVisible(false);
        await showInAppPaywall();
      } else {
        Alert.alert('Error', response.message || 'Failed to generate flashcards');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate flashcards');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // Steps show their own icon (upload/transcribe/generate) throughout — the design only
  // switches every circle to the dark checkmark look once the whole job is done, not
  // per-step (confirmed against the reference: a step still shows its plain icon at 100%
  // progress if a later step hasn't started yet).
  const STEP_ICONS: Record<string, IconName> = {
    upload: 'upward',
    transcribe: 'transcribe',
    generate: 'note',
  };

  const renderProgressIcon = (stepId: string) => {
    if (isComplete) {
      return (
        <View style={[styles.stepIconContainer, styles.stepIconContainerComplete]}>
          <Icon name="sucessfulFill" size={24} color="#FFFFFF" />
        </View>
      );
    }
    return (
      <View style={styles.stepIconContainer}>
        <Icon name={STEP_ICONS[stepId] || 'note'} size={24} color={theme.colors.yale[900]} />
      </View>
    );
  };

  const renderProgressBar = (step: ProgressStep, isActive: boolean) => {
    if (!isActive) return null;

    const progress = step.progress || 0;

    return (
      <View style={styles.progressSection}>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={{
                height: '100%',
                backgroundColor: theme.colors.yale[700],
                width: animatedProgress.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              }}
            />
          </View>
          <Text style={styles.progressPercentage}>{progress}%</Text>
        </View>
      </View>
    );
  };

  const handleConsentAccept = async () => {
    await saveAIConsent();
    setShowConsentModal(false);
    generateNote();
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
      <CreateQuizModal
        visible={isCreateQuizModalVisible}
        onClose={() => setCreateQuizModalVisible(false)}
        onGenerateQuiz={handleConfirmGenerateQuiz}
        noteTitle={fileName}
      />
      <CreateFlashcardsModal
        visible={isCreateFlashcardsModalVisible}
        onClose={() => setCreateFlashcardsModalVisible(false)}
        onGenerateFlashcards={handleConfirmGenerateFlashcards}
        isGenerating={isGeneratingFlashcards}
        noteTitle={fileName}
      />
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText={alertConfig.buttonText}
        onClose={closeAlert}
        onButtonPress={alertConfig.onButtonPress}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Icon name="backFill" size={24} color={theme.colors.grey[600]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Generating note</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Progress Steps */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step.id}>
              <View style={styles.stepRow}>
                <View style={styles.stepIconColumn}>
                  {renderProgressIcon(step.id)}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    {step.title}
                  </Text>
                  <Text style={styles.stepSubtitle}>{step.statusMessage || step.subtitle}</Text>
                  {step.status === 'active' && renderProgressBar(step, true)}
                </View>
              </View>
              {index < steps.length - 1 && (
                <View style={styles.stepConnector} />
              )}
            </View>
          ))}
        </View>

        {!isComplete && (
          <View style={styles.noteBox}>
            <Text style={styles.noteBoxText}>
              Please keep this screen open while your note is being generated. Large files may take a few minutes to transcribe.
            </Text>
          </View>
        )}

        <PoweredByFooter />
      </View>

      {/* Footer Button */}
      <View style={styles.footer}>
        {isComplete ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinueAfterGenerate}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{intent ? 'Continue' : 'Go to note'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              currentStepIndex < 1 && styles.buttonDisabled,
            ]}
            onPress={handleGenerateTranscript}
            disabled={currentStepIndex < 1}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                currentStepIndex < 1 && styles.buttonTextDisabled,
              ]}
            >
              Generate note transcript
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[6],
    justifyContent: 'space-between',
  },
  stepsContainer: {},
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIconColumn: {
    alignItems: 'center',
    marginRight: 16,
    width: 56,
  },
  stepIconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconContainerComplete: {
    backgroundColor: theme.colors.yale[900],
  },
  stepConnector: {
    width: 4,
    height: 52,
    backgroundColor: theme.colors.grey[50],
    marginLeft: 26,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 0,
  },
  stepTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[800],
    marginBottom: theme.spacing[1],
  },
  stepSubtitle: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[500],
  },
  progressSection: {
    marginTop: theme.spacing[4],
    width: '100%',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.grey[10],
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing[3],
    overflow: 'hidden',
  },
  progressPercentage: {
    ...theme.typography.textStyles.label1,
    color: theme.colors.grey[500],
    width: 40,
    textAlign: 'right',
  },
  noteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  noteBoxText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[900],
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  primaryButton: {
    backgroundColor: theme.colors.yale[700],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: theme.colors.yale[700],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonTextDisabled: {
    color: '#FFFFFF',
  },
});
