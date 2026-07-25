import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, HomeIcon, HomeIconFilled, LibraryIcon, LibraryIconFilled, ChatIcon, ChatIconFilled, ProfileIcon, ProfileIconFilled, FABPlusIcon } from '@clinicfact/design-system';
import { HomeScreen, ChatsScreen, LibraryScreen, ProfileScreen } from '../screens/main';
import { CreateNoteModal } from '../components/CreateNoteModal';
import { OnboardingOverlay } from '../components/OnboardingOverlay';
import { useOnboardingStore } from '../store/onboardingStore';
import { useAuthStore } from '../store/authStore';
import { useGatedFeature } from '../hooks/useGatedFeature';
import { MainStackParamList } from './MainStackNavigator';

export type MainTabParamList = {
  Home: undefined;
  Library: undefined;
  Create: undefined;
  Chat: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder Create screen (will open a modal instead)
const CreatePlaceholder = () => null;

// Custom Center Button for Create
const CreateButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.createButton} onPress={onPress} activeOpacity={0.8}>
    <FABPlusIcon size={64} />
  </TouchableOpacity>
);

type MainTabNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export const MainTabNavigator = () => {
  const navigation = useNavigation<MainTabNavigationProp>();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const { user } = useAuthStore();
  const { withAccess } = useGatedFeature();
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

  const handleOpenCreateModal = () => {
    setCreateModalVisible(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalVisible(false);
  };

  const handleSelectOption = (optionType: string) => {
    const actions: Record<string, () => void> = {
      record_audio: () => navigation.navigate('RecordAudio'),
      upload_audio: () => navigation.navigate('UploadAudio'),
      youtube: () => navigation.navigate('YouTubeInput'),
      pdf_document: () => navigation.navigate('UploadPDF'),
      custom_text: () => navigation.navigate('CustomTextInput'),
      image: () => navigation.navigate('UploadImage'),
    };
    const action = actions[optionType];
    if (action) withAccess(action);
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#1C1C1C',
          tabBarInactiveTintColor: '#BFBFBF',
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ focused }) =>
              focused ? <HomeIconFilled size={24} /> : <HomeIcon size={24} />,
          }}
        />
        <Tab.Screen
          name="Library"
          component={LibraryScreen}
          options={{
            tabBarIcon: ({ focused }) =>
              focused ? <LibraryIconFilled size={24} /> : <LibraryIcon size={24} />,
          }}
        />
        <Tab.Screen
          name="Create"
          component={CreatePlaceholder}
          options={{
            tabBarIcon: () => null,
            tabBarButton: () => (
              <CreateButton onPress={handleOpenCreateModal} />
            ),
            tabBarLabel: () => null,
          }}
        />
        <Tab.Screen
          name="Chat"
          component={ChatsScreen}
          options={{
            tabBarIcon: ({ focused }) =>
              focused ? <ChatIconFilled size={24} /> : <ChatIcon size={24} />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ focused }) =>
              focused ? <ProfileIconFilled size={24} /> : <ProfileIcon size={24} />,
          }}
        />
      </Tab.Navigator>

      {/* Create Note Modal */}
      <CreateNoteModal
        visible={isCreateModalVisible}
        onClose={handleCloseCreateModal}
        onSelectOption={handleSelectOption}
      />

      {/* Onboarding Overlay */}
      <OnboardingOverlay />
    </>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    height: 85,
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  createButton: {
    top: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});
