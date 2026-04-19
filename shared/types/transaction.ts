export type TransactionRole = "buy" | "sell";

export type TransactionStage =
  | "offer"
  | "under_contract"
  | "inspection"
  | "appraisal"
  | "closing"
  | "closed"
  | "active_listing";

export interface TransactionSummary {
  id: string;
  agentId: string;
  role: TransactionRole;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyPrice?: number;
  stage: TransactionStage | string;
  stageLabel: string;
  listedAt?: string;
  contractAt?: string;
  expectedCloseAt?: string;
  closedAt?: string;
  source: "demo" | "lofty";
  loftyEntityId?: string;
  createdAt: string;
}
