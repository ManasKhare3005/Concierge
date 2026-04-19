import type { AiTransparency } from "@shared";

export function buildFallbackTransparency(sources: string[], note: string): AiTransparency {
  return {
    sources,
    note: `Fallback response: ${note}`
  };
}

export function keywordSummary(text: string): string {
  const normalized = text.toLowerCase();

  if (normalized.includes("inspection")) {
    return "This document covers the property's condition and inspection findings.";
  }

  if (normalized.includes("hoa")) {
    return "This document explains HOA fees, rules, and community requirements.";
  }

  if (normalized.includes("earnest") || normalized.includes("purchase")) {
    return "This document outlines the contract terms, money deadlines, and contingencies.";
  }

  return "This document contains transaction details that will be summarized more fully in Phase 3.";
}
