import { useQuery } from "@tanstack/react-query";
import type { DocumentRecordDetail, VoiceBotSessionRecord } from "@shared";

import { api } from "@/lib/api";

export interface AgentTransactionsResponse {
  transactions: Array<{
    id: string;
    propertyAddress: string;
    propertyCity: string;
    propertyState: string;
    propertyZip: string;
    propertyPrice?: number;
    expectedCloseAt?: string;
    stage: string;
    stageLabel: string;
    role: string;
    documentCount: number;
    clients: Array<{
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    }>;
  }>;
}

export interface AgentTransactionDocumentsResponse {
  transaction: {
    id: string;
    propertyAddress: string;
    propertyCity: string;
    propertyState: string;
    propertyZip: string;
    propertyPrice?: number;
    expectedCloseAt?: string;
    stage: string;
    stageLabel: string;
    role: string;
    clients: Array<{
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    }>;
  };
  documents: DocumentRecordDetail[];
  voiceBotSessions: VoiceBotSessionRecord[];
}

export function useAgentTransactions(token: string | null) {
  return useQuery({
    queryKey: ["agent", "transactions", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await api.get<AgentTransactionsResponse>("/api/agent/transactions", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    }
  });
}

export function useAgentTransactionDocuments(transactionId: string | undefined, token: string | null) {
  return useQuery({
    queryKey: ["agent", "transaction-documents", transactionId, token],
    enabled: Boolean(transactionId && token),
    refetchInterval: 4000,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      const response = await api.get<AgentTransactionDocumentsResponse>(
        `/api/agent/transactions/${transactionId}/documents`,
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
