import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography, CloseIcon, CheckIcon } from '@clinicalfact/design-system';
import { MedicalChatFilters } from '../services/api';

interface MedicalFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: MedicalChatFilters;
  onApply: (filters: MedicalChatFilters) => void;
}

const Checkbox: React.FC<{ checked: boolean; label: string; onPress: () => void; description?: string }> = ({
  checked,
  label,
  onPress,
  description,
}) => (
  <TouchableOpacity style={styles.checkboxRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
      {checked && <CheckIcon size={14} color={colors.text.inverse} />}
    </View>
    <View style={styles.checkboxLabelContainer}>
      <Text style={styles.checkboxLabel}>{label}</Text>
      {!!description && <Text style={styles.checkboxDescription}>{description}</Text>}
    </View>
  </TouchableOpacity>
);

export const MedicalFilterModal: React.FC<MedicalFilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
}) => {
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  // Local draft state so edits don't apply until "Search with filters" is pressed.
  const [draft, setDraft] = useState<MedicalChatFilters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const scientificArticles = draft.sourceCategories?.scientificArticles !== false;
  const books = !!draft.sourceCategories?.books;
  const guidelines = !!draft.sourceCategories?.guidelines;
  const metaAnalyses = !!draft.articleTypes?.metaAnalyses;
  const reviewArticles = !!draft.articleTypes?.reviewArticles;
  const clinicalTrials = !!draft.articleTypes?.clinicalTrials;

  const toggleSource = (key: 'scientificArticles' | 'books' | 'guidelines') => {
    setDraft((prev) => ({
      ...prev,
      sourceCategories: {
        ...prev.sourceCategories,
        [key]: key === 'scientificArticles' ? !scientificArticles : !prev.sourceCategories?.[key],
      },
    }));
  };

  const toggleArticleType = (key: 'metaAnalyses' | 'reviewArticles' | 'clinicalTrials') => {
    setDraft((prev) => ({
      ...prev,
      articleTypes: {
        ...prev.articleTypes,
        [key]: !prev.articleTypes?.[key],
      },
    }));
  };

  const handleReset = () => setDraft({});

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.85 }]}>
              <View style={styles.handleBar} />

              <View style={styles.header}>
                <Text style={styles.title}>Filter Europe PMC results</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <CloseIcon size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Honest scope disclosure — these filters only affect the Europe PMC leg of
                    the search. PubMed/Semantic Scholar are on/off only (see the source database
                    menu); Wikimedia images, FDA drug labels, and the model's own grounded/general
                    knowledge are never filtered by this screen. Don't reword this to imply
                    broader scope than that. */}
                <Text style={styles.scopeNotice}>
                  Applies to Europe PMC citations only. PubMed and Semantic Scholar can be turned
                  on or off from the sources menu, but aren't filtered by these categories.
                </Text>

                <Text style={styles.sectionLabel}>Publication date range</Text>
                <View style={styles.dateRow}>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="From year"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="number-pad"
                    value={draft.dateRange?.from?.toString() ?? ''}
                    onChangeText={(t) =>
                      setDraft((prev) => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, from: t ? parseInt(t, 10) : undefined },
                      }))
                    }
                  />
                  <Text style={styles.dateSeparator}>to</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="To year"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="number-pad"
                    value={draft.dateRange?.to?.toString() ?? ''}
                    onChangeText={(t) =>
                      setDraft((prev) => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, to: t ? parseInt(t, 10) : undefined },
                      }))
                    }
                  />
                </View>

                <Text style={styles.sectionLabel}>Sources</Text>
                <Checkbox checked={scientificArticles} label="Scientific articles" onPress={() => toggleSource('scientificArticles')} />
                <Checkbox checked={books} label="Books" onPress={() => toggleSource('books')} />
                <Checkbox checked={guidelines} label="Guidelines" onPress={() => toggleSource('guidelines')} />

                <Text style={styles.sectionLabel}>Scientific article type</Text>
                <Text style={styles.sectionHint}>
                  {scientificArticles
                    ? 'Only applies to scientific articles'
                    : 'Enable "Scientific articles" above to use these filters'}
                </Text>
                <Checkbox
                  checked={metaAnalyses}
                  label="Meta-analyses"
                  onPress={() => toggleArticleType('metaAnalyses')}
                />
                <Checkbox
                  checked={reviewArticles}
                  label="Review articles"
                  onPress={() => toggleArticleType('reviewArticles')}
                />
                <Checkbox
                  checked={clinicalTrials}
                  label="Clinical trials"
                  onPress={() => toggleArticleType('clinicalTrials')}
                />
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7}>
                  <Text style={styles.resetButtonText}>Reset filters</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.85}>
                  <Text style={styles.applyButtonText}>Search with filters</Text>
                </TouchableOpacity>
              </View>
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
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing[1],
  },
  scroll: {
    paddingHorizontal: spacing[5],
  },
  scrollContent: {
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  scopeNotice: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    lineHeight: 16,
    marginTop: spacing[3],
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  sectionHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: spacing[2],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  dateSeparator: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  checkboxDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.dark,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  applyButton: {
    flex: 2,
    paddingVertical: spacing[3],
    borderRadius: 10,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
});
