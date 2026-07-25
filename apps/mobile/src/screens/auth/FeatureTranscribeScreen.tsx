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

type FeatureTranscribeNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'FeatureTranscribe'
>;

const PROGRESS_GRADIENT: [string, string, ...string[]] = [
  '#CEF9D0', '#DCEEB9', '#FFB09C', '#ECE19F', '#F3DA93', '#F9C597',
];

const DARK_BAR_HEIGHTS = [20, 35, 28, 40, 32, 38, 25, 42, 30, 36];

export const FeatureTranscribeScreen = () => {
  const navigation = useNavigation<FeatureTranscribeNavigationProp>();
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
              style={styles.progressFill50}
            />
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Badge + curved arrow row above player */}
          <View style={styles.badgeRow}>
            <View style={styles.badgeRowInner}>
              <LinearGradient
                colors={['#F3DA93', '#FFB09C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.audioBadge}
              >
                <Text style={styles.audioBadgeText}>From a 50-min audio</Text>
              </LinearGradient>
              <Text style={styles.curvedArrow}>↙</Text>
            </View>
          </View>

          {/* Audio player card */}
          <View style={styles.playerCard}>
            <LinearGradient
              colors={['#FFB09C', '#F3DA93']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pauseButton}
            >
              <Text style={styles.pauseIcon}>⏸</Text>
            </LinearGradient>

            {/* Waveform */}
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
            <Text style={styles.noteTitle}>📌 Meeting with the Zoe corps</Text>
            <Text style={styles.noteBody}>
              A motion has been made and seconded to amend the motion to increase the state match local litigation taxes to the maximum amounts to require 25 percent of the proceeds from
            </Text>
            <Text style={styles.actionPointsLabel}>🎯 Action points</Text>

            {/* Action items */}
            <LinearGradient
              colors={['#BBDEFB', '#C8E6C9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionItem}
            >
              <View style={styles.checkCircle}>
                <Text style={styles.checkText}>✓</Text>
              </View>
              <Text style={styles.actionItemText}>Follow up with Zaltar Corp</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#B3E5FC', '#B2DFDB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionItem}
            >
              <View style={styles.checkCircle}>
                <Text style={styles.checkText}>✓</Text>
              </View>
              <Text style={styles.actionItemText}>Send intro email to the Volkov</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#F9F3A3', '#D4EDBC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.actionItem, { marginBottom: 0 }]}
            >
              <View style={styles.checkCircle}>
                <Text style={styles.checkText}>✓</Text>
              </View>
              <Text style={styles.actionItemText}>Schedule a meeting with Ito</Text>
            </LinearGradient>
          </View>

          {/* Bottom text */}
          <View style={styles.bottomText}>
            <Text style={styles.bottomTitle}>Auto-transcribe any notes or file</Text>
            <Text style={styles.bottomSubtitle}>
              {'Upload or record your notes, Get clean searchable\nnotes in seconds.'}
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('FeatureChat')}
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
  progressFill50: {
    width: '50%',
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
  },

  // Badge row
  badgeRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  badgeRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  audioBadge: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  audioBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  curvedArrow: {
    fontSize: 20,
    color: '#1C1C1C',
  },

  // Player card
  playerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIcon: {
    fontSize: 18,
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
    backgroundColor: '#1C1C1C',
  },
  waveLight: {
    backgroundColor: '#BFBFBF',
    height: 8,
  },
  timeText: {
    fontSize: 13,
    color: '#374151',
    fontFamily: 'monospace',
  },

  // Note card
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 6,
  },
  noteBody: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionPointsLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 10,
  },
  actionItem: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1C',
  },

  // Bottom text
  bottomText: {
    alignItems: 'center',
    marginTop: 24,
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
