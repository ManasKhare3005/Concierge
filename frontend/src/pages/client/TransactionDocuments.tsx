import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useParams } from "react-router-dom";

import { DocumentViewer } from "@/components/client/DocumentViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientDocuments } from "@/hooks/useClientDocuments";
import { useClientAuthStore } from "@/store/clientAuthStore";

export function ClientTransactionDocumentsPage() {
  const { transactionId } = useParams();
  const token = useClientAuthStore((state) => state.token);
  const logout = useClientAuthStore((state) => state.logout);
  const documentsQuery = useClientDocuments(transactionId, token);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  useEffect(() => {
    if (documentsQuery.isError) {
      logout();
    }
  }, [documentsQuery.isError, logout]);

  if (!token) {
    return <Navigate to="/client/login" replace />;
  }

  if (!transactionId) {
    return <Navigate to="/client/portfolio" replace />;
  }

  if (documentsQuery.isLoading) {
    return (
      <div className="page-shell">
        <Card>
          <CardContent className="p-8 text-sm text-slate-600">Loading your transaction documents...</CardContent>
        </Card>
      </div>
    );
  }

  if (documentsQuery.isError || !documentsQuery.data) {
    return <Navigate to="/client/portfolio" replace />;
  }

  const { transaction, documents } = documentsQuery.data;
  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? documents[0] ?? null;

  return (
    <motion.main className="page-shell" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge>{transaction.stageLabel}</Badge>
                {transaction.readinessBucket ? <Badge>{transaction.readinessBucket}</Badge> : null}
              </div>
              <CardTitle className="text-4xl">{transaction.propertyAddress}</CardTitle>
              <CardDescription className="max-w-2xl text-base">
                Your documents update automatically while this page is open, so newly uploaded files appear without a manual refresh.
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link to="/client/portfolio">Back to Portfolio</Link>
            </Button>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[0.3fr_0.7fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Available Documents</CardTitle>
              <CardDescription>Select a document to open the PDF and summary.</CardDescription>
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
                  <p className="mt-1 text-xs text-slate-500">{document.category.replaceAll("_", " ")}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <DocumentViewer document={selectedDocument} token={token} />
        </div>
      </div>
    </motion.main>
  );
}
