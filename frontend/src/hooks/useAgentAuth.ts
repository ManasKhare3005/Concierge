import { useAgentAuthStore } from "@/store/agentAuthStore";

export function useAgentAuth() {
  const token = useAgentAuthStore((state) => state.token);
  const setToken = useAgentAuthStore((state) => state.setToken);

  return {
    token,
    setToken
  };
}
