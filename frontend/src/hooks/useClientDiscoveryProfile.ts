import type { ClientSearchProfile, RecommendedPropertyMatch } from "@shared";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface ClientDiscoveryProfileResponse {
  client: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    preferredLanguage: string;
    hasPassword: boolean;
    searchProfile?: ClientSearchProfile;
  };
  recommendedProperties: RecommendedPropertyMatch[];
}

export function useClientDiscoveryProfile(token: string | null) {
  return useQuery({
    queryKey: ["client", "discovery-profile", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await api.get<ClientDiscoveryProfileResponse>("/api/client/profile", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    }
  });
}
