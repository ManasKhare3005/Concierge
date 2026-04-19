import { create } from "zustand";

interface AgentAuthState {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const useAgentAuthStore = create<AgentAuthState>((set) => ({
  token: null,
  setToken: (token) => {
    set({ token });
  }
}));
