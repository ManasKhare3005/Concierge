import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BellRing, BriefcaseBusiness, FileStack, LogOut, RadioTower, Users } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { AgentShell } from "@/components/agent/AgentShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentTransactions } from "@/hooks/useAgentTransactionDocuments";
import { api } from "@/lib/api";
import { useAgentAuthStore } from "@/store/agentAuthStore";

interface AgentNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
}

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
  notifications: AgentNotification[];
}

export function AgentTriagePage() {
  const token = useAgentAuthStore((state) => state.token);
  const logout = useAgentAuthStore((state) => state.logout);
  const transactionsQuery = useAgentTransactions(token);

  const agentQuery = useQuery({
    queryKey: ["agent", "me", token],
    enabled: Boolean(token),
    retry: false,
    refetchInterval: token ? 2000 : false,
    refetchIntervalInBackground: true,
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

  if (!token) {
    return <Navigate to="/agent/login" replace />;
  }

  if (agentQuery.isLoading || transactionsQuery.isLoading) {
    return (
      <AgentShell>
        <div className="mx-auto max-w-5xl">
          <Card>
            <CardContent className="p-8 text-sm text-slate-600">Loading the seeded agent workspace...</CardContent>
          </Card>
        </div>
      </AgentShell>
    );
  }

  if (agentQuery.isError || transactionsQuery.isError || !agentQuery.data) {
    return <Navigate to="/agent/login" replace />;
  }

  const { agent, counts, notifications } = agentQuery.data;
  const transactions = transactionsQuery.data?.transactions ?? [];

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <AgentShell>
        <div className="mx-auto max-w-6xl space-y-6">
          <Card className="overflow-hidden bg-primary text-white">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <Badge className="w-fit border-white/20 bg-white/10 text-white">Phase 4 client signals live</Badge>
                <CardTitle className="text-4xl text-white">
                  Welcome back, {agent.firstName}. Your document workspace is ready.
                </CardTitle>
                <CardDescription className="max-w-2xl text-base text-teal-50/90">
                  Logged in as {agent.email} for {agent.brokerage ?? "Closing Day demo brokerage"}.
                </CardDescription>
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

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: BriefcaseBusiness,
                title: "Active Transactions",
                value: counts.activeTransactions,
                body: "Seeded transactions currently in motion for the document-pipeline demo."
              },
              {
                icon: Users,
                title: "Active Clients",
                value: counts.activeClients,
                body: "Clients tied to those live transactions, including co-buyers."
              },
              {
                icon: RadioTower,
                title: "Pending Bot Calls",
                value: counts.pendingBotCalls,
                body: "Sarah already has a pending bot session ready for later phases."
              }
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <item.icon className="h-5 w-5 text-primary" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-4xl font-semibold text-ink">{item.value}</p>
                  <p className="text-sm leading-6 text-slate-600">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <BellRing className="h-5 w-5 text-primary" />
                  Seeded Activity Feed
                </CardTitle>
                <CardDescription>
                  These notifications come from the seeded questions, document activity, and Sarah&apos;s high-attention state.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                    <p className="mt-2 text-xs font-mono text-slate-500">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Document Workspaces</CardTitle>
                <CardDescription>
                  Each active transaction now has a dedicated document workspace for upload, preview, and override.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{transaction.propertyAddress}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {transaction.stageLabel} | {transaction.documentCount} document{transaction.documentCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Button asChild variant="outline">
                        <Link to={`/agent/transactions/${transaction.id}/documents`}>
                          <FileStack className="mr-2 h-4 w-4" />
                          Manage
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Button asChild variant="outline">
            <Link to="/">Back to system status</Link>
          </Button>
        </div>
      </AgentShell>
    </motion.main>
  );
}
