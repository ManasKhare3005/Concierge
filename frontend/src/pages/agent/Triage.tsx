import { useEffect, useMemo, useState } from "react";
import type { AgentActivityItem, AgentTriageCard, RealtimeEventPayloadMap } from "@shared";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BellRing, LogOut, RadioTower } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

import { ActivityFeed } from "@/components/agent/ActivityFeed";
import { AgentShell } from "@/components/agent/AgentShell";
import { BotCallModal } from "@/components/agent/BotCallModal";
import { RoiRibbon } from "@/components/agent/RoiRibbon";
import { TriageBoard } from "@/components/agent/TriageBoard";
import { Toast } from "@/components/shared/Toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentEventStream } from "@/hooks/useAgentEventStream";
import { useInitiateBotCall } from "@/hooks/useBotCall";
import { useTriage } from "@/hooks/useTriage";
import { api } from "@/lib/api";
import { useAgentAuthStore } from "@/store/agentAuthStore";

interface AgentMeResponse {
  agent: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    brokerage?: string;
    loftyApiKeyConfigured: boolean;
  };
  counts: {
    activeTransactions: number;
    activeClients: number;
    pendingBotCalls: number;
  };
}

function dedupeActivity(items: AgentActivityItem[]): AgentActivityItem[] {
  const seen = new Set<string>();
  const deduped: AgentActivityItem[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    deduped.push(item);
    if (deduped.length === 20) {
      break;
    }
  }

  return deduped;
}

export function AgentTriagePage() {
  const navigate = useNavigate();
  const token = useAgentAuthStore((state) => state.token);
  const nudgesPaused = useAgentAuthStore((state) => state.nudgesPaused);
  const logout = useAgentAuthStore((state) => state.logout);
  const triageQuery = useTriage(token);
  const agentEvents = useAgentEventStream(token);
  const initiateBotCall = useInitiateBotCall(token);
  const [highlightedClientIds, setHighlightedClientIds] = useState<string[]>([]);
  const [selectedBotCard, setSelectedBotCard] = useState<AgentTriageCard | null>(null);
  const [toastState, setToastState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    variant: "info" | "success" | "error";
  }>({
    open: false,
    title: "",
    variant: "info"
  });

  const agentQuery = useQuery({
    queryKey: ["agent", "me", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await api.get<AgentMeResponse>("/api/auth/agent/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    }
  });

  useEffect(() => {
    if (agentQuery.isError) {
      logout();
    }
  }, [agentQuery.isError, logout]);

  const allCards = useMemo(() => {
    if (!triageQuery.data) {
      return [];
    }

    return [
      ...triageQuery.data.grouped.needs_full_attention,
      ...triageQuery.data.grouped.needs_light_touch,
      ...triageQuery.data.grouped.clear,
      ...triageQuery.data.grouped.booked
    ];
  }, [triageQuery.data]);

  useEffect(() => {
    const nextEvent = agentEvents.latestEvent;
    if (!nextEvent || !("clientAccountId" in nextEvent.payload)) {
      return;
    }

    const clientAccountId = nextEvent.payload.clientAccountId;
    setHighlightedClientIds((current) => Array.from(new Set([clientAccountId, ...current])));

    const timeout = window.setTimeout(() => {
      setHighlightedClientIds((current) => current.filter((id) => id !== clientAccountId));
    }, 1_500);

    const clientCard = allCards.find((card) => card.clientAccountId === clientAccountId);
    if (!nudgesPaused && nextEvent.type === "client:question") {
      const payload = nextEvent.payload as RealtimeEventPayloadMap["client:question"];
      const severity = Number(payload.classification.split(":")[1] ?? "2");
      if (severity >= 4 || payload.newReadiness?.bucket === "needs_full_attention") {
        setToastState({
          open: true,
          title: `${clientCard?.clientFirstName ?? "Client"} needs attention`,
          description: payload.question,
          variant: "error"
        });
      }
    }

    if (
      !nudgesPaused &&
      nextEvent.type === "client:sentiment" &&
      (() => {
        const payload = nextEvent.payload as RealtimeEventPayloadMap["client:sentiment"];
        return (
          payload.sentiment.agentAlertNeeded ||
          ["anxious", "frustrated", "overwhelmed"].includes(payload.sentiment.sentiment)
        );
      })()
    ) {
      const payload = nextEvent.payload as RealtimeEventPayloadMap["client:sentiment"];
      setToastState({
        open: true,
        title: `${clientCard?.clientFirstName ?? "Client"} sentiment changed`,
        description: payload.sentiment.alertReason,
        variant: "error"
      });
    }

    if (!nudgesPaused && nextEvent.type === "bot:booked") {
      const payload = nextEvent.payload as RealtimeEventPayloadMap["bot:booked"];
      setToastState({
        open: true,
        title: `${clientCard?.clientFirstName ?? "Client"} booked`,
        description: `Voice bot confirmed ${new Date(payload.bookedSlot).toLocaleString()}.`,
        variant: "success"
      });
    }

    return () => {
      window.clearTimeout(timeout);
    };
  }, [agentEvents.latestEvent, allCards, nudgesPaused]);

  if (!token) {
    return <Navigate to="/agent/login" replace />;
  }

  if (agentQuery.isLoading || triageQuery.isLoading) {
    return (
      <AgentShell>
        <div className="mx-auto max-w-5xl">
          <Card>
            <CardContent className="p-8 text-sm text-slate-600">Loading the live triage board...</CardContent>
          </Card>
        </div>
      </AgentShell>
    );
  }

  if (agentQuery.isError || triageQuery.isError || !agentQuery.data || !triageQuery.data) {
    return <Navigate to="/agent/login" replace />;
  }

  const { agent, counts } = agentQuery.data;
  const combinedActivity = dedupeActivity([
    ...agentEvents.activityItems,
    ...triageQuery.data.recentActivity
  ]);

  async function handleDraftText(card: AgentTriageCard) {
    try {
      await navigator.clipboard.writeText(card.draftText);
      setToastState({
        open: true,
        title: `Draft copied for ${card.clientFirstName}`,
        description: "The suggested follow-up text is now on your clipboard.",
        variant: "success"
      });
    } catch {
      setToastState({
        open: true,
        title: "Could not copy the draft",
        description: card.draftText,
        variant: "info"
      });
    }
  }

  async function handleCallWithBotStart(payload: {
    transactionId: string;
    clientAccountId: string;
    concerns: string[];
    tone: "warm" | "brief" | "detailed";
    proposedSlots: string[];
  }) {
    try {
      const session = await initiateBotCall.mutateAsync(payload);
      setSelectedBotCard(null);
      navigate(`/agent/voice-bot/${session.id}`);
    } catch (error) {
      setToastState({
        open: true,
        title: "Could not start the bot call",
        description: error instanceof Error ? error.message : "The simulated call session did not start.",
        variant: "error"
      });
    }
  }

  function handleCallWithBot(card: AgentTriageCard) {
    setSelectedBotCard(card);
  }

  return (
    <>
      <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <AgentShell>
          <div className="mx-auto max-w-[92rem] space-y-6">
            <Card className="overflow-hidden bg-primary text-white">
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="w-fit border-white/20 bg-white/10 text-white">Phase 5 realtime triage live</Badge>
                    <Badge className="w-fit border-white/20 bg-white/10 text-white">
                      <RadioTower className="mr-1.5 h-3.5 w-3.5" />
                      {agentEvents.connectionState === "open"
                        ? "Realtime connected"
                        : agentEvents.connectionState === "reconnecting"
                          ? "Realtime reconnecting"
                          : "Realtime starting"}
                    </Badge>
                  </div>
                  <CardTitle className="text-4xl text-white">
                    {agent.firstName}, this is the pile that actually needs your time.
                  </CardTitle>
                  <CardDescription className="max-w-3xl text-base text-teal-50/90">
                    Live client questions and emotional signals now move the board as they happen, so you can protect deals without spending your day digging through every file.
                  </CardDescription>
                  {nudgesPaused ? (
                    <p className="text-sm text-teal-50/90">
                      Realtime nudges are paused in Settings. The board still updates, but high-priority toasts stay quiet until you resume them.
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </CardHeader>
            </Card>

            <RoiRibbon roi={triageQuery.data.roi} />

            <section className="grid gap-4 md:grid-cols-4">
              {[
                {
                  label: "Active Clients",
                  value: triageQuery.data.summary.activeClients,
                  body: "Clients currently being triaged in this deployment."
                },
                {
                  label: "Needs Attention",
                  value: triageQuery.data.summary.needsFullAttention,
                  body: "People whose latest signals justify direct agent time."
                },
                {
                  label: "Low-Touch Safe",
                  value: triageQuery.data.summary.clear + triageQuery.data.summary.needsLightTouch,
                  body: "Clients Closing Day can keep moving with lighter intervention."
                },
                {
                  label: "Pending Bot Calls",
                  value: counts.pendingBotCalls,
                  body: "Queued bot-assisted conversations waiting to be started."
                }
              ].map((item) => (
                <Card key={item.label}>
                  <CardHeader>
                    <CardTitle className="text-lg">{item.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-4xl font-semibold text-ink">{item.value}</p>
                    <p className="text-sm leading-6 text-slate-600">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <TriageBoard
              grouped={triageQuery.data.grouped}
              highlightedClientIds={highlightedClientIds}
              onCallWithBot={handleCallWithBot}
              onDraftText={handleDraftText}
            />

            <ActivityFeed
              items={combinedActivity}
              {...(agentEvents.activityItems[0]?.id ? { latestLiveActivityId: agentEvents.activityItems[0]?.id } : {})}
            />

            <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">Why this matters</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                The goal is not to make every client feel the same. It is to protect the deal by knowing exactly who is calm,
                who needs a nudge, and who is quietly slipping toward a bad decision.
              </p>
            </div>
          </div>
        </AgentShell>
      </motion.main>

      <Toast
        open={toastState.open}
        title={toastState.title}
        variant={toastState.variant}
        {...(toastState.description ? { description: toastState.description } : {})}
        onClose={() => setToastState((current) => ({ ...current, open: false }))}
      />
      <BotCallModal
        open={selectedBotCard !== null}
        card={selectedBotCard}
        loading={initiateBotCall.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBotCard(null);
          }
        }}
        onStart={handleCallWithBotStart}
      />
    </>
  );
}
