import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth Screens
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { EmailScreen } from '../screens/auth/EmailScreen';
import { OTPVerificationScreen } from '../screens/auth/OTPVerificationScreen';
import { NameScreen } from '../screens/auth/NameScreen';
import { UsernameScreen } from '../screens/auth/UsernameScreen';
import { ContentTypeScreen } from '../screens/auth/ContentTypeScreen';
import { GoalsScreen } from '../screens/auth/GoalsScreen';
import { FeatureShowcaseScreen } from '../screens/auth/FeatureShowcaseScreen';
import { FeatureTranscribeScreen } from '../screens/auth/FeatureTranscribeScreen';
import { FeatureChatScreen } from '../screens/auth/FeatureChatScreen';
import { FeatureQuizScreen } from '../screens/auth/FeatureQuizScreen';
import { ThanksScreen } from '../screens/auth/ThanksScreen';
import { ReviewStyleScreen } from '../screens/auth/ReviewStyleScreen';
import { ReferralScreen } from '../screens/auth/ReferralScreen';
import { ReferralCodeScreen } from '../screens/auth/ReferralCodeScreen';
import { SetupScreen } from '../screens/auth/SetupScreen';
import { DemoVideoScreen } from '../screens/auth/DemoVideoScreen';

export type AuthStackParamList = {
  // Entry
  Welcome: undefined;

  // Email Flow (skipped for Google auth)
  Email: undefined;
  OTPVerification: undefined;
  Name: undefined;
  Username: undefined;

  // Shared Flow (both Email and Google)
  Goals: undefined;
  ContentType: undefined;
  FeatureShowcase: undefined;
  FeatureTranscribe: undefined;
  FeatureChat: undefined;
  FeatureQuiz: undefined;

  // Extended Flow (Google auth includes these additional screens)
  Thanks: undefined;
  ReviewStyle: undefined;
  Referral: undefined;
  ReferralCode: undefined;

  // Final Screens
  Setup: undefined;
  DemoVideo: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  initialRouteName?: keyof AuthStackParamList;
}

export const AuthNavigator = ({ initialRouteName = 'Welcome' }: AuthNavigatorProps) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
      initialRouteName={initialRouteName}
    >
      {/* Entry Screen */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />

      {/* Email Flow Screens */}
      <Stack.Screen name="Email" component={EmailScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="Name" component={NameScreen} />
      <Stack.Screen name="Username" component={UsernameScreen} />

      {/* Shared Personalization Screens */}
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="ContentType" component={ContentTypeScreen} />

      {/* Feature Showcase Screen (swipeable pager) */}
      <Stack.Screen name="FeatureShowcase" component={FeatureShowcaseScreen} />

      {/* Feature Detail Screens */}
      <Stack.Screen name="FeatureTranscribe" component={FeatureTranscribeScreen} />
      <Stack.Screen name="FeatureChat" component={FeatureChatScreen} />
      <Stack.Screen name="FeatureQuiz" component={FeatureQuizScreen} />

      {/* Extended Personalization Screens (primarily for Google flow) */}
      <Stack.Screen name="Thanks" component={ThanksScreen} />
      <Stack.Screen name="ReviewStyle" component={ReviewStyleScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="ReferralCode" component={ReferralCodeScreen} />

      {/* Final Screens */}
      <Stack.Screen
        name="Setup"
        component={SetupScreen}
        options={{
          gestureEnabled: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="DemoVideo"
        component={DemoVideoScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};
