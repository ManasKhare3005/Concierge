import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileStack, LogOut } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { DocumentUploader } from "@/components/agent/DocumentUploader";
import { DocumentViewer } from "@/components/client/DocumentViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAgentTransactionDocuments, useAgentTransactions } from "@/hooks/useAgentTransactionDocuments";
import { api } from "@/lib/api";
import { useAgentAuthStore } from "@/store/agentAuthStore";

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
  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? documents[0] ?? null;

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
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden bg-primary text-white">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <CardTitle className="text-4xl text-white">{transaction.propertyAddress}</CardTitle>
              <CardDescription className="max-w-2xl text-base text-teal-50/90">
                Upload, inspect, and override document summaries for this transaction.
              </CardDescription>
              <p className="text-sm text-teal-50/90">
                Agent edits stay visible, explainable, and client-safe. This is where trust gets earned when AI copy needs a human touch.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" variant="outline">
                <Link to="/agent/triage">Back to Triage</Link>
              </Button>
              <Button
                className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                variant="outline"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white shadow-glass">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Document labor saved</p>
              <p className="mt-2 text-3xl font-semibold">{documents.length * 11} min</p>
              <p className="mt-1 text-sm text-emerald-100/90">Recovered by starting from a generated explanation instead of drafting from scratch every time.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Client confusion reduced</p>
              <p className="mt-2 text-3xl font-semibold">{documents.reduce((sum, document) => sum + document.questionCount, 0)}</p>
              <p className="mt-1 text-sm text-emerald-100/90">Tracked questions tied directly to uploaded documents so you can see where edits matter most.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Trust lever</p>
              <p className="mt-2 text-3xl font-semibold">Override live</p>
              <p className="mt-1 text-sm text-emerald-100/90">Human-reviewed copy can replace the AI draft instantly and shows up to the client in real time.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
          <div className="space-y-6">
            <DocumentUploader token={token} transactionId={transactionId} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileStack className="h-5 w-5 text-primary" />
                  Transaction Documents
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
                        ? "border-primary bg-teal-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setSelectedDocumentId(document.id);
                    }}
                    type="button"
                  >
                    <p className="text-sm font-semibold text-slate-900">{document.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{document.category.replaceAll("_", " ")}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Switch Transaction</CardTitle>
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
          </div>

          <div className="space-y-6">
            <DocumentViewer document={selectedDocument} token={token} language="en" aiPaused={false} />

            {selectedDocument ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Override Summary</CardTitle>
                  <CardDescription>
                    Agents stay in control. Edit the AI draft, publish the client-facing version instantly, and keep the override path obvious for skeptical users.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">TL;DR</label>
                    <Input value={summaryTlDr} onChange={(event) => setSummaryTlDr(event.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">What This Is</label>
                    <Textarea value={whatThisIs} onChange={(event) => setWhatThisIs(event.target.value)} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Watch For (one per line)</label>
                      <Textarea value={watchFor} onChange={(event) => setWatchFor(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Ask Your Agent (one per line)</label>
                      <Textarea value={askYourAgent} onChange={(event) => setAskYourAgent(event.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Plain-English Translation</label>
                    <Textarea className="min-h-40" value={plainEnglish} onChange={(event) => setPlainEnglish(event.target.value)} />
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

                  <Button disabled={isSavingOverride} onClick={handleOverrideSave} type="button">
                    {isSavingOverride ? "Saving override..." : "Save Override"}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </motion.main>
  );
}
