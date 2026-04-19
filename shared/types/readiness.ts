import type { PropertyInterestSignal } from "./question";

export type ReadinessBucket = "clear" | "needs_light_touch" | "needs_full_attention";

export interface ReadinessSnapshotRecord {
  id: string;
  transactionId: string;
  clientAccountId: string;
  bucket: ReadinessBucket;
  reasoning: string;
  topConcerns: string[];
  propertyInterestSignal: PropertyInterestSignal;
  recommendedAgentAction: string;
  computedAt: string;
}
