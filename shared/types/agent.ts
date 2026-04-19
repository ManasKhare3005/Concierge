import type { BotTone } from "./voiceBot";

export type ServiceState = "configured" | "live" | "fallback" | "demo" | "error";

export interface ServiceStatus {
  name: "groq" | "elevenlabs" | "lofty";
  state: ServiceState;
  detail: string;
}

export interface AgentNotification {
  id: string;
  type: "question_asked" | "sentiment_changed" | "bot_booked" | "bot_followup_started" | "document_opened";
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

export type AgentTriageBucketKey = "needs_full_attention" | "needs_light_touch" | "clear" | "booked";
export type SentimentTrend = "up" | "down" | "flat";

export interface AgentActivityItem {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  severity?: number;
  transactionId?: string;
  clientAccountId?: string;
}

export interface AgentTriageCard {
  clientAccountId: string;
  transactionId: string;
  clientName: string;
  clientFirstName: string;
  roleLabel: string;
  preferredLanguage: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyPrice?: number;
  stage: string;
  stageLabel: string;
  bucket: AgentTriageBucketKey;
  reasoning: string;
  topConcerns: string[];
  recommendedAgentAction: string;
  propertyInterestSignal: "committed" | "evaluating" | "cooling";
  latestQuestionExcerpt?: string;
  latestQuestionSeverity?: number;
  latestQuestionAskedAt?: string;
  sentimentLabel?: "calm" | "curious" | "excited" | "anxious" | "confused" | "frustrated" | "overwhelmed";
  sentimentTrend: SentimentTrend;
  sentimentUpdatedAt?: string;
  requiresAgentAttention: boolean;
  roiMinutesSaved: number;
  roiDollarsProtected: number;
  roiLabel: string;
  draftText: string;
  bookedSlot?: string;
  pendingBotSessionId?: string;
  pendingBotTone?: BotTone;
  pendingBotConcerns?: string[];
  pendingBotProposedSlots?: string[];
}

export interface AgentTriageRoi {
  estimatedMinutesSaved: number;
  estimatedRevenueProtected: number;
  lowTouchClients: number;
  focusRecoveredMinutes: number;
}

export interface AgentTriageResponse {
  grouped: Record<AgentTriageBucketKey, AgentTriageCard[]>;
  roi: AgentTriageRoi;
  recentActivity: AgentActivityItem[];
  summary: {
    activeClients: number;
    needsFullAttention: number;
    needsLightTouch: number;
    clear: number;
    booked: number;
  };
}

export type AgentRepeatClientTier = "immediate" | "soon" | "nurture";

export interface AgentRepeatClientCard {
  clientAccountId: string;
  transactionId: string;
  clientName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  closedAt: string;
  monthsSinceClose: number;
  equityGainPct: number;
  estimatedCurrentValue: number;
  originalPrice?: number;
  tier: AgentRepeatClientTier;
  lifeEventSignals: string[];
  outcomeLabel: string;
  recommendedAction: string;
  roleLabel: string;
  roiPotentialDollars: number;
}

export interface AgentRepeatClientsResponse {
  grouped: Record<AgentRepeatClientTier, AgentRepeatClientCard[]>;
  roi: {
    estimatedPipelineValue: number;
    annualFollowUpHoursSaved: number;
    immediateOpportunityCount: number;
  };
  summary: {
    totalClients: number;
    immediate: number;
    soon: number;
    nurture: number;
  };
}
