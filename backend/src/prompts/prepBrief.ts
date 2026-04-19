interface PrepBriefPromptInput {
  agentName: string;
  clientName: string;
  propertyAddress: string;
  stageLabel: string;
  topConcerns: string[];
  conversationTranscript: string[];
  recentQuestions: string[];
  documentContext: string[];
}

export function getPrepBriefPrompt(input: PrepBriefPromptInput): string {
  return [
    "You are writing a prep brief for a real-estate agent before a client call.",
    "Return valid JSON only with this exact shape:",
    '{"brief":"string"}',
    "Rules:",
    "- Keep it under 200 words.",
    "- Focus on the client's emotional temperature, top decision blockers, and what the agent should do first.",
    "- Stay practical and plain-English.",
    `Agent: ${input.agentName}`,
    `Client: ${input.clientName}`,
    `Property: ${input.propertyAddress}`,
    `Stage: ${input.stageLabel}`,
    `Top concerns: ${input.topConcerns.join(" | ")}`,
    `Conversation transcript: ${input.conversationTranscript.join(" | ")}`,
    `Recent transaction questions: ${input.recentQuestions.join(" | ") || "none"}`,
    `Document context: ${input.documentContext.join(" | ") || "none"}`
  ].join("\n\n");
}
