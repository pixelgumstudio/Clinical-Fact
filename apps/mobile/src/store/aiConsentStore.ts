import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Same key the old per-screen useAIConsent.ts hook used to read/write directly —
// kept as-is so users who already accepted via GeneratingNoteScreen/YouTubeGeneratingScreen
// aren't re-prompted now that every AI-triggering screen shares this one global store.
const AI_CONSENT_KEY = 'ai_data_consent_given';

interface PendingRequest {
  onAccept: () => void;
  onDecline?: () => void;
}

interface AIConsentState {
  hasConsented: boolean;
  isModalVisible: boolean;
  pending: PendingRequest | null;
  requestConsent: (onAccept: () => void, onDecline?: () => void) => void;
  /** Promise-based equivalent of requestConsent, for call sites already using async/await —
   *  resolves true immediately if consent was already given, otherwise resolves once the
   *  modal is answered (true on accept, false on decline). */
  ensureConsent: () => Promise<boolean>;
  acceptConsent: () => Promise<void>;
  declineConsent: () => void;
}

export const useAIConsentStore = create<AIConsentState>((set, get) => ({
  hasConsented: false,
  isModalVisible: false,
  pending: null,

  requestConsent: (onAccept, onDecline) => {
    if (get().hasConsented) {
      onAccept();
      return;
    }
    // Overwrites any earlier pending request (e.g. a fast double-tap) with the latest
    // one — the modal is already up, and only ever one action should fire on accept.
    set({ pending: { onAccept, onDecline }, isModalVisible: true });
  },

  ensureConsent: () => {
    return new Promise<boolean>((resolve) => {
      get().requestConsent(() => resolve(true), () => resolve(false));
    });
  },

  acceptConsent: async () => {
    try {
      await AsyncStorage.setItem(AI_CONSENT_KEY, 'true');
    } catch {}
    const { pending } = get();
    set({ hasConsented: true, isModalVisible: false, pending: null });
    pending?.onAccept();
  },

  declineConsent: () => {
    // No "declined" state is persisted — leaving hasConsented false means the user
    // is simply asked again next time they try an AI-triggering action.
    const { pending } = get();
    set({ isModalVisible: false, pending: null });
    pending?.onDecline?.();
  },
}));

// Runs once on module load (before any screen can possibly fire an AI request) so
// `hasConsented` reflects prior consent as soon as possible. If a request races this
// read, it just sees the safe default of `false` and shows the modal once more —
// never the other way around.
AsyncStorage.getItem(AI_CONSENT_KEY)
  .then((value) => {
    if (value === 'true') useAIConsentStore.setState({ hasConsented: true });
  })
  .catch(() => {});
