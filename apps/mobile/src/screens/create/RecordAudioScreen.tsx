import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Audio } from "expo-av";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  RecordAudioGradientIcon,
  AudioFilePreviewIcon,
} from "@clinicfact/design-system";
import { MainStackParamList } from "../../navigation/MainStackNavigator";
import { useGatedFeature } from "../../hooks/useGatedFeature";
import { PoweredByFooter } from "../../components/PoweredByFooter";

type RecordAudioNavigationProp = NativeStackNavigationProp<
  MainStackParamList,
  "RecordAudio"
>;

// Recording states
type RecordingState = "idle" | "recording" | "paused" | "stopped";

// Pause/Play Button Icon
const PauseIcon = ({
  size = 24,
  color = "#FFFFFF",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="6" y="4" width="4" height="16" rx="1" fill={color} />
    <Rect x="14" y="4" width="4" height="16" rx="1" fill={color} />
  </Svg>
);

const PlayIcon = ({
  size = 24,
  color = "#FFFFFF",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8 5V19L19 12L8 5Z" fill={color} />
  </Svg>
);

const StopIcon = ({
  size = 24,
  color = "#EF4444",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="16" height="16" rx="2" fill={color} />
  </Svg>
);

export const RecordAudioScreen = () => {
  const navigation = useNavigation<RecordAudioNavigationProp>();
  const { withAccess } = useGatedFeature();
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingUriRef = useRef<string | null>(null);


  useEffect(() => {
    requestPermissions();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
    }
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.error("Error unloading sound:", error);
      }
    }
  };

  const requestPermissions = async () => {
    try {
      console.log("📢 Requesting audio recording permissions...");
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted");

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant microphone permission to record audio.",
          [{ text: "OK" }],
        );
      } else {
        console.log("✅ Audio recording permission granted");
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
      Alert.alert("Error", "Failed to request microphone permission");
    }
  };

  const handleGoBack = async () => {
    await cleanup();
    navigation.goBack();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = () => {
    const now = new Date();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, "0");
    return `Created ${month} ${day}, ${year}, ${formattedHours}:${formattedMinutes}${ampm}`;
  };

  const startRecording = async () => {
    if (!hasPermission) {
      Alert.alert(
        "Permission Required",
        "Please grant microphone permission to record audio.",
      );
      await requestPermissions();
      return;
    }

    try {
      console.log("🎙️ Starting recording...");

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording with speech-optimized settings (smaller file, faster upload)
      const { recording } = await Audio.Recording.createAsync({
        isMeteringEnabled: false,
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 32000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 32000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 32000,
        },
      });

      recordingRef.current = recording;
      setRecordingState("recording");
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log("✅ Recording started");
    } catch (error: any) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording: " + error.message);
    }
  };

  const pauseRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.pauseAsync();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setRecordingState("paused");
        console.log("⏸️ Recording paused");
      }
    } catch (error: any) {
      console.error("Failed to pause recording:", error);
      Alert.alert("Error", "Failed to pause recording: " + error.message);
    }
  };

  const resumeRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.startAsync();
        setRecordingState("recording");
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
        console.log("▶️ Recording resumed");
      }
    } catch (error: any) {
      console.error("Failed to resume recording:", error);
      Alert.alert("Error", "Failed to resume recording: " + error.message);
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (!recordingRef.current) {
        console.error("No recording found");
        return;
      }

      console.log("⏹️ Stopping recording...");
      await recordingRef.current.stopAndUnloadAsync();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingRef.current.getURI();
      const status = await recordingRef.current.getStatusAsync();

      if (uri) {
        recordingUriRef.current = uri;
        const durationInSeconds = status.durationMillis
          ? Math.floor(status.durationMillis / 1000)
          : recordingTime;
        setTotalDuration(durationInSeconds);
        setRecordingState("stopped");
        setPlaybackTime(0);

        console.log("✅ Recording stopped. URI:", uri);
        console.log("📊 Duration:", durationInSeconds, "seconds");
      } else {
        throw new Error("No recording URI found");
      }

      recordingRef.current = null;
    } catch (error: any) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to stop recording: " + error.message);
    }
  };

  const handleRecordAgain = async () => {
    // Cleanup previous recording
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    setRecordingState("idle");
    setRecordingTime(0);
    setPlaybackTime(0);
    setTotalDuration(0);
    setIsPlaying(false);
    recordingUriRef.current = null;
  };

  const handlePlayPause = async () => {
    if (!recordingUriRef.current) {
      console.error("No recording URI available");
      return;
    }

    try {
      if (isPlaying) {
        // Pause playback
        if (soundRef.current) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        }
      } else {
        // Start or resume playback
        if (!soundRef.current) {
          // Load the sound
          console.log("🔊 Loading sound from URI:", recordingUriRef.current);
          const { sound } = await Audio.Sound.createAsync(
            { uri: recordingUriRef.current },
            { shouldPlay: true },
            onPlaybackStatusUpdate,
          );
          soundRef.current = sound;
          setIsPlaying(true);

          // Start playback timer
          timerRef.current = setInterval(() => {
            setPlaybackTime((prev) => {
              if (prev >= totalDuration) {
                if (timerRef.current) clearInterval(timerRef.current);
                setIsPlaying(false);
                return totalDuration;
              }
              return prev + 1;
            });
          }, 1000);
        } else {
          // Resume playback
          await soundRef.current.playAsync();
          setIsPlaying(true);

          timerRef.current = setInterval(() => {
            setPlaybackTime((prev) => {
              if (prev >= totalDuration) {
                if (timerRef.current) clearInterval(timerRef.current);
                setIsPlaying(false);
                return totalDuration;
              }
              return prev + 1;
            });
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error("Playback error:", error);
      Alert.alert("Error", "Failed to play audio: " + error.message);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPlaybackTime(totalDuration);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const skipBackward = async () => {
    if (soundRef.current) {
      const newPosition = Math.max(0, playbackTime - 10);
      await soundRef.current.setPositionAsync(newPosition * 1000);
      setPlaybackTime(newPosition);
    }
  };

  const skipForward = async () => {
    if (soundRef.current) {
      const newPosition = Math.min(totalDuration, playbackTime + 10);
      await soundRef.current.setPositionAsync(newPosition * 1000);
      setPlaybackTime(newPosition);
    }
  };

  const handleContinue = () => {
    if (recordingState === "stopped" && recordingUriRef.current) {
      const fileName = `Recording_${new Date().getTime()}.m4a`;

      console.log("📤 Continuing with recorded audio:");
      console.log("  - File Name:", fileName);
      console.log("  - File URI:", recordingUriRef.current);
      console.log("  - Duration:", totalDuration, "seconds");

      navigation.navigate("GeneratingNote", {
        sourceType: "audio",
        fileName: fileName,
        fileUri: recordingUriRef.current,
      });
    }
  };

  // Render waveform visualization
  const renderWaveform = () => {
    const bars = 30;
    return (
      <View style={styles.waveformContainer}>
        {Array.from({ length: bars }).map((_, index) => {
          const height =
            recordingState === "recording" ? Math.random() * 40 + 10 : 20;
          return (
            <View
              key={index}
              style={[
                styles.waveformBar,
                { height },
                recordingState === "recording" && styles.waveformBarActive,
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Render playback progress bar
  const renderProgressBar = () => {
    const progress =
      totalDuration > 0 ? (playbackTime / totalDuration) * 100 : 0;
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTime}>{formatTime(playbackTime)}</Text>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
        <Text style={styles.progressTime}>{formatTime(totalDuration)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ChevronLeftIcon size={24} color="#1F2937" />
        </TouchableOpacity>
        {recordingState !== "idle" && (
          <Text style={styles.headerTitle}>Recording Audio</Text>
        )}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {recordingState === "idle" ? (
          // Initial state - show icon and start button
          <>
            <View style={styles.iconContainer}>
              <RecordAudioGradientIcon size={64} />
            </View>
            <Text style={styles.title}>Record audio</Text>
            <Text style={styles.subtitle}>
              Create a note from any recorded audio
            </Text>

            {/* Large record button */}
            <TouchableOpacity
              style={styles.largeRecordButton}
              onPress={() => withAccess(startRecording)}
              activeOpacity={0.8}
            >
              <View style={styles.recordButtonInner}>
                <View style={styles.recordDot} />
              </View>
            </TouchableOpacity>
          </>
        ) : recordingState === "recording" || recordingState === "paused" ? (
          // Recording state
          <>
            <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>

            {/* Recording indicator */}
            <View style={styles.recordingIndicator}>
              <RecordAudioGradientIcon size={64} />
            </View>

            <Text style={styles.title}>Record audio</Text>
            <Text style={styles.subtitle}>
              Create a note from any recorded audio
            </Text>

            {/* Waveform visualization */}
            {renderWaveform()}

            {/* Recording status */}
            <View style={styles.recordingStatus}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                {recordingState === "recording" ? "Recording" : "Paused"}
              </Text>
            </View>

            {/* Control buttons */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleRecordAgain}
              >
                <Text style={styles.cancelButtonText}>×</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mainControlButton}
                onPress={
                  recordingState === "recording"
                    ? pauseRecording
                    : resumeRecording
                }
                activeOpacity={0.8}
              >
                {recordingState === "recording" ? (
                  <PauseIcon size={32} color="#FFFFFF" />
                ) : (
                  <PlayIcon size={32} color="#FFFFFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopRecording}
              >
                <StopIcon size={24} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Stopped state - show preview and playback
          <>
            <View style={styles.iconContainer}>
              <RecordAudioGradientIcon size={64} />
            </View>
            <Text style={styles.title}>Record audio</Text>
            <Text style={styles.subtitle}>
              Create a note from any recorded audio
            </Text>

            {/* Preview card */}
            <View style={styles.previewCard}>
              <AudioFilePreviewIcon size={48} />
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  Recording ({formatTime(totalDuration)})
                </Text>
                <Text style={styles.previewDate}>{formatDate()}</Text>
              </View>
              <TouchableOpacity
                style={styles.recordAgainButton}
                onPress={handleRecordAgain}
              >
                <Text style={styles.recordAgainText}>Record again</Text>
              </TouchableOpacity>
            </View>

            {/* Playback controls */}
            {renderProgressBar()}

            <View style={styles.playbackControls}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={skipBackward}
              >
                <Text style={styles.skipText}>-10</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
              >
                {isPlaying ? (
                  <PauseIcon size={24} color="#1F2937" />
                ) : (
                  <PlayIcon size={24} color="#1F2937" />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={skipForward}>
                <Text style={styles.skipText}>10+</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <PoweredByFooter />
        <TouchableOpacity
          style={[
            styles.continueButton,
            recordingState !== "stopped" && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={recordingState !== "stopped"}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.continueButtonText,
              recordingState !== "stopped" && styles.continueButtonTextDisabled,
            ]}
          >
            Continue
          </Text>
        </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backButton: {
    padding: spacing[1],
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    textAlign: "center",
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: spacing[6],
    marginTop: spacing[8],
  },
  recordingIndicator: {
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing[8],
  },
  timerText: {
    fontSize: 64,
    fontWeight: "300",
    color: colors.text.primary,
    marginBottom: spacing[6],
    marginTop: spacing[8],
  },
  largeRecordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[900],
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing[4],
  },
  recordButtonInner: {
    justifyContent: "center",
    alignItems: "center",
  },
  recordDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EF4444",
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    width: "100%",
    marginBottom: spacing[4],
    gap: 3,
  },
  waveformBar: {
    width: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
  },
  waveformBarActive: {
    backgroundColor: "#EF4444",
  },
  recordingStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[8],
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    marginRight: spacing[2],
  },
  recordingText: {
    fontSize: typography.fontSize.sm,
    color: "#EF4444",
    fontWeight: typography.fontWeight.medium,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
  },
  cancelButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[200],
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 28,
    color: colors.text.secondary,
    fontWeight: "300",
  },
  mainControlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[900],
    justifyContent: "center",
    alignItems: "center",
  },
  stopButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.light,
    width: "100%",
    marginBottom: spacing[6],
  },
  previewInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  previewTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  previewDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  recordAgainButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.neutral[200],
    borderRadius: 6,
  },
  recordAgainText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: spacing[4],
  },
  progressTime: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    width: 40,
    textAlign: "center",
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: spacing[3],
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.neutral[900],
    borderRadius: 2,
  },
  playbackControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
  },
  skipButton: {
    padding: spacing[2],
  },
  skipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    paddingBottom: spacing[8],
  },
  continueButton: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 100,
    alignItems: "center",
  },
  continueButtonDisabled: {
    backgroundColor: colors.neutral[200],
  },
  continueButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
  continueButtonTextDisabled: {
    color: colors.neutral[400],
  },
});
