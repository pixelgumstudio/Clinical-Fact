import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  CustomTextGradientIcon,
  NoteFilePreviewIcon,
} from "@clinicfact/design-system";
import { MainStackParamList } from "../../navigation/MainStackNavigator";
import { useGatedFeature } from "../../hooks/useGatedFeature";
import { PoweredByFooter } from "../../components/PoweredByFooter";

type CustomTextNavigationProp = NativeStackNavigationProp<
  MainStackParamList,
  "CustomTextInput"
>;

export const CustomTextInputScreen = () => {
  const navigation = useNavigation<CustomTextNavigationProp>();
  const { withAccess } = useGatedFeature();
  const [text, setText] = useState("");
  const [hasContent, setHasContent] = useState(false);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleTextChange = (value: string) => {
    setText(value);
    setHasContent(value.trim().length > 0);
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

  const generateTitle = (content: string) => {
    const words = content.trim().split(" ").slice(0, 6).join(" ");
    return words.length > 30 ? words.substring(0, 30) + "..." : words;
  };

  const handleContinue = () => {
    if (hasContent) {
      console.log(
        "Custom text - Navigating to GeneratingNote with text length:",
        text.length,
      );
      navigation.navigate("GeneratingNote", {
        sourceType: "text",
        fileName: generateTitle(text),
        fileUri: text, // Pass the actual text content
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
          {/* Icon */}
          <View style={styles.iconContainer}>
            <CustomTextGradientIcon size={64} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Custom Text</Text>
          <Text style={styles.subtitle}>
            Create a note from any custom text
          </Text>

          {/* Text Input Area */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Enter Text</Text>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your text here..."
                placeholderTextColor={colors.text.tertiary}
                value={text}
                onChangeText={handleTextChange}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Preview Card (shows when there's content) */}
          {hasContent && (
            <View style={styles.previewCard}>
              <NoteFilePreviewIcon size={48} />
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {generateTitle(text)}
                </Text>
                <Text style={styles.previewDate}>{formatDate()}</Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => setText("")}
              >
                <Text style={styles.changeButtonText}>Change text</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.footer}>
          <PoweredByFooter />
          <TouchableOpacity
            style={[
              styles.continueButton,
              !hasContent && styles.continueButtonDisabled,
            ]}
            onPress={() => withAccess(handleContinue)}
            disabled={!hasContent}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.continueButtonText,
                !hasContent && styles.continueButtonTextDisabled,
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
    paddingBottom: spacing[4],
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
  textInputContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 150,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    minHeight: 150,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.light,
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
  changeButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.neutral[200],
    borderRadius: 6,
  },
  changeButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
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
