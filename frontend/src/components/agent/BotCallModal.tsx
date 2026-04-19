import { useEffect, useMemo, useState } from "react";
import type { AgentTriageCard, BotTone } from "@shared";
import { CalendarClock, PhoneCall, Sparkles, TimerReset } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface BotCallModalProps {
  open: boolean;
  card: AgentTriageCard | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (payload: {
    transactionId: string;
    clientAccountId: string;
    concerns: string[];
    tone: BotTone;
    proposedSlots: string[];
  }) => Promise<void>;
}

function buildDefaultSlots(): string[] {
  const baseDate = new Date();
  return [1, 2, 3].map((offset, index) => {
    const slot = new Date(baseDate);
    slot.setDate(slot.getDate() + offset);
    slot.setHours(index === 0 ? 10 : index === 1 ? 13 : 16, 0, 0, 0);
    return slot.toISOString();
  });
}

function formatSlot(slot: string): string {
  return new Date(slot).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function BotCallModal({
  open,
  card,
  loading,
  onOpenChange,
  onStart
}: BotCallModalProps) {
  const [tone, setTone] = useState<BotTone>("warm");
  const concerns = useMemo(
    () => (card?.pendingBotConcerns && card.pendingBotConcerns.length > 0 ? card.pendingBotConcerns : card?.topConcerns ?? []),
    [card]
  );
  const proposedSlots = useMemo(
    () =>
      card?.pendingBotProposedSlots && card.pendingBotProposedSlots.length === 3
        ? card.pendingBotProposedSlots
        : buildDefaultSlots(),
    [card]
  );

  useEffect(() => {
    if (!card) {
      return;
    }

    setTone(card.pendingBotTone ?? "warm");
  }, [card]);

  if (!card) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,44rem)]">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
              <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
              Voice bot ready
            </Badge>
            {card.pendingBotSessionId ? (
              <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                <TimerReset className="mr-1.5 h-3.5 w-3.5" />
                Pending session detected
              </Badge>
            ) : null}
          </div>
          <DialogTitle>Start a focused call for {card.clientFirstName}</DialogTitle>
          <DialogDescription>
            Closing Day will open with the client’s biggest concerns, narrow the decision, and tee up a meeting slot
            so you step into the real call already briefed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{card.propertyAddress}</p>
            <p className="mt-1 text-sm text-slate-600">
              {card.stageLabel} for {card.clientName}
            </p>
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">Top Concerns</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {concerns.map((concern) => (
                <span
                  key={concern}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700"
                >
                  {concern}
                </span>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">Proposed Slots</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {proposedSlots.map((slot) => (
                <div key={slot} className="rounded-[20px] border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  {formatSlot(slot)}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">Tone</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                {
                  value: "warm" as const,
                  label: "Warm",
                  description: "Best for anxious or overloaded clients."
                },
                {
                  value: "brief" as const,
                  label: "Brief",
                  description: "Fast, efficient, and to the point."
                },
                {
                  value: "detailed" as const,
                  label: "Detailed",
                  description: "Spends more time framing the decision."
                }
              ].map((option) => (
                <button
                  key={option.value}
                  className={`rounded-[20px] border p-4 text-left transition ${
                    tone === option.value
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  type="button"
                  onClick={() => setTone(option.value)}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className={`mt-2 text-sm leading-6 ${tone === option.value ? "text-white/85" : "text-slate-500"}`}>
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="accent"
              disabled={loading}
              onClick={() =>
                onStart({
                  transactionId: card.transactionId,
                  clientAccountId: card.clientAccountId,
                  concerns,
                  tone,
                  proposedSlots
                })
              }
            >
              {loading ? "Starting..." : "Start Bot Call"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
