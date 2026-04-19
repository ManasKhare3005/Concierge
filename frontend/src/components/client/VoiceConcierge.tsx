import { useEffect, useState } from "react";
import { formatVoiceBotSlotLabel, type VoiceBotSessionRecord } from "@shared";
import { Bot, CalendarCheck2, LoaderCircle, MessageSquareMore, PhoneCall } from "lucide-react";

import { AiBadge } from "@/components/shared/AiBadge";
import { Toast } from "@/components/shared/Toast";
import { WhyExpansion } from "@/components/shared/WhyExpansion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmClientBotCall, useRespondToClientBotCall } from "@/hooks/useBotCall";
import type { SupportedLanguage } from "@/lib/i18n";

interface VoiceConciergeProps {
  transactionId: string;
  token: string;
  language: SupportedLanguage;
  session?: VoiceBotSessionRecord;
}

const copy = {
  en: {
    title: "Concierge follow-up",
    emptyTitle: "No bot follow-up yet",
    emptyBody:
      "If a question gets serious enough to need a calmer conversation, Concierge will open a guided follow-up here and keep the transcript visible for your agent.",
    openBody:
      "This guided conversation captures your concern in plain language so your agent can step in with context instead of making you repeat everything.",
    bookedBody:
      "The meeting is locked in. Your agent can already see the transcript, your final question, and the booked time on their side.",
    closedBody: "This follow-up is no longer active, but the conversation history stays here for reference.",
    topConcerns: "Top concerns",
    currentTurn: "Current prompt",
    transcript: "Transcript",
    transcriptBody: "Everything you say here is preserved so the agent can see the exact issue you are working through.",
    customReply: "Custom reply",
    customPlaceholder: "Type your reply or one more concern...",
    sendReply: "Send Reply",
    sendingReply: "Sending...",
    confirmTitle: "Pick a meeting time",
    confirmBody: "Choose the Arizona time that works best and add one optional last note for your agent.",
    confirmButton: "Confirm Meeting",
    confirmingButton: "Confirming...",
    finalNote: "Optional final note",
    finalNotePlaceholder: "Anything else your agent should see before the call?",
    bookedTitle: "Meeting confirmed",
    bookedLabel: "Booked time",
    activeStatus: "Live follow-up",
    bookedStatus: "Meeting booked",
    pendingStatus: "Follow-up staged",
    closedStatus: "Closed",
    replyError: "Could not send reply",
    confirmError: "Could not confirm meeting",
    confirmSuccess: "Meeting confirmed",
    confirmSuccessBody: "Your agent can now see the booked time and transcript.",
    finalQuestion: "Final note for agent"
  },
  es: {
    title: "Seguimiento de Concierge",
    emptyTitle: "Todavia no hay seguimiento",
    emptyBody:
      "Si una pregunta necesita una conversacion mas guiada, Concierge abrira un seguimiento aqui y mantendra el historial visible para tu agente.",
    openBody:
      "Esta conversacion guiada captura tu preocupacion en lenguaje claro para que tu agente entre con contexto y sin hacerte repetir todo.",
    bookedBody:
      "La reunion ya esta confirmada. Tu agente ya puede ver el historial, tu ultima nota y la hora agendada.",
    closedBody: "Este seguimiento ya no esta activo, pero el historial sigue aqui como referencia.",
    topConcerns: "Temas principales",
    currentTurn: "Mensaje actual",
    transcript: "Historial",
    transcriptBody: "Todo lo que escribes aqui queda guardado para que el agente vea exactamente que te preocupa.",
    customReply: "Respuesta personalizada",
    customPlaceholder: "Escribe tu respuesta o una preocupacion mas...",
    sendReply: "Enviar respuesta",
    sendingReply: "Enviando...",
    confirmTitle: "Elige una hora",
    confirmBody: "Selecciona la hora de Arizona que mejor te funcione y agrega una nota opcional para tu agente.",
    confirmButton: "Confirmar reunion",
    confirmingButton: "Confirmando...",
    finalNote: "Nota final opcional",
    finalNotePlaceholder: "Algo mas que tu agente deba saber antes de la llamada?",
    bookedTitle: "Reunion confirmada",
    bookedLabel: "Hora agendada",
    activeStatus: "Seguimiento activo",
    bookedStatus: "Reunion agendada",
    pendingStatus: "Seguimiento preparado",
    closedStatus: "Cerrado",
    replyError: "No se pudo enviar la respuesta",
    confirmError: "No se pudo confirmar la reunion",
    confirmSuccess: "Reunion confirmada",
    confirmSuccessBody: "Tu agente ya puede ver la hora y el historial.",
    finalQuestion: "Nota final para el agente"
  }
} as const;

function statusLabel(session: VoiceBotSessionRecord, language: SupportedLanguage): string {
  const localCopy = copy[language];
  if (session.status === "booked") {
    return localCopy.bookedStatus;
  }
  if (session.status === "pending") {
    return localCopy.pendingStatus;
  }
  if (session.status === "declined" || session.status === "failed") {
    return localCopy.closedStatus;
  }
  return localCopy.activeStatus;
}

export function VoiceConcierge({ transactionId, token, language, session }: VoiceConciergeProps) {
  const localCopy = copy[language];
  const respondMutation = useRespondToClientBotCall(transactionId, token);
  const confirmMutation = useConfirmClientBotCall(transactionId, token);
  const [customResponse, setCustomResponse] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [clientNote, setClientNote] = useState("");
  const [toastState, setToastState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    variant: "success" | "error";
  }>({
    open: false,
    title: "",
    variant: "success"
  });

  useEffect(() => {
    if (!session || session.proposedSlots.length === 0) {
      setSelectedSlot(null);
      return;
    }

    setSelectedSlot((current) => current ?? session.proposedSlots[0] ?? null);
  }, [session]);

  const showBookedState = session?.status === "booked";
  const showClosedState = session?.status === "declined" || session?.status === "failed";
  const showConfirmState = Boolean(session && !showBookedState && !showClosedState && session.canConfirmBooking);

  async function handleResponse(responseText: string) {
    try {
      await respondMutation.mutateAsync({
        response: responseText
      });
      setCustomResponse("");
    } catch (error) {
      setToastState({
        open: true,
        title: localCopy.replyError,
        description: error instanceof Error ? error.message : localCopy.replyError,
        variant: "error"
      });
    }
  }

  async function handleConfirm() {
    if (!selectedSlot) {
      return;
    }

    try {
      await confirmMutation.mutateAsync({
        bookedSlot: selectedSlot,
        ...(clientNote.trim() ? { clientNewQuestion: clientNote.trim() } : {})
      });
      setToastState({
        open: true,
        title: localCopy.confirmSuccess,
        description: localCopy.confirmSuccessBody,
        variant: "success"
      });
    } catch (error) {
      setToastState({
        open: true,
        title: localCopy.confirmError,
        description: error instanceof Error ? error.message : localCopy.confirmError,
        variant: "error"
      });
    }
  }

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <div className="space-y-3">
            <Badge className="w-fit border-slate-200 bg-slate-100 text-slate-700">
              {language === "es" ? "En espera" : "Standing by"}
            </Badge>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <PhoneCall className="h-5 w-5 text-primary" />
              {localCopy.emptyTitle}
            </CardTitle>
            <CardDescription>{localCopy.emptyBody}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-teal-200 bg-teal-50 text-teal-800">{statusLabel(session, language)}</Badge>
                <AiBadge generatedBy={session.generatedBy} />
              </div>
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Bot className="h-5 w-5 text-primary" />
                  {localCopy.title}
                </CardTitle>
                <CardDescription>
                  {showBookedState ? localCopy.bookedBody : showClosedState ? localCopy.closedBody : localCopy.openBody}
                </CardDescription>
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {language === "es" ? "Temas activos" : "Active concerns"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{session.topConcerns.length}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {session.topConcerns.map((concern) => (
              <span key={concern} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                {concern}
              </span>
            ))}
          </div>

          {session.currentBotTurn ? (
            <div className="rounded-[24px] border border-teal-100 bg-teal-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{localCopy.currentTurn}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{session.currentBotTurn.text}</p>
            </div>
          ) : null}

          <WhyExpansion transparency={session.transparency} />

          {showBookedState ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">{localCopy.bookedLabel}</p>
              <p className="mt-2 text-lg font-semibold text-emerald-950">
                {session.bookedSlot ? formatVoiceBotSlotLabel(session.bookedSlot, language) : localCopy.bookedTitle}
              </p>
              {session.clientNewQuestion ? (
                <div className="mt-4 rounded-[20px] border border-emerald-200 bg-white p-4 text-sm text-slate-700">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{localCopy.finalQuestion}</p>
                  <p className="leading-6">{session.clientNewQuestion}</p>
                </div>
              ) : null}
            </div>
          ) : showConfirmState ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-lg font-semibold text-emerald-950">{localCopy.confirmTitle}</p>
              <p className="mt-2 text-sm leading-6 text-emerald-900/80">{localCopy.confirmBody}</p>
              <div className="mt-4 grid gap-2">
                {session.proposedSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`rounded-[20px] border px-4 py-3 text-left text-sm transition ${
                      selectedSlot === slot
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {formatVoiceBotSlotLabel(slot, language)}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-slate-900">{localCopy.finalNote}</p>
                <Textarea
                  value={clientNote}
                  onChange={(event) => setClientNote(event.target.value)}
                  placeholder={localCopy.finalNotePlaceholder}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button type="button" variant="accent" disabled={!selectedSlot || confirmMutation.isPending} onClick={() => void handleConfirm()}>
                  {confirmMutation.isPending ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      {localCopy.confirmingButton}
                    </>
                  ) : (
                    <>
                      <CalendarCheck2 className="mr-2 h-4 w-4" />
                      {localCopy.confirmButton}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : showClosedState ? null : (
            <div className="space-y-4">
              <div className="grid gap-2">
                {session.responseOptions.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant="outline"
                    className="h-auto justify-start rounded-[20px] px-4 py-4 text-left leading-6"
                    onClick={() => void handleResponse(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
              <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">{localCopy.customReply}</p>
                <Textarea
                  value={customResponse}
                  onChange={(event) => setCustomResponse(event.target.value)}
                  placeholder={localCopy.customPlaceholder}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="accent"
                    disabled={respondMutation.isPending || customResponse.trim().length < 3}
                    onClick={() => void handleResponse(customResponse.trim())}
                  >
                    {respondMutation.isPending ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        {localCopy.sendingReply}
                      </>
                    ) : (
                      <>
                        <MessageSquareMore className="mr-2 h-4 w-4" />
                        {localCopy.sendReply}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-lg font-semibold text-slate-900">{localCopy.transcript}</p>
            <p className="mt-1 text-sm text-slate-500">{localCopy.transcriptBody}</p>
            <div className="mt-4 space-y-3">
              {session.script.map((turn, index) => (
                <div
                  key={`${turn.speaker}-${index}-${turn.text.slice(0, 18)}`}
                  className={`rounded-[24px] p-4 text-sm leading-7 ${
                    turn.speaker === "bot" ? "bg-primary text-white" : "border border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.16em] ${turn.speaker === "bot" ? "text-white/80" : "text-slate-500"}`}>
                    {turn.speaker === "bot" ? "Concierge" : "You"}
                  </p>
                  <p>{turn.text}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Toast
        open={toastState.open}
        title={toastState.title}
        variant={toastState.variant}
        {...(toastState.description ? { description: toastState.description } : {})}
        onClose={() => setToastState((current) => ({ ...current, open: false }))}
      />
    </>
  );
}

