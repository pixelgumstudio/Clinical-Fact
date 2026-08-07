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

  // 8-screen onboarding survey (confirmed 2026-07-30) — replaces the old
  // goals/contentTypes/reviewStyle/frustrations question screens. All
  // single-select. Not yet wired into the completeSignup API payload —
  // confirm the expected field names before submitting these server-side.
  role: string;
  currentMethod: string;
  timeDrain: string;
  appExpectation: string;
  aiToolsUsed: string;
  aiToolIssue: string;
  aiTrustLevel: string;
  biggestNeed: string;

  // Post-Thanks mini survey (confirmed 2026-07-29) — sits between Thanks and
  // Referral. Not yet wired into the completeSignup API payload.
  studyTimePerWeek: string;
  comingUp: string;
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
  setRole: (role: string) => void;
  setCurrentMethod: (method: string) => void;
  setTimeDrain: (drain: string) => void;
  setAppExpectation: (expectation: string) => void;
  setAiToolsUsed: (tool: string) => void;
  setAiToolIssue: (issue: string) => void;
  setAiTrustLevel: (level: string) => void;
  setBiggestNeed: (need: string) => void;
  setStudyTimePerWeek: (time: string) => void;
  setComingUp: (value: string) => void;
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
  role: '',
  currentMethod: '',
  timeDrain: '',
  appExpectation: '',
  aiToolsUsed: '',
  aiToolIssue: '',
  aiTrustLevel: '',
  biggestNeed: '',
  studyTimePerWeek: '',
  comingUp: '',
};

export const useSignupStore = create<SignupState>()(
  persist(
  (set) => ({
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

  setRole: (role) =>
    set((state) => ({
      data: { ...state.data, role },
      error: null,
    })),

  setCurrentMethod: (currentMethod) =>
    set((state) => ({
      data: { ...state.data, currentMethod },
      error: null,
    })),

  setTimeDrain: (timeDrain) =>
    set((state) => ({
      data: { ...state.data, timeDrain },
      error: null,
    })),

  setAppExpectation: (appExpectation) =>
    set((state) => ({
      data: { ...state.data, appExpectation },
      error: null,
    })),

  setAiToolsUsed: (aiToolsUsed) =>
    set((state) => ({
      data: { ...state.data, aiToolsUsed },
      error: null,
    })),

  setAiToolIssue: (aiToolIssue) =>
    set((state) => ({
      data: { ...state.data, aiToolIssue },
      error: null,
    })),

  setAiTrustLevel: (aiTrustLevel) =>
    set((state) => ({
      data: { ...state.data, aiTrustLevel },
      error: null,
    })),

  setBiggestNeed: (biggestNeed) =>
    set((state) => ({
      data: { ...state.data, biggestNeed },
      error: null,
    })),

  setStudyTimePerWeek: (studyTimePerWeek) =>
    set((state) => ({
      data: { ...state.data, studyTimePerWeek },
      error: null,
    })),

  setComingUp: (comingUp) =>
    set((state) => ({
      data: { ...state.data, comingUp },
      error: null,
    })),

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
    name: 'clinicalfact-signup',
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

// 8-screen onboarding survey options (confirmed 2026-07-30)
export const ROLE_OPTIONS = [
  { id: 'nursing-student', label: 'Nursing student' },
  { id: 'medical-student', label: 'Medical student' },
  { id: 'pa-pharmacy-student', label: 'PA or Pharmacy student' },
  { id: 'practicing-nurse', label: 'Practicing nurse' },
  { id: 'practicing-physician', label: 'Practicing physician' },
  { id: 'other-healthcare-professional', label: 'Other healthcare professional' },
];

export const CURRENT_METHOD_OPTIONS = [
  { id: 'textbooks-notes', label: 'Textbooks or class notes' },
  { id: 'flashcard-quiz-apps', label: 'Flashcard or quiz apps' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'ai-chatbots', label: 'AI chatbots' },
  { id: 'colleague-classmate', label: 'Asking a colleague or classmate' },
  { id: 'practice-question-banks', label: 'Practice question banks' },
];

export const TIME_DRAIN_OPTIONS = [
  { id: 'making-flashcards-quizzes', label: 'Making flashcards & quizzes from scratch' },
  { id: 'finding-trustworthy-answer', label: 'Finding a trustworthy answer fast' },
  { id: 're-reading-notes', label: "Re-reading notes I don't remember" },
  { id: 'switching-apps', label: 'Switching between too many apps' },
  { id: 'charting-documentation', label: 'Charting & documentation' },
];

export const APP_EXPECTATION_OPTIONS = [
  { id: 'no-hallucination', label: "An AI that doesn't hallucinate" },
  { id: 'real-citations', label: 'Real citations from source' },
  { id: 'one-app', label: 'One app instead of five subscriptions' },
  { id: 'explains-why', label: 'Explains the "why," not just the answer' },
];

export const AI_TOOLS_USED_OPTIONS = [
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'google-gemini', label: 'Google Gemini' },
  { id: 'notebook-llm', label: 'Notebook LLM' },
  { id: 'claude', label: 'Claude' },
  { id: 'uworld', label: 'Uworld' },
  { id: 'google-search', label: 'Google search' },
  { id: 'other-apps', label: 'Other Apps' },
];

export const AI_TOOL_ISSUE_OPTIONS = [
  { id: 'made-things-up', label: 'Made things up' },
  { id: 'not-medical-content', label: 'Not built for medical content' },
  { id: 'no-sources', label: 'No sources to check' },
  { id: 'too-generic', label: 'Too generic, not Exam or practice-focused' },
];

export const AI_TRUST_LEVEL_OPTIONS = [
  { id: 'every-time', label: 'Every time' },
  { id: 'sometimes', label: 'Sometimes' },
  { id: 'rarely', label: 'Rarely' },
  { id: 'dont-use-ai', label: "I don't use AI yet" },
];

export const BIGGEST_NEED_OPTIONS = [
  { id: 'fast-trustworthy-answers', label: 'Fast answers I can trust' },
  { id: 'quizzes-flashcards-without-work', label: 'Quizzes & flashcards without work' },
  { id: 'remembering-studied', label: "Help remembering what I've studied" },
  { id: 'medical-citations', label: 'Medical citations reference' },
  { id: 'all-of-the-above', label: 'All of the above' },
];

// Referral source options (confirmed 2026-07-29 — replaces the previous
// Reddit/YouTube/Google Search/Friend-or-Family set)
export const REFERRAL_OPTIONS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'threads', label: 'Threads' },
  { id: 'appstore', label: 'App Store' },
  { id: 'playstore', label: 'Play Store' },
  { id: 'other', label: 'Other' },
];

// Post-Thanks mini survey options (confirmed 2026-07-29)
export const STUDY_TIME_OPTIONS = [
  { id: 'under-5-hours', label: 'Under 5 hours' },
  { id: '5-10-hours', label: '5–10 hours' },
  { id: '10-20-hours', label: '10–20 hours' },
  { id: '20-plus-hours', label: '20+ hours' },
];

export const COMING_UP_OPTIONS = [
  { id: 'medical-exams', label: 'Medical exams' },
  { id: 'clinical-rotations', label: 'Clinical rotations' },
  { id: 'nursing-exams', label: 'Nursing exams' },
  { id: 'other-exams', label: 'Other Exams' },
  { id: 'stay-sharp', label: 'Just want to stay sharp' },
];
