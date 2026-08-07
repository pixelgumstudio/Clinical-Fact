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
  CheckIcon,
} from '@clinicalfact/design-system';
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  nameKey: string;
  flag: string;
}

interface LanguageSupportModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLanguage: (languageCode: string) => void;
  selectedLanguage?: string;
}

const languages: Language[] = [
  { code: 'en', nameKey: 'languages.english', flag: 'us' },
  { code: 'en-GB', nameKey: 'languages.englishGB', flag: 'gb' },
  { code: 'en-AU', nameKey: 'languages.englishAU', flag: 'au' },
  { code: 'en-CA', nameKey: 'languages.englishCA', flag: 'ca' },
  { code: 'es', nameKey: 'languages.spanish', flag: 'es' },
  { code: 'es-MX', nameKey: 'languages.spanishMX', flag: 'mx' },
  { code: 'fr', nameKey: 'languages.french', flag: 'fr' },
  { code: 'fr-CA', nameKey: 'languages.frenchCA', flag: 'ca' },
  { code: 'de', nameKey: 'languages.german', flag: 'de' },
  { code: 'pt', nameKey: 'languages.portuguese', flag: 'br' },
  { code: 'pt-PT', nameKey: 'languages.portuguesePT', flag: 'pt' },
  { code: 'it', nameKey: 'languages.italian', flag: 'it' },
  { code: 'nl', nameKey: 'languages.dutch', flag: 'nl' },
  { code: 'pl', nameKey: 'languages.polish', flag: 'pl' },
  { code: 'sv', nameKey: 'languages.swedish', flag: 'se' },
  { code: 'no', nameKey: 'languages.norwegian', flag: 'no' },
  { code: 'da', nameKey: 'languages.danish', flag: 'dk' },
  { code: 'fi', nameKey: 'languages.finnish', flag: 'fi' },
  { code: 'cs', nameKey: 'languages.czech', flag: 'cz' },
  { code: 'sk', nameKey: 'languages.slovak', flag: 'sk' },
  { code: 'sl', nameKey: 'languages.slovenian', flag: 'si' },
  { code: 'hr', nameKey: 'languages.croatian', flag: 'hr' },
  { code: 'hu', nameKey: 'languages.hungarian', flag: 'hu' },
  { code: 'ro', nameKey: 'languages.romanian', flag: 'ro' },
  { code: 'el', nameKey: 'languages.greek', flag: 'gr' },
  { code: 'tr', nameKey: 'languages.turkish', flag: 'tr' },
  { code: 'ru', nameKey: 'languages.russian', flag: 'ru' },
  { code: 'uk', nameKey: 'languages.ukrainian', flag: 'ua' },
  { code: 'ar', nameKey: 'languages.arabic', flag: 'sa' },
  { code: 'ar-AE', nameKey: 'languages.arabicAE', flag: 'ae' },
  { code: 'ar-EG', nameKey: 'languages.arabicEG', flag: 'eg' },
  { code: 'he', nameKey: 'languages.hebrew', flag: 'il' },
  { code: 'hi', nameKey: 'languages.hindi', flag: 'in' },
  { code: 'bn', nameKey: 'languages.bengali', flag: 'bd' },
  { code: 'ta', nameKey: 'languages.tamil', flag: 'in' },
  { code: 'te', nameKey: 'languages.telugu', flag: 'in' },
  { code: 'kn', nameKey: 'languages.kannada', flag: 'in' },
  { code: 'ml', nameKey: 'languages.malayalam', flag: 'in' },
  { code: 'mr', nameKey: 'languages.marathi', flag: 'in' },
  { code: 'gu', nameKey: 'languages.gujarati', flag: 'in' },
  { code: 'pa', nameKey: 'languages.punjabi', flag: 'in' },
  { code: 'ur', nameKey: 'languages.urdu', flag: 'pk' },
  { code: 'zh-CN', nameKey: 'languages.chineseSimplified', flag: 'cn' },
  { code: 'zh-TW', nameKey: 'languages.chineseTraditional', flag: 'tw' },
  { code: 'ja', nameKey: 'languages.japanese', flag: 'jp' },
  { code: 'ko', nameKey: 'languages.korean', flag: 'kr' },
  { code: 'vi', nameKey: 'languages.vietnamese', flag: 'vn' },
  { code: 'th', nameKey: 'languages.thai', flag: 'th' },
  { code: 'ms', nameKey: 'languages.malay', flag: 'my' },
  { code: 'id', nameKey: 'languages.indonesian', flag: 'id' },
  { code: 'ca', nameKey: 'languages.catalan', flag: 'es' },
];

// Simple flag component using emoji flags
const FlagEmoji: React.FC<{ countryCode: string }> = ({ countryCode }) => {
  const flagMap: Record<string, string> = {
    us: '\uD83C\uDDFA\uD83C\uDDF8', // 🇺🇸
    es: '\uD83C\uDDEA\uD83C\uDDF8', // 🇪🇸
    fr: '\uD83C\uDDEB\uD83C\uDDF7', // 🇫🇷
    de: '\uD83C\uDDE9\uD83C\uDDEA', // 🇩🇪
    br: '\uD83C\uDDE7\uD83C\uDDF7', // 🇧🇷
    cn: '\uD83C\uDDE8\uD83C\uDDF3', // 🇨🇳
    tw: '\uD83C\uDDF9\uD83C\uDDFC', // 🇹🇼
    jp: '\uD83C\uDDEF\uD83C\uDDF5', // 🇯🇵
    kr: '\uD83C\uDDF0\uD83C\uDDF7', // 🇰🇷
    sa: '\uD83C\uDDF8\uD83C\uDDE6', // 🇸🇦
    in: '\uD83C\uDDEE\uD83C\uDDF3', // 🇮🇳
    ru: '\uD83C\uDDF7\uD83C\uDDFA', // 🇷🇺
    it: '\uD83C\uDDEE\uD83C\uDDF9', // 🇮🇹
    pl: '\uD83C\uDDF5\uD83C\uDDF1', // 🇵🇱
    nl: '\uD83C\uDDF3\uD83C\uDDF1', // 🇳🇱
    se: '\uD83C\uDDF8\uD83C\uDDEA', // 🇸🇪
    tr: '\uD83C\uDDF9\uD83C\uDDF7', // 🇹🇷
    vn: '\uD83C\uDDFB\uD83C\uDDF3', // 🇻🇳
    th: '\uD83C\uDDF9\uD83C\uDDED', // 🇹🇭
    id: '\uD83C\uDDEE\uD83C\uDDE9', // 🇮🇩
  };

  return (
    <Text style={styles.flagEmoji}>{flagMap[countryCode] || '\uD83C\uDFF3\uFE0F'}</Text>
  );
};

export const LanguageSupportModal: React.FC<LanguageSupportModalProps> = ({
  visible,
  onClose,
  onSelectLanguage,
  selectedLanguage = 'en',
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSelection, setCurrentSelection] = useState(selectedLanguage);

  const filteredLanguages = languages.filter((lang) =>
    t(lang.nameKey).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLanguage = (languageCode: string) => {
    setCurrentSelection(languageCode);
    onSelectLanguage(languageCode);
  };

  const renderLanguageItem = ({ item }: { item: Language }) => {
    const isSelected = currentSelection === item.code;

    return (
      <TouchableOpacity
        style={styles.languageItem}
        onPress={() => handleSelectLanguage(item.code)}
        activeOpacity={0.7}
      >
        <FlagEmoji countryCode={item.flag} />
        <Text style={styles.languageName}>{t(item.nameKey)}</Text>
        {isSelected && <CheckIcon size={20} color="#10B981" />}
      </TouchableOpacity>
    );
  };

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
                  <CloseIcon size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <SearchIcon size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t('common.search')}
                    placeholderTextColor="#9CA3AF"
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
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  flagEmoji: {
    fontSize: 24,
    marginRight: spacing[3],
  },
  languageName: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
});
