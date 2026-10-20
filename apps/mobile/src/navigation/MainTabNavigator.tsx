import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { Icon, SparkleIcon, theme } from '@clinicalfact/design-system';
import { HomeScreen, ProfileScreen } from '../screens/main';
import { ChatConversationScreen } from '../screens/chat';
import { QuizHistoryScreen } from '../screens/main/QuizHistoryScreen';
import { FlashcardHistoryScreen } from '../screens/main/FlashcardHistoryScreen';
import { WalkthroughOverlay } from '../components/walkthrough/WalkthroughOverlay';
import { useWalkthroughTarget } from '../hooks/useWalkthroughTarget';
import type { WalkthroughTargetId } from '../services/walkthroughTargets';
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

/** A tab button the walkthrough can point at: the stock button, in a wrapper that registers its position. */
const tabButtonFor = (id: WalkthroughTargetId) => (props: BottomTabBarButtonProps) => <TabButtonTarget targetId={id} {...props} />;

const TabButtonTarget = ({ targetId, ...props }: BottomTabBarButtonProps & { targetId: WalkthroughTargetId }) => {
  const ref = useWalkthroughTarget(targetId);
  return (
    <View ref={ref} collapsable={false} style={styles.tabButtonTarget}>
      <PlatformPressable {...props} />
    </View>
  );
};

export const MainTabNavigator = () => {
  const { t } = useTranslation();
  const { user, completeOnboardingStep } = useAuthStore();
  // A brand-new account lands on Chat so its first action is a conversation, and it keeps landing
  // there until the walkthrough (which points at things on Chat) is finished or skipped; every later
  // launch lands on Home. Both flags live on the account (set when registration completes), so they
  // survive a crash, a reinstall or another device. Decided once, at first mount: the first-chat step
  // is marked done straight away, which must not change where this mount starts.
  const landOnChat = useRef(
    user?.onboarding?.firstChatPending === true || user?.onboarding?.walkthroughPending === true
  ).current;
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
            title: t('navigation.mainTabNavigator.home'),
            tabBarButton: tabButtonFor('tabHome'),
            tabBarIcon: ({ color }) => <Icon name="chatFill" size={24} color={color} />,
          }}
        />
        <Tab.Screen
          name="QuizTab"
          component={QuizHistoryScreen}
          options={{
            title: t('navigation.mainTabNavigator.quiz'),
            tabBarButton: tabButtonFor('tabQuiz'),
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
            title: t('navigation.mainTabNavigator.flashcards'),
            tabBarButton: tabButtonFor('tabFlashcards'),
            tabBarIcon: ({ color }) => <Icon name="flashcardsFill" size={24} color={color} />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: t('navigation.mainTabNavigator.profile'),
            tabBarIcon: ({ color }) => <Icon name="profileFill" size={24} color={color} />,
          }}
        />
      </Tab.Navigator>

      <WalkthroughOverlay />
    </>
  );
};

const styles = StyleSheet.create({
  tabButtonTarget: {
    flex: 1,
  },
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
