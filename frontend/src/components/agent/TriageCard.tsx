import type { AgentTriageCard } from "@shared";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  MessageSquareText,
  ExternalLink,
  Globe2,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TriageCardProps {
  card: AgentTriageCard;
  highlighted: boolean;
  onCallWithBot: (card: AgentTriageCard) => void;
  onDraftText: (card: AgentTriageCard) => void;
}

function trendIcon(trend: AgentTriageCard["sentimentTrend"]) {
  if (trend === "up") {
    return <ArrowUpRight className="h-4 w-4" />;
  }
  if (trend === "down") {
    return <ArrowDownRight className="h-4 w-4" />;
  }
  return <ArrowRight className="h-4 w-4" />;
}

function sentimentTone(label?: AgentTriageCard["sentimentLabel"]): string {
  switch (label) {
    case "anxious":
    case "frustrated":
    case "overwhelmed":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "confused":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "excited":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

function interestTone(signal: AgentTriageCard["propertyInterestSignal"]): string {
  if (signal === "cooling") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (signal === "evaluating") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function TriageCard({ card, highlighted, onCallWithBot, onDraftText }: TriageCardProps) {
  return (
    <Card className={cn(highlighted && "highlight-flash")}>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{card.clientName}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">{card.roleLabel}</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            {card.stageLabel}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-900">{card.propertyAddress}</p>
          <p className="mt-1 text-sm text-slate-500">
            {card.propertyCity}, {card.propertyState} {card.propertyZip}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {card.sentimentLabel ? (
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium", sentimentTone(card.sentimentLabel))}>
              {trendIcon(card.sentimentTrend)}
              {card.sentimentLabel}
            </span>
          ) : null}

          <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium", interestTone(card.propertyInterestSignal))}>
            {card.propertyInterestSignal}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
            <Globe2 className="h-3.5 w-3.5" />
            {card.preferredLanguage === "es" ? "Spanish" : "English"}
          </span>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Latest Question</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {card.latestQuestionExcerpt ?? "No recent question yet. Closing Day is watching for the next client signal."}
          </p>
          {card.latestQuestionSeverity ? (
            <p className="mt-2 text-xs font-medium text-slate-500">Severity {card.latestQuestionSeverity}</p>
          ) : null}
        </div>

        <details className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <summary className="cursor-pointer list-none font-medium text-slate-900">Why this bucket</summary>
          <p className="mt-3 leading-6">{card.reasoning}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {card.topConcerns.map((concern) => (
              <span key={concern} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                {concern}
              </span>
            ))}
          </div>
          <p className="mt-3 leading-6 text-slate-700">{card.recommendedAgentAction}</p>
        </details>

        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 text-emerald-700" />
            <p className="text-sm font-medium text-emerald-900">{card.roiLabel}</p>
          </div>
          <p className="mt-2 text-sm text-emerald-800">Estimated value protected: ${card.roiDollarsProtected.toLocaleString()}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button onClick={() => onCallWithBot(card)} type="button" variant="accent">
            <Bot className="mr-2 h-4 w-4" />
            Call with bot
          </Button>
          <Button onClick={() => onDraftText(card)} type="button" variant="outline">
            <MessageSquareText className="mr-2 h-4 w-4" />
            Draft text
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link to={`/agent/transactions/${card.transactionId}/documents`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open detail
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
