import type { AgentTriageRoi } from "@shared";
import { DollarSign, Gauge, TimerReset } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface RoiRibbonProps {
  roi: AgentTriageRoi;
}

export function RoiRibbon({ roi }: RoiRibbonProps) {
  return (
    <Card className="overflow-hidden border border-emerald-200 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
      <CardContent className="grid gap-4 p-5 md:grid-cols-3">
        <div className="flex items-start gap-3">
          <TimerReset className="mt-1 h-5 w-5 text-emerald-100" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Time Saved</p>
            <p className="mt-2 text-3xl font-semibold">{roi.estimatedMinutesSaved} min</p>
            <p className="mt-1 text-sm text-emerald-100/90">Recovered by keeping low-risk clients out of the urgent pile.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <DollarSign className="mt-1 h-5 w-5 text-emerald-100" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Revenue Protected</p>
            <p className="mt-2 text-3xl font-semibold">${roi.estimatedRevenueProtected.toLocaleString()}</p>
            <p className="mt-1 text-sm text-emerald-100/90">Estimated deal value kept on track through faster triage.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Gauge className="mt-1 h-5 w-5 text-emerald-100" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">Focus Recovered</p>
            <p className="mt-2 text-3xl font-semibold">{roi.focusRecoveredMinutes} min</p>
            <p className="mt-1 text-sm text-emerald-100/90">{roi.lowTouchClients} clients are safe to manage with lighter-touch follow-up.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
