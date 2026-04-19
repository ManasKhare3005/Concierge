export function getDocumentSummaryPrompt(category: string): string {
  return `Summarize this ${category} document in plain English with sections for what it is, what to watch for, and what to ask the agent.`;
}
