import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = ({ className, ...props }: DialogPrimitive.DialogOverlayProps) => {
  return (
    <DialogPrimitive.Overlay
      className={cn("fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm", className)}
      {...props}
    />
  );
};

const DialogContent = ({ className, children, ...props }: DialogPrimitive.DialogContentProps) => {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[min(92vw,40rem)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-glass backdrop-blur",
          className
        )}
        {...props}
      >
        {children}
        <DialogClose className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
};

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("space-y-2", className)} {...props} />;
};

const DialogTitle = ({ className, ...props }: DialogPrimitive.DialogTitleProps) => {
  return <DialogPrimitive.Title className={cn("text-xl font-semibold text-ink", className)} {...props} />;
};

const DialogDescription = ({ className, ...props }: DialogPrimitive.DialogDescriptionProps) => {
  return <DialogPrimitive.Description className={cn("text-sm text-slate-600", className)} {...props} />;
};

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
};
