import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Global toggle (set from the chat drawer) for whether live medical search — FDA drug labels,
 *  PubMed/scientific articles, grounded images — is blended into every chat's responses, not
 *  just dedicated "Ask a medical question" sessions. Document/image/note/PDF chats still search
 *  their own attached content either way; this controls whether live external search is ALSO
 *  blended in alongside it. Defaults off, so a document/PDF chat only answers from the attached
 *  content until the user explicitly opts into blending in external literature. */
interface MedicalSearchState {
  liveSearchEnabled: boolean;
  setLiveSearchEnabled: (enabled: boolean) => void;
  toggleLiveSearch: () => void;
}

export const useMedicalSearchStore = create<MedicalSearchState>()(
  persist(
    (set, get) => ({
      liveSearchEnabled: false,
      setLiveSearchEnabled: (enabled) => set({ liveSearchEnabled: enabled }),
      toggleLiveSearch: () => set({ liveSearchEnabled: !get().liveSearchEnabled }),
    }),
    {
      name: 'clinicalfact-medical-search',
      storage: createJSONStorage(() => AsyncStorage),
      // v0 shipped with the default (and therefore most installed users' persisted value)
      // stuck at `true`, which is what caused document/PDF chats to silently blend in live
      // web search. Bump to v1 and force it back to `false` on migration so already-installed
      // devices actually pick up the new default instead of keeping their stale `true`.
      version: 1,
      migrate: () => ({ liveSearchEnabled: false }),
    }
  )
);
