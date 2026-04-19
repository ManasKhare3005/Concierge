import { useQuery } from "@tanstack/react-query";
import type { ServiceStatus } from "@shared";

import { api } from "@/lib/api";

export interface DiagnosticsResponse {
  status: string;
  app: string;
  phase: number;
  timestamp: string;
  diagnostics: {
    port: number;
    clientOrigin: string;
    databaseUrl: string;
    services: ServiceStatus[];
  };
}

export function useDiagnostics() {
  return useQuery({
    queryKey: ["diagnostics", "health"],
    queryFn: async () => {
      const response = await api.get<DiagnosticsResponse>("/api/diagnostics/health");
      return response.data;
    }
  });
}
