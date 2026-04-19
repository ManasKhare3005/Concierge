import type { AgentTriageResponse } from "@shared";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useTriage(token: string | null) {
  return useQuery({
    queryKey: ["agent", "triage", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await api.get<AgentTriageResponse>("/api/agent/triage", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    }
  });
}
