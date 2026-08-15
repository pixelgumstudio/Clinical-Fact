import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth Screens
import { IntroScreen } from '../screens/auth/IntroScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { OTPVerificationScreen } from '../screens/auth/OTPVerificationScreen';
import { NameScreen } from '../screens/auth/NameScreen';
import { UsernameScreen } from '../screens/auth/UsernameScreen';
import { ProfessionalDeclarationScreen } from '../screens/auth/ProfessionalDeclarationScreen';
import { RoleScreen } from '../screens/auth/RoleScreen';
import { CurrentMethodScreen } from '../screens/auth/CurrentMethodScreen';
import { TimeDrainScreen } from '../screens/auth/TimeDrainScreen';
import { AppExpectationScreen } from '../screens/auth/AppExpectationScreen';
import { AiToolsUsedScreen } from '../screens/auth/AiToolsUsedScreen';
import { AiToolIssueScreen } from '../screens/auth/AiToolIssueScreen';
import { AiTrustLevelScreen } from '../screens/auth/AiTrustLevelScreen';
import { BiggestNeedScreen } from '../screens/auth/BiggestNeedScreen';
import { Feature1Screen } from '../screens/auth/Feature1Screen';
import { Feature2Screen } from '../screens/auth/Feature2Screen';
import { Feature3Screen } from '../screens/auth/Feature3Screen';
import { Feature4Screen } from '../screens/auth/Feature4Screen';
import { ThanksScreen } from '../screens/auth/ThanksScreen';
import { StudyTimeScreen } from '../screens/auth/StudyTimeScreen';
import { ComingUpScreen } from '../screens/auth/ComingUpScreen';
import { ReferralScreen } from '../screens/auth/ReferralScreen';
import { ReferralCodeScreen } from '../screens/auth/ReferralCodeScreen';
import { SetupScreen } from '../screens/auth/SetupScreen';
import { PaywallScreen } from '../screens/auth/PaywallScreen';
import { DemoVideoScreen } from '../screens/auth/DemoVideoScreen';

export type AuthStackParamList = {
  // Entry
  Intro: undefined;
  Welcome: undefined;

  // Email Flow (skipped for Google auth) — OTP is sent directly from
  // Welcome; there's no separate "enter email" screen anymore.
  OTPVerification: undefined;
  Name: undefined;
  Username: undefined;
  ProfessionalDeclaration: undefined;

  // 8-screen onboarding survey (confirmed 2026-07-30) — replaces the old
  // Goals/ContentType/ReviewStyle/Frustration question screens.
  Role: undefined;
  CurrentMethod: undefined;
  TimeDrain: undefined;
  AppExpectation: undefined;
  AiToolsUsed: undefined;
  AiToolIssue: undefined;
  AiTrustLevel: undefined;
  BiggestNeed: undefined;

  // Shared Flow (both Email and Google)
  Feature1: undefined;
  Feature2: undefined;
  Feature3: undefined;
  Feature4: undefined;

  // Extended Flow (Google auth includes these additional screens)
  Thanks: undefined;

  // Post-Thanks mini survey — Referral (who referred you) → StudyTime →
  // ComingUp → ReferralCode (enter code), immediately before Setup.
  Referral: undefined;
  StudyTime: undefined;
  ComingUp: undefined;
  ReferralCode: undefined;

  // Final Screens
  Setup: undefined;
  Paywall: undefined;
  DemoVideo: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  initialRouteName?: keyof AuthStackParamList;
}

export const AuthNavigator = ({ initialRouteName = 'Intro' }: AuthNavigatorProps) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
      initialRouteName={initialRouteName}
    >
      {/* Entry Screens */}
      <Stack.Screen name="Intro" component={IntroScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />

      {/* Email Flow Screens */}
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="Name" component={NameScreen} />
      <Stack.Screen name="Username" component={UsernameScreen} />
      <Stack.Screen name="ProfessionalDeclaration" component={ProfessionalDeclarationScreen} />

      {/* 8-screen onboarding survey */}
      <Stack.Screen name="Role" component={RoleScreen} />
      <Stack.Screen name="CurrentMethod" component={CurrentMethodScreen} />
      <Stack.Screen name="TimeDrain" component={TimeDrainScreen} />
      <Stack.Screen name="AppExpectation" component={AppExpectationScreen} />
      <Stack.Screen name="AiToolsUsed" component={AiToolsUsedScreen} />
      <Stack.Screen name="AiToolIssue" component={AiToolIssueScreen} />
      <Stack.Screen name="AiTrustLevel" component={AiTrustLevelScreen} />
      <Stack.Screen name="BiggestNeed" component={BiggestNeedScreen} />

      {/* Feature Detail Screens */}
      <Stack.Screen name="Feature1" component={Feature1Screen} />
      <Stack.Screen name="Feature2" component={Feature2Screen} />
      <Stack.Screen name="Feature3" component={Feature3Screen} />
      <Stack.Screen name="Feature4" component={Feature4Screen} />

      {/* Extended Personalization Screens (primarily for Google flow) */}
      <Stack.Screen name="Thanks" component={ThanksScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="StudyTime" component={StudyTimeScreen} />
      <Stack.Screen name="ComingUp" component={ComingUpScreen} />
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
        name="Paywall"
        component={PaywallScreen}
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
