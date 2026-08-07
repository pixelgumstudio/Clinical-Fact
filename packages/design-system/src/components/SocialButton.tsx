/**
 * FILE: /mnt/project/packages/design-system/src/components/SocialButton.tsx
 *
 * Social Button Component
 *
 * A specialized button for social authentication (Google, Apple, Facebook).
 * Includes provider-specific branding and icons.
 *
 * @example
 * ```tsx
 * <SocialButton
 *   provider="google"
 *   onPress={handleGoogleLogin}
 *   loading={isLoading}
 * />
 * ```
 */

import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TouchableOpacityProps,
} from "react-native";

import { GoogleIcon, AppleIcon, FacebookIcon } from "../icons";
import { theme } from "../theme";

type SocialProvider = "google" | "apple" | "facebook";

export interface SocialButtonProps
  extends Omit<TouchableOpacityProps, "style"> {
  /**
   * Social provider
   */
  provider: SocialProvider;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Full width button
   */
  fullWidth?: boolean;

  /**
   * Custom button text (overrides default)
   */
  text?: string;

  /**
   * Custom style
   */
  style?: ViewStyle;

  /**
   * Press handler
   */
  onPress: () => void;
}

// Provider configurations
const providerConfig = {
  google: {
    text: "Continue with Google",
    backgroundColor: "#FFFFFF",
    textColor: "#000000",
    borderColor: theme.colors.border.main,
  },
  apple: {
    text: "Continue with Apple",
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
    borderColor: "#000000",
  },
  facebook: {
    text: "Continue with Facebook",
    backgroundColor: "#1877F2",
    textColor: "#FFFFFF",
    borderColor: "#1877F2",
  },
};

// Render icon based on provider
const renderIcon = (provider: SocialProvider, color: string) => {
  switch (provider) {
    case "google":
      return <GoogleIcon size={20} />;
    case "apple":
      return <AppleIcon size={20} color={color} />;
    case "facebook":
      return <FacebookIcon size={20} color={color} />;
    default:
      return null;
  }
};

export const SocialButton: React.FC<SocialButtonProps> = ({
  provider,
  loading = false,
  disabled = false,
  fullWidth = true,
  text,
  style,
  onPress,
  ...rest
}) => {
  const config = providerConfig[provider];
  const isDisabled = disabled || loading;

  const buttonStyle = [
    styles.button,
    {
      backgroundColor: config.backgroundColor,
      borderColor: config.borderColor,
    },
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    {
      color: config.textColor,
    },
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={
            provider === "google" ? theme.colors.primary[500] : config.textColor
          }
        />
      ) : (
        <View style={styles.content}>
          {/* Provider Icon */}
          <View style={styles.iconContainer}>
            {renderIcon(provider, config.textColor)}
          </View>

          {/* Button text */}
          <Text style={textStyle}>{text || config.text}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    minHeight: 56,
    ...theme.shadows.sm,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  iconContainer: {
    marginRight: theme.spacing[3],
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeight.bold,
  },

  text: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },

  fullWidth: {
    width: "100%",
  },

  disabled: {
    opacity: 0.5,
  },
});

export default SocialButton;
