import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentActivityItem, RealtimeEvent, RealtimeEventPayloadMap } from "@shared";

import { queryClient } from "@/lib/queryClient";

type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";

function buildActivityItem(event: RealtimeEvent): AgentActivityItem {
  switch (event.type) {
    case "client:question": {
      const payload = event.payload as RealtimeEventPayloadMap["client:question"];
      const severity = Number(payload.classification.split(":")[1] ?? "2");
      return {
        id: event.id,
        type: event.type,
        title: severity >= 4 ? "High-attention client question" : "Client asked a question",
        body: payload.question,
        createdAt: event.createdAt,
        severity,
        transactionId: payload.transactionId,
        clientAccountId: payload.clientAccountId
      };
    }
    case "client:sentiment": {
      const payload = event.payload as RealtimeEventPayloadMap["client:sentiment"];
      return {
        id: event.id,
        type: event.type,
        title: `Sentiment updated to ${payload.sentiment.sentiment}`,
        body: payload.sentiment.alertReason,
        createdAt: event.createdAt,
        severity: payload.sentiment.agentAlertNeeded ? 5 : 2,
        transactionId: payload.transactionId,
        clientAccountId: payload.clientAccountId
      };
    }
    case "client:document_opened": {
      const payload = event.payload as RealtimeEventPayloadMap["client:document_opened"];
      return {
        id: event.id,
        type: event.type,
        title: "Client opened a document",
        body: "A client opened a transaction document in the portal.",
        createdAt: event.createdAt,
        severity: 1,
        transactionId: payload.transactionId,
        clientAccountId: payload.clientAccountId
      };
    }
    case "agent:override": {
      const payload = event.payload as RealtimeEventPayloadMap["agent:override"];
      return {
        id: event.id,
        type: event.type,
        title: "Agent override published",
        body: "A document explanation was updated and pushed to the client view.",
        createdAt: event.createdAt,
        severity: 1,
        transactionId: payload.transactionId,
        clientAccountId: payload.clientAccountId
      };
    }
    case "bot:booked": {
      const payload = event.payload as RealtimeEventPayloadMap["bot:booked"];
      return {
        id: event.id,
        type: event.type,
        title: "Bot call booked",
        body: `A meeting slot was confirmed for ${new Date(payload.bookedSlot).toLocaleString()}.`,
        createdAt: event.createdAt,
        severity: 2,
        transactionId: payload.transactionId,
        clientAccountId: payload.clientAccountId
      };
    }
    default:
      return {
        id: event.id,
        type: event.type,
        title: "Realtime event received",
        body: event.type,
        createdAt: event.createdAt
      };
  }
}

export function useAgentEventStream(token: string | null) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!token) {
      setEvents([]);
      setConnectionState("closed");
      return;
    }

    let eventSource: EventSource | null = null;
    let closed = false;

    const connect = () => {
      if (closed) {
        return;
      }

      setConnectionState(attemptRef.current === 0 ? "connecting" : "reconnecting");
      eventSource = new EventSource(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api/agent/events?token=${encodeURIComponent(token)}`
      );

      eventSource.onopen = () => {
        attemptRef.current = 0;
        setConnectionState("open");
      };

      eventSource.onmessage = (message) => {
        try {
          const nextEvent = JSON.parse(message.data) as RealtimeEvent;
          setEvents((current) => [nextEvent, ...current].slice(0, 20));

          void queryClient.invalidateQueries({ queryKey: ["agent", "triage"] });
          void queryClient.invalidateQueries({ queryKey: ["agent", "me"] });
          void queryClient.invalidateQueries({ queryKey: ["agent", "transactions"] });

          if ("transactionId" in nextEvent.payload) {
            void queryClient.invalidateQueries({
              queryKey: ["agent", "transaction-documents", nextEvent.payload.transactionId]
            });
          }
        } catch {
          return;
        }
      };

      eventSource.onerror = () => {
        if (closed) {
          return;
        }

        setConnectionState("reconnecting");
        eventSource?.close();
        attemptRef.current += 1;
        reconnectTimerRef.current = window.setTimeout(connect, Math.min(4_000, 1_000 * attemptRef.current));
      };
    };

    connect();

    return () => {
      closed = true;
      setConnectionState("closed");
      eventSource?.close();
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [token]);

  const activityItems = useMemo(() => events.map((event) => buildActivityItem(event)), [events]);
  const latestEvent = events[0] ?? null;

  return {
    connectionState,
    events,
    latestEvent,
    activityItems
  };
}
