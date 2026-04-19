import type { DocumentCategory } from "@shared";

interface DocumentSummaryPromptInput {
  category: DocumentCategory;
  title: string;
  propertyAddress?: string;
  transactionStage?: string;
  textContent: string;
}

const categoryGuidance: Record<DocumentCategory, string> = {
  purchase_agreement:
    "Focus on purchase price, earnest money, contingencies, closing date, deadlines, title/HOA review, and any places the buyer could accidentally miss a decision window.",
  inspection_report:
    "Focus on safety issues, water intrusion risk, aging systems, repair-vs-credit decision points, and what findings deserve contractor estimates before negotiation.",
  disclosure:
    "Focus on what the seller is revealing, any signs of known defects, insurance or claims history, and anything the client should independently verify.",
  hoa:
    "Focus on dues, transfer fees, special assessment risk, rental restrictions, parking and pet rules, architectural controls, and anything that changes day-to-day livability.",
  generic:
    "Focus on what the document is, the concrete decisions or deadlines it creates, and what parts could confuse a first-time buyer or seller."
};

export function getDocumentSummaryPrompt(input: DocumentSummaryPromptInput): string {
  return [
    "You are Closing Day, an AI real-estate document concierge.",
    "Return valid JSON only with this exact shape:",
    '{"summaryTlDr":"string","whatThisIs":"string","watchFor":["string","string","string"],"askYourAgent":["string","string","string"],"plainEnglishFullText":"string"}',
    "Write in calm, plain English for a client who is not a real-estate expert.",
    "Do not give legal advice, and if a strategic or legal call is needed, point the client back to the agent.",
    `Document category: ${input.category}`,
    `Document title: ${input.title}`,
    `Property address: ${input.propertyAddress ?? "Unknown property"}`,
    `Transaction stage: ${input.transactionStage ?? "Unknown stage"}`,
    `Category-specific guidance: ${categoryGuidance[input.category]}`,
    "The JSON values should be concise but useful. `watchFor` and `askYourAgent` should each contain exactly 3 concrete bullet-style strings.",
    "Document text begins below:",
    input.textContent
  ].join("\n\n");
}
