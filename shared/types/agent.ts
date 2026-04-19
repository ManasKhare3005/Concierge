export type ServiceState = "configured" | "live" | "fallback" | "demo" | "error";

export interface ServiceStatus {
  name: "anthropic" | "elevenlabs" | "lofty";
  state: ServiceState;
  detail: string;
}

export interface AgentNotification {
  id: string;
  type: "question_asked" | "sentiment_changed" | "bot_booked" | "document_opened";
  title: string;
  body: string;
  relatedId?: string;
  read: boolean;
  createdAt: string;
}

export interface AgentProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  brokerage?: string;
  loftyApiKeyConfigured: boolean;
}
