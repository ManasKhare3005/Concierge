import path from "node:path";

import type { AiTransparency, DocumentRecordDetail, DocumentSummarySections, GeneratedBy } from "@shared";
import type { DocumentRecord } from "@prisma/client";
import { z } from "zod";

const documentSummarySectionsSchema = z.object({
  whatThisIs: z.string(),
  watchFor: z.array(z.string()),
  askYourAgent: z.array(z.string()),
  plainEnglishFullText: z.string()
});

interface DocumentRecordLike extends DocumentRecord {
  transaction?: {
    propertyAddress: string;
    stageLabel: string;
  };
}

function parseSummaryJson(summaryJson: string | null): DocumentSummarySections | undefined {
  if (!summaryJson) {
    return undefined;
  }

  try {
    return documentSummarySectionsSchema.parse(JSON.parse(summaryJson) as unknown);
  } catch {
    return undefined;
  }
}

function normalizeGeneratedBy(value: string | null): GeneratedBy | undefined {
  if (value === "groq" || value === "fallback") {
    return value;
  }

  return undefined;
}

function buildTransparency(document: DocumentRecordLike): AiTransparency {
  const generatedBy = normalizeGeneratedBy(document.summaryGeneratedBy);
  const note = document.overriddenAt
    ? "The original AI draft was edited by the agent, so you are seeing the latest human-reviewed explanation."
    : generatedBy === "groq"
      ? "Groq summarized the extracted PDF text for this document."
      : "A rule-based fallback summary was used for this document.";

  return {
    sources: [
      `document:${document.title}`,
      `category:${document.category}`,
      document.transaction ? `property:${document.transaction.propertyAddress}` : "property:unknown"
    ],
    note
  };
}

export function mapDocumentRecord(document: DocumentRecordLike): DocumentRecordDetail {
  const summaryJson = parseSummaryJson(document.summaryJson);
  const summaryGeneratedBy = normalizeGeneratedBy(document.summaryGeneratedBy);

  return {
    id: document.id,
    transactionId: document.transactionId,
    title: document.title,
    category: document.category as DocumentRecordDetail["category"],
    filePath: document.filePath,
    uploadedAt: document.uploadedAt.toISOString(),
    uploadedBy: document.uploadedBy,
    ...(document.summaryTlDr ? { summaryTlDr: document.summaryTlDr } : {}),
    ...(summaryJson ? { summaryJson } : {}),
    ...(document.summaryGeneratedAt ? { summaryGeneratedAt: document.summaryGeneratedAt.toISOString() } : {}),
    ...(summaryGeneratedBy ? { summaryGeneratedBy } : {}),
    openedByClient: document.openedByClient,
    ...(document.openedAt ? { openedAt: document.openedAt.toISOString() } : {}),
    questionCount: document.questionCount,
    ...(document.overriddenAt ? { overriddenAt: document.overriddenAt.toISOString() } : {}),
    ...(document.overriddenBy ? { overriddenBy: document.overriddenBy } : {}),
    transparency: buildTransparency(document),
    textContent: document.textContent
  };
}

export function resolveDocumentAbsolutePath(filePath: string): string {
  return path.resolve(process.cwd(), filePath);
}
