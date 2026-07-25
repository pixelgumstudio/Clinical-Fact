import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type FeatureChatNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'FeatureChat'>;

const PROGRESS_GRADIENT: [string, string, ...string[]] = [
  '#CEF9D0', '#DCEEB9', '#FFB09C', '#ECE19F', '#F3DA93', '#F9C597',
];

export const FeatureChatScreen = () => {
  const navigation = useNavigation<FeatureChatNavigationProp>();
  const canGoBack = navigation.canGoBack();

  return (
    <LinearGradient
      colors={['#E8F7F3', '#FFFFFF', '#FDF0E8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBg}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header row */}
        <View style={styles.header}>
          {canGoBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={PROGRESS_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressFill66}
            />
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Notechat + document row */}
          <View style={styles.notechatRow}>
            {/* Left: Notechat icon + label */}
            <View style={styles.notechatLeft}>
              <LinearGradient
                colors={['#FFB09C', '#F3DA93']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.notechatIcon}
              >
                <Text style={styles.notechatDots}>• •</Text>
              </LinearGradient>
              <Text style={styles.notechatLabel}>Notechat</Text>
            </View>

            {/* Right: document card */}
            <View style={styles.docCard}>
              <View style={styles.docCardHeader}>
                <Text style={styles.docIcon}>📄</Text>
                <Text style={styles.docTitle}>Solar energy</Text>
              </View>
              <View style={[styles.docLine, { width: '100%' }]} />
              <View style={[styles.docLine, { width: '85%' }]} />
              <View style={[styles.docLine, { width: '90%' }]} />
              <View style={[styles.docLine, { width: '70%' }]} />
            </View>
          </View>

          {/* Question bubble */}
          <LinearGradient
            colors={['#B3E5FC', '#B2DFDB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.questionBubble}
          >
            <Text style={styles.questionText}>
              What challenges affect CRM implementation?
            </Text>
          </LinearGradient>

          {/* Answer card */}
          <View style={styles.answerCard}>
            <Text style={styles.answerLine}>
              <Text style={styles.answerBold}>{'• Data Silos: '}</Text>
              <Text style={styles.answerRegular}>Information scattered across different systems hinders a unified view.</Text>
            </Text>
            <Text style={styles.answerLine}>
              <Text style={styles.answerBold}>{'• Scalability: '}</Text>
              <Text style={styles.answerRegular}>Choosing a CRM that doesn't grow with your business limits long-term potential.</Text>
            </Text>
            <Text style={styles.answerLine}>
              <Text style={styles.answerBold}>{'• Lack of Customization: '}</Text>
              <Text style={styles.answerRegular}>Inability to tailor the CRM to specific business needs reduces its effectiveness.</Text>
            </Text>
          </View>

          {/* Suggested question pill */}
          <View style={styles.suggestionPill}>
            <Text style={styles.suggestionText}>
              What problems businesses face with CRMs?
            </Text>
            <LinearGradient
              colors={['#FFB09C', '#F3DA93']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.suggestionArrow}
            >
              <Text style={styles.suggestionArrowText}>›</Text>
            </LinearGradient>
          </View>

          {/* Bottom text */}
          <View style={styles.bottomText}>
            <Text style={styles.bottomTitle}>Chat with your notes</Text>
            <Text style={styles.bottomSubtitle}>
              {'Ask any document questions and get instant AI-\npowered answers.'}
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('FeatureQuiz')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: '#1C1C1C',
    lineHeight: 28,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill66: {
    width: '66%',
    height: '100%',
    borderRadius: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },

  // Notechat row
  notechatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notechatLeft: {
    alignItems: 'center',
  },
  notechatIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notechatDots: {
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 2,
  },
  notechatLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1C',
    textAlign: 'center',
    marginTop: 4,
  },

  // Doc card
  docCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  docIcon: {
    fontSize: 14,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1C',
  },
  docLine: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 4,
  },

  // Question bubble
  questionBubble: {
    borderRadius: 20,
    padding: 14,
    width: '100%',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1C',
  },

  // Answer card
  answerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    gap: 6,
  },
  answerLine: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
  },
  answerBold: {
    fontWeight: '700',
    color: '#374151',
  },
  answerRegular: {
    fontWeight: '400',
  },

  // Suggestion pill
  suggestionPill: {
    borderWidth: 1.5,
    borderColor: '#F3DA93',
    borderRadius: 24,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  suggestionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionArrowText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 22,
  },

  // Bottom text
  bottomText: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  bottomTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1C1C1C',
    textAlign: 'center',
    marginBottom: 8,
  },
  bottomSubtitle: {
    fontSize: 15,
    color: '#636363',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  continueButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
