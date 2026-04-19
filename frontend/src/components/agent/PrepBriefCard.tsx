import type { VoiceBotPrepBrief } from "@shared";
import { FileText } from "lucide-react";

import { AiBadge } from "@/components/shared/AiBadge";
import { WhyExpansion } from "@/components/shared/WhyExpansion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PrepBriefCardProps {
  brief: VoiceBotPrepBrief;
}

export function PrepBriefCard({ brief }: PrepBriefCardProps) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/80">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-emerald-950">
            <FileText className="h-5 w-5" />
            Agent Prep Brief
          </CardTitle>
          <p className="mt-2 text-sm text-emerald-900/80">
            Generated from the simulated conversation and recent transaction context.
          </p>
        </div>
        <AiBadge generatedBy={brief.generatedBy} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-7 text-emerald-950">{brief.text}</p>
        <WhyExpansion transparency={brief.transparency} />
      </CardContent>
    </Card>
  );
}
