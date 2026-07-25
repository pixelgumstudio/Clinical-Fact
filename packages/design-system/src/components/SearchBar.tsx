/**
 * FILE: /mnt/project/packages/design-system/src/components/SearchBar.tsx
 * 
 * SearchBar Component
 * 
 * A search input with icon, clear button, and loading state.
 * Optimized for filtering lists and searching content.
 * 
 * @example
 * ```tsx
 * <SearchBar
 *   value={searchQuery}
 *   onChangeText={setSearchQuery}
 *   placeholder="Search notes..."
 * />
 * 
 * <SearchBar
 *   value={query}
 *   onChangeText={setQuery}
 *   onSearch={handleSearch}
 *   loading={isSearching}
 * />
 * ```
 */

import React, { useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Icon } from './Icon';
import { theme } from '../theme';

export interface SearchBarProps {
  /**
   * Search value
   */
  value: string;

  /**
   * Change handler
   */
  onChangeText: (text: string) => void;

  /**
   * Search submit handler
   */
  onSearch?: () => void;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Auto focus on mount
   */
  autoFocus?: boolean;

  /**
   * Show cancel button
   */
  showCancel?: boolean;

  /**
   * Cancel handler
   */
  onCancel?: () => void;

  /**
   * Container style
   */
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onSearch,
  placeholder = 'Search...',
  loading = false,
  disabled = false,
  autoFocus = false,
  showCancel = false,
  onCancel,
  style,
}) => {
  const inputRef = useRef<TextInput>(null);

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const handleCancel = () => {
    onChangeText('');
    inputRef.current?.blur();
    onCancel?.();
  };

  const showClearButton = value.length > 0 && !loading;

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      <View style={styles.inputContainer}>
        {/* Search Icon */}
        <Icon
          name="search"
          size={20}
          color={theme.colors.text.tertiary}
          style={styles.searchIcon}
        />

        {/* Input */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSearch}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.tertiary}
          editable={!disabled}
          autoFocus={autoFocus}
          returnKeyType="search"
          style={styles.input}
        />

        {/* Loading / Clear Button */}
        {loading ? (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary[500]}
            style={styles.loader}
          />
        ) : showClearButton ? (
          <TouchableOpacity
            onPress={handleClear}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.clearButton}
          >
            <Icon
              name="x-circle"
              size={18}
              color={theme.colors.text.tertiary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Cancel Button */}
      {showCancel && (
        <TouchableOpacity
          onPress={handleCancel}
          activeOpacity={0.7}
          style={styles.cancelButton}
        >
          <Text
            variant="body2"
            color="primary"
            weight="medium"
          >
            Cancel
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[3],
    minHeight: 44,
  },

  searchIcon: {
    marginRight: theme.spacing[2],
  },

  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    paddingVertical: theme.spacing[2],
  },

  loader: {
    marginLeft: theme.spacing[2],
  },

  clearButton: {
    padding: theme.spacing[1],
    marginLeft: theme.spacing[1],
  },

  cancelButton: {
    marginLeft: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
  },
});

// Import Text component (circular import fix)
import { Text } from './Text';

export default SearchBar;