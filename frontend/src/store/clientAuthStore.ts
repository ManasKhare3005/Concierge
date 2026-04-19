import { create } from "zustand";

interface ClientAuthState {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const useClientAuthStore = create<ClientAuthState>((set) => ({
  token: null,
  setToken: (token) => {
    set({ token });
  }
}));
