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

const askQuestionSchema = z.object({
  question: z.string().trim().min(4, "Ask a little more so Closing Day has enough context.").max(1_200)
});

type AskQuestionValues = z.infer<typeof askQuestionSchema>;

interface QuestionChatProps {
  transactionId: string;
  token: string;
  document: DocumentRecordDetail | null;
  questions: QuestionRecord[];
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

export function QuestionChat({ transactionId, token, document, questions }: QuestionChatProps) {
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
      return "Ask a general transaction question";
    }

    return `Asking about ${document.title}`;
  }, [document]);

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
        title: "Question failed to send",
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
          <CardTitle className="flex items-center gap-2 text-2xl">
            <MessageSquareText className="h-5 w-5 text-primary" />
            Question Chat
          </CardTitle>
          <CardDescription>
            {selectedDocumentLabel}. Higher-stakes judgment questions are automatically routed back to the agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[38rem] space-y-4 overflow-y-auto pr-1">
            {questions.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Ask the first question about this transaction or document. Closing Day will answer in context and flag the agent when the question moves into judgment, risk, or emotional territory.
              </div>
            ) : null}

            {questions.map((question) => (
              <div key={question.id} className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={getSeverityTone(question.severity)}>Severity {question.severity}</Badge>
                  {question.routedToAgent ? (
                    <Badge className="border-rose-200 bg-rose-50 text-rose-700">Routed to agent</Badge>
                  ) : null}
                  <Badge className="border-slate-200 bg-slate-50 text-slate-700">{question.category}</Badge>
                </div>

                <p className="mt-3 text-sm font-medium leading-6 text-slate-900">{question.question}</p>

                <div className="mt-4 rounded-[22px] bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <AiBadge generatedBy={question.generatedBy} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{question.answer}</p>
                  {question.nextStep ? (
                    <p className="mt-3 text-sm font-medium text-slate-900">Next step: {question.nextStep}</p>
                  ) : null}
                </div>

                <div className="mt-4">
                  <WhyExpansion transparency={question.transparency} />
                </div>
              </div>
            ))}

            {askQuestion.isPending && pendingQuestion ? (
              <div className="rounded-[24px] border border-primary/20 bg-teal-50 p-5">
                <p className="text-sm font-medium leading-6 text-slate-900">{pendingQuestion}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Closing Day is typing...
                </div>
              </div>
            ) : null}
          </div>

          <form className="space-y-3" onSubmit={form.handleSubmit(submitQuestion)}>
            <Textarea
              placeholder="Ask what this means, what happens next, or whether something should worry you."
              {...form.register("question")}
            />
            {form.formState.errors.question ? (
              <p className="text-sm text-rose-600">{form.formState.errors.question.message}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                The answer uses the selected document and transaction context. Judgment calls still go back to your agent.
              </p>
              <Button disabled={askQuestion.isPending} type="submit">
                {askQuestion.isPending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Ask Question
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
        actionLabel="Retry"
        {...(toastState.description ? { description: toastState.description } : {})}
        onAction={() => {
          void retryLastQuestion();
        }}
        onClose={() => setToastState({ open: false, title: "" })}
      />
    </>
  );
}
