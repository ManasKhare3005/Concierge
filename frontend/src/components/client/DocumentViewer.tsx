import { useEffect, useState } from "react";
import { FileText, LoaderCircle } from "lucide-react";
import type { DocumentRecordDetail } from "@shared";

import { AiBadge } from "@/components/shared/AiBadge";
import { WhyExpansion } from "@/components/shared/WhyExpansion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { SupportedLanguage } from "@/lib/i18n";
import { getClientCopy } from "@/lib/i18n";

interface DocumentViewerProps {
  document: DocumentRecordDetail | null;
  token: string;
  language: SupportedLanguage;
  aiPaused: boolean;
}

export function DocumentViewer({ document, token, language, aiPaused }: DocumentViewerProps) {
  const copy = getClientCopy(language);
  const whyLabel = language === "es" ? "Por que veo esto?" : "Why am I seeing this?";
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showPlainEnglish, setShowPlainEnglish] = useState(false);

  useEffect(() => {
    if (!document) {
      setPdfUrl(null);
      setPdfError(null);
      setIsLoadingPdf(false);
      return;
    }

    const activeDocument = document;
    let isMounted = true;
    let objectUrl: string | null = null;

    async function loadPdf() {
      setIsLoadingPdf(true);
      setPdfError(null);

      try {
        const documentId = activeDocument.id;
        const response = await api.get<Blob>(`/api/documents/${documentId}/file`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          responseType: "blob"
        });

        objectUrl = URL.createObjectURL(response.data);
        if (isMounted) {
          setPdfUrl(objectUrl);
        }
      } catch (error) {
        if (isMounted) {
          setPdfError(error instanceof Error ? error.message : "Unable to load the PDF preview.");
          setPdfUrl(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPdf(false);
        }
      }
    }

    void loadPdf();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [document, token]);

  useEffect(() => {
    setShowPlainEnglish(false);
  }, [document?.id]);

  if (!document) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-slate-500">
          {copy.noDocumentSelected}
        </CardContent>
      </Card>
    );
  }

  const summary = document.summaryJson;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            {document.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="min-h-[600px] bg-slate-100">
            {isLoadingPdf ? (
              <div className="flex min-h-[600px] items-center justify-center gap-3 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {copy.loadingPdf}
              </div>
            ) : pdfError ? (
              <div className="flex min-h-[600px] items-center justify-center px-6 text-center text-sm text-rose-700">
                {pdfError}
              </div>
            ) : pdfUrl ? (
              <iframe className="min-h-[600px] w-full" src={pdfUrl} title={document.title} />
            ) : (
              <div className="flex min-h-[600px] items-center justify-center text-sm text-slate-500">
                {copy.pdfUnavailable}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {document.summaryGeneratedBy ? <AiBadge generatedBy={document.summaryGeneratedBy} /> : null}
            {document.overriddenAt ? <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">{copy.agentEdited}</span> : null}
          </div>
          {document.summaryTlDr ? <p className="text-sm leading-6 text-slate-700">{document.summaryTlDr}</p> : null}
          {document.transparency ? <WhyExpansion transparency={document.transparency} label={whyLabel} /> : null}
        </CardHeader>
        <CardContent className="space-y-5">
          {aiPaused ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              {copy.aiPausedSummary}
            </div>
          ) : null}
          {summary ? (
            <>
              <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.whatThisIs}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-700">{aiPaused ? copy.aiPausedSummary : summary.whatThisIs}</p>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.watchFor}</h3>
                <div className="mt-3 space-y-3">
                  {(aiPaused ? [copy.aiPausedSummary] : summary.watchFor).map((item) => (
                    <p key={item} className="text-sm leading-6 text-slate-700">
                      {item}
                    </p>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.askYourAgent}</h3>
                <div className="mt-3 space-y-3">
                  {(aiPaused ? [copy.aiPausedSummary] : summary.askYourAgent).map((item) => (
                    <p key={item} className="text-sm leading-6 text-slate-700">
                      {item}
                    </p>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {copy.plainEnglishTranslation}
                  </h3>
                  <Button onClick={() => setShowPlainEnglish((current) => !current)} type="button" variant="outline">
                    {showPlainEnglish ? copy.hide : copy.show}
                  </Button>
                </div>
                {showPlainEnglish ? <p className="mt-4 text-sm leading-6 text-slate-700">{aiPaused ? copy.aiPausedSummary : summary.plainEnglishFullText}</p> : null}
              </section>
            </>
          ) : (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              {copy.summaryUnavailable}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
