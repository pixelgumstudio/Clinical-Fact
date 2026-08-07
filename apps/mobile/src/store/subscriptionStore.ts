import { create } from 'zustand';
// 🛡️ Import your authStore so we can check the backend status
// (You may need to adjust this path depending on your folder structure)
import { useAuthStore } from './authStore'; 

export type SubscriptionStatus = 'premium' | 'trial' | 'cancelled' | 'free';

interface SubscriptionState {
  status: SubscriptionStatus;
  isSubscribed: boolean;
  isInTrial: boolean;
  hasAccess: boolean;

  setStatus: (status: SubscriptionStatus) => void;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  status: 'free',
  isSubscribed: false,
  isInTrial: false,
  hasAccess: false,

  setStatus: (status) => {
    // 🛡️ 1. Grab the backend user object
    const user = useAuthStore.getState().user;
    const isBackendPro = user?.subscription === 'PRO';

    const isInTrial = status === 'trial';
    // RevenueCat's check
    const isRCSubscribed = status === 'premium' || status === 'trial' || status === 'cancelled';

    // 🛡️ 2. The Override: If MongoDB says PRO, force access to true!
    const hasAccess = isBackendPro || isRCSubscribed;

    set({
      // If backend says PRO, force the UI status to 'premium' so the badge doesn't flicker
      status: isBackendPro ? 'premium' : status, 
      isSubscribed: hasAccess,
      isInTrial,
      hasAccess,
    });
  },

  reset: () => set({
    status: 'free',
    isSubscribed: false,
    isInTrial: false,
    hasAccess: false,
  }),
}));