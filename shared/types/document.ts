export type DocumentCategory =
  | "purchase_agreement"
  | "inspection_report"
  | "disclosure"
  | "hoa"
  | "generic";

export type GeneratedBy = "anthropic" | "fallback";

export interface AiTransparency {
  sources: string[];
  note: string;
}

export interface DocumentSummarySections {
  whatThisIs: string;
  watchFor: string[];
  askYourAgent: string[];
  plainEnglishFullText: string;
}

export interface DocumentRecordSummary {
  id: string;
  transactionId: string;
  title: string;
  category: DocumentCategory;
  filePath: string;
  uploadedAt: string;
  uploadedBy: string;
  summaryTlDr?: string;
  summaryJson?: DocumentSummarySections;
  summaryGeneratedAt?: string;
  summaryGeneratedBy?: GeneratedBy;
  openedByClient: boolean;
  openedAt?: string;
  questionCount: number;
  overriddenAt?: string;
  overriddenBy?: string;
}
