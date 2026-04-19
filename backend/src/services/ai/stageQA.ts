import type { AiTransparency, DocumentCategory, GeneratedBy } from "@shared";
import { z } from "zod";

import { runGroqTask } from "../../lib/groq";
import { logger } from "../../lib/logger";
import { getStageQaPrompt } from "../../prompts/stageQA";

export interface StageQaInput {
  question: string;
  propertyAddress: string;
  transactionStage: string;
  transactionRole: string;
  documentTitle?: string;
  documentCategory?: DocumentCategory;
  documentTextExcerpt?: string;
  recentQuestions?: string[];
}

export interface StageQaResult {
  answer: string;
  nextStep?: string;
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
}

const stageQaSchema = z.object({
  answer: z.string().min(20),
  nextStep: z.string().min(8).optional()
});

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function stripCodeFences(responseText: string): string {
  return responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function buildFallbackAnswer(input: StageQaInput): { answer: string; nextStep?: string } {
  const normalized = input.question.toLowerCase();

  if (normalized.includes("earnest")) {
    return {
      answer:
        "Earnest money is the buyer's good-faith deposit. It is usually credited back toward closing costs or cash to close later, but whether it stays protected depends on the contract deadlines and contingencies still in place.",
      nextStep: "Ask your agent which contingency deadlines still protect your deposit on this transaction."
    };
  }

  if (normalized.includes("inspection") || normalized.includes("roof") || normalized.includes("foundation")) {
    return {
      answer:
        "Inspection issues do not automatically kill the deal. They usually create a decision point about asking for repairs, requesting a credit, getting specialist quotes, or deciding whether the findings still fit your comfort level.",
      nextStep: "Have your agent prioritize the biggest repair items and decide whether contractor quotes are needed before responding."
    };
  }

  if (normalized.includes("contingenc")) {
    return {
      answer:
        "A contingency is a built-in contract protection that gives one side a chance to review something important before moving forward. Once that deadline passes, the client usually has less leverage and fewer clean exit paths.",
      nextStep: "Confirm which contingency expires next so you know the real decision window."
    };
  }

  if (normalized.includes("financ") || normalized.includes("loan") || normalized.includes("mortgage") || normalized.includes("rate")) {
    return {
      answer:
        "Financing questions usually come down to approval status, cash-to-close changes, or what happens if the lender timeline slips. The contract may protect the buyer for some financing problems, but only if the timeline and notice rules are still being followed.",
      nextStep: "Compare the lender timeline to the contract deadlines and have your agent flag any mismatch early."
    };
  }

  if (normalized.includes("title") || normalized.includes("lien") || normalized.includes("escrow")) {
    return {
      answer:
        "Title and escrow questions usually relate to ownership, liens, or who is holding and moving money during the transaction. If title finds a problem, it normally needs to be cleared before closing can happen cleanly.",
      nextStep: "Ask your agent whether title has raised any items that could delay closing or change risk."
    };
  }

  if (normalized.includes("closing cost") || normalized.includes("cash to close") || normalized.includes("fees")) {
    return {
      answer:
        "Closing costs are the collection of lender, title, escrow, recording, prepaid, and transaction fees that show up alongside the purchase price. They can move around as quotes firm up, so the final number is more than just the down payment.",
      nextStep: "Review the latest estimate with your agent and lender so there are no surprise fees near closing."
    };
  }

  if (
    normalized.includes("walk away") ||
    normalized.includes("back out") ||
    normalized.includes("changed my mind") ||
    normalized.includes("don't want this") ||
    normalized.includes("do not want this")
  ) {
    return {
      answer:
        "Whether you can walk away cleanly depends on which contract protections are still active and what deadlines have already passed. That is a higher-stakes judgment call, so the safest next move is a direct conversation with your agent before taking any action.",
      nextStep: "Pause before sending anything and talk with your agent about the exact contract protections still available."
    };
  }

  if (normalized.includes("closing") || normalized.includes("sign") || normalized.includes("keys")) {
    return {
      answer:
        "Closing is usually the final signing and money-transfer stage of the transaction. The exact timing depends on whether the documents, lender, title company, and any unresolved contingencies are all lined up in time.",
      nextStep: "Ask your agent what has to be completed before you can sign and receive keys."
    };
  }

  if (normalized.includes("hoa") || normalized.includes("association") || normalized.includes("dues")) {
    return {
      answer:
        "HOA documents usually matter because they add monthly costs, rules, and sometimes transfer fees or special-assessment risk. They can change how flexible ownership feels even when the house itself looks great.",
      nextStep: "Have your agent point out any HOA fees, rental limits, or use restrictions that matter most for your plans."
    };
  }

  if (normalized.includes("apprais")) {
    return {
      answer:
        "If the appraisal comes in low, the next question is usually whether the price changes, the buyer brings more cash, or the parties renegotiate. The answer depends on the contract, lender rules, and how flexible the seller is.",
      nextStep: "Ask your agent what the contract says about appraisal timing and what your realistic options would be."
    };
  }

  return {
    answer:
      "This looks like a normal transaction question. The safest way to think about it is to separate what the document says, what deadline applies, and whether the answer requires a real strategy call from your agent.",
    nextStep: "Ask your agent which deadline or decision this question affects most."
  };
}

export async function answerTransactionQuestion(input: StageQaInput): Promise<StageQaResult> {
  const fallback = buildFallbackAnswer(input);
  const documentTextExcerpt = input.documentTextExcerpt
    ? trimToLength(input.documentTextExcerpt, 4_000)
    : undefined;

  const result = await runGroqTask({
    taskName: "Transaction Q&A",
    system:
      "You are a careful real-estate transaction assistant. You answer in plain English, stay grounded in the provided context, and return valid JSON only.",
    prompt: getStageQaPrompt({
      question: input.question,
      propertyAddress: input.propertyAddress,
      transactionStage: input.transactionStage,
      transactionRole: input.transactionRole,
      ...(input.documentTitle ? { documentTitle: input.documentTitle } : {}),
      ...(input.documentCategory ? { documentCategory: input.documentCategory } : {}),
      ...(documentTextExcerpt ? { documentTextExcerpt } : {}),
      ...(input.recentQuestions && input.recentQuestions.length > 0
        ? { recentQuestions: input.recentQuestions.slice(0, 4) }
        : {})
    }),
    sources: [
      `question:${trimToLength(input.question, 80)}`,
      `property:${input.propertyAddress}`,
      `stage:${input.transactionStage}`,
      input.documentTitle ? `document:${input.documentTitle}` : "document:none"
    ],
    fallback: () => fallback,
    parse: (responseText) => {
      const parsed = stageQaSchema.parse(JSON.parse(stripCodeFences(responseText)) as unknown);
      return {
        answer: trimToLength(parsed.answer, 900),
        ...(parsed.nextStep ? { nextStep: trimToLength(parsed.nextStep, 180) } : {})
      };
    }
  });

  if (result.generatedBy === "fallback") {
    logger.warn("Transaction Q&A used fallback", {
      propertyAddress: input.propertyAddress,
      transactionStage: input.transactionStage
    });
  }

  return result;
}
