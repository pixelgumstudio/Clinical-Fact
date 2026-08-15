import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Icon, theme } from '@clinicalfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { FeatureScreenLayout } from '../../components/FeatureScreenLayout';

type FeatureChatNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'FeatureChat'>;

export const FeatureChatScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<FeatureChatNavigationProp>();

  return (
    <FeatureScreenLayout
      progress={0.66}
      title={t('auth.features.chat.title')}
      subtitle={t('auth.features.chat.description')}
      continueLabel={t('auth.buttons.continue')}
      onContinue={() => navigation.navigate('FeatureQuiz')}
    >
      <View style={styles.illustrationWrap}>
      {/* Notechat + document row */}
      <View style={styles.notechatRow}>
        <View style={styles.notechatLeft}>
          <LinearGradient
            colors={['#FFB09C', '#F3DA93']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.notechatIcon}
          >
            <Icon name="chatFill" size={26} color={theme.colors.white} />
          </LinearGradient>
          <Text style={styles.notechatLabel}>{t('auth.features.chat.featureChatLabel')}</Text>
        </View>

        <View style={styles.docCard}>
          <View style={styles.docCardHeader}>
            <Icon name="note" size={14} color={theme.colors.grey[300]} />
            <Text style={styles.docTitle}>{t('auth.features.chat.docTitle')}</Text>
          </View>
          <View style={[styles.docLine, { width: '100%' }]} />
          <View style={[styles.docLine, { width: '85%' }]} />
          <View style={[styles.docLine, { width: '90%' }]} />
          <View style={[styles.docLine, { width: '70%' }]} />
        </View>
      </View>

      {/* Question bubble */}
      <LinearGradient
        colors={['#CBEAFF', '#DAFADB', '#CCFBF1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.questionBubble}
      >
        <Text style={styles.questionText}>{t('auth.features.chat.questionText')}</Text>
      </LinearGradient>

      {/* Answer card */}
      <View style={styles.answerCard}>
        <Text style={styles.answerLine}>
          <Text style={styles.answerBold}>{t('auth.features.chat.answerBold1')}</Text>
          <Text style={styles.answerRegular}>{t('auth.features.chat.answerRegular1')}</Text>
        </Text>
        <Text style={styles.answerLine}>
          <Text style={styles.answerBold}>{t('auth.features.chat.answerBold2')}</Text>
          <Text style={styles.answerRegular}>{t('auth.features.chat.answerRegular2')}</Text>
        </Text>
        <Text style={styles.answerLine}>
          <Text style={styles.answerBold}>{t('auth.features.chat.answerBold3')}</Text>
          <Text style={styles.answerRegular}>{t('auth.features.chat.answerRegular3')}</Text>
        </Text>
      </View>

      {/* Suggested question pill */}
      <View style={styles.suggestionPill}>
        <Text style={styles.suggestionText}>{t('auth.features.chat.suggestionText')}</Text>
        <LinearGradient
          colors={['#FFB09C', '#F3DA93']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.suggestionArrow}
        >
          <Icon name="foward" size={16} color={theme.colors.white} />
        </LinearGradient>
      </View>
      </View>
    </FeatureScreenLayout>
  );
};

const styles = StyleSheet.create({
  illustrationWrap: {
    alignSelf: 'center',
    width: '77%',
  },
  notechatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[3], // 12
    marginBottom: theme.spacing[3], // 12
  },
  notechatLeft: {
    alignItems: 'center',
  },
  notechatIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notechatLabel: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginTop: theme.spacing[1],
  },

  docCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md, // 12
    padding: theme.spacing[3], // 12
    ...theme.shadows.sm,
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
    marginBottom: theme.spacing[2], // 8
  },
  docTitle: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.grey[900],
  },
  docLine: {
    height: 8,
    backgroundColor: theme.colors.grey[50],
    borderRadius: 4,
    marginBottom: theme.spacing[1],
  },

  questionBubble: {
    borderRadius: theme.borderRadius.xl, // 20
    padding: 14,
    width: '100%',
    marginBottom: theme.spacing[3], // 12
  },
  questionText: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },

  answerCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg, // 16
    padding: 14,
    gap: theme.spacing[1.5],
    marginBottom: theme.spacing[3], // 12
    ...theme.shadows.card,
  },
  answerLine: {
    ...theme.typography.textStyles.p3,
    lineHeight: 20,
    color: theme.colors.grey[700],
  },
  answerBold: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.grey[700],
  },
  answerRegular: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontWeight: theme.typography.fontWeight.regular,
  },

  suggestionPill: {
    borderWidth: 1.5,
    borderColor: theme.colors.orange[300],
    borderRadius: theme.borderRadius.xl, // 20
    padding: theme.spacing[3], // 12
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
  },
  suggestionText: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[700],
    flex: 1,
  },
  suggestionArrow: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FeatureChatScreen;
