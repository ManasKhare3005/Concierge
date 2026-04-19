import type { QuestionRecord, ReadinessSnapshotRecord, SentimentSnapshot } from "@shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface AskQuestionPayload {
  question: string;
  documentId?: string;
}

export interface AskQuestionResponse {
  question: QuestionRecord;
  sentiment: SentimentSnapshot;
  readiness: ReadinessSnapshotRecord;
}

export function useAskQuestion(transactionId: string, token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AskQuestionPayload) => {
      const response = await api.post<AskQuestionResponse>(
        `/api/client/transactions/${transactionId}/questions`,
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
        }),
        queryClient.invalidateQueries({
          queryKey: ["agent", "transactions"]
        })
      ]);
    }
  });
}
