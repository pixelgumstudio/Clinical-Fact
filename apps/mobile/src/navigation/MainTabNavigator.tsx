import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, SparkleIcon, theme } from '@clinicalfact/design-system';
import { HomeScreen, ProfileScreen } from '../screens/main';
import { ChatConversationScreen } from '../screens/chat';
import { QuizHistoryScreen } from '../screens/main/QuizHistoryScreen';
import { FlashcardHistoryScreen } from '../screens/main/FlashcardHistoryScreen';
import { OnboardingOverlay } from '../components/OnboardingOverlay';
import { useOnboardingStore } from '../store/onboardingStore';
import { useAuthStore } from '../store/authStore';
import { useAIConsentStore } from '../store/aiConsentStore';

export type MainTabParamList = {
  Home: undefined;
  Quiz: undefined;
  Chat: undefined;
  Flashcards: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const { user } = useAuthStore();
  const {
    hasCompletedOnboarding,
    isOnboardingActive,
    startOnboarding,
  } = useOnboardingStore();

  // Start onboarding once for new users — AppNavigator already loaded the status
  useEffect(() => {
    if (user && !hasCompletedOnboarding && !isOnboardingActive) {
      const timer = setTimeout(() => {
        startOnboarding();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [user?.id, hasCompletedOnboarding, isOnboardingActive]);

  // Ask for AI-data consent right here, as soon as the user lands on the main app after
  // onboarding — rather than waiting for the first AI-triggering action (chat, note, quiz,
  // flashcards, etc). No-ops immediately for anyone who already consented, so this is safe to
  // fire on every fresh landing; the per-action consent checks elsewhere stay in place as a
  // fallback for the rare case this proactive prompt doesn't fire (e.g. a declined prompt).
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      useAIConsentStore.getState().requestConsent(() => {}, () => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [user?.id]);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: theme.colors.yale[700],
          tabBarInactiveTintColor: theme.colors.grey[200],
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color }) => <Icon name="chatFill" size={24} color={color} />,
          }}
        />
        <Tab.Screen
          name="Quiz"
          component={QuizHistoryScreen}
          options={{
            tabBarIcon: ({ color }) => <Icon name="quizFill" size={24} color={color} />,
          }}
        />
        <Tab.Screen
          name="Chat"
          component={ChatConversationScreen}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: () => (
              <View style={styles.chatTabButton}>
                <SparkleIcon size={32} color={theme.colors.white} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Flashcards"
          component={FlashcardHistoryScreen}
          options={{
            tabBarIcon: ({ color }) => <Icon name="flashcardsFill" size={24} color={color} />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color }) => <Icon name="profileFill" size={24} color={color} />,
          }}
        />
      </Tab.Navigator>

      {/* Onboarding Overlay */}
      <OnboardingOverlay />
    </>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[10],
    paddingHorizontal: 23,
    paddingTop: 8,
  },
  tabLabel: {
    ...theme.typography.textStyles.label2,
    marginTop: 4,
  },
  chatTabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.yale[700],
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
});
