import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface ClientProfileResponse {
  via: "password" | "magic_link";
  saveProgressSuggested: boolean;
  client: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    preferredLanguage: string;
    hasPassword: boolean;
  };
}

export function useClientProfile(token: string | null) {
  return useQuery({
    queryKey: ["client", "me", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await api.get<ClientProfileResponse>("/api/auth/client/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    }
  });
}
