import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { SupportedLanguage } from "@/lib/i18n";

interface ClientAuthState {
  token: string | null;
  preferredLanguage: SupportedLanguage | null;
  aiAssistPaused: boolean;
  setToken: (token: string | null) => void;
  setPreferredLanguage: (language: SupportedLanguage | null) => void;
  setAiAssistPaused: (paused: boolean) => void;
  logout: () => void;
}

export const useClientAuthStore = create<ClientAuthState>()(
  persist(
    (set) => ({
      token: null,
      preferredLanguage: null,
      aiAssistPaused: false,
      setToken: (token) => {
        set({ token });
      },
      setPreferredLanguage: (preferredLanguage) => {
        set({ preferredLanguage });
      },
      setAiAssistPaused: (aiAssistPaused) => {
        set({ aiAssistPaused });
      },
      logout: () => {
        set({ token: null, preferredLanguage: null, aiAssistPaused: false });
      }
    }),
    {
      name: "concierge-client-auth",
      storage: createJSONStorage(() => localStorage)
    }
  )
);

