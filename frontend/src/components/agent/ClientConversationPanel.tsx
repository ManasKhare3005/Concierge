import { useEffect, useState } from "react";
import {
  formatVoiceBotSlotLabel,
  fromArizonaDateTimeInputValue,
  toArizonaDateTimeInputValue,
  type VoiceBotSessionRecord
} from "@shared";
import { CalendarClock, LoaderCircle, MessageSquareQuote, PhoneCall } from "lucide-react";

import { AiBadge } from "@/components/shared/AiBadge";
import { WhyExpansion } from "@/components/shared/WhyExpansion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUpdateBotSlots } from "@/hooks/useBotCall";

interface ClientConversationPanelProps {
  session: VoiceBotSessionRecord;
  token: string;
}

function sessionLabel(session: VoiceBotSessionRecord): string {
  if (session.status === "booked") {
    return "Meeting booked";
  }
  if (session.status === "pending") {
    return "Waiting for client reply";
  }
  if (session.status === "declined" || session.status === "failed") {
    return "Closed";
  }
  return "Conversation active";
}

export function ClientConversationPanel({ session, token }: ClientConversationPanelProps) {
  const updateSlots = useUpdateBotSlots(token);
  const [slotInputs, setSlotInputs] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setSlotInputs(session.proposedSlots.map((slot) => toArizonaDateTimeInputValue(slot)));
    setFeedback(null);
  }, [session.id, session.proposedSlots]);

  const canEditSlots = session.status === "pending" || session.status === "in_progress";

  async function handleSaveSlots() {
    const normalizedSlots = slotInputs.map((value) => fromArizonaDateTimeInputValue(value));
    if (normalizedSlots.some((value) => !value)) {
      setFeedback({
        type: "error",
        message: "Every slot needs a valid Arizona date and time before it can be saved."
      });
      return;
    }

    try {
      await updateSlots.mutateAsync({
        sessionId: session.id,
        proposedSlots: normalizedSlots.filter((value): value is string => Boolean(value))
      });
      setFeedback({
        type: "success",
        message: "Meeting slots updated. The client-side bot flow now shows the same times."
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Could not update the meeting slots."
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-teal-200 bg-teal-50 text-teal-800">{sessionLabel(session)}</Badge>
          <AiBadge generatedBy={session.generatedBy} />
        </div>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <PhoneCall className="h-5 w-5 text-primary" />
          {session.clientName} conversation
        </CardTitle>
        <CardDescription>
          This is the same Closing Day transcript the client sees in their transaction workspace. Use it to understand the concern before you call.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {session.topConcerns.map((concern) => (
            <span key={concern} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
              {concern}
            </span>
          ))}
        </div>

        {session.bookedSlot ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">Booked time</p>
            <p className="mt-2 text-lg font-semibold text-emerald-950">{formatVoiceBotSlotLabel(session.bookedSlot)}</p>
          </div>
        ) : null}

        {canEditSlots ? (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">Meeting slots</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              These drive both the on-screen slot buttons and the booking line in the Closing Day transcript. All times are Arizona time.
            </p>
            <div className="mt-4 grid gap-3">
              {slotInputs.map((slotValue, index) => (
                <div key={`${session.id}-slot-${index}`} className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Option {index + 1}</label>
                  <Input
                    type="datetime-local"
                    value={slotValue}
                    onChange={(event) =>
                      setSlotInputs((current) =>
                        current.map((value, currentIndex) => (currentIndex === index ? event.target.value : value))
                      )
                    }
                  />
                </div>
              ))}
            </div>
            {feedback ? (
              <div
                className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                  feedback.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="accent" disabled={updateSlots.isPending} onClick={() => void handleSaveSlots()}>
                {updateSlots.isPending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Saving slots...
                  </>
                ) : (
                  "Save Meeting Slots"
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {session.clientNewQuestion ? (
          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Final client note</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{session.clientNewQuestion}</p>
          </div>
        ) : null}

        <div>
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">Transcript</p>
          </div>
          <div className="mt-4 space-y-3">
            {session.script.map((turn, index) => (
              <div
                key={`${turn.speaker}-${index}-${turn.text.slice(0, 18)}`}
                className={`rounded-[24px] p-4 text-sm leading-7 ${
                  turn.speaker === "bot" ? "bg-primary text-white" : "border border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.16em] ${turn.speaker === "bot" ? "text-white/80" : "text-slate-500"}`}>
                  {turn.speaker === "bot" ? "Closing Day" : session.clientFirstName}
                </p>
                <p>{turn.text}</p>
              </div>
            ))}
          </div>
        </div>

        {session.prepBrief ? (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Prep brief</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{session.prepBrief.text}</p>
          </div>
        ) : null}

        <WhyExpansion transparency={session.transparency} />
      </CardContent>
    </Card>
  );
}
