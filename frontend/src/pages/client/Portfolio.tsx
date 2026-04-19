import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FolderOpen, Globe2, LogOut, ShieldCheck } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { ClientShell } from "@/components/client/ClientShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientEventStream } from "@/hooks/useClientEventStream";
import { api } from "@/lib/api";
import { useClientAuthStore } from "@/store/clientAuthStore";

interface ClientMeResponse {
  via: "password" | "magic_link";
  saveProgressSuggested: boolean;
  client: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    preferredLanguage: string;
    hasPassword: boolean;
  };
}

interface PortfolioResponse {
  transactions: Array<{
    id: string;
    role: string;
    propertyAddress: string;
    propertyCity: string;
    propertyState: string;
    propertyZip: string;
    propertyPrice?: number;
    stage: string;
    stageLabel: string;
    expectedCloseAt?: string;
    closedAt?: string;
    relationshipRole: string;
    documentCount: number;
    readinessBucket?: string;
  }>;
}

export function ClientPortfolioPage() {
  const token = useClientAuthStore((state) => state.token);
  const logout = useClientAuthStore((state) => state.logout);
  useClientEventStream(token);

  const clientQuery = useQuery({
    queryKey: ["client", "me", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await api.get<ClientMeResponse>("/api/auth/client/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    }
  });

  const portfolioQuery = useQuery({
    queryKey: ["client", "portfolio", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await api.get<PortfolioResponse>("/api/client/portfolio", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    }
  });

  useEffect(() => {
    if (clientQuery.isError || portfolioQuery.isError) {
      logout();
    }
  }, [clientQuery.isError, portfolioQuery.isError, logout]);

  if (!token) {
    return <Navigate to="/client/login" replace />;
  }

  if (clientQuery.isLoading || portfolioQuery.isLoading) {
    return (
      <ClientShell>
        <div className="mx-auto max-w-5xl">
          <Card>
            <CardContent className="p-8 text-sm text-slate-600">Loading the seeded client portfolio...</CardContent>
          </Card>
        </div>
      </ClientShell>
    );
  }

  if (clientQuery.isError || portfolioQuery.isError || !clientQuery.data || !portfolioQuery.data) {
    return <Navigate to="/client/login" replace />;
  }

  const { client, via, saveProgressSuggested } = clientQuery.data;
  const { transactions } = portfolioQuery.data;

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <ClientShell>
        <div className="mx-auto max-w-6xl space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <Badge className="w-fit border-teal-200 bg-teal-50 text-teal-800">Phase 4 Q&A live</Badge>
                <CardTitle className="text-4xl">Welcome, {client.firstName}.</CardTitle>
                <CardDescription className="max-w-2xl text-base">
                  Your seeded Closing Day portfolio is ready with live document previews and plain-English AI summaries.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Access Mode</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {via === "magic_link" ? "Magic link" : "Email + password"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Language</p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Globe2 className="h-4 w-4 text-primary" />
                  {client.preferredLanguage === "es" ? "Spanish" : "English"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Saved Progress</p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {client.hasPassword ? "Password set" : "Magic-link only"}
                </p>
              </div>
            </CardContent>
          </Card>

          {saveProgressSuggested ? (
            <Card className="border border-amber-200 bg-amber-50/90">
              <CardContent className="p-5 text-sm text-amber-900">
                You came in through a magic link. Closing Day already supports saving a password through
                `POST /api/auth/client/set-password`, and the polished prompt will land later in the flow.
              </CardContent>
            </Card>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {transactions.map((transaction) => (
              <Card key={transaction.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge>{transaction.stageLabel}</Badge>
                    {transaction.readinessBucket ? <Badge>{transaction.readinessBucket}</Badge> : null}
                  </div>
                  <CardTitle className="text-2xl">{transaction.propertyAddress}</CardTitle>
                  <CardDescription>
                    {transaction.propertyCity}, {transaction.propertyState} {transaction.propertyZip}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-4">
                    <span>{transaction.relationshipRole.replaceAll("_", " ")}</span>
                    <span className="font-mono text-xs text-slate-500">{transaction.role}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    {transaction.documentCount} seeded document{transaction.documentCount === 1 ? "" : "s"}
                  </div>
                  {transaction.propertyPrice ? (
                    <p className="text-sm text-slate-700">
                      Price: <span className="font-semibold text-slate-900">${transaction.propertyPrice.toLocaleString()}</span>
                    </p>
                  ) : null}
                  {transaction.expectedCloseAt ? (
                    <p>
                      Expected close:{" "}
                      <span className="font-medium text-slate-900">
                        {new Date(transaction.expectedCloseAt).toLocaleDateString()}
                      </span>
                    </p>
                  ) : null}
                  {transaction.closedAt ? (
                    <p>
                      Closed on{" "}
                      <span className="font-medium text-slate-900">
                        {new Date(transaction.closedAt).toLocaleDateString()}
                      </span>
                    </p>
                  ) : null}
                  <Button asChild className="w-full" variant="outline">
                    <Link to={`/client/transactions/${transaction.id}/documents`}>Open documents</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>

          <Button asChild variant="outline">
            <Link to="/">Back to system status</Link>
          </Button>
        </div>
      </ClientShell>
    </motion.main>
  );
}
