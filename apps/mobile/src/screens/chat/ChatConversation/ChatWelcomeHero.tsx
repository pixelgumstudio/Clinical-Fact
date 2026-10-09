import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Image, StyleSheet } from 'react-native';
import { Icon, theme } from '@clinicalfact/design-system';

// Confirmed 2026-07-29 — replaces the old Gemini-style "Hi, what's on your mind?"
// greeting with the branded hero + starter-topic cards shown when a new chat is
// created with no session yet.
const CHAT_WELCOME_TOPICS = [
  { emoji: '🔋', label: 'Electrolyte imbalance explained', question: 'Explain electrolyte imbalance — causes, symptoms, and treatment' },
  { emoji: '🩵', label: 'ECG interpretation basics', question: 'What are the basics of ECG interpretation?' },
  { emoji: '💊', label: 'Common drug interactions to know', question: 'What are some common and important drug interactions I should know?' },
  { emoji: '🫀', label: 'NCLEX-style practice topics', question: 'Give me an NCLEX-style practice question' },
];

interface ChatWelcomeHeroProps {
  onSelectTopic: (question: string) => void;
}

export const ChatWelcomeHero: React.FC<ChatWelcomeHeroProps> = ({ onSelectTopic }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.welcomeContainer, { opacity, transform: [{ scale }] }]}>
      <View style={styles.welcomeLogoRow}>
        <Image
          source={require('../../../../assets/Chat_logo.png')}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <Text style={styles.welcomeWordmark}>Clinicalfact</Text>
      </View>
      <Text style={styles.welcomeTagline}>
        Ask anything medical, Get the{'\n'}Cited fact backed by real sources
      </Text>
      <Text style={styles.welcomeSubtitle}>Evidence-based · PubMed sources · Peer-reviewed</Text>

      <Text style={styles.welcomeTopicsLabel}>Try out any of this topics to get started</Text>
      <View style={styles.welcomeTopicsList}>
        {CHAT_WELCOME_TOPICS.map((topic) => (
          <TouchableOpacity
            key={topic.label}
            style={styles.welcomeTopicCard}
            onPress={() => onSelectTopic(topic.question)}
            activeOpacity={0.7}
          >
            <View style={styles.welcomeTopicTop}>
              <View style={styles.welcomeTopicIcon}>
                <Text style={styles.welcomeTopicEmoji}>{topic.emoji}</Text>
              </View>
              <Icon name="foward" size={16} color={theme.colors.grey[200]} />
            </View>
            <Text style={styles.welcomeTopicText}>{topic.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4], // 16
    width: '100%',
  },
  welcomeLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
    marginBottom: theme.spacing[6], // 24
  },
  welcomeLogo: {
    width: 36,
    height: 36,
  },
  welcomeWordmark: {
    ...theme.typography.textStyles.h6,
    fontFamily: theme.typography.fontFamily.tiroBangla,
    color: theme.colors.yale[701],
  },
  welcomeTagline: {
    ...theme.typography.textStyles.h7,
    fontFamily: theme.typography.fontFamily.lora,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.yale[900],
    textAlign: 'center',
    marginBottom: theme.spacing[2], // 8
  },
  welcomeSubtitle: {
    ...theme.typography.textStyles.caption1,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginBottom: theme.spacing[6], // 24
  },
  welcomeTopicsLabel: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.yale[900],
    textAlign: 'center',
    marginBottom: theme.spacing[2], // 8
  },
  welcomeTopicsList: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3], // 12
  },
  welcomeTopicCard: {
    width: '48%',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    borderRadius: theme.borderRadius.lg, // 16
    padding: theme.spacing[4], // 16
    gap: theme.spacing[4], // 16
  },
  welcomeTopicTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeTopicIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm, // 8
    backgroundColor: theme.colors.linen[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTopicEmoji: {
    fontSize: 16,
  },
  welcomeTopicText: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.grey[900],
  },
});
