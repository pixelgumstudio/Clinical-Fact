import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthMethod = 'email' | 'google' | 'apple' | null;

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
  isAppleLoading: boolean;

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
  setAppleUserData: (userData: { email?: string; firstName?: string; lastName?: string }) => void;
  setOtpCode: (code: string) => void;
  setOtpVerified: (verified: boolean) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setLoading: (loading: boolean) => void;
  setSendingOtp: (sending: boolean) => void;
  setVerifyingOtp: (verifying: boolean) => void;
  setGoogleLoading: (loading: boolean) => void;
  setAppleLoading: (loading: boolean) => void;
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
  isAppleLoading: false,
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

  setAppleUserData: (userData) =>
    set((state) => ({
      authMethod: 'apple',
      data: {
        ...state.data,
        email: userData.email ?? state.data.email,
        firstName: userData.firstName ?? state.data.firstName,
        lastName: userData.lastName ?? state.data.lastName,
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

  setAppleLoading: (isAppleLoading) => set({ isAppleLoading }),

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
      isAppleLoading: false,
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

// 8-screen onboarding survey options (confirmed 2026-07-30)
export const ROLE_OPTIONS = [
  { id: 'nursing-student', labelKey: 'auth.options.role.nursingStudent' },
  { id: 'medical-student', labelKey: 'auth.options.role.medicalStudent' },
  { id: 'pa-pharmacy-student', labelKey: 'auth.options.role.paPharmacyStudent' },
  { id: 'practicing-nurse', labelKey: 'auth.options.role.practicingNurse' },
  { id: 'practicing-physician', labelKey: 'auth.options.role.practicingPhysician' },
  { id: 'other-healthcare-professional', labelKey: 'auth.options.role.otherHealthcareProfessional' },
];

export const CURRENT_METHOD_OPTIONS = [
  { id: 'textbooks-notes', labelKey: 'auth.options.currentMethod.textbooksNotes' },
  { id: 'flashcard-quiz-apps', labelKey: 'auth.options.currentMethod.flashcardQuizApps' },
  { id: 'youtube', labelKey: 'auth.options.currentMethod.youtube' },
  { id: 'ai-chatbots', labelKey: 'auth.options.currentMethod.aiChatbots' },
  { id: 'colleague-classmate', labelKey: 'auth.options.currentMethod.colleagueClassmate' },
  { id: 'practice-question-banks', labelKey: 'auth.options.currentMethod.practiceQuestionBanks' },
];

export const TIME_DRAIN_OPTIONS = [
  { id: 'making-flashcards-quizzes', labelKey: 'auth.options.timeDrain.makingFlashcardsQuizzes' },
  { id: 'finding-trustworthy-answer', labelKey: 'auth.options.timeDrain.findingTrustworthyAnswer' },
  { id: 're-reading-notes', labelKey: 'auth.options.timeDrain.reReadingNotes' },
  { id: 'switching-apps', labelKey: 'auth.options.timeDrain.switchingApps' },
  { id: 'charting-documentation', labelKey: 'auth.options.timeDrain.chartingDocumentation' },
];

export const APP_EXPECTATION_OPTIONS = [
  { id: 'no-hallucination', labelKey: 'auth.options.appExpectation.noHallucination' },
  { id: 'real-citations', labelKey: 'auth.options.appExpectation.realCitations' },
  { id: 'one-app', labelKey: 'auth.options.appExpectation.oneApp' },
  { id: 'explains-why', labelKey: 'auth.options.appExpectation.explainsWhy' },
];

export const AI_TOOLS_USED_OPTIONS = [
  { id: 'chatgpt', labelKey: 'auth.options.aiToolsUsed.chatgpt' },
  { id: 'google-gemini', labelKey: 'auth.options.aiToolsUsed.googleGemini' },
  { id: 'notebook-llm', labelKey: 'auth.options.aiToolsUsed.notebookLlm' },
  { id: 'claude', labelKey: 'auth.options.aiToolsUsed.claude' },
  { id: 'uworld', labelKey: 'auth.options.aiToolsUsed.uworld' },
  { id: 'google-search', labelKey: 'auth.options.aiToolsUsed.googleSearch' },
  { id: 'other-apps', labelKey: 'auth.options.aiToolsUsed.otherApps' },
];

export const AI_TOOL_ISSUE_OPTIONS = [
  { id: 'made-things-up', labelKey: 'auth.options.aiToolIssue.madeThingsUp' },
  { id: 'not-medical-content', labelKey: 'auth.options.aiToolIssue.notMedicalContent' },
  { id: 'no-sources', labelKey: 'auth.options.aiToolIssue.noSources' },
  { id: 'too-generic', labelKey: 'auth.options.aiToolIssue.tooGeneric' },
];

export const AI_TRUST_LEVEL_OPTIONS = [
  { id: 'every-time', labelKey: 'auth.options.aiTrustLevel.everyTime' },
  { id: 'sometimes', labelKey: 'auth.options.aiTrustLevel.sometimes' },
  { id: 'rarely', labelKey: 'auth.options.aiTrustLevel.rarely' },
  { id: 'dont-use-ai', labelKey: 'auth.options.aiTrustLevel.dontUseAi' },
];

export const BIGGEST_NEED_OPTIONS = [
  { id: 'fast-trustworthy-answers', labelKey: 'auth.options.biggestNeed.fastTrustworthyAnswers' },
  { id: 'quizzes-flashcards-without-work', labelKey: 'auth.options.biggestNeed.quizzesFlashcardsWithoutWork' },
  { id: 'remembering-studied', labelKey: 'auth.options.biggestNeed.rememberingStudied' },
  { id: 'medical-citations', labelKey: 'auth.options.biggestNeed.medicalCitations' },
  { id: 'all-of-the-above', labelKey: 'auth.options.biggestNeed.allOfTheAbove' },
];

// Referral source options (confirmed 2026-07-29 — replaces the previous
// Reddit/YouTube/Google Search/Friend-or-Family set)
export const REFERRAL_OPTIONS = [
  { id: 'tiktok', labelKey: 'auth.options.referral.tiktok' },
  { id: 'instagram', labelKey: 'auth.options.referral.instagram' },
  { id: 'facebook', labelKey: 'auth.options.referral.facebook' },
  { id: 'newsletter', labelKey: 'auth.options.referral.newsletter' },
  { id: 'threads', labelKey: 'auth.options.referral.threads' },
  { id: 'appstore', labelKey: 'auth.options.referral.appstore' },
  { id: 'playstore', labelKey: 'auth.options.referral.playstore' },
  { id: 'other', labelKey: 'auth.options.referral.other' },
];

// Post-Thanks mini survey options (confirmed 2026-07-29)
export const STUDY_TIME_OPTIONS = [
  { id: 'under-5-hours', labelKey: 'auth.options.studyTime.under5Hours' },
  { id: '5-10-hours', labelKey: 'auth.options.studyTime.510Hours' },
  { id: '10-20-hours', labelKey: 'auth.options.studyTime.1020Hours' },
  { id: '20-plus-hours', labelKey: 'auth.options.studyTime.20PlusHours' },
];

export const COMING_UP_OPTIONS = [
  { id: 'medical-exams', labelKey: 'auth.options.comingUp.medicalExams' },
  { id: 'clinical-rotations', labelKey: 'auth.options.comingUp.clinicalRotations' },
  { id: 'nursing-exams', labelKey: 'auth.options.comingUp.nursingExams' },
  { id: 'other-exams', labelKey: 'auth.options.comingUp.otherExams' },
  { id: 'stay-sharp', labelKey: 'auth.options.comingUp.staySharp' },
];
