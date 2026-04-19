import type { AgentActivityItem } from "@shared";
import { BellRing } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  items: AgentActivityItem[];
  latestLiveActivityId?: string;
}

function itemTone(severity?: number): string {
  if ((severity ?? 0) >= 4) {
    return "border-rose-200 bg-rose-50";
  }
  if ((severity ?? 0) >= 3) {
    return "border-amber-200 bg-amber-50";
  }
  return "border-slate-200 bg-slate-50";
}

export function ActivityFeed({ items, latestLiveActivityId }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <BellRing className="h-5 w-5 text-primary" />
          Activity Feed
        </CardTitle>
        <CardDescription>The last 20 live transaction events, updated the moment a client or agent action lands.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Waiting for the first live event...
          </div>
        ) : null}

        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-[22px] border p-4 transition",
              itemTone(item.severity),
              item.id === latestLiveActivityId && "highlight-flash"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
              <p className="shrink-0 text-xs font-mono text-slate-500">
                {new Date(item.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
