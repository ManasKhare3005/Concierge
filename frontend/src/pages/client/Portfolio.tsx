import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarClock,
  FolderOpen,
  Globe2,
  HeartPulse,
  LogOut,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Users
} from "lucide-react";
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
  translateQuestionCategory,
  translateReadinessBucket,
  translateRelationshipRole,
  translateStageLabel,
  type SupportedLanguage
} from "@/lib/i18n";
import { useClientAuthStore } from "@/store/clientAuthStore";

interface PortfolioTransaction {
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
  openedDocumentCount?: number;
  questionCount?: number;
  readinessBucket?: string;
  readinessReasoning?: string;
  topConcerns?: string[];
  agent?: {
    firstName: string;
    lastName: string;
    brokerage?: string;
  };
  participants?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    isYou: boolean;
  }>;
  latestQuestion?: {
    question: string;
    category: string;
    severity: number;
    askedAt: string;
  };
  latestSentiment?: {
    sentiment: string;
    createdAt: string;
    agentAlertNeeded: boolean;
  };
  latestBotCall?: {
    status: string;
    createdAt: string;
    bookedSlot?: string;
  };
}

interface PortfolioResponse {
  transactions: PortfolioTransaction[];
}

const portfolioDetailCopy = {
  en: {
    profileSearch: "Profile & Search",
    docsReviewed: "Docs reviewed",
    docsReviewedBody: "opened in your portal",
    questionsAsked: "Questions asked",
    questionsAskedBody: "tracked in context",
    lastSignal: "Latest signal",
    noSignal: "No recent check-in",
    transactionSnapshot: "Transaction snapshot",
    currentFocus: "Current focus",
    latestQuestion: "Latest question",
    noQuestionsYet: "No question asked yet on this transaction.",
    sharedParticipants: "Shared participants",
    supportedBy: "Supported by",
    you: "You",
    severity: "Severity",
    asked: "Asked",
    updated: "Updated",
    expectedClose: "Expected close",
    closedOn: "Closed on",
    botCallQueued: "AI call queued",
    botCallInProgress: "AI call in progress",
    botCallBooked: "Call booked",
    botCallFailed: "Call unavailable",
    botCallDeclined: "Call declined",
    botCallPendingBody: "Concierge is holding a follow-up call flow for this transaction.",
    botCallBookedBody: "A guided follow-up is already booked and visible to the agent.",
    botCallUpdated: "Updated",
    noTransactions: "No transactions are linked to this portal yet."
  },
  es: {
    profileSearch: "Perfil y busqueda",
    docsReviewed: "Documentos revisados",
    docsReviewedBody: "abiertos en tu portal",
    questionsAsked: "Preguntas hechas",
    questionsAskedBody: "guardadas con contexto",
    lastSignal: "Ultima senal",
    noSignal: "Sin revision reciente",
    transactionSnapshot: "Resumen de la transaccion",
    currentFocus: "En que esta enfocada la transaccion",
    latestQuestion: "Ultima pregunta",
    noQuestionsYet: "Todavia no has hecho preguntas en esta transaccion.",
    sharedParticipants: "Participantes compartidos",
    supportedBy: "Acompanado por",
    you: "Tu",
    severity: "Severidad",
    asked: "Preguntada",
    updated: "Actualizado",
    expectedClose: "Cierre estimado",
    closedOn: "Cerro el",
    botCallQueued: "Llamada IA en cola",
    botCallInProgress: "Llamada IA en progreso",
    botCallBooked: "Llamada agendada",
    botCallFailed: "Llamada no disponible",
    botCallDeclined: "Llamada rechazada",
    botCallPendingBody: "Concierge tiene preparada una llamada de seguimiento para esta transaccion.",
    botCallBookedBody: "Ya existe un seguimiento guiado agendado y visible para el agente.",
    botCallUpdated: "Actualizado",
    noTransactions: "Todavia no hay transacciones vinculadas a este portal."
  }
} as const;

function translateSentiment(language: SupportedLanguage, sentiment?: string): string {
  const labels = {
    calm: { en: "Calm", es: "Calma" },
    curious: { en: "Curious", es: "Curiosidad" },
    excited: { en: "Excited", es: "Emocion" },
    anxious: { en: "Anxious", es: "Ansiedad" },
    confused: { en: "Confused", es: "Confusion" },
    frustrated: { en: "Frustrated", es: "Frustracion" },
    overwhelmed: { en: "Overwhelmed", es: "Abrumado" }
  } as const;

  if (!sentiment) {
    return language === "es" ? "Sin revision reciente" : "No recent check-in";
  }

  const translated = labels[sentiment as keyof typeof labels];
  return translated ? translated[language] : sentiment;
}

function sentimentTone(sentiment?: string, alertNeeded?: boolean): string {
  if (alertNeeded || ["anxious", "frustrated", "overwhelmed"].includes(sentiment ?? "")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (sentiment === "confused") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (sentiment === "excited" || sentiment === "calm") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function translateBotStatus(language: SupportedLanguage, status: string): string {
  const labels = {
    pending: { en: "AI call queued", es: "Llamada IA en cola" },
    in_progress: { en: "AI call in progress", es: "Llamada IA en progreso" },
    booked: { en: "Call booked", es: "Llamada agendada" },
    failed: { en: "Call unavailable", es: "Llamada no disponible" },
    declined: { en: "Call declined", es: "Llamada rechazada" }
  } as const;

  const translated = labels[status as keyof typeof labels];
  return translated ? translated[language] : status.replaceAll("_", " ");
}

function botTone(status: string): string {
  if (status === "booked") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "pending" || status === "in_progress") {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function formatDate(dateValue: string, dateLocale: string): string {
  return new Date(dateValue).toLocaleDateString(dateLocale, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(dateValue: string, dateLocale: string): string {
  return new Date(dateValue).toLocaleString(dateLocale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
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
      const response = await api.get<PortfolioResponse>("/api/client/portfolio?view=enhanced", {
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
  const detailCopy = portfolioDetailCopy[language];
  const dateLocale = getDateLocale(language);
  const portfolioRibbon = language === "es"
    ? {
        timeSaved: "Tiempo ahorrado",
        timeBody: "Recuperado al tener documentos, respuestas y pasos siguientes en un solo lugar.",
        clarity: "Clarity ganada",
        clarityBody: "Ahora tambien ves las senales vivas de la transaccion, no solo la lista de archivos.",
        trust: "Senales en vivo",
        trustBody: "Sentimiento, preguntas y estado de llamada aparecen donde revisas el trato.",
        transactionsBody:
          "Concierge mantiene estas transacciones sincronizadas para que veas el mismo contexto operativo que mueve la vista del agente."
      }
    : {
        timeSaved: "Time Saved",
        timeBody: "Recovered by having your documents, answers, and next steps in one place.",
        clarity: "Clarity Gained",
        clarityBody: "You now see live transaction signals here, not just a list of files.",
        trust: "Live Signals",
        trustBody: "Sentiment, questions, and call status stay visible where you review the deal.",
        transactionsBody:
          "Concierge keeps these transactions synced so you can see the same operating context that moves the agent view."
      };

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <ClientShell>
        <div className="mx-auto max-w-7xl space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <Badge className="w-fit border-teal-200 bg-teal-50 text-teal-800">{copy.portfolioPhaseBadge}</Badge>
                <CardTitle className="text-4xl">{copy.welcome}, {client.firstName}.</CardTitle>
                <CardDescription className="max-w-2xl text-base">
                  {copy.portfolioDescription}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link to="/client/profile">{detailCopy.profileSearch}</Link>
                </Button>
                <Button variant="outline" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
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
                  {transactions.reduce((sum, transaction) => sum + (transaction.questionCount ?? 0), 0)}
                </p>
                <p className="mt-1 text-sm text-emerald-100/90">{portfolioRibbon.clarityBody}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">{portfolioRibbon.trust}</p>
                <p className="mt-2 text-3xl font-semibold">
                  {transactions.filter((transaction) => transaction.latestSentiment || transaction.latestBotCall).length}
                </p>
                <p className="mt-1 text-sm text-emerald-100/90">{portfolioRibbon.trustBody}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">{copy.transactionsHeading}</p>
            <p className="text-sm text-slate-500">{portfolioRibbon.transactionsBody}</p>
          </div>

          <section className="grid gap-4 xl:grid-cols-2">
            {transactions.length === 0 ? (
              <Card className="border-dashed border-slate-300 bg-slate-50">
                <CardContent className="p-6 text-sm text-slate-600">{detailCopy.noTransactions}</CardContent>
              </Card>
            ) : null}

            {transactions.map((transaction) => (
              <Card key={transaction.id}>
                {(() => {
                  const openedDocumentCount = transaction.openedDocumentCount ?? transaction.documentCount;
                  const questionCount = transaction.questionCount ?? 0;
                  const topConcerns = transaction.topConcerns ?? [];
                  const participants = transaction.participants ?? [];
                  const agentName = transaction.agent
                    ? `${transaction.agent.firstName} ${transaction.agent.lastName}`
                    : language === "es"
                      ? "tu agente"
                      : "your agent";
                  const agentBrokerage = transaction.agent?.brokerage;

                  return (
                    <>
                <CardHeader className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{translateStageLabel(language, transaction.stage, transaction.stageLabel)}</Badge>
                    {transaction.readinessBucket ? <Badge>{translateReadinessBucket(language, transaction.readinessBucket)}</Badge> : null}
                    {transaction.latestBotCall ? (
                      <Badge className={botTone(transaction.latestBotCall.status)}>
                        <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
                        {translateBotStatus(language, transaction.latestBotCall.status)}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{transaction.propertyAddress}</CardTitle>
                    <CardDescription>
                      {transaction.propertyCity}, {transaction.propertyState} {transaction.propertyZip}
                    </CardDescription>
                    <p className="text-sm text-slate-600">
                      {detailCopy.supportedBy}{" "}
                      <span className="font-medium text-slate-900">
                        {agentName}
                      </span>
                      {agentBrokerage ? ` | ${agentBrokerage}` : ""}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-sm text-slate-600">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{detailCopy.docsReviewed}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {openedDocumentCount}/{transaction.documentCount}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{detailCopy.docsReviewedBody}</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{detailCopy.questionsAsked}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{questionCount}</p>
                      <p className="mt-1 text-xs text-slate-500">{detailCopy.questionsAskedBody}</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{detailCopy.lastSignal}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {translateSentiment(language, transaction.latestSentiment?.sentiment)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {transaction.latestSentiment
                          ? `${detailCopy.updated} ${formatDateTime(transaction.latestSentiment.createdAt, dateLocale)}`
                          : detailCopy.noSignal}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{detailCopy.transactionSnapshot}</p>
                      <span className="font-mono text-xs text-slate-500">{transaction.role}</span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <FolderOpen className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-slate-900">{translateRelationshipRole(language, transaction.relationshipRole)}</p>
                          <p className="text-xs text-slate-500">
                            {transaction.propertyPrice
                              ? `${copy.priceLabel}: $${transaction.propertyPrice.toLocaleString()}`
                              : translateStageLabel(language, transaction.stage, transaction.stageLabel)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-slate-900">
                            {transaction.expectedCloseAt
                              ? detailCopy.expectedClose
                              : transaction.closedAt
                                ? detailCopy.closedOn
                                : translateStageLabel(language, transaction.stage, transaction.stageLabel)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {transaction.expectedCloseAt
                              ? formatDate(transaction.expectedCloseAt, dateLocale)
                              : transaction.closedAt
                                ? formatDate(transaction.closedAt, dateLocale)
                                : transaction.stageLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {transaction.readinessReasoning || topConcerns.length > 0 ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <HeartPulse className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-slate-900">{detailCopy.currentFocus}</p>
                      </div>
                      {transaction.readinessReasoning ? (
                        <p className="mt-3 leading-6 text-slate-700">{transaction.readinessReasoning}</p>
                      ) : null}
                      {topConcerns.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {topConcerns.map((concern) => (
                            <span key={concern} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              {concern}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-slate-900">{detailCopy.latestQuestion}</p>
                    </div>
                    {transaction.latestQuestion ? (
                      <div className="mt-3 space-y-2">
                        <p className="leading-6 text-slate-700">{transaction.latestQuestion.question}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                            {translateQuestionCategory(language, transaction.latestQuestion.category)}
                          </Badge>
                          <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                            {detailCopy.severity} {transaction.latestQuestion.severity}
                          </Badge>
                          <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                            {detailCopy.asked} {formatDateTime(transaction.latestQuestion.askedAt, dateLocale)}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">{detailCopy.noQuestionsYet}</p>
                    )}
                  </div>

                  {transaction.latestBotCall ? (
                    <div className="rounded-[24px] border border-teal-200 bg-teal-50 p-4">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="h-4 w-4 text-teal-800" />
                        <p className="text-sm font-semibold text-teal-900">
                          {translateBotStatus(language, transaction.latestBotCall.status)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-teal-900/85">
                        {transaction.latestBotCall.status === "booked"
                          ? detailCopy.botCallBookedBody
                          : detailCopy.botCallPendingBody}
                      </p>
                      <p className="mt-2 text-xs text-teal-800/80">
                        {transaction.latestBotCall.bookedSlot
                          ? `${detailCopy.expectedClose}: ${formatDateTime(transaction.latestBotCall.bookedSlot, dateLocale)}`
                          : `${detailCopy.botCallUpdated}: ${formatDateTime(transaction.latestBotCall.createdAt, dateLocale)}`}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-slate-900">{detailCopy.sharedParticipants}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {participants.length > 0 ? participants.map((participant) => (
                        <Badge
                          key={participant.id}
                          className={
                            participant.isYou
                              ? "border-teal-200 bg-teal-50 text-teal-800"
                              : "border-slate-200 bg-white text-slate-700"
                          }
                        >
                          {participant.firstName} {participant.lastName}
                          {" | "}
                          {translateRelationshipRole(language, participant.role)}
                          {participant.isYou ? ` | ${detailCopy.you}` : ""}
                        </Badge>
                      )) : (
                        <p className="text-sm text-slate-500">
                          {language === "es"
                            ? "Los participantes compartidos apareceran aqui cuando se cargue la vista completa."
                            : "Shared participants will appear here once the full transaction view loads."}
                        </p>
                      )}
                    </div>
                  </div>

                  {transaction.latestSentiment ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={sentimentTone(transaction.latestSentiment.sentiment, transaction.latestSentiment.agentAlertNeeded)}>
                        {translateSentiment(language, transaction.latestSentiment.sentiment)}
                      </Badge>
                      {transaction.latestSentiment.agentAlertNeeded ? (
                        <Badge className="border-rose-200 bg-rose-50 text-rose-700">
                          {language === "es" ? "Agente atento" : "Agent watching closely"}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}

                  <Button asChild className="w-full" variant="outline">
                    <Link to={`/client/transactions/${transaction.id}/documents`}>{copy.openDocuments}</Link>
                  </Button>
                </CardContent>
                    </>
                  );
                })()}
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

