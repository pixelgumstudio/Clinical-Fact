// apps/mobile/src/screens/create/YouTubeInputScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  VideoFilePreviewIcon,
  YoutubeGradientIcon,
} from "@clinicalfact/design-system";
import { MainStackParamList } from "../../navigation/MainStackNavigator";
import { useGatedFeature } from "../../hooks/useGatedFeature";
import { api } from "../../services/api";
import { PoweredByFooter } from "../../components/PoweredByFooter";

type YouTubeInputNavigationProp = NativeStackNavigationProp<
  MainStackParamList,
  "YouTubeInput"
>;

interface VideoPreview {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
}

export const YouTubeInputScreen = () => {
  const navigation = useNavigation<YouTubeInputNavigationProp>();
  const { withAccess } = useGatedFeature();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoPreview, setVideoPreview] = useState<VideoPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleUrlChange = async (url: string) => {
    setYoutubeUrl(url);
    setError(null);

    // Clear preview if URL is invalid or empty
    if (!url.trim()) {
      setVideoPreview(null);
      return;
    }

    // Check if it's a valid YouTube URL
    const isValidUrl =
      url.includes("youtube.com/watch?v=") ||
      url.includes("youtu.be/") ||
      url.includes("youtube.com/shorts/") ||
      /^[a-zA-Z0-9_-]{11}$/.test(url); // Also accept raw video IDs

    if (!isValidUrl) {
      setVideoPreview(null);
      return;
    }

    // Fetch video info from backend
    setIsLoading(true);
    try {
      console.log("📺 Fetching video info for:", url);
      const response = await api.getYouTubeVideoInfo(url);

      // ✅ ADD DETAILED LOGGING HERE
      console.log("📦 Full response:", JSON.stringify(response, null, 2));
      console.log("📦 Response success:", response.success);
      console.log("📦 Response data:", response.data);
      console.log("📦 Response message:", response.message);

      if (response.success && response.data) {
        console.log("✅ Video info received:", response.data);
        setVideoPreview({
          videoId: response.data.videoId,
          title: response.data.title,
          description: response.data.description,
          thumbnail: response.data.thumbnail,
          duration: response.data.duration,
          channelTitle: response.data.channelTitle,
        });
      } else {
        setError(response.message || "Could not fetch video information");
      }
    } catch (err: any) {
      console.error("❌ Error fetching video info:", err);
      setError(err.message || "Failed to fetch video information");
      setVideoPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (videoPreview) {
      console.log("📤 Navigating to YouTubeGenerating with:", {
        youtubeUrl,
        videoId: videoPreview.videoId,
        videoTitle: videoPreview.title,
      });

      navigation.navigate("YouTubeGenerating", {
        youtubeUrl,
        videoId: videoPreview.videoId,
        videoTitle: videoPreview.title,
        thumbnail: videoPreview.thumbnail,
        channelTitle: videoPreview.channelTitle,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ChevronLeftIcon size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* YouTube Icon */}
          <View style={styles.iconContainer}>
            <YoutubeGradientIcon size={40} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Youtube Video</Text>
          <Text style={styles.subtitle}>
            Create a note from any youtube video
          </Text>

          {/* URL Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Enter Youtube URL</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste Youtube URL"
              placeholderTextColor={colors.text.tertiary}
              value={youtubeUrl}
              onChangeText={handleUrlChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary[600]} />
              <Text style={styles.loadingText}>Fetching video info...</Text>
            </View>
          )}

          {/* Error State */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Video Preview Card */}
          {videoPreview && !isLoading && (
            <View style={styles.previewCard}>
              {videoPreview.thumbnail ? (
                <Image
                  source={{ uri: videoPreview.thumbnail }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              ) : (
                <VideoFilePreviewIcon size={48} />
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {videoPreview.title}
                </Text>
                <Text style={styles.previewChannel} numberOfLines={1}>
                  {videoPreview.channelTitle}
                </Text>
                <Text style={styles.previewDuration}>
                  {videoPreview.duration}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.footer}>
          <PoweredByFooter />
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!videoPreview || isLoading) && styles.continueButtonDisabled,
            ]}
            onPress={() => withAccess(handleContinue)}
            disabled={!videoPreview || isLoading}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.continueButtonText,
                (!videoPreview || isLoading) &&
                  styles.continueButtonTextDisabled,
              ]}
            >
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backButton: {
    padding: spacing[1],
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[8],
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: spacing[6],
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
  inputSection: {
    marginBottom: spacing[6],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: spacing[8],
  },
  loadingText: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: "#DC2626",
    textAlign: "center",
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  thumbnail: {
    width: 120,
    height: 68,
    borderRadius: 8,
  },
  previewInfo: {
    flex: 1,
    marginLeft: spacing[3],
    justifyContent: "center",
  },
  previewTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  previewChannel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  previewDuration: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
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
