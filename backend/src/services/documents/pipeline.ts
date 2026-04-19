import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { DocumentCategory, DocumentRecordDetail } from "@shared";

import { logger } from "../../lib/logger";
import { readPdfText } from "../../lib/pdfReader";
import { prisma } from "../../lib/prisma";
import { summarizeDocument } from "../ai/documentSummarizer";
import { mapDocumentRecord } from "./repository";

export interface RunDocumentPipelineInput {
  transactionId: string;
  agentId: string;
  title: string;
  category: DocumentCategory;
  originalFilename: string;
  fileBuffer: Buffer;
}

function sanitizeFilename(originalFilename: string): string {
  return originalFilename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").toLowerCase();
}

async function persistUploadedPdf(originalFilename: string, fileBuffer: Buffer): Promise<string> {
  const safeFilename = sanitizeFilename(originalFilename);
  const targetFilename = `${Date.now()}-${randomUUID()}-${safeFilename.endsWith(".pdf") ? safeFilename : `${safeFilename}.pdf`}`;
  const relativePath = path.join("uploads", targetFilename).replaceAll("\\", "/");
  const absolutePath = path.resolve(process.cwd(), relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, fileBuffer);

  return relativePath;
}

async function extractTextContent(fileBuffer: Buffer, title: string): Promise<string> {
  try {
    const extractedText = await readPdfText(fileBuffer);
    if (extractedText.trim().length > 0) {
      return extractedText;
    }
  } catch (error) {
    logger.error("PDF text extraction failed", {
      title,
      error: error instanceof Error ? error.message : error
    });
  }

  return `Text extraction was limited for ${title}. The PDF is still available for direct review in the document viewer.`;
}

export async function runDocumentPipeline(
  input: RunDocumentPipelineInput
): Promise<DocumentRecordDetail> {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: input.transactionId,
      agentId: input.agentId
    }
  });

  if (!transaction) {
    throw new Error("Transaction not found for this agent.");
  }

  const filePath = await persistUploadedPdf(input.originalFilename, input.fileBuffer);
  const textContent = await extractTextContent(input.fileBuffer, input.title);
  const summary = await summarizeDocument({
    title: input.title,
    category: input.category,
    textContent,
    propertyAddress: transaction.propertyAddress,
    transactionStage: transaction.stageLabel
  });

  const document = await prisma.documentRecord.create({
    data: {
      transactionId: transaction.id,
      title: input.title,
      category: input.category,
      filePath,
      textContent,
      uploadedBy: input.agentId,
      summaryTlDr: summary.summaryTlDr,
      summaryJson: JSON.stringify(summary.summaryJson),
      summaryGeneratedAt: new Date(),
      summaryGeneratedBy: summary.generatedBy
    },
    include: {
      transaction: {
        select: {
          propertyAddress: true,
          stageLabel: true
        }
      }
    }
  });

  return mapDocumentRecord(document);
}
