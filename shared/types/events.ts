import type { ReadinessSnapshotRecord } from "./readiness";
import type { SentimentSnapshot } from "./sentiment";

export type RealtimeEventType =
  | "client:question"
  | "client:sentiment"
  | "client:document_opened"
  | "agent:override"
  | "bot:booked";

export interface RealtimeEventPayloadMap {
  "client:question": {
    agentId: string;
    transactionId: string;
    clientAccountId: string;
    question: string;
    classification: string;
    newReadiness?: ReadinessSnapshotRecord;
  };
  "client:sentiment": {
    agentId: string;
    transactionId: string;
    clientAccountId: string;
    sentiment: SentimentSnapshot;
  };
  "client:document_opened": {
    agentId: string;
    transactionId: string;
    clientAccountId: string;
    documentId: string;
  };
  "agent:override": {
    agentId: string;
    transactionId: string;
    clientAccountId: string;
    documentId: string;
  };
  "bot:booked": {
    agentId: string;
    transactionId: string;
    clientAccountId: string;
    sessionId: string;
    bookedSlot: string;
  };
}

export interface RealtimeEvent<TType extends RealtimeEventType = RealtimeEventType> {
  id: string;
  type: TType;
  createdAt: string;
  payload: RealtimeEventPayloadMap[TType];
}
