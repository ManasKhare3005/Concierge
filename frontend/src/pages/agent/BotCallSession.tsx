import { useEffect, useMemo, useRef, useState } from "react";
import type { VoiceBotSessionRecord } from "@shared";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarCheck2, Mic, PhoneCall, Volume2 } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { AgentShell } from "@/components/agent/AgentShell";
import { PrepBriefCard } from "@/components/agent/PrepBriefCard";
import { AiBadge } from "@/components/shared/AiBadge";
import { Toast } from "@/components/shared/Toast";
import { WhyExpansion } from "@/components/shared/WhyExpansion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmBotCall, useRespondToBotCall, useVoiceBotSession } from "@/hooks/useBotCall";
import { useAgentAuthStore } from "@/store/agentAuthStore";

function formatSlot(slot: string): string {
  return new Date(slot).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function VoiceBadge({ session }: { session: VoiceBotSessionRecord }) {
  if (!session.currentBotAudio) {
    return null;
  }

  return (
    <Badge className={session.currentBotAudio.generatedBy === "elevenlabs" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
      <Volume2 className="mr-1.5 h-3.5 w-3.5" />
      {session.currentBotAudio.generatedBy === "elevenlabs" ? "Voice live" : "Fallback voice"}
    </Badge>
  );
}

function TranscriptCard({ session }: { session: VoiceBotSessionRecord }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript</CardTitle>
        <CardDescription>The simulated call stays short and focused so the real agent conversation can go deeper.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {session.script.map((turn, index) => (
          <div
            key={`${turn.speaker}-${index}-${turn.text.slice(0, 20)}`}
            className={`rounded-[24px] p-4 text-sm leading-7 ${
              turn.speaker === "bot" ? "bg-primary text-white" : "border border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.16em] ${turn.speaker === "bot" ? "text-white/80" : "text-slate-500"}`}>
              {turn.speaker === "bot" ? "Concierge bot" : "Client"}
            </p>
            <p>{turn.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AgentBotCallSessionPage() {
  const token = useAgentAuthStore((state) => state.token);
  const { sessionId } = useParams();
  const sessionQuery = useVoiceBotSession(token, sessionId);
  const respondMutation = useRespondToBotCall(token);
  const confirmMutation = useConfirmBotCall(token);
  const [customResponse, setCustomResponse] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [clientNewQuestion, setClientNewQuestion] = useState("");
  const [toastState, setToastState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    variant: "info" | "success" | "error";
  }>({
    open: false,
    title: "",
    variant: "info"
  });
  const lastPlayedTurnRef = useRef<string | null>(null);

  useEffect(() => {
    const session = sessionQuery.data;
    if (!session?.currentBotAudio?.audioBase64 || !session.currentBotTurn) {
      return;
    }

    const turnKey = session.currentBotTurn.text;
    if (lastPlayedTurnRef.current === turnKey) {
      return;
    }

    const audio = new Audio(`data:${session.currentBotAudio.mimeType};base64,${session.currentBotAudio.audioBase64}`);
    void audio.play().catch(() => {
      return;
    });
    lastPlayedTurnRef.current = turnKey;
  }, [sessionQuery.data]);

  useEffect(() => {
    const session = sessionQuery.data;
    if (!session) {
      return;
    }

    if (session.proposedSlots.length > 0) {
      setSelectedSlot((current) => current ?? session.proposedSlots[0] ?? null);
    }
  }, [sessionQuery.data]);

  if (!token) {
    return <Navigate to="/agent/login" replace />;
  }

  if (!sessionId) {
    return <Navigate to="/agent/triage" replace />;
  }

  if (sessionQuery.isLoading) {
    return (
      <AgentShell>
        <Card>
          <CardContent className="p-8 text-sm text-slate-600">Loading the simulated call...</CardContent>
        </Card>
      </AgentShell>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <Navigate to="/agent/triage" replace />;
  }

  const session = sessionQuery.data;
  const voiceWhyTransparency = session.currentBotAudio?.transparency;
  const showBookedState = session.status === "booked";
  const showClosedState = session.status === "declined" || session.status === "failed";
  const showConfirmState = !showBookedState && !showClosedState && session.canConfirmBooking;
  const showCustomResponse = !showBookedState && !showClosedState && !session.canConfirmBooking;
  const confirmDisabled = !selectedSlot || confirmMutation.isPending || showBookedState || showClosedState;

  async function handleResponse(nextResponse: string) {
    try {
      await respondMutation.mutateAsync({
        sessionId: session.id,
        response: nextResponse
      });
      setCustomResponse("");
    } catch (error) {
      setToastState({
        open: true,
        title: "Could not advance the bot call",
        description: error instanceof Error ? error.message : "The next bot turn did not load.",
        variant: "error"
      });
    }
  }

  async function handleConfirm() {
    if (!selectedSlot || showBookedState || showClosedState) {
      return;
    }

    try {
      await confirmMutation.mutateAsync({
        sessionId: session.id,
        bookedSlot: selectedSlot,
        ...(clientNewQuestion.trim() ? { clientNewQuestion: clientNewQuestion.trim() } : {})
      });
      setToastState({
        open: true,
        title: "Booking confirmed",
        description: "The prep brief is ready and the triage board will move this client into Booked.",
        variant: "success"
      });
    } catch (error) {
      setToastState({
        open: true,
        title: "Could not confirm booking",
        description: error instanceof Error ? error.message : "The booking step failed.",
        variant: "error"
      });
    }
  }

  const responseButtons = useMemo(
    () =>
      session.responseOptions.map((option: string) => (
        <Button key={option} type="button" variant="outline" className="justify-start px-4 py-4 text-left leading-6 h-auto" onClick={() => void handleResponse(option)}>
          {option}
        </Button>
      )),
    [session.responseOptions]
  );

  return (
    <>
      <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <AgentShell>
          <div className="mx-auto max-w-6xl space-y-6">
            <Card className="overflow-hidden bg-primary text-white">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="glass">
                    <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
                    Simulated call live
                  </Badge>
                  <VoiceBadge session={session} />
                  <AiBadge generatedBy={session.generatedBy} />
                </div>
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <CardTitle className="text-4xl text-white">{session.clientFirstName} bot session</CardTitle>
                    <CardDescription className="mt-2 max-w-3xl text-base text-teal-50/90">
                      {session.propertyAddress} is in {session.stageLabel.toLowerCase()}. Concierge is narrowing the call so you only step in once the concern is clear and the meeting slot is ready.
                    </CardDescription>
                  </div>
                  <Button asChild type="button" variant="glass" className="hover:text-white">
                    <Link to="/agent/triage">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Triage
                    </Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mic className="h-5 w-5 text-primary" />
                      Current Bot Turn
                    </CardTitle>
                    <CardDescription>
                      The transcript is always visible. If ElevenLabs is configured, the latest bot turn also plays as audio.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-[24px] bg-slate-50 p-5">
                      <p className="text-sm leading-7 text-slate-700">
                        {session.currentBotTurn?.text ?? "The bot is waiting for the next step."}
                      </p>
                    </div>
                    {voiceWhyTransparency ? <WhyExpansion transparency={voiceWhyTransparency} /> : null}
                    <WhyExpansion transparency={session.transparency} />
                  </CardContent>
                </Card>

                <TranscriptCard session={session} />

                {session.prepBrief ? <PrepBriefCard brief={session.prepBrief} /> : null}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Concerns</CardTitle>
                    <CardDescription>These are the issues the bot is actively steering the conversation around.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {session.topConcerns.map((concern: string) => (
                      <span key={concern} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                        {concern}
                      </span>
                    ))}
                  </CardContent>
                </Card>

                {showBookedState ? (
                  <Card className="border-emerald-200 bg-emerald-50/70">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-emerald-950">
                        <CalendarCheck2 className="h-5 w-5" />
                        Booking Confirmed
                      </CardTitle>
                      <CardDescription className="text-emerald-900/80">
                        Concierge already locked the meeting and generated the prep brief for the agent follow-up.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-[20px] border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700">
                        {session.bookedSlot ? formatSlot(session.bookedSlot) : "Booked slot saved"}
                      </div>
                      {session.clientNewQuestion ? (
                        <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-700">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Final client note
                          </p>
                          <p className="leading-6">{session.clientNewQuestion}</p>
                        </div>
                      ) : null}
                      <div className="flex justify-end">
                        <Button asChild type="button" variant="accent">
                          <Link to="/agent/triage">Back to Triage</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : showClosedState ? (
                  <Card className="border-slate-200 bg-slate-50">
                    <CardHeader>
                      <CardTitle>Session Closed</CardTitle>
                      <CardDescription>
                        This bot session is no longer active. Head back to triage to decide the next agent follow-up.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end">
                      <Button asChild type="button" variant="outline">
                        <Link to="/agent/triage">Back to Triage</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : showCustomResponse ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Advance the Call</CardTitle>
                      <CardDescription>Choose a plausible client reply or type your own to keep the simulated call moving.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2">{responseButtons}</div>
                      <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-900">Custom client response</p>
                        <Textarea
                          value={customResponse}
                          onChange={(event) => setCustomResponse(event.target.value)}
                          placeholder="Type a custom client answer or concern..."
                        />
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="accent"
                            disabled={respondMutation.isPending || customResponse.trim().length < 3}
                            onClick={() => void handleResponse(customResponse.trim())}
                          >
                            {respondMutation.isPending ? "Sending..." : "Send Custom Response"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : showConfirmState ? (
                  <Card className="border-emerald-200 bg-emerald-50/70">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-emerald-950">
                        <CalendarCheck2 className="h-5 w-5" />
                        Confirm Booking
                      </CardTitle>
                      <CardDescription className="text-emerald-900/80">
                        The bot has enough context. Pick the slot to lock and capture one optional final question for the prep brief.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2">
                        {session.proposedSlots.map((slot: string) => (
                          <button
                            key={slot}
                            className={`rounded-[20px] border px-4 py-3 text-left text-sm transition ${
                              selectedSlot === slot
                                ? "border-primary bg-primary text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            }`}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {formatSlot(slot)}
                          </button>
                        ))}
                      </div>
                      <Textarea
                        value={clientNewQuestion}
                        onChange={(event) => setClientNewQuestion(event.target.value)}
                        placeholder="Optional: capture one last client question for James..."
                      />
                      <div className="flex justify-end">
                        <Button type="button" variant="accent" disabled={confirmDisabled} onClick={() => void handleConfirm()}>
                          {confirmMutation.isPending ? "Confirming..." : "Confirm Booking"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </section>
          </div>
        </AgentShell>
      </motion.main>

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

