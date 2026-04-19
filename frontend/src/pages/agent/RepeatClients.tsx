import type { AgentRepeatClientCard, AgentRepeatClientTier } from "@shared";
import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, Copy, Home, LogOut, PiggyBank, Sparkles } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { AgentShell } from "@/components/agent/AgentShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRepeatClients } from "@/hooks/useRepeatClients";
import { useAgentAuthStore } from "@/store/agentAuthStore";

function tierTitle(tier: AgentRepeatClientTier): string {
  switch (tier) {
    case "immediate":
      return "Immediate";
    case "soon":
      return "Soon";
    case "nurture":
      return "Nurture";
    default:
      return tier;
  }
}

function tierDescription(tier: AgentRepeatClientTier): string {
  switch (tier) {
    case "immediate":
      return "Clients who are already strong candidates for a high-intent follow-up.";
    case "soon":
      return "Clients worth warming up before they drift into another agent's pipeline.";
    case "nurture":
      return "Longer-cycle homeowners who still deserve a value-building touch cadence.";
    default:
      return "";
  }
}

async function copyFollowUp(card: AgentRepeatClientCard) {
  const text = `Hi ${card.clientName.split(" ")[0]}, I pulled a quick value snapshot on ${card.propertyAddress}. ${card.outcomeLabel}. If you want, I can send a short move-up or equity-planning rundown so you can see what your options look like now.`;
  await navigator.clipboard.writeText(text);
}

function RepeatClientCard({ card }: { card: AgentRepeatClientCard }) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{card.clientName}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">{card.roleLabel}</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            {card.monthsSinceClose} mo since close
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
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-950">{card.outcomeLabel}</p>
          <p className="mt-2 text-sm text-emerald-900/80">
            Estimated current value ${card.estimatedCurrentValue.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-emerald-900/80">
            Follow-up upside ${card.roiPotentialDollars.toLocaleString()}
          </p>
        </div>

        <div className="space-y-2">
          {card.lifeEventSignals.map((signal) => (
            <div key={signal} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {signal}
            </div>
          ))}
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Suggested play</p>
          <p className="mt-3 text-sm leading-6 text-slate-700">{card.recommendedAction}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="accent" onClick={() => void copyFollowUp(card)}>
            <Copy className="mr-2 h-4 w-4" />
            Draft follow-up
          </Button>
          <Button asChild type="button" variant="outline">
            <Link to={`/agent/transactions/${card.transactionId}/documents`}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Open detail
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentRepeatClientsPage() {
  const token = useAgentAuthStore((state) => state.token);
  const logout = useAgentAuthStore((state) => state.logout);
  const repeatClientsQuery = useRepeatClients(token);

  if (!token) {
    return <Navigate to="/agent/login" replace />;
  }

  if (repeatClientsQuery.isLoading) {
    return (
      <AgentShell>
        <Card>
          <CardContent className="p-8 text-sm text-slate-600">Loading repeat-client opportunities...</CardContent>
        </Card>
      </AgentShell>
    );
  }

  if (repeatClientsQuery.isError || !repeatClientsQuery.data) {
    return <Navigate to="/agent/triage" replace />;
  }

  const data = repeatClientsQuery.data;

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <AgentShell>
        <div className="mx-auto max-w-[92rem] space-y-6">
          <Card className="overflow-hidden bg-primary text-white">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Repeat-client ROI
                  </span>
                </div>
                <CardTitle className="text-4xl text-white">Past wins are future pipeline.</CardTitle>
                <CardDescription className="max-w-3xl text-base text-teal-50/90">
                  Closing Day turns closed deals into a ranked follow-up list so equity growth, timing signals, and prior trust become visible revenue instead of forgotten CRM dust.
                </CardDescription>
              </div>
              <Button className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" variant="outline" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </CardHeader>
          </Card>

          <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white shadow-glass">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <PiggyBank className="mt-1 h-5 w-5 text-emerald-100" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Pipeline Value</p>
                  <p className="mt-2 text-3xl font-semibold">${data.roi.estimatedPipelineValue.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-emerald-100/90">Visible upside from closed clients who are realistically worth another conversation.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-1 h-5 w-5 text-emerald-100" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Follow-Up Hours Saved</p>
                  <p className="mt-2 text-3xl font-semibold">{data.roi.annualFollowUpHoursSaved} hrs</p>
                  <p className="mt-1 text-sm text-emerald-100/90">Recovered by ranking outreach instead of manually sorting every closed file.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Home className="mt-1 h-5 w-5 text-emerald-100" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Immediate Plays</p>
                  <p className="mt-2 text-3xl font-semibold">{data.roi.immediateOpportunityCount}</p>
                  <p className="mt-1 text-sm text-emerald-100/90">Clients already positioned for a value-update or move-up conversation.</p>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-6 xl:grid-cols-3">
            {(["immediate", "soon", "nurture"] as AgentRepeatClientTier[]).map((tier) => (
              <div key={tier} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">{tierTitle(tier)}</CardTitle>
                    <CardDescription>{tierDescription(tier)}</CardDescription>
                  </CardHeader>
                </Card>

                {data.grouped[tier].length > 0 ? (
                  data.grouped[tier].map((card) => <RepeatClientCard key={`${tier}-${card.clientAccountId}`} card={card} />)
                ) : (
                  <Card className="border-dashed border-slate-300 bg-slate-50">
                    <CardContent className="p-6 text-sm leading-7 text-slate-600">
                      No clients in this tier right now. Closing Day will populate it as more closed deals and timing signals accumulate.
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </section>
        </div>
      </AgentShell>
    </motion.main>
  );
}
