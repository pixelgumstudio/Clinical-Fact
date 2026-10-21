import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Icon, theme } from '@clinicalfact/design-system';
import { useTranslation } from 'react-i18next';

interface FullScreenModalProps {
  visible: boolean;
  onClose: () => void;
  /** Shown in a header with a close button. Leave out when the content draws its own header. */
  title?: string;
  /** Disables the close button and the hardware back button (e.g. while something is being generated). */
  closeDisabled?: boolean;
  /** Wrap the content in a ScrollView so it stays reachable with the keyboard open or on small screens. */
  scroll?: boolean;
  children: React.ReactNode;
}

/**
 * A create flow shown as a full page (slides up, covers the whole screen) instead of a bottom sheet.
 * It stays a native Modal so existing `visible`/`onClose` callers and the modal-then-navigate
 * sequencing keep working unchanged.
 */
export const FullScreenModal: React.FC<FullScreenModalProps> = ({
  visible,
  onClose,
  title,
  closeDisabled = false,
  scroll = false,
  children,
}) => {
  const { t } = useTranslation();
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={closeDisabled ? undefined : onClose}
    >
      {/* A native Modal is its own root view, so it needs its own safe-area provider. */}
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {title !== undefined && (
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={onClose}
                  disabled={closeDisabled}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Icon name="close" size={20} color={theme.colors.grey[900]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {title}
                </Text>
                <View style={styles.closeButton} />
              </View>
            )}
            {body}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3],
  },
  headerTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
});
