import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthMethod = 'email' | 'google' | null;

export interface SignupData {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  contentTypes: string[];
  goals: string[];
  studyFrequency: string;
  learningStyle: string;
  reviewStyle: string;
  frustrations: string[];
  referralSource: string;
  profilePhoto?: string;
  googleId?: string;
}

interface SignupState {
  // Auth method tracking
  authMethod: AuthMethod;

  // Current step tracking
  currentStep: number;
  totalSteps: number;

  // User data
  data: SignupData;

  // OTP
  otpCode: string;
  isOtpVerified: boolean;

  // Loading states
  isLoading: boolean;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  isGoogleLoading: boolean;

  // Error states
  error: string | null;

  // Actions
  setAuthMethod: (method: AuthMethod) => void;
  setEmail: (email: string) => void;
  setFirstName: (firstName: string) => void;
  setLastName: (lastName: string) => void;
  setUsername: (username: string) => void;
  setContentTypes: (types: string[]) => void;
  toggleContentType: (type: string) => void;
  setGoals: (goals: string[]) => void;
  toggleGoal: (goal: string) => void;
  setStudyFrequency: (frequency: string) => void;
  setLearningStyle: (style: string) => void;
  setReviewStyle: (style: string) => void;
  setFrustrations: (frustrations: string[]) => void;
  toggleFrustration: (frustration: string) => void;
  setReferralSource: (source: string) => void;
  setProfilePhoto: (photo: string) => void;
  setGoogleId: (id: string) => void;
  setGoogleUserData: (userData: { email: string; firstName: string; lastName: string; photo?: string; googleId: string }) => void;
  setOtpCode: (code: string) => void;
  setOtpVerified: (verified: boolean) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setLoading: (loading: boolean) => void;
  setSendingOtp: (sending: boolean) => void;
  setVerifyingOtp: (verifying: boolean) => void;
  setGoogleLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetSignup: () => void;
}

const initialData: SignupData = {
  email: '',
  firstName: '',
  lastName: '',
  username: '',
  contentTypes: [],
  goals: [],
  studyFrequency: '',
  learningStyle: '',
  reviewStyle: '',
  frustrations: [],
  referralSource: '',
  profilePhoto: undefined,
  googleId: undefined,
};

export const useSignupStore = create<SignupState>()(
  persist(
  (set, get) => ({
  authMethod: null,
  currentStep: 0,
  totalSteps: 12,
  data: initialData,
  otpCode: '',
  isOtpVerified: false,
  isLoading: false,
  isSendingOtp: false,
  isVerifyingOtp: false,
  isGoogleLoading: false,
  error: null,

  setAuthMethod: (authMethod) => set({ authMethod }),

  setEmail: (email) =>
    set((state) => ({
      data: { ...state.data, email },
      error: null,
    })),

  setFirstName: (firstName) =>
    set((state) => ({
      data: { ...state.data, firstName },
      error: null,
    })),

  setLastName: (lastName) =>
    set((state) => ({
      data: { ...state.data, lastName },
      error: null,
    })),

  setUsername: (username) =>
    set((state) => ({
      data: { ...state.data, username },
      error: null,
    })),

  setContentTypes: (contentTypes) =>
    set((state) => ({
      data: { ...state.data, contentTypes },
      error: null,
    })),

  toggleContentType: (type) =>
    set((state) => {
      const current = state.data.contentTypes;
      const newTypes = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      return {
        data: { ...state.data, contentTypes: newTypes },
        error: null,
      };
    }),

  setGoals: (goals) =>
    set((state) => ({
      data: { ...state.data, goals },
      error: null,
    })),

  toggleGoal: (goal) =>
    set((state) => {
      const current = state.data.goals;
      const newGoals = current.includes(goal)
        ? current.filter((g) => g !== goal)
        : [...current, goal];
      return {
        data: { ...state.data, goals: newGoals },
        error: null,
      };
    }),

  setStudyFrequency: (studyFrequency) =>
    set((state) => ({
      data: { ...state.data, studyFrequency },
      error: null,
    })),

  setLearningStyle: (learningStyle) =>
    set((state) => ({
      data: { ...state.data, learningStyle },
      error: null,
    })),

  setReviewStyle: (reviewStyle) =>
    set((state) => ({
      data: { ...state.data, reviewStyle },
      error: null,
    })),

  setFrustrations: (frustrations) =>
    set((state) => ({
      data: { ...state.data, frustrations },
      error: null,
    })),

  toggleFrustration: (frustration) =>
    set((state) => {
      const current = state.data.frustrations;
      const newFrustrations = current.includes(frustration)
        ? current.filter((f) => f !== frustration)
        : [...current, frustration];
      return {
        data: { ...state.data, frustrations: newFrustrations },
        error: null,
      };
    }),

  setReferralSource: (referralSource) =>
    set((state) => ({
      data: { ...state.data, referralSource },
      error: null,
    })),

  setProfilePhoto: (profilePhoto) =>
    set((state) => ({
      data: { ...state.data, profilePhoto },
      error: null,
    })),

  setGoogleId: (googleId) =>
    set((state) => ({
      data: { ...state.data, googleId },
      error: null,
    })),

  setGoogleUserData: (userData) =>
    set((state) => ({
      authMethod: 'google',
      data: {
        ...state.data,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profilePhoto: userData.photo,
        googleId: userData.googleId,
      },
      error: null,
    })),

  setOtpCode: (otpCode) => set({ otpCode, error: null }),

  setOtpVerified: (isOtpVerified) => set({ isOtpVerified }),

  setCurrentStep: (currentStep) => set({ currentStep }),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
    })),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setSendingOtp: (isSendingOtp) => set({ isSendingOtp }),

  setVerifyingOtp: (isVerifyingOtp) => set({ isVerifyingOtp }),

  setGoogleLoading: (isGoogleLoading) => set({ isGoogleLoading }),

  setError: (error) => set({ error }),

  resetSignup: () =>
    set({
      authMethod: null,
      currentStep: 0,
      data: initialData,
      otpCode: '',
      isOtpVerified: false,
      isLoading: false,
      isSendingOtp: false,
      isVerifyingOtp: false,
      isGoogleLoading: false,
      error: null,
    }),
  }),
  {
    name: 'clinicfact-signup',
    storage: createJSONStorage(() => AsyncStorage),
    // Persist only the wizard-progress fields the user needs to resume.
    // Exclude transient UI state (loading flags, errors) and the OTP code
    // (time-limited — persisting it would be a security liability).
    partialize: (state) => ({
      authMethod: state.authMethod,
      currentStep: state.currentStep,
      data: state.data,
      isOtpVerified: state.isOtpVerified,
    }),
  }
));

// Content type options
export const CONTENT_TYPE_OPTIONS = [
  { id: 'textbooks-pdfs', label: 'Audio  and voice recordings' },
  { id: 'video-lectures', label: 'PDFs and Word documents' },
  { id: 'handwritten-notes', label: 'Podcasts and YouTube notes' },
  { id: 'recorded-lectures', label: 'Personal knowledge hub' },
  { id: 'online-articles', label: 'YouTube  and  video links' },
];

// Goal options - Based on design specification
export const GOAL_OPTIONS = [
  { id: 'better-grades', label: 'Study and exam prep' },
  { id: 'ace-exams', label: 'Work meetings and tasks' },
  { id: 'organize-notes', label: 'Research and academic reading' },
  { id: 'learn-faster', label: 'Podcasts or YouTube notes' },
  { id: 'improve-skills', label: 'Personal knowledge hub' },
];

// Review style options
export const REVIEW_STYLE_OPTIONS = [
  { id: 'quizzes', label: 'Quizzes'},
  { id: 'flashcards', label: 'Flashcards'},
  { id: 'summaries', label: 'AI Summaries'},
  { id: 'practice-problems', label: 'Chat with your notes'},
];

// Frustration options
export const FRUSTRATION_OPTIONS = [
  { id: 'time-consuming', label: 'Takes too much time', icon: '⏰' },
  { id: 'disorganized', label: 'Notes get disorganized', icon: '📁' },
  { id: 'forgetting', label: 'Forgetting what I learned', icon: '🧠' },
  { id: 'finding-info', label: 'Can\'t find information later', icon: '🔍' },
  { id: 'boring', label: 'Studying is boring', icon: '😴' },
  { id: 'overwhelmed', label: 'Too much information', icon: '📚' },
];

// Referral source options
export const REFERRAL_OPTIONS = [
  { id: 'tiktok', label: 'Tiktok'},
  { id: 'instagram', label: 'Instagram'},
  { id: 'reddit', label: 'Reddit'},
  { id: 'youtube', label: 'YouTube'},
  { id: 'search', label: 'Google Search'},
  { id: 'friend', label: 'Friend or Family'},
  { id: 'appstore', label: 'App Store'},
  { id: 'playstore', label: 'Play Store'},
  { id: 'other', label: 'Other'},
];
