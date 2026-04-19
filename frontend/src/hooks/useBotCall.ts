import type { BotTone, VoiceBotSessionRecord } from "@shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface InitiateBotCallPayload {
  transactionId: string;
  clientAccountId: string;
  concerns: string[];
  tone: BotTone;
  proposedSlots: string[];
}

interface ConfirmBotCallPayload {
  sessionId: string;
  bookedSlot: string;
  clientNewQuestion?: string;
}

interface UpdateBotSlotsPayload {
  sessionId: string;
  proposedSlots: string[];
}

function authHeaders(token: string | null) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export function useVoiceBotSession(token: string | null, sessionId: string | undefined) {
  return useQuery({
    queryKey: ["agent", "voice-bot-session", sessionId],
    enabled: Boolean(token && sessionId),
    queryFn: async () => {
      const response = await api.get<{ session: VoiceBotSessionRecord }>(
        `/api/agent/voice-bot/${sessionId}`,
        authHeaders(token)
      );

      return response.data.session;
    }
  });
}

export function useInitiateBotCall(token: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InitiateBotCallPayload) => {
      const response = await api.post<{ session: VoiceBotSessionRecord }>(
        "/api/agent/voice-bot/initiate",
        payload,
        authHeaders(token)
      );

      return response.data.session;
    },
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: ["agent", "triage"] });
      void queryClient.invalidateQueries({ queryKey: ["agent", "me"] });
      queryClient.setQueryData(["agent", "voice-bot-session", session.id], session);
    }
  });
}

export function useRespondToBotCall(token: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { sessionId: string; response: string }) => {
      const response = await api.post<{ session: VoiceBotSessionRecord }>(
        `/api/agent/voice-bot/${payload.sessionId}/respond`,
        {
          response: payload.response
        },
        authHeaders(token)
      );

      return response.data.session;
    },
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: ["agent", "triage"] });
      queryClient.setQueryData(["agent", "voice-bot-session", session.id], session);
    }
  });
}

export function useConfirmBotCall(token: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ConfirmBotCallPayload) => {
      const response = await api.post<{ session: VoiceBotSessionRecord }>(
        `/api/agent/voice-bot/${payload.sessionId}/confirm`,
        {
          bookedSlot: payload.bookedSlot,
          ...(payload.clientNewQuestion ? { clientNewQuestion: payload.clientNewQuestion } : {})
        },
        authHeaders(token)
      );

      return response.data.session;
    },
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: ["agent", "triage"] });
      void queryClient.invalidateQueries({ queryKey: ["agent", "me"] });
      queryClient.setQueryData(["agent", "voice-bot-session", session.id], session);
    }
  });
}

export function useUpdateBotSlots(token: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateBotSlotsPayload) => {
      const response = await api.post<{ session: VoiceBotSessionRecord }>(
        `/api/agent/voice-bot/${payload.sessionId}/slots`,
        {
          proposedSlots: payload.proposedSlots
        },
        authHeaders(token)
      );

      return response.data.session;
    },
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: ["agent", "triage"] });
      void queryClient.invalidateQueries({ queryKey: ["agent", "transaction-documents", session.transactionId] });
      void queryClient.invalidateQueries({ queryKey: ["client", "transaction-documents", session.transactionId] });
      queryClient.setQueryData(["agent", "voice-bot-session", session.id], session);
    }
  });
}

export function useRespondToClientBotCall(transactionId: string, token: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { response: string }) => {
      const response = await api.post<{ session: VoiceBotSessionRecord }>(
        `/api/client/transactions/${transactionId}/voice-bot/respond`,
        {
          response: payload.response
        },
        authHeaders(token)
      );

      return response.data.session;
    },
    onSuccess: async (session) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["client", "transaction-documents", transactionId] }),
        queryClient.invalidateQueries({ queryKey: ["client", "portfolio"] }),
        queryClient.invalidateQueries({ queryKey: ["agent", "triage"] }),
        queryClient.invalidateQueries({ queryKey: ["agent", "transaction-documents", transactionId] })
      ]);

      queryClient.setQueryData(["agent", "voice-bot-session", session.id], session);
    }
  });
}

export function useConfirmClientBotCall(transactionId: string, token: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { bookedSlot: string; clientNewQuestion?: string }) => {
      const response = await api.post<{ session: VoiceBotSessionRecord }>(
        `/api/client/transactions/${transactionId}/voice-bot/confirm`,
        {
          bookedSlot: payload.bookedSlot,
          ...(payload.clientNewQuestion ? { clientNewQuestion: payload.clientNewQuestion } : {})
        },
        authHeaders(token)
      );

      return response.data.session;
    },
    onSuccess: async (session) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["client", "transaction-documents", transactionId] }),
        queryClient.invalidateQueries({ queryKey: ["client", "portfolio"] }),
        queryClient.invalidateQueries({ queryKey: ["agent", "triage"] }),
        queryClient.invalidateQueries({ queryKey: ["agent", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["agent", "transaction-documents", transactionId] })
      ]);

      queryClient.setQueryData(["agent", "voice-bot-session", session.id], session);
    }
  });
}
