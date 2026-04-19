import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ClientAuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useClientAuthStore = create<ClientAuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => {
        set({ token });
      },
      logout: () => {
        set({ token: null });
      }
    }),
    {
      name: "closing-day-client-auth",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
