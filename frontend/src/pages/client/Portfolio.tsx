import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FolderOpen, Globe2, LogOut, ShieldCheck } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { ClientShell } from "@/components/client/ClientShell";
import { LanguageToggle } from "@/components/client/LanguageToggle";
import { SaveProgressPrompt } from "@/components/client/SaveProgressPrompt";
import { TrustBanner } from "@/components/client/TrustBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientEventStream } from "@/hooks/useClientEventStream";
import { useClientProfile } from "@/hooks/useClientProfile";
import { api } from "@/lib/api";
import {
  getClientCopy,
  getDateLocale,
  normalizeLanguage,
  translateReadinessBucket,
  translateRelationshipRole,
  translateStageLabel,
  type SupportedLanguage
} from "@/lib/i18n";
import { useClientAuthStore } from "@/store/clientAuthStore";

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
  const preferredLanguage = useClientAuthStore((state) => state.preferredLanguage);
  const setPreferredLanguage = useClientAuthStore((state) => state.setPreferredLanguage);
  const aiAssistPaused = useClientAuthStore((state) => state.aiAssistPaused);
  const setAiAssistPaused = useClientAuthStore((state) => state.setAiAssistPaused);
  const logout = useClientAuthStore((state) => state.logout);
  useClientEventStream(token);

  const clientQuery = useClientProfile(token);

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

  useEffect(() => {
    if (!clientQuery.data || preferredLanguage) {
      return;
    }

    setPreferredLanguage(normalizeLanguage(clientQuery.data.client.preferredLanguage));
  }, [clientQuery.data, preferredLanguage, setPreferredLanguage]);

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
  const language: SupportedLanguage = preferredLanguage ?? normalizeLanguage(client.preferredLanguage);
  const copy = getClientCopy(language);
  const dateLocale = getDateLocale(language);
  const portfolioRibbon = language === "es"
    ? {
        timeSaved: "Tiempo ahorrado",
        timeBody: "Recuperado al tener documentos, respuestas y pasos siguientes en un solo lugar.",
        clarity: "Claridad ganada",
        clarityBody: "Documentos ya organizados para revisar mas facil y reducir mensajes innecesarios.",
        trust: "Control de IA",
        trustBody: "Tu decides cuando aparece la ayuda de IA y cada respuesta sigue explicando por que se genero.",
        transactionsBody:
          "Closing Day mantiene estas transacciones sincronizadas para que puedas cambiar de documento sin perder contexto."
      }
    : {
        timeSaved: "Time Saved",
        timeBody: "Recovered by having your documents, answers, and next steps in one place.",
        clarity: "Clarity Gained",
        clarityBody: "Documents already organized for easier review and fewer back-and-forth messages.",
        trust: "Trust Signal",
        trustBody: "You control when AI help appears, and every answer still shows why it was generated.",
        transactionsBody:
          "Closing Day keeps these transactions synced so you can move between documents without losing context."
      };

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <ClientShell>
        <div className="mx-auto max-w-6xl space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <Badge className="w-fit border-teal-200 bg-teal-50 text-teal-800">{copy.portfolioPhaseBadge}</Badge>
                <CardTitle className="text-4xl">{copy.welcome}, {client.firstName}.</CardTitle>
                <CardDescription className="max-w-2xl text-base">
                  {copy.portfolioDescription}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.accessModeLabel}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {via === "magic_link" ? copy.accessMagicLink : copy.accessPassword}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.languageLabel}</p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Globe2 className="h-4 w-4 text-primary" />
                  {language === "es" ? "Espanol" : "English"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.savedProgressLabel}</p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {client.hasPassword ? copy.passwordSet : copy.magicLinkOnly}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <TrustBanner
              language={language}
              isPaused={aiAssistPaused}
              onTogglePause={() => setAiAssistPaused(!aiAssistPaused)}
            />
            <LanguageToggle
              language={language}
              label={copy.languageToggleLabel}
              onChange={setPreferredLanguage}
            />
          </div>

          {saveProgressSuggested ? <SaveProgressPrompt token={token} language={language} /> : null}

          <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white shadow-glass">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">{portfolioRibbon.timeSaved}</p>
                <p className="mt-2 text-3xl font-semibold">{transactions.length * 12} min</p>
                <p className="mt-1 text-sm text-emerald-100/90">{portfolioRibbon.timeBody}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">{portfolioRibbon.clarity}</p>
                <p className="mt-2 text-3xl font-semibold">
                  {transactions.reduce((sum: number, transaction) => sum + transaction.documentCount, 0)}
                </p>
                <p className="mt-1 text-sm text-emerald-100/90">{portfolioRibbon.clarityBody}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">{portfolioRibbon.trust}</p>
                <p className="mt-2 text-3xl font-semibold">{aiAssistPaused ? "Paused" : "Active"}</p>
                <p className="mt-1 text-sm text-emerald-100/90">{portfolioRibbon.trustBody}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">{copy.transactionsHeading}</p>
            <p className="text-sm text-slate-500">{portfolioRibbon.transactionsBody}</p>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {transactions.map((transaction: PortfolioResponse["transactions"][number]) => (
              <Card key={transaction.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge>{translateStageLabel(language, transaction.stage, transaction.stageLabel)}</Badge>
                    {transaction.readinessBucket ? <Badge>{translateReadinessBucket(language, transaction.readinessBucket)}</Badge> : null}
                  </div>
                  <CardTitle className="text-2xl">{transaction.propertyAddress}</CardTitle>
                  <CardDescription>
                    {transaction.propertyCity}, {transaction.propertyState} {transaction.propertyZip}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-4">
                    <span>{translateRelationshipRole(language, transaction.relationshipRole)}</span>
                    <span className="font-mono text-xs text-slate-500">{transaction.role}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    {transaction.documentCount} {copy.documentCountLabel}
                  </div>
                  {transaction.propertyPrice ? (
                    <p className="text-sm text-slate-700">
                      {copy.priceLabel}: <span className="font-semibold text-slate-900">${transaction.propertyPrice.toLocaleString()}</span>
                    </p>
                  ) : null}
                  {transaction.expectedCloseAt ? (
                    <p>
                      {copy.expectedCloseLabel}:{" "}
                      <span className="font-medium text-slate-900">
                        {new Date(transaction.expectedCloseAt).toLocaleDateString(dateLocale)}
                      </span>
                    </p>
                  ) : null}
                  {transaction.closedAt ? (
                    <p>
                      {copy.closedOnLabel}{" "}
                      <span className="font-medium text-slate-900">
                        {new Date(transaction.closedAt).toLocaleDateString(dateLocale)}
                      </span>
                    </p>
                  ) : null}
                  <Button asChild className="w-full" variant="outline">
                    <Link to={`/client/transactions/${transaction.id}/documents`}>{copy.openDocuments}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>

          <Button asChild variant="outline">
            <Link to="/">{copy.backToStatus}</Link>
          </Button>
        </div>
      </ClientShell>
    </motion.main>
  );
}
