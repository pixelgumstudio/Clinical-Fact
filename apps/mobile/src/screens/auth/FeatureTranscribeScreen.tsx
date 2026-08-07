import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Icon, theme } from '@clinicalfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { FeatureScreenLayout } from '../../components/FeatureScreenLayout';

type FeatureTranscribeNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'FeatureTranscribe'
>;

const DARK_BAR_HEIGHTS = [20, 35, 28, 40, 32, 38, 25, 42, 30, 36];

const ACTION_GRADIENTS: [string, string, ...string[]][] = [
  ['#FFEBEA', '#CBEAFF', '#FBD0CD', '#B9EDBA'],
  ['#CBEAFF', '#DAFADB', '#CCFBF1', '#2DD4C0'],
  ['#F6FEE7', '#BEF164', '#B5D975', '#D3E2B7'],
];

export const FeatureTranscribeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<FeatureTranscribeNavigationProp>();

  const actionItems = [
    t('auth.features.transcribe.actionItem1'),
    t('auth.features.transcribe.actionItem2'),
    t('auth.features.transcribe.actionItem3'),
  ];

  return (
    <FeatureScreenLayout
      progress={0.5}
      title={t('auth.features.transcribe.title')}
      subtitle={t('auth.features.transcribe.description')}
      continueLabel={t('auth.buttons.continue')}
      onContinue={() => navigation.navigate('FeatureChat')}
    >
      <View style={styles.illustrationWrap}>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('auth.features.transcribe.demoLabel')}</Text>
        </View>
      </View>

      {/* Audio player card */}
      <View style={styles.playerCard}>
        <View style={styles.pauseButton}>
          <Icon name="pauseFill" size={20} color={theme.colors.white} />
        </View>

        <View style={styles.waveform}>
          {DARK_BAR_HEIGHTS.map((h, i) => (
            <View key={`dark-${i}`} style={[styles.waveBar, styles.waveDark, { height: h }]} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <View key={`light-${i}`} style={[styles.waveBar, styles.waveLight]} />
          ))}
        </View>

        <Text style={styles.timeText}>-23:45</Text>
      </View>

      {/* Note card */}
      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>{t('auth.features.transcribe.noteTitle')}</Text>
        <Text style={styles.noteBody}>{t('auth.features.transcribe.noteBody')}</Text>
        <Text style={styles.actionPointsLabel}>
          {t('auth.features.transcribe.actionPointsLabel')}
        </Text>

        {actionItems.map((label, index) => (
          <LinearGradient
            key={label}
            colors={ACTION_GRADIENTS[index]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.actionItem, index === actionItems.length - 1 && styles.actionItemLast]}
          >
            <Icon name="sucessfulFill" size={22} color={theme.colors.grey[900]} />
            <Text style={styles.actionItemText}>{label}</Text>
          </LinearGradient>
        ))}
      </View>
      </View>
    </FeatureScreenLayout>
  );
};

const styles = StyleSheet.create({
  illustrationWrap: {
    alignSelf: 'center',
    width: '73%',
  },
  badgeRow: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing[2], // 8
  },
  badge: {
    backgroundColor: theme.colors.grey[10],
    paddingVertical: theme.spacing[2], // 8
    paddingHorizontal: theme.spacing[3], // 12
    borderRadius: theme.borderRadius.md, // 12
  },
  badgeText: {
    ...theme.typography.textStyles.label1,
    color: theme.colors.grey[900],
  },

  playerCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg, // 16
    padding: theme.spacing[3], // 12
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
    ...theme.shadows.card,
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md, // 12
    backgroundColor: theme.colors.yale[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  waveDark: {
    backgroundColor: theme.colors.grey[900],
  },
  waveLight: {
    backgroundColor: theme.colors.grey[200],
    height: 8,
  },
  timeText: {
    ...theme.typography.textStyles.label1,
    color: theme.colors.grey[800],
  },

  noteCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg, // 16
    padding: theme.spacing[4], // 16
    marginTop: theme.spacing[3], // 12
    ...theme.shadows.card,
  },
  noteTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[1.5],
  },
  noteBody: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing[3], // 12
  },
  actionPointsLabel: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    marginBottom: 10,
  },
  actionItem: {
    height: 44,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[3], // 12
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: theme.spacing[2], // 8
  },
  actionItemLast: {
    marginBottom: 0,
  },
  actionItemText: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.grey[900],
    flex: 1,
  },
});

export default FeatureTranscribeScreen;
