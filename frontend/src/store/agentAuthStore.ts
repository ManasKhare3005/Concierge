import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AgentAuthState {
  token: string | null;
  nudgesPaused: boolean;
  setToken: (token: string | null) => void;
  setNudgesPaused: (paused: boolean) => void;
  logout: () => void;
}

export const useAgentAuthStore = create<AgentAuthState>()(
  persist(
    (set) => ({
      token: null,
      nudgesPaused: false,
      setToken: (token) => {
        set({ token });
      },
      setNudgesPaused: (nudgesPaused) => {
        set({ nudgesPaused });
      },
      logout: () => {
        set({ token: null, nudgesPaused: false });
      }
    }),
    {
      name: "concierge-agent-auth",
      storage: createJSONStorage(() => localStorage)
    }
  )
);

