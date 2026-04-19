import type { PropsWithChildren } from "react";

export function ClientShell({ children }: PropsWithChildren) {
  return <div className="page-shell">{children}</div>;
}
