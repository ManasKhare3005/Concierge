import { useQuery } from "@tanstack/react-query";
import type {
  DocumentRecordDetail,
  QuestionRecord,
  ReadinessSnapshotRecord,
  SentimentSnapshot,
  VoiceBotSessionRecord
} from "@shared";

import { api } from "@/lib/api";

export interface ClientTransactionDocumentsResponse {
  transaction: {
    id: string;
    propertyAddress: string;
    propertyCity: string;
    propertyState: string;
    propertyZip: string;
    propertyPrice?: number;
    stage: string;
    stageLabel: string;
    role: string;
    relationshipRole: string;
    readinessBucket?: string;
    readiness?: ReadinessSnapshotRecord;
  };
  documents: DocumentRecordDetail[];
  questions: QuestionRecord[];
  latestSentiment?: SentimentSnapshot;
  voiceBotSession?: VoiceBotSessionRecord;
}

export function useClientDocuments(transactionId: string | undefined, token: string | null) {
  return useQuery({
    queryKey: ["client", "transaction-documents", transactionId, token],
    enabled: Boolean(transactionId && token),
    refetchInterval: 4000,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      const response = await api.get<ClientTransactionDocumentsResponse>(
        `/api/client/transactions/${transactionId}/documents`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    }
  });
}
