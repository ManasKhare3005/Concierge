import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  FileStack,
  LogOut,
  MapPinned,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { ClientConversationPanel } from "@/components/agent/ClientConversationPanel";
import { DocumentUploader } from "@/components/agent/DocumentUploader";
import { DocumentViewer } from "@/components/client/DocumentViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAgentTransactionDocuments, useAgentTransactions } from "@/hooks/useAgentTransactionDocuments";
import { api } from "@/lib/api";
import { useAgentAuthStore } from "@/store/agentAuthStore";

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

function formatDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatRoleLabel(role: string): string {
  return role.replaceAll("_", " ");
}

function formatDocumentCategory(category: string): string {
  switch (category) {
    case "purchase_agreement":
      return "Purchase agreement";
    case "inspection_report":
      return "Inspection report";
    case "disclosure":
      return "Disclosure";
    case "hoa":
      return "HOA packet";
    default:
      return "Generic document";
  }
}

export function AgentTransactionDocumentsPage() {
  const { transactionId } = useParams();
  const token = useAgentAuthStore((state) => state.token);
  const logout = useAgentAuthStore((state) => state.logout);
  const transactionsQuery = useAgentTransactions(token);
  const documentsQuery = useAgentTransactionDocuments(transactionId, token);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [overrideMessage, setOverrideMessage] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [summaryTlDr, setSummaryTlDr] = useState("");
  const [whatThisIs, setWhatThisIs] = useState("");
  const [watchFor, setWatchFor] = useState("");
  const [askYourAgent, setAskYourAgent] = useState("");
  const [plainEnglish, setPlainEnglish] = useState("");

  const activeTransactions = transactionsQuery.data?.transactions ?? [];
  const documents = documentsQuery.data?.documents ?? [];
  const voiceBotSessions = documentsQuery.data?.voiceBotSessions ?? [];
  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? documents[0] ?? null;

  useEffect(() => {
    setOverrideMessage(null);
    setOverrideError(null);

    if (!selectedDocument?.summaryJson) {
      setSummaryTlDr(selectedDocument?.summaryTlDr ?? "");
      setWhatThisIs("");
      setWatchFor("");
      setAskYourAgent("");
      setPlainEnglish("");
      return;
    }

    setSummaryTlDr(selectedDocument.summaryTlDr ?? "");
    setWhatThisIs(selectedDocument.summaryJson.whatThisIs);
    setWatchFor(selectedDocument.summaryJson.watchFor.join("\n"));
    setAskYourAgent(selectedDocument.summaryJson.askYourAgent.join("\n"));
    setPlainEnglish(selectedDocument.summaryJson.plainEnglishFullText);
  }, [selectedDocument]);

  if (!token) {
    return <Navigate to="/agent/login" replace />;
  }

  if (!transactionId) {
    return <Navigate to="/agent/triage" replace />;
  }

  if (transactionsQuery.isLoading || documentsQuery.isLoading) {
    return (
      <div className="page-shell">
        <Card>
          <CardContent className="p-8 text-sm text-slate-600">Loading transaction documents...</CardContent>
        </Card>
      </div>
    );
  }

  if (transactionsQuery.isError || documentsQuery.isError || !documentsQuery.data) {
    return <Navigate to="/agent/triage" replace />;
  }

  const transaction = documentsQuery.data.transaction;
  const formattedPrice = formatCurrency(transaction.propertyPrice);
  const expectedClose = formatDate(transaction.expectedCloseAt);
  const totalQuestions = documents.reduce((sum, document) => sum + document.questionCount, 0);
  const liveFollowUps = voiceBotSessions.filter(
    (session) => session.status === "pending" || session.status === "in_progress"
  ).length;
  const bookedMeetings = voiceBotSessions.filter((session) => session.status === "booked").length;

  async function handleOverrideSave() {
    if (!selectedDocument) {
      return;
    }

    setOverrideMessage(null);
    setOverrideError(null);
    setIsSavingOverride(true);

    try {
      const splitLines = (value: string) =>
        value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 3);

      await api.post(
        `/api/agent/documents/${selectedDocument.id}/override`,
        {
          summaryTlDr,
          whatThisIs,
          watchFor: splitLines(watchFor),
          askYourAgent: splitLines(askYourAgent),
          plainEnglishFullText: plainEnglish
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setOverrideMessage("Summary override saved. Clients polling this transaction will pick up the edited copy.");
      await documentsQuery.refetch();
    } catch (error) {
      setOverrideError(error instanceof Error ? error.message : "Unable to save override.");
    } finally {
      setIsSavingOverride(false);
    }
  }

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="page-shell">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card className="overflow-hidden border-teal-200 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.24),_transparent_36%),linear-gradient(135deg,_#0f4f4c_0%,_#115e59_52%,_#164e63_100%)] text-white">
          <CardHeader className="gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="glass">{transaction.stageLabel}</Badge>
                <Badge variant="glass">{transaction.role === "buy" ? "Buyer-side file" : "Seller-side file"}</Badge>
                <Badge className="border-emerald-200/40 bg-emerald-300/15 text-emerald-50">
                  {transaction.clients.length} active participant{transaction.clients.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="space-y-3">
                <CardTitle className="text-4xl text-white md:text-5xl">{transaction.propertyAddress}</CardTitle>
                <CardDescription className="max-w-2xl text-base leading-7 text-teal-50/92">
                  Upload, inspect, and override document summaries for this transaction while keeping the client-facing explanation trustworthy and clear.
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
                    Expected close {expectedClose}
                  </span>
                ) : null}
                {formattedPrice ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                    <ShieldCheck className="h-4 w-4" />
                    {formattedPrice}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-4">
              <div className="rounded-[28px] border border-white/12 bg-white/10 p-5 text-white backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-50/80">Operator focus</p>
                <p className="mt-3 text-3xl font-semibold">
                  {liveFollowUps > 0 ? `${liveFollowUps} follow-up${liveFollowUps === 1 ? "" : "s"} live` : "Document control"}
                </p>
                <p className="mt-2 text-sm leading-6 text-teal-50/85">
                  This page keeps the summary override path, upload flow, and client conversation history in one workspace so James can act without tab-hopping.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild variant="white">
                  <Link to="/agent/triage">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Triage
                  </Link>
                </Button>
                <Button className="hover:text-white" variant="glass" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-white/80">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Document labor saved
              </CardDescription>
              <CardTitle className="text-3xl">{documents.length * 11} min</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-600">
                Recovered by starting from a generated explanation instead of drafting every summary from scratch.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/80">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Client confusion reduced
              </CardDescription>
              <CardTitle className="text-3xl">{totalQuestions}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-600">
                Questions tied directly to uploaded documents so you can see where edits matter most.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/80">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Guided follow-ups live
              </CardDescription>
              <CardTitle className="text-3xl">{liveFollowUps}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-600">
                Active Concierge conversation threads you can inspect and tune before you step in.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/80">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Meetings booked
              </CardDescription>
              <CardTitle className="text-3xl">{bookedMeetings}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-600">
                Confirmed conversation times already captured back into the agent workflow.
              </p>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Document operations</p>
              <h2 className="text-3xl font-semibold text-slate-950">Upload, inspect, and publish the client-safe explanation</h2>
            </div>
            {selectedDocument ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                <FileStack className="h-4 w-4 text-primary" />
                {formatDocumentCategory(selectedDocument.category)}
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
              <DocumentUploader token={token} transactionId={transactionId} />

              <Card className="border-white/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FileStack className="h-5 w-5 text-primary" />
                    Transaction documents
                  </CardTitle>
                  <CardDescription>
                    Clients: {transaction.clients.map((client) => `${client.firstName} ${client.lastName}`).join(", ")}
                  </CardDescription>
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
                      onClick={() => {
                        setSelectedDocumentId(document.id);
                      }}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-sm font-semibold ${selectedDocument?.id === document.id ? "text-white" : "text-slate-900"}`}>
                            {document.title}
                          </p>
                          <p className={`mt-1 text-xs ${selectedDocument?.id === document.id ? "text-teal-50/80" : "text-slate-500"}`}>
                            {formatDocumentCategory(document.category)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            selectedDocument?.id === document.id ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
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
                          {document.openedByClient ? "Opened by client" : "Not opened yet"}
                        </span>
                        {document.overriddenAt ? (
                          <span
                            className={`rounded-full px-2.5 py-1 ${
                              selectedDocument?.id === document.id ? "bg-white/12 text-teal-50" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            Override published
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/80">
                <CardHeader>
                  <CardTitle className="text-xl">Switch transaction</CardTitle>
                  <CardDescription>Jump between active files without leaving the operator workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeTransactions.map((activeTransaction) => (
                    <Button
                      key={activeTransaction.id}
                      asChild
                      className="w-full justify-start"
                      variant={activeTransaction.id === transactionId ? "default" : "outline"}
                    >
                      <Link to={`/agent/transactions/${activeTransaction.id}/documents`}>
                        {activeTransaction.propertyAddress}
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/80">
                <CardHeader>
                  <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Participants
                  </CardDescription>
                  <CardTitle className="text-xl">Who is attached to this file</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {transaction.clients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{client.firstName} {client.lastName}</p>
                        <p className="text-xs text-slate-500">{formatRoleLabel(client.role)}</p>
                      </div>
                      <Users className="h-4 w-4 text-slate-400" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <DocumentViewer document={selectedDocument} token={token} language="en" aiPaused={false} />

              {selectedDocument ? (
                <Card className="border-white/80">
                  <CardHeader className="border-b border-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Human review controls</p>
                        <CardTitle className="text-2xl">Override summary</CardTitle>
                        <CardDescription>
                          Adjust the AI draft, publish a cleaner client-facing version instantly, and keep the override path obvious for skeptical agents.
                        </CardDescription>
                      </div>
                      <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">Trust lever</p>
                        <p className="mt-2 text-lg font-semibold text-emerald-950">Override live</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <label className="text-sm font-medium text-slate-700">TL;DR</label>
                      <Input className="mt-2 bg-white" value={summaryTlDr} onChange={(event) => setSummaryTlDr(event.target.value)} />
                    </div>

                    <div className="rounded-[24px] border border-teal-100 bg-teal-50/70 p-4">
                      <label className="text-sm font-medium text-slate-700">What this is</label>
                      <Textarea className="mt-2 min-h-28 bg-white" value={whatThisIs} onChange={(event) => setWhatThisIs(event.target.value)} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-4">
                        <label className="text-sm font-medium text-slate-700">Watch for (one per line)</label>
                        <Textarea className="mt-2 min-h-32 bg-white" value={watchFor} onChange={(event) => setWatchFor(event.target.value)} />
                      </div>
                      <div className="rounded-[24px] border border-sky-100 bg-sky-50/80 p-4">
                        <label className="text-sm font-medium text-slate-700">Ask your agent (one per line)</label>
                        <Textarea className="mt-2 min-h-32 bg-white" value={askYourAgent} onChange={(event) => setAskYourAgent(event.target.value)} />
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                      <label className="text-sm font-medium text-slate-700">Plain-English translation</label>
                      <Textarea
                        className="mt-2 min-h-40 bg-slate-50"
                        value={plainEnglish}
                        onChange={(event) => setPlainEnglish(event.target.value)}
                      />
                    </div>

                    {overrideMessage ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {overrideMessage}
                      </div>
                    ) : null}
                    {overrideError ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {overrideError}
                      </div>
                    ) : null}

                    <div className="flex justify-end">
                      <Button disabled={isSavingOverride} onClick={handleOverrideSave} type="button">
                        {isSavingOverride ? "Saving override..." : "Save Override"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Client follow-up visibility</p>
              <h2 className="text-3xl font-semibold text-slate-950">Read the same guided conversation your client is seeing</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              <MessageSquareQuote className="h-4 w-4 text-primary" />
              Slot edits and transcript review stay in one view
            </div>
          </div>

          {voiceBotSessions.length === 0 ? (
            <Card className="border-white/80">
              <CardContent className="p-8 text-sm leading-7 text-slate-600">
                No Concierge conversation has been triggered for this transaction yet. When a client question crosses into higher concern, the follow-up thread will appear here automatically.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              {voiceBotSessions.map((session) => (
                <ClientConversationPanel key={session.id} session={session} token={token} />
              ))}
            </div>
          )}

          <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white shadow-glass">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Live trust signal</p>
                <p className="mt-2 text-3xl font-semibold">Editable AI</p>
                <p className="mt-1 text-sm text-emerald-100/90">
                  Human-reviewed copy can replace the AI draft instantly and show up to the client in real time.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Conversation leverage</p>
                <p className="mt-2 text-3xl font-semibold">{voiceBotSessions.length}</p>
                <p className="mt-1 text-sm text-emerald-100/90">
                  Follow-up threads captured with transcript, meeting options, and prep context before the human call.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Operator payoff</p>
                <p className="mt-2 text-3xl font-semibold">Less scramble</p>
                <p className="mt-1 text-sm text-emerald-100/90">
                  One page now covers uploads, summary publishing, and client follow-up review without switching tools.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.main>
  );
}

