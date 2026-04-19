import type { GeneratedBy } from "@shared";

import { Badge } from "@/components/ui/badge";

interface AiBadgeProps {
  generatedBy: GeneratedBy;
}

export function AiBadge({ generatedBy }: AiBadgeProps) {
  return (
    <Badge className={generatedBy === "anthropic" ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700"}>
      {generatedBy === "anthropic" ? "AI live" : "Fallback"}
    </Badge>
  );
}
