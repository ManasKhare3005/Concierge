import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
  getClientCopy,
  normalizeLanguage,
  translateDocumentCategory,
  translateReadinessBucket,
  translateStageLabel,
  type SupportedLanguage
} from "@/lib/i18n";
import { useClientAuthStore } from "@/store/clientAuthStore";

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
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge>{translateStageLabel(language, transaction.stage, transaction.stageLabel)}</Badge>
                {transaction.readinessBucket ? <Badge>{translateReadinessBucket(language, transaction.readinessBucket)}</Badge> : null}
              </div>
              <CardTitle className="text-4xl">{transaction.propertyAddress}</CardTitle>
              <CardDescription className="max-w-2xl text-base">
                {copy.documentsDescription}
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link to="/client/portfolio">{copy.backToPortfolio}</Link>
            </Button>
          </CardHeader>
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
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">{docsRibbon.timeSaved}</p>
                <p className="mt-2 text-3xl font-semibold">{documents.length * 9} min</p>
                <p className="mt-1 text-sm text-emerald-100/90">{docsRibbon.timeBody}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">{docsRibbon.answered}</p>
                <p className="mt-2 text-3xl font-semibold">{questions.length}</p>
                <p className="mt-1 text-sm text-emerald-100/90">{docsRibbon.answeredBody}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">{docsRibbon.aiControl}</p>
                <p className="mt-2 text-3xl font-semibold">{aiAssistPaused ? "Paused" : "Active"}</p>
                <p className="mt-1 text-sm text-emerald-100/90">{docsRibbon.aiBody}</p>
              </div>
            </div>
          </div>

        <div className="grid gap-6 lg:grid-cols-[0.3fr_0.7fr]">
          <Card>
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
                      ? "border-primary bg-teal-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedDocumentId(document.id)}
                  type="button"
                >
                  <p className="text-sm font-semibold text-slate-900">{document.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{translateDocumentCategory(language, document.category)}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <DocumentViewer document={selectedDocument} token={token} language={language} aiPaused={aiAssistPaused} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
      </div>
      </ClientShell>
    </motion.main>
  );
}
