import type { ReadinessSnapshotRecord, SentimentSnapshot } from "@shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface CheckInPayload {
  response: string;
}

export interface CheckInResponse {
  sentiment: SentimentSnapshot;
  readiness: ReadinessSnapshotRecord;
}

export function useCheckIn(transactionId: string, token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CheckInPayload) => {
      const response = await api.post<CheckInResponse>(
        `/api/client/transactions/${transactionId}/check-in`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["client", "transaction-documents", transactionId, token]
        }),
        queryClient.invalidateQueries({
          queryKey: ["client", "portfolio", token]
        }),
        queryClient.invalidateQueries({
          queryKey: ["agent", "me"]
        })
      ]);
    }
  });
}
