import React, { useEffect, useRef } from 'react';
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
import { useTranslation } from 'react-i18next';

export type MainTabParamList = {
  Home: undefined;
  // Not 'Quiz': MainStack has a screen of that name (the real quiz screen), and navigate('Quiz')
  // from anywhere inside these tabs (e.g. Home) resolved to this list tab instead of the stack.
  QuizTab: undefined;
  Chat: undefined;
  Flashcards: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const { t } = useTranslation();
  const { user, completeOnboardingStep } = useAuthStore();
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

  // A brand-new account lands on Chat so its first action is a conversation; every later launch
  // lands on Home. The flag lives on the account (set when registration completes), so it survives
  // a crash before landing, a reinstall or another device. Decided once, at first mount: the step is
  // marked done straight away, which must not change where this mount starts.
  const landOnChat = useRef(user?.onboarding?.firstChatPending === true).current;
  useEffect(() => {
    if (landOnChat) completeOnboardingStep('firstChatPending');
  }, []);

  return (
    <>
      <Tab.Navigator
        initialRouteName={landOnChat ? 'Chat' : 'Home'}
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
          name="QuizTab"
          component={QuizHistoryScreen}
          options={{
            title: t('navigation.mainTabNavigator.quiz'),
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
