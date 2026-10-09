import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Video, { VideoRef } from 'react-native-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@clinicalfact/design-system';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore } from '../../store/signupStore';
import { useAuthStore } from '../../store/authStore';

type DemoVideoScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'DemoVideo'>;

const PROGRESS_GRADIENT: [string, string, ...string[]] = [
  colors.pastelRainbow.mint,
  colors.pastelRainbow.lime,
  colors.pastelRainbow.coral,
  colors.pastelRainbow.honeydew,
  colors.pastelRainbow.wheat,
  colors.pastelRainbow.apricot,
];

export const DemoVideoScreen = () => {
  const navigation = useNavigation<DemoVideoScreenNavigationProp>();
  const { resetSignup } = useSignupStore();
  const { setOnboardingComplete } = useAuthStore();
  const canGoBack = navigation.canGoBack();
  const videoRef = useRef<VideoRef>(null);

  const handleContinue = () => {
    setOnboardingComplete();
    resetSignup();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={PROGRESS_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressFill}
          />
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>Everything you need to{'\n'} learn anything</Text>
          <Text style={styles.subtitle}>
            Record it. Research it. Quiz it. Master it.
          </Text>
        </View>

        <View style={styles.videoCard}>
          <Video
            ref={videoRef}
            source={require('../../../assets/demo-video.mp4')}
            style={styles.video}
            paused={false}
            muted={true}
            repeat={true}
            resizeMode="cover"
            ignoreSilentSwitch="obey"
          />
          <TouchableOpacity
            style={styles.fullscreenButton}
            onPress={() => videoRef.current?.presentFullscreenPlayer()}
            activeOpacity={0.7}
          >
            <Text style={styles.fullscreenIcon}>⛶</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Try Clinical Fact now for free</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: colors.grey[900],
    fontWeight: '500',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.grey[10],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  titleSection: {
    marginTop: 8,
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.grey[900],
    letterSpacing: -0.48,
    lineHeight: 32,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.grey[600],
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  videoCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  video: {
    width: '100%',
    aspectRatio: 9 / 16,
  },
  fullscreenButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenIcon: {
    fontSize: 18,
    color: colors.white,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  continueButton: {
    backgroundColor: colors.grey[900],
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.white,
    letterSpacing: -0.16,
  },
});
