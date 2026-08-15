import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, theme } from '@clinicalfact/design-system';
import { ProfileScreen } from '../screens/main';
import { ChatConversationScreen } from '../screens/chat';
import { QuizHistoryScreen } from '../screens/main/QuizHistoryScreen';
import { FlashcardHistoryScreen } from '../screens/main/FlashcardHistoryScreen';
import { OnboardingOverlay } from '../components/OnboardingOverlay';
import { useOnboardingStore } from '../store/onboardingStore';
import { useAuthStore } from '../store/authStore';

export type MainTabParamList = {
  Home: undefined;
  Quiz: undefined;
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
          component={ChatConversationScreen}
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
});
