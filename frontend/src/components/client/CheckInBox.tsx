import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReadinessSnapshotRecord, SentimentSnapshot } from "@shared";
import { HeartHandshake, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AiBadge } from "@/components/shared/AiBadge";
import { Toast } from "@/components/shared/Toast";
import { WhyExpansion } from "@/components/shared/WhyExpansion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCheckIn } from "@/hooks/useCheckIn";
import type { SupportedLanguage } from "@/lib/i18n";
import { getClientCopy, translateReadinessBucket } from "@/lib/i18n";

const checkInSchema = z.object({
  response: z.string().trim().min(3, "Say a little more so Closing Day can read the tone accurately.").max(600)
});

type CheckInValues = z.infer<typeof checkInSchema>;

interface CheckInBoxProps {
  transactionId: string;
  token: string;
  language: SupportedLanguage;
  aiPaused: boolean;
  latestSentiment?: SentimentSnapshot;
  readiness?: ReadinessSnapshotRecord;
}

export function CheckInBox({ transactionId, token, language, aiPaused, latestSentiment, readiness }: CheckInBoxProps) {
  const copy = getClientCopy(language);
  const whyLabel = language === "es" ? "Por que veo esto?" : "Why am I seeing this?";
  const checkIn = useCheckIn(transactionId, token);
  const [lastPayload, setLastPayload] = useState<CheckInValues | null>(null);
  const [toastState, setToastState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    variant: "error" | "success";
  }>({
    open: false,
    title: "",
    variant: "success"
  });

  const form = useForm<CheckInValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      response: ""
    }
  });

  async function submitCheckIn(values: CheckInValues) {
    setLastPayload(values);
    setToastState({ open: false, title: "", variant: "success" });

    try {
      await checkIn.mutateAsync(values);
      form.reset();
      setToastState({
        open: true,
        title: copy.checkInSavedTitle,
        description: copy.checkInSavedBody,
        variant: "success"
      });
    } catch (error) {
      setToastState({
        open: true,
        title: copy.checkInFailedTitle,
        description: error instanceof Error ? error.message : "The sentiment check-in request failed.",
        variant: "error"
      });
    }
  }

  async function retryLastCheckIn() {
    if (!lastPayload || checkIn.isPending) {
      return;
    }

    await submitCheckIn(lastPayload);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <HeartHandshake className="h-5 w-5 text-primary" />
            {copy.checkInTitle}
          </CardTitle>
          <CardDescription>
            {copy.checkInDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiPaused ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              {copy.checkInPaused}
            </div>
          ) : null}
          {latestSentiment ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-slate-200 bg-white text-slate-700">{latestSentiment.sentiment}</Badge>
                {latestSentiment.agentAlertNeeded ? (
                  <Badge className="border-rose-200 bg-rose-50 text-rose-700">Agent alert</Badge>
                ) : null}
                <AiBadge generatedBy={latestSentiment.generatedBy} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{latestSentiment.alertReason}</p>
              {readiness ? (
                <p className="mt-3 text-sm font-medium text-slate-900">
                  {copy.currentReadiness}: {translateReadinessBucket(language, readiness.bucket)}
                </p>
              ) : null}
              <div className="mt-4">
                <WhyExpansion transparency={latestSentiment.transparency} label={whyLabel} />
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              {copy.checkInEmpty}
            </div>
          )}

          <form className="space-y-3" onSubmit={form.handleSubmit(submitCheckIn)}>
            <Textarea
              placeholder={copy.checkInPlaceholder}
              disabled={aiPaused}
              {...form.register("response")}
            />
            {form.formState.errors.response ? (
              <p className="text-sm text-rose-600">{form.formState.errors.response.message}</p>
            ) : null}

            <Button disabled={checkIn.isPending || aiPaused} type="submit">
              {checkIn.isPending ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  {copy.checkInSaving}
                </>
              ) : (
                copy.checkInSubmit
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Toast
        open={toastState.open}
        title={toastState.title}
        variant={toastState.variant}
        {...(toastState.description ? { description: toastState.description } : {})}
        {...(toastState.variant === "error" ? { actionLabel: copy.retry } : {})}
        {...(toastState.variant === "error"
          ? {
              onAction: () => {
                void retryLastCheckIn();
              }
            }
          : {})}
        onClose={() => setToastState({ open: false, title: "", variant: toastState.variant })}
      />
    </>
  );
}
