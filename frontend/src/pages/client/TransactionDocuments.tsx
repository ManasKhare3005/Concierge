import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  FileStack,
  MapPinned,
  MessageSquareMore,
  ShieldCheck
} from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { ClientShell } from "@/components/client/ClientShell";
import { DocumentViewer } from "@/components/client/DocumentViewer";
import { LanguageToggle } from "@/components/client/LanguageToggle";
import { QuestionChat } from "@/components/client/QuestionChat";
import { SaveProgressPrompt } from "@/components/client/SaveProgressPrompt";
import { TrustBanner } from "@/components/client/TrustBanner";
import { VoiceConcierge } from "@/components/client/VoiceConcierge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientEventStream } from "@/hooks/useClientEventStream";
import { useClientDocuments } from "@/hooks/useClientDocuments";
import { useClientProfile } from "@/hooks/useClientProfile";
import {
  getDateLocale,
  getClientCopy,
  normalizeLanguage,
  translateDocumentCategory,
  translateReadinessBucket,
  translateRelationshipRole,
  translateStageLabel,
  type SupportedLanguage
} from "@/lib/i18n";
import { useClientAuthStore } from "@/store/clientAuthStore";

function formatCurrency(value?: number): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatCalendarDate(value: string | undefined, language: SupportedLanguage): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Intl.DateTimeFormat(getDateLocale(language), {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function ClientTransactionDocumentsPage() {
  const { transactionId } = useParams();
  const token = useClientAuthStore((state) => state.token);
  const preferredLanguage = useClientAuthStore((state) => state.preferredLanguage);
  const setPreferredLanguage = useClientAuthStore((state) => state.setPreferredLanguage);
  const aiAssistPaused = useClientAuthStore((state) => state.aiAssistPaused);
  const setAiAssistPaused = useClientAuthStore((state) => state.setAiAssistPaused);
  const logout = useClientAuthStore((state) => state.logout);
  const documentsQuery = useClientDocuments(transactionId, token);
  const clientProfileQuery = useClientProfile(token);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  useClientEventStream(token);

  useEffect(() => {
    if (documentsQuery.isError || clientProfileQuery.isError) {
      logout();
    }
  }, [clientProfileQuery.isError, documentsQuery.isError, logout]);

  useEffect(() => {
    if (!clientProfileQuery.data || preferredLanguage) {
      return;
    }

    setPreferredLanguage(normalizeLanguage(clientProfileQuery.data.client.preferredLanguage));
  }, [clientProfileQuery.data, preferredLanguage, setPreferredLanguage]);

  if (!token) {
    return <Navigate to="/client/login" replace />;
  }

  if (!transactionId) {
    return <Navigate to="/client/portfolio" replace />;
  }

  if (documentsQuery.isLoading || clientProfileQuery.isLoading) {
    return (
      <ClientShell>
        <Card>
          <CardContent className="p-8 text-sm text-slate-600">Loading your transaction documents...</CardContent>
        </Card>
      </ClientShell>
    );
  }

  if (documentsQuery.isError || clientProfileQuery.isError || !documentsQuery.data || !clientProfileQuery.data) {
    return <Navigate to="/client/portfolio" replace />;
  }

  const { transaction, documents, questions, voiceBotSession } = documentsQuery.data;
  const { saveProgressSuggested } = clientProfileQuery.data;
  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? documents[0] ?? null;
  const language: SupportedLanguage =
    preferredLanguage ?? normalizeLanguage(clientProfileQuery.data.client.preferredLanguage);
  const copy = getClientCopy(language);
  const formattedPrice = formatCurrency(transaction.propertyPrice);
  const expectedClose = formatCalendarDate(transaction.expectedCloseAt, language);
  const openedDocumentCount = documents.filter((document) => document.openedByClient).length;
  const translatedRole = translateRelationshipRole(language, transaction.relationshipRole);
  const supportStatusLabel =
    voiceBotSession?.status === "booked"
      ? language === "es"
        ? "Llamada agendada"
        : "Call booked"
      : voiceBotSession
        ? language === "es"
          ? "Seguimiento activo"
          : "Follow-up live"
        : language === "es"
          ? "En espera"
          : "Standing by";
  const docsRibbon = language === "es"
    ? {
        timeSaved: "Tiempo ahorrado",
        timeBody: "Recuperado al tener el PDF, el resumen y las preguntas en el mismo espacio.",
        answered: "Preguntas resueltas",
        answeredBody: "El historial de conversacion se mantiene unido a esta transaccion para que nada se repita.",
        aiControl: "Control de IA",
        aiBody: "Puedes pausar la capa de ayuda en cualquier momento sin perder acceso a tus documentos."
      }
    : {
        timeSaved: "Time Saved",
        timeBody: "Recovered by keeping the PDF, summary, and Q&A context in one workspace.",
        answered: "Questions Answered",
        answeredBody: "Existing conversation history stays attached to this transaction so nothing has to be repeated.",
        aiControl: "AI Control",
        aiBody: "Pause the helper layer any time without losing access to your actual documents."
      };

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <ClientShell>
        <div className="mx-auto max-w-7xl space-y-8">
          <Card className="overflow-hidden border-teal-200 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.28),_transparent_36%),linear-gradient(135deg,_#0f4f4c_0%,_#115e59_52%,_#164e63_100%)] text-white">
            <CardHeader className="gap-8 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="border-white/20 bg-white/12 text-white">
                    {translateStageLabel(language, transaction.stage, transaction.stageLabel)}
                  </Badge>
                  {transaction.readinessBucket ? (
                    <Badge className="border-white/20 bg-white/12 text-white">
                      {translateReadinessBucket(language, transaction.readinessBucket)}
                    </Badge>
                  ) : null}
                  <Badge className="border-emerald-200/40 bg-emerald-300/15 text-emerald-50">
                    {translatedRole}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <CardTitle className="text-4xl text-white md:text-5xl">{transaction.propertyAddress}</CardTitle>
                  <CardDescription className="max-w-2xl text-base leading-7 text-teal-50/92">
                    {copy.documentsDescription}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-teal-50/90">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                    <MapPinned className="h-4 w-4" />
                    {transaction.propertyCity}, {transaction.propertyState} {transaction.propertyZip}
                  </span>
                  {expectedClose ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                      <CalendarDays className="h-4 w-4" />
                      {language === "es" ? "Cierre estimado" : "Expected close"} {expectedClose}
                    </span>
                  ) : null}
                  {formattedPrice ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                      <BadgeCheck className="h-4 w-4" />
                      {formattedPrice}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex w-full max-w-sm flex-col gap-4">
                <div className="rounded-[28px] border border-white/12 bg-white/10 p-5 text-white backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-50/80">
                    {language === "es" ? "Estado del soporte" : "Support status"}
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{supportStatusLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-teal-50/85">
                    {voiceBotSession
                      ? language === "es"
                        ? "Closing Day ya esta capturando el contexto para tu agente y manteniendo el historial en este mismo espacio."
                        : "Closing Day is already capturing context for your agent and keeping the transcript inside this same workspace."
                      : language === "es"
                        ? "Todavia no se activo un seguimiento guiado. Si una pregunta sube de tono, aparecera aqui automaticamente."
                        : "A guided follow-up has not been triggered yet. If a question turns high-stakes, it will appear here automatically."}
                  </p>
                </div>
                <Button asChild className="w-full" variant="white">
                  <Link to="/client/portfolio">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {copy.backToPortfolio}
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-white/80">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {language === "es" ? "Documentos abiertos" : "Documents opened"}
                </CardDescription>
                <CardTitle className="text-3xl">{openedDocumentCount}/{documents.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-600">
                  {language === "es"
                    ? "Cada archivo abierto se mantiene unido a su resumen y al historial de preguntas."
                    : "Every opened file stays tied to its summary and question history."}
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/80">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {language === "es" ? "Preguntas resueltas" : "Questions resolved"}
                </CardDescription>
                <CardTitle className="text-3xl">{questions.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-600">
                  {language === "es"
                    ? "Tus preguntas y respuestas se guardan aqui para que no tengas que repetir el contexto."
                    : "Your questions and answers stay here so you never have to repeat the context."}
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/80">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {docsRibbon.timeSaved}
                </CardDescription>
                <CardTitle className="text-3xl">{documents.length * 9} min</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-600">{docsRibbon.timeBody}</p>
              </CardContent>
            </Card>

            <Card className="border-white/80">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {docsRibbon.aiControl}
                </CardDescription>
                <CardTitle className="text-3xl">{aiAssistPaused ? "Paused" : "Active"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-600">{docsRibbon.aiBody}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <TrustBanner
              language={language}
              isPaused={aiAssistPaused}
              onTogglePause={() => setAiAssistPaused(!aiAssistPaused)}
            />
            <div className="space-y-4">
              <LanguageToggle
                language={language}
                label={copy.languageToggleLabel}
                onChange={setPreferredLanguage}
              />
              {saveProgressSuggested ? <SaveProgressPrompt token={token} language={language} /> : null}
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {language === "es" ? "Espacio de documentos" : "Document workspace"}
                </p>
                <h2 className="text-3xl font-semibold text-slate-950">
                  {language === "es" ? "Lee el archivo y entiende lo importante" : "Read the file and understand what matters"}
                </h2>
              </div>
              {selectedDocument ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                  <FileStack className="h-4 w-4 text-primary" />
                  {translateDocumentCategory(language, selectedDocument.category)}
                </div>
              ) : null}
            </div>

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                <Card className="border-white/80">
                  <CardHeader>
                    <CardTitle className="text-2xl">{copy.availableDocuments}</CardTitle>
                    <CardDescription>{copy.selectDocument}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {documents.map((document) => (
                      <button
                        key={document.id}
                        className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                          selectedDocument?.id === document.id
                            ? "border-primary bg-primary text-white shadow-[0_12px_30px_rgba(15,79,76,0.18)]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                        onClick={() => setSelectedDocumentId(document.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-sm font-semibold ${selectedDocument?.id === document.id ? "text-white" : "text-slate-900"}`}>
                              {document.title}
                            </p>
                            <p className={`mt-1 text-xs ${selectedDocument?.id === document.id ? "text-teal-50/80" : "text-slate-500"}`}>
                              {translateDocumentCategory(language, document.category)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              selectedDocument?.id === document.id
                                ? "bg-white/15 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {document.questionCount}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`rounded-full px-2.5 py-1 ${
                              document.openedByClient
                                ? selectedDocument?.id === document.id
                                  ? "bg-white/12 text-teal-50"
                                  : "bg-emerald-50 text-emerald-700"
                                : selectedDocument?.id === document.id
                                  ? "bg-white/12 text-teal-50"
                                  : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {document.openedByClient
                              ? language === "es"
                                ? "Abierto"
                                : "Opened"
                              : language === "es"
                                ? "Nuevo"
                                : "New"}
                          </span>
                          {document.overriddenAt ? (
                            <span
                              className={`rounded-full px-2.5 py-1 ${
                                selectedDocument?.id === document.id ? "bg-white/12 text-teal-50" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {language === "es" ? "Editado por agente" : "Agent edited"}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {selectedDocument ? (
                  <Card className="border-white/80">
                    <CardHeader>
                      <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {language === "es" ? "Documento actual" : "Current document"}
                      </CardDescription>
                      <CardTitle className="text-xl">{selectedDocument.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
                        <ShieldCheck className="h-4 w-4" />
                        {selectedDocument.summaryGeneratedBy === "fallback"
                          ? language === "es"
                            ? "Resumen alternativo"
                            : "Fallback summary"
                          : language === "es"
                            ? "Resumen IA activo"
                            : "Live AI summary"}
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        {selectedDocument.summaryTlDr ??
                          (language === "es"
                            ? "Todavia no hay un resumen breve para este archivo."
                            : "A quick summary is not available for this file yet.")}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
              </div>

              <DocumentViewer document={selectedDocument} token={token} language={language} aiPaused={aiAssistPaused} />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {language === "es" ? "Conversacion y apoyo" : "Conversation and support"}
                </p>
                <h2 className="text-3xl font-semibold text-slate-950">
                  {language === "es" ? "Haz preguntas y agenda ayuda sin perder contexto" : "Ask questions and book help without losing context"}
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                <MessageSquareMore className="h-4 w-4 text-primary" />
                {language === "es"
                  ? "Todo el historial queda visible para tu agente"
                  : "Your agent can see the full transcript"}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <QuestionChat
                document={selectedDocument}
                questions={questions}
                token={token}
                transactionId={transactionId}
                language={language}
                aiPaused={aiAssistPaused}
              />
              <VoiceConcierge
                token={token}
                transactionId={transactionId}
                language={language}
                {...(voiceBotSession ? { session: voiceBotSession } : {})}
              />
            </div>
          </section>
        </div>
      </ClientShell>
    </motion.main>
  );
}
