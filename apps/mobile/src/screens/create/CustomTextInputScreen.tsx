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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon, theme } from "@clinicalfact/design-system";
import { MainStackParamList } from "../../navigation/MainStackNavigator";
import { useGatedFeature } from "../../hooks/useGatedFeature";
import { PoweredByFooter } from "../../components/PoweredByFooter";

type CustomTextNavigationProp = NativeStackNavigationProp<
  MainStackParamList,
  "CustomTextInput"
>;
type CustomTextRouteProp = RouteProp<MainStackParamList, "CustomTextInput">;

export const CustomTextInputScreen = () => {
  const navigation = useNavigation<CustomTextNavigationProp>();
  const route = useRoute<CustomTextRouteProp>();
  const { withAccess } = useGatedFeature();
  const [text, setText] = useState("");
  const hasContent = text.trim().length > 0;

  const handleGoBack = () => {
    navigation.goBack();
  };

  const generateTitle = (content: string) => {
    const words = content.trim().split(" ").slice(0, 6).join(" ");
    return words.length > 30 ? words.substring(0, 30) + "..." : words;
  };

  const handleContinue = () => {
    if (hasContent) {
      navigation.navigate("GeneratingNote", {
        sourceType: "text",
        fileName: generateTitle(text),
        fileUri: text, // Pass the actual text content
        intent: route.params?.intent,
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
            <Icon name="backFill" size={24} color={theme.colors.grey[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Icon name="textFill" size={40} color="#FFFFFF" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Custom text</Text>
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
                placeholderTextColor={theme.colors.grey[300]}
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
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
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing[5],
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    textAlign: "center",
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[600],
    textAlign: "center",
    marginBottom: theme.spacing[8],
  },
  inputSection: {
    width: "100%",
  },
  inputLabel: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[3],
  },
  textInputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.borderRadius.lg,
    minHeight: 181,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[900],
    minHeight: 181,
  },
  footer: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  continueButton: {
    backgroundColor: theme.colors.yale[700],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    ...theme.typography.textStyles.button2,
    color: "#FFFFFF",
  },
});
