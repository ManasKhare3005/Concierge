import type { DocumentCategory, DocumentSummarySections } from "@shared";
import { z } from "zod";

import { runGroqTask } from "../../lib/groq";
import { logger } from "../../lib/logger";
import { getDocumentSummaryPrompt } from "../../prompts/documentSummaryByCategory";

export interface DocumentSummarizerInput {
  title: string;
  category: DocumentCategory;
  textContent: string;
  propertyAddress?: string;
  transactionStage?: string;
}

export interface DocumentSummaryResult {
  summaryTlDr: string;
  summaryJson: DocumentSummarySections;
  generatedBy: "groq" | "fallback";
  transparency: {
    sources: string[];
    note: string;
  };
}

const documentSummarySchema = z.object({
  summaryTlDr: z.string().min(12),
  whatThisIs: z.string().min(20),
  watchFor: z.array(z.string().min(6)).min(3),
  askYourAgent: z.array(z.string().min(6)).min(3),
  plainEnglishFullText: z.string().min(30)
});

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function fallbackWatchFor(category: DocumentCategory, textContent: string): string[] {
  const normalized = textContent.toLowerCase();

  switch (category) {
    case "purchase_agreement":
      return uniqueStrings([
        normalized.includes("earnest")
          ? "Earnest money timing matters, because missing that delivery window can create avoidable risk."
          : "Watch the deposit and performance deadlines closely so no one misses a contract obligation.",
        normalized.includes("inspection")
          ? "Inspection response timing can affect whether the buyer still has leverage to ask for repairs or credits."
          : "Look for the next contingency deadline, because that usually controls the client's negotiation leverage.",
        normalized.includes("closing")
          ? "Closing date and possession timing may create separate logistical expectations for move-in or move-out."
          : "Title, HOA, and closing-cost sections often hide the biggest non-price surprises."
      ]);
    case "inspection_report":
      return uniqueStrings([
        normalized.includes("roof")
          ? "Roof wear or flashing concerns can become an immediate negotiation point if repair costs are meaningful."
          : "Any item involving water entry, safety, or a major system deserves more attention than cosmetic notes.",
        normalized.includes("gfci") || normalized.includes("electrical")
          ? "Electrical safety items are often worth fixing even if they are not expensive."
          : "Separate true safety issues from routine maintenance so the client does not feel overwhelmed by the whole list.",
        normalized.includes("water heater")
          ? "An older water heater may still work now but can create near-term replacement costs."
          : "Aging systems matter because they may affect budgeting even if they are still functional today."
      ]);
    case "disclosure":
      return uniqueStrings([
        "Seller disclosures tell you what has already been noticed, not what will never go wrong later.",
        "Insurance claims, repairs, or recurring-condition notes usually deserve a follow-up question if they affect confidence.",
        "If a disclosure hints at prior damage or an unresolved condition, ask what documentation supports the seller's statement."
      ]);
    case "hoa":
      return uniqueStrings([
        normalized.includes("assessment")
          ? "Monthly dues are only part of the cost if the HOA can also issue transfer fees or special assessments."
          : "Look beyond monthly dues to see whether transfer charges or future assessments are possible.",
        normalized.includes("rent") || normalized.includes("lease")
          ? "Rental rules can matter later even if the client is buying as an owner-occupant today."
          : "Parking, pet, and use rules can change how flexible ownership feels day to day.",
        normalized.includes("architectural")
          ? "Exterior changes may need HOA approval even for projects that feel minor to the owner."
          : "Reserve and budget information can hint at whether the community may need higher dues later."
      ]);
    case "generic":
    default:
      return [
        "Watch for deadlines, costs, or approval steps that the client may not realize are hidden in the document.",
        "Separate simple explanation questions from anything that needs agent judgment or legal review.",
        "If the document references another form, report, or rule set, the client may need both pieces together."
      ];
  }
}

function fallbackAskYourAgent(category: DocumentCategory, textContent: string): string[] {
  const normalized = textContent.toLowerCase();

  switch (category) {
    case "purchase_agreement":
      return uniqueStrings([
        "Which deadline matters most next, and what happens if we need more time?",
        normalized.includes("earnest")
          ? "Under what circumstances would our earnest money still be protected if the deal changes?"
          : "Which parts of this contract are normal, and which parts should we negotiate harder?",
        "Are there any title, HOA, or closing-cost items here that should change how confident we feel?"
      ]);
    case "inspection_report":
      return uniqueStrings([
        "Which findings are worth asking the seller to repair, and which are better handled as a credit?",
        normalized.includes("roof")
          ? "Should we get a roofer quote before we send our inspection response?"
          : "Should we bring in any specialist before the inspection response deadline expires?",
        "Do these findings change our comfort with the price or timeline?"
      ]);
    case "disclosure":
      return [
        "Is there anything disclosed here that should change our inspection strategy or follow-up questions?",
        "Do we need any extra documentation to verify what the seller is saying?",
        "Which of these disclosures are common, and which ones deserve more attention?"
      ];
    case "hoa":
      return [
        "Do these HOA rules conflict with how I want to live in or use this property?",
        "What HOA-related fees will actually show up at closing?",
        "Do the budget or reserve numbers suggest the community may need higher dues later?"
      ];
    case "generic":
    default:
      return [
        "What is the one decision this document is actually asking us to make?",
        "Is there anything in here that changes our timeline, cost, or negotiation posture?",
        "Which parts are routine and which parts deserve a live conversation?"
      ];
  }
}

function fallbackWhatThisIs(category: DocumentCategory): string {
  switch (category) {
    case "purchase_agreement":
      return "This is the main contract for the transaction. It sets the price, deadlines, contingencies, and closing responsibilities for the people involved in the sale.";
    case "inspection_report":
      return "This is the property-condition report prepared after the home inspection. It highlights safety items, maintenance issues, aging systems, and anything the buyers may want to discuss before moving forward.";
    case "disclosure":
      return "This is a seller disclosure document. It is meant to tell the client what the seller knows about the property and what may need closer review.";
    case "hoa":
      return "This is the homeowners association packet. It explains the community rules, recurring dues, transfer fees, and any restrictions that come with owning the property.";
    case "generic":
    default:
      return "This is a transaction document that may create responsibilities, deadlines, or questions for the client during the deal.";
  }
}

function fallbackPlainEnglishText(
  input: DocumentSummarizerInput,
  watchFor: string[],
  askYourAgent: string[]
): string {
  return trimToLength(
    `${fallbackWhatThisIs(input.category)} The biggest points to notice are: ${watchFor.join(" ")} If the client needs help deciding what to do next, the best agent-facing follow-ups are: ${askYourAgent.join(" ")}`,
    1200
  );
}

function buildFallbackSummary(input: DocumentSummarizerInput) {
  const watchFor = fallbackWatchFor(input.category, input.textContent).slice(0, 3);
  const askYourAgent = fallbackAskYourAgent(input.category, input.textContent).slice(0, 3);

  return {
    summaryTlDr: trimToLength(
      `${fallbackWhatThisIs(input.category)} Key takeaways focus on ${watchFor
        .map((item) => item.toLowerCase())
        .join(" ")}`,
      220
    ),
    summaryJson: {
      whatThisIs: fallbackWhatThisIs(input.category),
      watchFor,
      askYourAgent,
      plainEnglishFullText: fallbackPlainEnglishText(input, watchFor, askYourAgent)
    }
  };
}

function stripCodeFences(responseText: string): string {
  return responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

export async function summarizeDocument(
  input: DocumentSummarizerInput
): Promise<DocumentSummaryResult> {
  const truncatedText = trimToLength(input.textContent, 30_000);
  const fallback = buildFallbackSummary(input);

  const result = await runGroqTask({
    taskName: "Document summary",
    system:
      "You are a careful real-estate transaction assistant. You explain documents in plain English, avoid legal advice, and always return valid JSON.",
    prompt: getDocumentSummaryPrompt({
      title: input.title,
      category: input.category,
      ...(input.propertyAddress ? { propertyAddress: input.propertyAddress } : {}),
      ...(input.transactionStage ? { transactionStage: input.transactionStage } : {}),
      textContent: truncatedText
    }),
    sources: [
      `document:${input.title}`,
      `category:${input.category}`,
      input.propertyAddress ? `property:${input.propertyAddress}` : "property:unknown"
    ],
    fallback: () => fallback,
    parse: (responseText) => {
      const normalized = stripCodeFences(responseText);
      const parsedJson = JSON.parse(normalized) as unknown;
      const parsed = documentSummarySchema.parse(parsedJson);

      return {
        summaryTlDr: trimToLength(parsed.summaryTlDr, 240),
        summaryJson: {
          whatThisIs: parsed.whatThisIs,
          watchFor: parsed.watchFor.slice(0, 3),
          askYourAgent: parsed.askYourAgent.slice(0, 3),
          plainEnglishFullText: trimToLength(parsed.plainEnglishFullText, 1600)
        }
      };
    }
  });

  if (result.generatedBy === "fallback") {
    logger.warn("Document summary used fallback", {
      title: input.title,
      category: input.category
    });
  }

  return result;
}
