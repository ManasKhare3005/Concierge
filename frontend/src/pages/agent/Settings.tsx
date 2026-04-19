import { Navigate } from "react-router-dom";

import { AgentShell } from "@/components/agent/AgentShell";
import { SystemStatusCard } from "@/components/agent/SystemStatusCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentAuthStore } from "@/store/agentAuthStore";

export function AgentSettingsPage() {
  const token = useAgentAuthStore((state) => state.token);
  const nudgesPaused = useAgentAuthStore((state) => state.nudgesPaused);
  const setNudgesPaused = useAgentAuthStore((state) => state.setNudgesPaused);
  const logout = useAgentAuthStore((state) => state.logout);

  if (!token) {
    return <Navigate to="/agent/login" replace />;
  }

  return (
    <AgentShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="overflow-hidden bg-primary text-white">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <CardTitle className="text-4xl text-white">Settings and trust controls</CardTitle>
              <CardDescription className="max-w-2xl text-base text-teal-50/90">
                Service visibility matters in the demo. This page makes it obvious which integrations are live, configured, or in fallback.
              </CardDescription>
            </div>
            <Button
              className="hover:text-white"
              onClick={logout}
              variant="glass"
            >
              Log Out
            </Button>
          </CardHeader>
        </Card>

        <SystemStatusCard />

        <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white shadow-glass">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Trust posture</p>
              <p className="mt-2 text-3xl font-semibold">{nudgesPaused ? "Manual" : "Live"}</p>
              <p className="mt-1 text-sm text-emerald-100/90">Choose whether high-priority nudges interrupt you in real time or stay quietly visible on the board.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Override control</p>
              <p className="mt-2 text-3xl font-semibold">Agent-first</p>
              <p className="mt-1 text-sm text-emerald-100/90">Document explanations stay editable so no client-facing copy is locked in by automation.</p>
            </div>
            <div className="flex items-center md:justify-end">
              <Button type="button" variant="glass" className="hover:text-white" onClick={() => setNudgesPaused(!nudgesPaused)}>
                {nudgesPaused ? "Resume realtime nudges" : "Pause realtime nudges"}
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Trust controls</CardTitle>
            <CardDescription>Concierge keeps agent override paths visible so automation never feels irreversible.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
            <p>Document summaries can be edited by the agent and the latest human-reviewed version appears in the client portal immediately.</p>
            <p>Question answers show whether Groq is live or whether a fallback handled the request.</p>
            <p>Real-time events are in-memory SSE for the demo, so the triage board moves the moment a client acts.</p>
            <p>You can pause toast-style nudges here without shutting off the underlying realtime data feed.</p>
          </CardContent>
        </Card>
      </div>
    </AgentShell>
  );
}

