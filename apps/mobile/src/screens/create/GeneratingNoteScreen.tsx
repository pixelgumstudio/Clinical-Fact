import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { sourceType, fileName, ocrText, fileUri } = route.params || {};
  const [generatedNoteId, setGeneratedNoteId] = useState<string | null>(null);

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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
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

  const getAudioStatusText = (progress: number): string => {
    if (progress <= 10) return 'Uploading and optimizing audio...';
    if (progress <= 20) return 'Slicing audio for AI engine...';
    if (progress <= 60) return 'Transcribing audio to text...';
    if (progress <= 90) return 'Structuring AI note...';
    return 'Applying final polish...';
  };

  const renderProgressIcon = (status: string) => {
    let icon;
    switch (status) {
      case 'completed': icon = <ProgressCircleCompleteIcon size={24} />; break;
      case 'active': icon = <ProgressCircleActiveIcon size={24} />; break;
      default: icon = <ProgressCirclePendingIcon size={24} />; break;
    }
    return <View style={styles.stepIconContainer}>{icon}</View>;
  };

  const renderProgressBar = (step: ProgressStep, isActive: boolean) => {
    if (!isActive) return null;

    const progress = step.progress || 0;
    const displayText = sourceType === 'audio'
      ? getAudioStatusText(progress)
      : step.statusMessage;

    return (
      <View style={styles.progressSection}>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={{
                height: '100%',
                width: animatedProgress.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              }}
            >
              <LinearGradient
                colors={['#F9C597', '#FFB09C', '#EBE19F', '#CEF9D0']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </View>
          <Text style={styles.progressPercentage}>{progress}%</Text>
        </View>
        {displayText ? (
          <Text style={styles.statusMessage}>{displayText}</Text>
        ) : null}
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
          <ChevronLeftIcon size={24} color="#1F2937" />
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
                  {renderProgressIcon(step.status)}
                </View>
                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepTitle,
                      step.status === 'completed' && styles.stepTitleCompleted,
                    ]}
                  >
                    {step.title}
                  </Text>
                  <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
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
            onPress={handleGoToNote}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Go to note</Text>
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
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
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
    borderRadius: 28,
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepConnector: {
    width: 4,
    height: 52,
    backgroundColor: '#E5E5E5',
    marginLeft: 26,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 0,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#2D2D2D',
    marginBottom: spacing[1],
    letterSpacing: -0.28,
  },
  stepTitleCompleted: {
    color: '#10B981',
  },
  stepSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    letterSpacing: -0.24,
  },
  progressSection: {
    marginTop: 16,
    width: '100%',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#F9F9F9',
    borderRadius: 0,
    marginRight: spacing[3],
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  progressPercentage: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: '#757575',
    width: 40,
    textAlign: 'right',
  },
  statusMessage: {
    fontSize: typography.fontSize.xs,
    color: '#F59E0B',
    marginTop: spacing[2],
    fontWeight: typography.fontWeight.medium,
    fontStyle: 'italic',
  },
  noteBox: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    marginBottom: spacing[4],
  },
  noteBoxText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    paddingBottom: spacing[8],
  },
  primaryButton: {
    backgroundColor: '#10B981',
    paddingVertical: spacing[4],
    borderRadius: 9999,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 9999,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    backgroundColor: colors.neutral[200],
  },
  buttonTextDisabled: {
    color: colors.neutral[400],
  },
});
