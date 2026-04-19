import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToastProps {
  open: boolean;
  title: string;
  description?: string;
  variant?: "error" | "success" | "info";
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

export function Toast({
  open,
  title,
  description,
  variant = "info",
  actionLabel,
  onAction,
  onClose
}: ToastProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-[24px] border bg-white/95 p-4 shadow-[0_18px_45px_rgba(2,6,23,0.14)] backdrop-blur",
        variant === "error" && "border-rose-200",
        variant === "success" && "border-emerald-200",
        variant === "info" && "border-slate-200"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        <button className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={onClose} type="button">
          <X className="h-4 w-4" />
        </button>
      </div>

      {actionLabel && onAction ? (
        <div className="mt-3 flex justify-end">
          <Button onClick={onAction} type="button" variant={variant === "error" ? "outline" : "ghost"}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
