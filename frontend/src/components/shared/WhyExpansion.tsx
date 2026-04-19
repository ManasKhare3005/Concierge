import type { AiTransparency } from "@shared";

interface WhyExpansionProps {
  transparency: AiTransparency;
}

export function WhyExpansion({ transparency }: WhyExpansionProps) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      <summary className="cursor-pointer list-none font-medium text-slate-900">Why am I seeing this?</summary>
      <p className="mt-3">{transparency.note}</p>
      <p className="mt-2 font-mono text-xs text-slate-500">{transparency.sources.join(" | ")}</p>
    </details>
  );
}
