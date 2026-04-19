import type { AgentTriageBucketKey, AgentTriageCard as AgentTriageCardType } from "@shared";

import { TriageCard } from "@/components/agent/TriageCard";
import { cn } from "@/lib/utils";

interface TriageBoardProps {
  grouped: Record<AgentTriageBucketKey, AgentTriageCardType[]>;
  highlightedClientIds: string[];
  onCallWithBot: (card: AgentTriageCardType) => void;
  onDraftText: (card: AgentTriageCardType) => void;
}

const columns: Array<{
  key: AgentTriageBucketKey;
  title: string;
  subtitle: string;
  tone: string;
}> = [
  {
    key: "needs_full_attention",
    title: "Needs Attention",
    subtitle: "High-risk conversations that deserve direct time soon.",
    tone: "border-rose-200 bg-rose-50"
  },
  {
    key: "needs_light_touch",
    title: "Light Touch",
    subtitle: "Clients who need reassurance or a short targeted follow-up.",
    tone: "border-amber-200 bg-amber-50"
  },
  {
    key: "clear",
    title: "Clear",
    subtitle: "Safe to manage mostly in self-serve while you focus elsewhere.",
    tone: "border-emerald-200 bg-emerald-50"
  },
  {
    key: "booked",
    title: "Booked",
    subtitle: "Conversations already captured and moved toward the calendar.",
    tone: "border-sky-200 bg-sky-50"
  }
];

export function TriageBoard({ grouped, highlightedClientIds, onCallWithBot, onDraftText }: TriageBoardProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {columns.map((column) => (
        <section key={column.key} className="space-y-4">
          <div className={cn("rounded-[28px] border p-4", column.tone)}>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">{column.title}</p>
            <p className="mt-1 text-sm text-slate-600">{column.subtitle}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{grouped[column.key].length}</p>
          </div>

          <div className="space-y-4">
            {grouped[column.key].length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/80 p-4 text-sm leading-6 text-slate-500">
                No clients in this lane right now.
              </div>
            ) : null}

            {grouped[column.key].map((card) => (
              <TriageCard
                key={`${card.transactionId}:${card.clientAccountId}`}
                card={card}
                highlighted={highlightedClientIds.includes(card.clientAccountId)}
                onCallWithBot={onCallWithBot}
                onDraftText={onDraftText}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
