import { useClientAuthStore } from "@/store/clientAuthStore";

export function useClientAuth() {
  const token = useClientAuthStore((state) => state.token);
  const setToken = useClientAuthStore((state) => state.setToken);

  return {
    token,
    setToken
  };
}
