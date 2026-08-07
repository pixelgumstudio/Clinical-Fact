import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Global toggle (set from the chat drawer) for whether live medical search — FDA drug labels,
 *  PubMed/scientific articles, grounded images — is blended into every chat's responses, not
 *  just dedicated "Ask a medical question" sessions. Document/image/note/PDF chats still search
 *  their own attached content either way; this controls whether live external search is ALSO
 *  blended in alongside it. Defaults on. */
interface MedicalSearchState {
  liveSearchEnabled: boolean;
  setLiveSearchEnabled: (enabled: boolean) => void;
  toggleLiveSearch: () => void;
}

export const useMedicalSearchStore = create<MedicalSearchState>()(
  persist(
    (set, get) => ({
      liveSearchEnabled: true,
      setLiveSearchEnabled: (enabled) => set({ liveSearchEnabled: enabled }),
      toggleLiveSearch: () => set({ liveSearchEnabled: !get().liveSearchEnabled }),
    }),
    {
      name: 'clinicalfact-medical-search',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
