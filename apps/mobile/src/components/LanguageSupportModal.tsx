import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
} from 'react-native';
import {
  colors,
  spacing,
  typography,
  CloseIcon,
  SearchIcon,
} from '@clinicalfact/design-system';
import { useTranslation } from 'react-i18next';
import { AppLanguage, searchLanguages } from '../i18n/languages';
import { LanguageOptionRow } from './LanguageOptionRow';

interface LanguageSupportModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLanguage: (languageCode: string) => void;
  selectedLanguage?: string;
}

export const LanguageSupportModal: React.FC<LanguageSupportModalProps> = ({
  visible,
  onClose,
  onSelectLanguage,
  selectedLanguage = 'en',
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSelection, setCurrentSelection] = useState(selectedLanguage);

  const filteredLanguages = searchLanguages(searchQuery);

  const handleSelectLanguage = (languageCode: string) => {
    setCurrentSelection(languageCode);
    onSelectLanguage(languageCode);
  };

  // Same rows (flag, names, check) as the first-launch language screen.
  const renderLanguageItem = ({ item }: { item: AppLanguage }) => (
    <LanguageOptionRow language={item} selected={currentSelection === item.code} onPress={handleSelectLanguage} />
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <Text style={styles.headerTitle}>{t('profile.changeLanguage')}</Text>
                  <Text style={styles.headerSubtitle}>
                    {t('common.search')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseIcon size={24} color={colors.slate[500]} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <SearchIcon size={18} color={colors.slate[400]} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t('common.search')}
                    placeholderTextColor={colors.slate[400]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
              </View>

              {/* Language List */}
              <FlatList
                data={filteredLanguages}
                keyExtractor={(item) => item.code}
                renderItem={renderLanguageItem}
                style={styles.languageList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  closeButton: {
    padding: spacing[1],
    marginLeft: spacing[3],
  },
  searchContainer: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  languageList: {
    paddingHorizontal: spacing[5],
  },
});
