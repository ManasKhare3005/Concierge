import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DocumentRecordDetail, QuestionRecord } from "@shared";
import { LoaderCircle, MessageSquareText, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AiBadge } from "@/components/shared/AiBadge";
import { Toast } from "@/components/shared/Toast";
import { WhyExpansion } from "@/components/shared/WhyExpansion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAskQuestion } from "@/hooks/useAskQuestion";
import type { SupportedLanguage } from "@/lib/i18n";
import { getClientCopy, translateQuestionCategory } from "@/lib/i18n";

const askQuestionSchema = z.object({
  question: z.string().trim().min(4, "Ask a little more so Concierge has enough context.").max(1_200)
});

type AskQuestionValues = z.infer<typeof askQuestionSchema>;

interface QuestionChatProps {
  transactionId: string;
  token: string;
  document: DocumentRecordDetail | null;
  questions: QuestionRecord[];
  language: SupportedLanguage;
  aiPaused: boolean;
}

function getSeverityTone(severity: number): string {
  if (severity >= 4) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (severity === 3) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-white text-slate-700";
}

export function QuestionChat({ transactionId, token, document, questions, language, aiPaused }: QuestionChatProps) {
  const copy = getClientCopy(language);
  const whyLabel = language === "es" ? "Por que veo esto?" : "Why am I seeing this?";
  const askQuestion = useAskQuestion(transactionId, token);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<AskQuestionValues | null>(null);
  const [toastState, setToastState] = useState<{
    open: boolean;
    title: string;
    description?: string;
  }>({
    open: false,
    title: ""
  });

  const form = useForm<AskQuestionValues>({
    resolver: zodResolver(askQuestionSchema),
    defaultValues: {
      question: ""
    }
  });

  const selectedDocumentLabel = useMemo(() => {
    if (!document) {
      return copy.questionChatDescription;
    }

    return language === "es" ? `Preguntando sobre ${document.title}` : `Asking about ${document.title}`;
  }, [copy.questionChatDescription, document, language]);

  async function submitQuestion(values: AskQuestionValues) {
    setPendingQuestion(values.question);
    setLastPayload(values);
    setToastState({ open: false, title: "" });

    try {
      await askQuestion.mutateAsync({
        question: values.question,
        ...(document ? { documentId: document.id } : {})
      });
      form.reset();
    } catch (error) {
      const description = error instanceof Error ? error.message : "The question request failed.";
      setToastState({
        open: true,
        title: copy.questionFailed,
        description
      });
    } finally {
      setPendingQuestion(null);
    }
  }

  async function retryLastQuestion() {
    if (!lastPayload || askQuestion.isPending) {
      return;
    }

    await submitQuestion(lastPayload);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <MessageSquareText className="h-5 w-5 text-primary" />
                {copy.questionChatTitle}
              </CardTitle>
              <CardDescription>{selectedDocumentLabel}</CardDescription>
            </div>
            <Badge className="border-slate-200 bg-slate-100 text-slate-700">
              {questions.length} {language === "es" ? "mensajes" : "messages"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiPaused ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              {copy.questionPaused}
            </div>
          ) : null}
          <div className="max-h-[42rem] space-y-4 overflow-y-auto pr-1">
            {questions.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                {copy.questionChatEmpty}
              </div>
            ) : null}

            {questions.map((question) => (
              <div key={question.id} className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getSeverityTone(question.severity)}>
                      {copy.severity} {question.severity}
                    </Badge>
                    {question.routedToAgent ? (
                      <Badge className="border-rose-200 bg-rose-50 text-rose-700">{copy.questionRouted}</Badge>
                    ) : null}
                    <Badge className="border-slate-200 bg-white text-slate-700">
                      {translateQuestionCategory(language, question.category)}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {language === "es" ? "Tu pregunta" : "Your question"}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{question.question}</p>
                </div>

                <div className="rounded-[22px] border border-teal-100 bg-teal-50/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <AiBadge generatedBy={question.generatedBy} />
                    <Badge className="border-teal-200 bg-white text-teal-800">
                      {language === "es" ? "Respuesta contextual" : "Contextual answer"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{question.answer}</p>
                  {question.nextStep ? (
                    <p className="mt-3 text-sm font-medium text-slate-900">{copy.questionNextStep}: {question.nextStep}</p>
                  ) : null}
                </div>

                <div className="mt-4">
                  <WhyExpansion transparency={question.transparency} label={whyLabel} />
                </div>
              </div>
            ))}

            {askQuestion.isPending && pendingQuestion ? (
              <div className="rounded-[24px] border border-primary/20 bg-teal-50 p-5">
                <p className="text-sm font-medium leading-6 text-slate-900">{pendingQuestion}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {copy.questionTyping}
                </div>
              </div>
            ) : null}
          </div>

          <form className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4" onSubmit={form.handleSubmit(submitQuestion)}>
            <Textarea
              placeholder={copy.questionChatPlaceholder}
              disabled={aiPaused}
              className="min-h-28 bg-white"
              {...form.register("question")}
            />
            {form.formState.errors.question ? (
              <p className="text-sm text-rose-600">{form.formState.errors.question.message}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {copy.questionChatFooter}
              </p>
              <Button disabled={askQuestion.isPending || aiPaused} type="submit">
                {askQuestion.isPending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {copy.questionSending}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {copy.questionAsk}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Toast
        open={toastState.open}
        title={toastState.title}
        variant="error"
        actionLabel={copy.retry}
        {...(toastState.description ? { description: toastState.description } : {})}
        onAction={() => {
          void retryLastQuestion();
        }}
        onClose={() => setToastState({ open: false, title: "" })}
      />
    </>
  );
}

