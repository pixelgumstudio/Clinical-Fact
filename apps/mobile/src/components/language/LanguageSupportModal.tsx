import React from 'react';
import { Modal, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CloseIcon, theme } from '@clinicalfact/design-system';
import { LanguageList } from './LanguageList';
import { styles } from './LanguageSupportModal.styles';

interface LanguageSupportModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLanguage: (languageCode: string) => void;
  /** The selected language code; null selects the "Default (same as app)" row. */
  selectedLanguage?: string | null;
  /** Adds a leading "Default (same as app)" row and is called when it is picked. */
  onSelectDefault?: () => void;
  /** Header text; defaults to "Change language". */
  title?: string;
}

/** A bottom sheet around the shared LanguageList, for pickers that open from another screen. */
export const LanguageSupportModal: React.FC<LanguageSupportModalProps> = ({
  visible,
  onClose,
  onSelectLanguage,
  selectedLanguage = 'en',
  onSelectDefault,
  title,
}) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.header}>
                <Text style={styles.headerTitle} accessibilityRole="header">
                  {title ?? t('profile.changeLanguage')}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <CloseIcon size={24} color={theme.colors.grey[600]} />
                </TouchableOpacity>
              </View>

              <LanguageList
                selected={selectedLanguage}
                showDefaultOption={!!onSelectDefault}
                onSelect={(code) => (code === null ? onSelectDefault?.() : onSelectLanguage(code))}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
