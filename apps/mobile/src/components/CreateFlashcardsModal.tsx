import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Icon, theme, colors } from "@clinicalfact/design-system";
import { CounterInput } from "./CounterInput";
import { useTranslation } from 'react-i18next';
import { FullScreenModal } from './FullScreenModal';

interface CreateFlashcardsModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerateFlashcards: (questionCount: number) => void;
  isGenerating?: boolean;
  noteTitle?: string;
}

export const CreateFlashcardsModal: React.FC<CreateFlashcardsModalProps> = ({
  visible,
  onClose,
  onGenerateFlashcards,
  isGenerating = false,
  noteTitle,
}) => {
  const { t } = useTranslation();
  const [questionCount, setQuestionCount] = useState(3);

  const handleGenerate = () => {
    onGenerateFlashcards(questionCount);
  };

  return (
    <FullScreenModal
      visible={visible}
      onClose={onClose}
      closeDisabled={isGenerating}
      title={t('components.createFlashcards.generateFlashcards')}
      scroll
    >
              <View style={styles.content}>
                {/* Flashcards Icon */}
                <View style={styles.iconCircle}>
                  <Icon name="flashcardsFill" size={40} color={colors.white} />
                </View>

                {/* Title */}
                <Text style={styles.title}>{t('components.createFlashcards.createFlashcards')}</Text>
                <Text style={styles.subtitle}>
                  {noteTitle
                    ? t('components.createFlashcards.createFlashcardsFromToImproveYour', { noteTitle })
                    : t('components.createFlashcards.createFlashcardsToImproveYourRetention')}
                </Text>

                {/* Question Count Selector */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>{t('components.createFlashcards.howManyQuestions')}</Text>
                  <CounterInput
                    value={questionCount}
                    onChange={setQuestionCount}
                    min={1}
                    max={50}
                    disabled={isGenerating}
                  />
                </View>

                {/* Generate Button */}
                <TouchableOpacity
                  style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
                  onPress={handleGenerate}
                  activeOpacity={0.8}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.generateButtonText}>{t('components.createFlashcards.generateFlashcards2')}</Text>
                  )}
                </TouchableOpacity>
              </View>
    </FullScreenModal>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[5],
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[600],
    textAlign: "center",
    marginBottom: theme.spacing[6],
  },
  selectorContainer: {
    width: "100%",
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius['2xl'],
    padding: theme.spacing[6],
    marginBottom: theme.spacing[4],
  },
  selectorLabel: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    textAlign: "center",
    marginBottom: theme.spacing[4],
  },
  generateButton: {
    width: "100%",
    backgroundColor: theme.colors.yale[700],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    marginTop: theme.spacing[4],
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    ...theme.typography.textStyles.button1,
    color: colors.white,
  },
});
