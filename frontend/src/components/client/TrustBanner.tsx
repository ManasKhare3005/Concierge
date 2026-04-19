import type { SupportedLanguage } from "@/lib/i18n";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getClientCopy } from "@/lib/i18n";

interface TrustBannerProps {
  language: SupportedLanguage;
  isPaused: boolean;
  onTogglePause: () => void;
}

export function TrustBanner({ language, isPaused, onTogglePause }: TrustBannerProps) {
  const copy = getClientCopy(language);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.10),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,250,252,0.94)_100%)] p-5 shadow-glass backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{copy.trustBadgeLive}</Badge>
            <Badge className="border-slate-200 bg-slate-100 text-slate-700">{copy.trustBadgeOverride}</Badge>
            <Badge className="border-slate-200 bg-slate-100 text-slate-700">{copy.trustBadgeWhy}</Badge>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">{copy.trustTitle}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{copy.trustBody}</p>
            {isPaused ? <p className="mt-2 text-sm font-medium text-amber-700">{copy.trustPausedNotice}</p> : null}
          </div>
        </div>

        <Button type="button" variant="outline" onClick={onTogglePause}>
          {isPaused ? copy.trustPauseOff : copy.trustPauseOn}
        </Button>
      </div>
    </div>
  );
}
