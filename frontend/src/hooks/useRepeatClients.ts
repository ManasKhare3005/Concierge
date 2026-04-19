import type { AgentRepeatClientsResponse } from "@shared";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useRepeatClients(token: string | null) {
  return useQuery({
    queryKey: ["agent", "repeat-clients", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await api.get<AgentRepeatClientsResponse>("/api/agent/repeat-clients", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    }
  });
}
