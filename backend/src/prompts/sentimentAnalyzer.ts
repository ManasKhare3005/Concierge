export interface SentimentAnalyzerPromptInput {
  source: "question" | "check_in";
  propertyAddress: string;
  transactionStage: string;
  question: string;
  response: string;
}

export function getSentimentAnalyzerPrompt(input: SentimentAnalyzerPromptInput): string {
  return [
    "You detect client emotion during a real-estate transaction.",
    "Return valid JSON only with this exact shape:",
    '{"sentiment":"calm|curious|excited|anxious|confused|frustrated|overwhelmed","confidence":0.0,"agentAlertNeeded":false,"alertReason":"string","recommendedAgentAction":"string","propertyInterestSignal":"committed|evaluating|cooling"}',
    "Use confidence between 0 and 1.",
    "Mark agentAlertNeeded true when the client sounds distressed, frustrated, overwhelmed, or likely to need a live conversation soon.",
    `Source: ${input.source}`,
    `Property: ${input.propertyAddress}`,
    `Stage: ${input.transactionStage}`,
    `Client message: ${input.question}`,
    `System response or check-in body: ${input.response}`
  ].join("\n\n");
}
