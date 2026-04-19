import { Navigate } from "react-router-dom";

import { AgentShell } from "@/components/agent/AgentShell";
import { SystemStatusCard } from "@/components/agent/SystemStatusCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentAuthStore } from "@/store/agentAuthStore";

export function AgentSettingsPage() {
  const token = useAgentAuthStore((state) => state.token);
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
              className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              onClick={logout}
              variant="outline"
            >
              Log Out
            </Button>
          </CardHeader>
        </Card>

        <SystemStatusCard />

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Trust controls</CardTitle>
            <CardDescription>Closing Day keeps agent override paths visible so automation never feels irreversible.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
            <p>Document summaries can be edited by the agent and the latest human-reviewed version appears in the client portal immediately.</p>
            <p>Question answers show whether Groq is live or whether a fallback handled the request.</p>
            <p>Real-time events are in-memory SSE for the demo, so the triage board moves the moment a client acts.</p>
          </CardContent>
        </Card>
      </div>
    </AgentShell>
  );
}
