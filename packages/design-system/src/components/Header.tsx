/**
 * Header Component
 *
 * TICKET-001: Standardized header matching design specifications
 * - Height: 56px (mobile), 64px (tablet)
 * - Background: #FFFFFF with shadow elevation 1
 * - Back button: 40x40px touch target
 * - Title: 18px font, 600 weight, #1F2937 color
 * - Action buttons: 40x40px icons, #6B7280 color
 * - Variants: default, transparent, search, tabs
 *
 * @example
 * ```tsx
 * // Basic header with back button
 * <Header
 *   title="Settings"
 *   onBackPress={() => navigation.goBack()}
 * />
 *
 * // Header with right actions
 * <Header
 *   title="Edit Profile"
 *   onBackPress={() => navigation.goBack()}
 *   rightActions={[
 *     <IconButton icon="save" onPress={handleSave} />,
 *     <IconButton icon="more" onPress={handleMore} />
 *   ]}
 * />
 *
 * // Transparent header (for scrollable content)
 * <Header
 *   title="Note Detail"
 *   variant="transparent"
 *   onBackPress={() => navigation.goBack()}
 * />
 *
 * // Search header variant
 * <Header
 *   variant="search"
 *   searchValue={searchQuery}
 *   onSearchChange={setSearchQuery}
 *   onBackPress={() => navigation.goBack()}
 * />
 * ```
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

export interface HeaderProps {
  /**
   * Title text to display in the center
   */
  title?: string;

  /**
   * Whether to show the back button
   */
  showBackButton?: boolean;

  /**
   * Callback when back button is pressed
   */
  onBackPress?: () => void;

  /**
   * Custom back button icon/component
   */
  backButton?: React.ReactNode;

  /**
   * Array of action components to display on the right (max 3 recommended)
   */
  rightActions?: React.ReactNode[];

  /**
   * Visual variant
   * - default: White background with shadow
   * - transparent: No background, no shadow
   * - search: Search input instead of title
   * - tabs: Header with tabs below title
   */
  variant?: 'default' | 'transparent' | 'search' | 'tabs';

  /**
   * Search value (for search variant)
   */
  searchValue?: string;

  /**
   * Search change handler (for search variant)
   */
  onSearchChange?: (text: string) => void;

  /**
   * Search placeholder
   */
  searchPlaceholder?: string;

  /**
   * Tabs component (for tabs variant)
   */
  tabs?: React.ReactNode;

  /**
   * Custom container style
   */
  style?: ViewStyle;

  /**
   * Custom title style
   */
  titleStyle?: TextStyle;

  /**
   * Whether to use SafeAreaView
   */
  useSafeArea?: boolean;

  /**
   * Status bar style
   */
  statusBarStyle?: 'light-content' | 'dark-content';
}

/**
 * Default back arrow icon component
 */
const BackArrow: React.FC<{ color: string }> = ({ color }) => (
  <View style={styles.backArrow}>
    <Text style={{ color, fontSize: 24, fontWeight: '400' }}>‹</Text>
  </View>
);

/**
 * Header component for screen navigation
 */
export const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = true,
  onBackPress,
  backButton,
  rightActions = [],
  variant = 'default',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  tabs,
  style,
  titleStyle,
  useSafeArea = true,
  statusBarStyle = 'dark-content',
}) => {
  const variantStyles = {
    default: {
      backgroundColor: theme.colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
      ...theme.shadows.sm,
    },
    transparent: {
      backgroundColor: 'transparent',
      borderBottomWidth: 0,
    },
    search: {
      backgroundColor: theme.colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
      ...theme.shadows.sm,
    },
    tabs: {
      backgroundColor: theme.colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.light,
      ...theme.shadows.sm,
    },
  };

  const textColor = theme.colors.text.primary;
  const iconColor = theme.colors.neutral[500]; // #6B7280

  const containerStyle = [
    styles.container,
    variantStyles[variant],
    style,
  ] as ViewStyle[];

  const headerContent = (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={theme.colors.background.primary}
      />

      <View style={styles.header}>
        {/* Left Section - Back Button */}
        <View style={styles.leftSection}>
          {showBackButton && onBackPress && (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              {backButton || <BackArrow color={iconColor} />}
            </TouchableOpacity>
          )}
        </View>

        {/* Center Section - Title or Search */}
        <View style={styles.centerSection}>
          {variant === 'search' ? (
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.colors.neutral[400]}
              value={searchValue}
              onChangeText={onSearchChange}
              autoFocus
            />
          ) : title ? (
            <Text
              style={[styles.title, { color: textColor }, titleStyle]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          ) : null}
        </View>

        {/* Right Section - Actions */}
        <View style={styles.rightSection}>
          {rightActions.slice(0, 3).map((action, index) => (
            <View key={index} style={styles.action}>
              {action}
            </View>
          ))}
        </View>
      </View>

      {/* Tabs Section (for tabs variant) */}
      {variant === 'tabs' && tabs && (
        <View style={styles.tabsContainer}>{tabs}</View>
      )}
    </>
  );

  if (useSafeArea) {
    return (
      <SafeAreaView style={containerStyle} edges={['top']}>
        {headerContent}
      </SafeAreaView>
    );
  }

  return <View style={containerStyle}>{headerContent}</View>;
};

const styles = StyleSheet.create({
  container: {
    // Dynamic styling applied via variant
  },

  header: {
    height: theme.layout.dimensions.headerHeight, // 56px
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4], // 16px
  },

  leftSection: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2], // 8px
  },

  rightSection: {
    width: 60,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing[2], // 8px between actions
  },

  backButton: {
    width: 40, // Design Spec: 40x40px touch target
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg, // 12px
  },

  backArrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: theme.typography.fontSize.lg, // 18px - Design Spec
    fontWeight: theme.typography.fontWeight.semibold, // 600 - Design Spec
    color: theme.colors.neutral[800], // #1F2937 - Design Spec
    textAlign: 'center',
  },

  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
  },

  action: {
    width: 40, // Design Spec: 40x40px for action buttons
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabsContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
});

export default Header;
