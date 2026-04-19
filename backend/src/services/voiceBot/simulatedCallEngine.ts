import type { BotScriptTurn } from "@shared";

export interface SimulatedCallState {
  clientFirstName: string;
  topConcerns: string[];
  proposedSlots: string[];
  plan: string[];
  transcript: BotScriptTurn[];
}

export interface SimulatedCallPresentation {
  currentBotTurn?: BotScriptTurn;
  responseOptions: string[];
  canConfirmBooking: boolean;
}

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function normalizeConcern(concern?: string): string {
  if (!concern) {
    return "the next steps";
  }

  return concern.replace(/\.$/, "");
}

function buildOpeningOptions(concerns: string[]): string[] {
  const primary = normalizeConcern(concerns[0]);
  const secondary = normalizeConcern(concerns[1] ?? concerns[0]);

  return [
    trimToLength(`I'm mostly worried about ${primary}.`, 140),
    trimToLength(`I need help understanding ${secondary} before we make the wrong move.`, 140),
    "Can James walk me through what really matters here?"
  ];
}

function buildFollowUpOptions(concerns: string[], clientFirstName: string): string[] {
  const primary = normalizeConcern(concerns[0]);

  return [
    trimToLength(`Protecting the price matters most if ${primary} changes our leverage.`, 150),
    "I mostly need confidence on the timeline and what happens next.",
    trimToLength(`I still have one more question before ${clientFirstName} picks a time.`, 150)
  ];
}

function countClientTurns(turns: BotScriptTurn[]): number {
  return turns.filter((turn) => turn.speaker === "client").length;
}

export function buildInitialTranscript(plan: string[]): BotScriptTurn[] {
  const opening = plan[0] ?? "Hi, this is Closing Day calling with a quick check-in before your agent follows up.";
  return [{ speaker: "bot", text: trimToLength(opening, 280) }];
}

export function advanceSimulatedCall(state: SimulatedCallState, clientResponse: string): BotScriptTurn[] {
  const normalizedResponse = trimToLength(clientResponse.trim(), 280);
  const nextTurns: BotScriptTurn[] = [...state.transcript, { speaker: "client", text: normalizedResponse }];
  const clientTurns = countClientTurns(nextTurns);

  if (clientTurns <= 2) {
    const nextBotText =
      state.plan[clientTurns] ??
      "Thanks, that helps. I'm summarizing this for your agent now so the live call can stay focused.";
    nextTurns.push({ speaker: "bot", text: trimToLength(nextBotText, 280) });
  }

  return nextTurns;
}

export function getSimulatedCallPresentation(state: SimulatedCallState): SimulatedCallPresentation {
  const lastTurn = state.transcript.at(-1);
  const clientTurns = countClientTurns(state.transcript);

  if (!lastTurn || lastTurn.speaker !== "bot") {
    return {
      responseOptions: [],
      canConfirmBooking: false
    };
  }

  if (clientTurns >= 2) {
    return {
      currentBotTurn: lastTurn,
      responseOptions: [],
      canConfirmBooking: true
    };
  }

  return {
    currentBotTurn: lastTurn,
    responseOptions:
      clientTurns === 0
        ? buildOpeningOptions(state.topConcerns)
        : buildFollowUpOptions(state.topConcerns, state.clientFirstName),
    canConfirmBooking: false
  };
}

export function extractClientQuestion(text: string): string | undefined {
  const normalized = text.trim();
  if (!normalized) {
    return undefined;
  }

  const lower = normalized.toLowerCase();
  if (
    normalized.includes("?") ||
    lower.startsWith("what ") ||
    lower.startsWith("can ") ||
    lower.startsWith("could ") ||
    lower.startsWith("should ") ||
    lower.startsWith("do ") ||
    lower.startsWith("does ")
  ) {
    return trimToLength(normalized, 280);
  }

  return undefined;
}
