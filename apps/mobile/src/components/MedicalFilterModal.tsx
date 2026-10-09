import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { Icon, theme, Switch as DSSwitch } from '@clinicalfact/design-system';
import { MedicalChatFilters } from '../services/api';
import { sheetChromeStyles } from '../screens/chat/ChatConversation/sheetChromeStyles';
import { CounterInput } from './CounterInput';

interface MedicalFilterModalProps {
  visible: boolean;
  opacity: Animated.Value;
  translateY: Animated.Value;
  /** Backdrop tap / Android hardware back — dismisses straight back to the chat screen. */
  onClose: () => void;
  /** The back-chevron — returns to the "+" attach sheet this screen was drilled into from. */
  onBack: () => void;
  filters: MedicalChatFilters;
  onApply: (filters: MedicalChatFilters) => void;
}

type ActivePicker = 'from' | 'to' | null;

const CURRENT_YEAR = new Date().getFullYear();

/** Drill-in screen opened from the "+" attach sheet's "Filter by Date, Source and Type" row —
 *  scopes the medical live-search results (see chatService.chatMedicalLiveStream). Every
 *  toggle/date pick applies immediately. Uses the same externally-driven Animated opacity/
 *  translateY as ChatAttachSheet (animationType="none" on the underlying Modal, JS-driven slide)
 *  instead of the plain <Modal animationType="slide"> other sheets use — that's what lets
 *  ChatConversationScreen sequence "this slides down, then the attach sheet slides back up"
 *  instead of an abrupt cut between two independently-animated native modals. */
export const MedicalFilterModal: React.FC<MedicalFilterModalProps> = ({
  visible,
  opacity,
  translateY,
  onClose,
  onBack,
  filters,
  onApply,
}) => {
  const [draft, setDraft] = useState<MedicalChatFilters>(filters);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  // Every underlying source (Europe PMC, PubMed, Semantic Scholar) only filters by
  // publication year, not day — so the picker itself only ever asks for a year, held
  // here while the sheet is open until "Done" commits it.
  const [draftYear, setDraftYear] = useState<number>(CURRENT_YEAR);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const update = (next: MedicalChatFilters) => {
    setDraft(next);
    onApply(next);
  };

  const scientificArticles = !!draft.sourceCategories?.scientificArticles;
  const books = !!draft.sourceCategories?.books;
  const guidelines = !!draft.sourceCategories?.guidelines;
  const metaAnalyses = !!draft.articleTypes?.metaAnalyses;
  const reviewArticles = !!draft.articleTypes?.reviewArticles;
  const clinicalTrials = !!draft.articleTypes?.clinicalTrials;

  const toggleSource = (key: 'scientificArticles' | 'books' | 'guidelines') => {
    update({ ...draft, sourceCategories: { ...draft.sourceCategories, [key]: !draft.sourceCategories?.[key] } });
  };

  const toggleArticleType = (key: 'metaAnalyses' | 'reviewArticles' | 'clinicalTrials') => {
    update({ ...draft, articleTypes: { ...draft.articleTypes, [key]: !draft.articleTypes?.[key] } });
  };

  const fromYear = draft.dateRange?.from;
  const toYear = draft.dateRange?.to;

  const commitYear = (key: 'from' | 'to', year: number) => {
    update({ ...draft, dateRange: { ...draft.dateRange, [key]: year } });
  };

  const openPicker = (picker: 'from' | 'to') => {
    setDraftYear((picker === 'from' ? fromYear : toYear) ?? CURRENT_YEAR);
    setActivePicker(picker);
  };

  const handleDone = () => {
    if (activePicker) commitYear(activePicker, draftYear);
    setActivePicker(null);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[sheetChromeStyles.overlay, { opacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[sheetChromeStyles.sheet, styles.sheet, { transform: [{ translateY }] }]}>
              <View style={sheetChromeStyles.handle} />
              <View style={sheetChromeStyles.header}>
                <TouchableOpacity onPress={onBack} style={sheetChromeStyles.closeButton} activeOpacity={0.7}>
                  <Icon name="foward" size={20} color={theme.colors.grey[600]} style={styles.backIcon} />
                </TouchableOpacity>
                <Text style={sheetChromeStyles.title}>Medical research filters</Text>
                <View style={sheetChromeStyles.closeButton} />
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>HOW RECENT DO YOU WANT THE SOURCE</Text>
                <View style={styles.card}>
                  <TouchableOpacity style={styles.row} onPress={() => openPicker('from')} activeOpacity={0.7}>
                    <Text style={styles.rowLabel}>From</Text>
                    <View style={styles.rowValueGroup}>
                      <Text style={styles.rowValue}>{fromYear ? String(fromYear) : 'Any'}</Text>
                      <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.divider} />
                  <TouchableOpacity style={styles.row} onPress={() => openPicker('to')} activeOpacity={0.7}>
                    <Text style={styles.rowLabel}>To</Text>
                    <View style={styles.rowValueGroup}>
                      <Text style={styles.rowValue}>{toYear ? String(toYear) : 'Any'}</Text>
                      <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                    </View>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>WHAT KIND OF SOURCE DO YOU NEED</Text>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Textbooks</Text>
                    <DSSwitch value={books} onValueChange={() => toggleSource('books')} />
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Clinical guidelines</Text>
                    <DSSwitch value={guidelines} onValueChange={() => toggleSource('guidelines')} />
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Scientific Journal articles</Text>
                    <DSSwitch value={scientificArticles} onValueChange={() => toggleSource('scientificArticles')} />
                  </View>
                </View>

                {scientificArticles && (
                  <>
                    <Text style={styles.sectionLabel}>ONLY WITH THIS JOURNAL ARTICLES</Text>
                    <View style={styles.card}>
                      <View style={styles.row}>
                        <Text style={styles.rowLabel}>Meta-analyses</Text>
                        <DSSwitch value={metaAnalyses} onValueChange={() => toggleArticleType('metaAnalyses')} />
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.row}>
                        <Text style={styles.rowLabel}>Review articles</Text>
                        <DSSwitch value={reviewArticles} onValueChange={() => toggleArticleType('reviewArticles')} />
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.row}>
                        <Text style={styles.rowLabel}>Clinical trials</Text>
                        <DSSwitch value={clinicalTrials} onValueChange={() => toggleArticleType('clinicalTrials')} />
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>

      {/* Same on both platforms — the underlying sources (Europe PMC, PubMed, Semantic
          Scholar) only ever filter by year, so there's no native day-precision picker to
          reach for here. */}
      {activePicker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setActivePicker(null)}>
          <TouchableWithoutFeedback onPress={() => setActivePicker(null)}>
            <View style={styles.yearPickerOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.yearPickerSheet}>
                  <View style={styles.yearPickerHeader}>
                    <Text style={styles.yearPickerTitle}>{activePicker === 'from' ? 'From year' : 'To year'}</Text>
                    <TouchableOpacity onPress={handleDone} activeOpacity={0.7}>
                      <Text style={styles.yearPickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.yearPickerBody}>
                    <CounterInput value={draftYear} onChange={setDraftYear} min={1900} max={CURRENT_YEAR} />
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '85%',
  },
  backIcon: {
    transform: [{ rotate: '180deg' }],
  },
  scrollContent: {
    paddingBottom: theme.spacing[8], // 32
    gap: theme.spacing[2], // 8
  },
  sectionLabel: {
    ...theme.typography.textStyles.label2,
    color: theme.colors.grey[400],
    marginTop: theme.spacing[4], // 16
    marginBottom: theme.spacing[2], // 8
  },
  card: {
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.lg, // 16
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.grey[50],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4], // 16
    paddingVertical: theme.spacing[3], // 12
  },
  rowLabel: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  rowValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
  },
  rowValue: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[400],
  },
  yearPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  yearPickerSheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius['2xl'], // 24
    borderTopRightRadius: theme.borderRadius['2xl'],
    paddingBottom: theme.spacing[8], // 32
  },
  yearPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5], // 20
    paddingVertical: theme.spacing[3], // 12
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey[50],
  },
  yearPickerTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  yearPickerDone: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.yale[700],
  },
  yearPickerBody: {
    paddingVertical: theme.spacing[6], // 24
    paddingHorizontal: theme.spacing[5], // 20
  },
});
