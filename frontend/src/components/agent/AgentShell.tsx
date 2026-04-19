import type { PropsWithChildren } from "react";

export function AgentShell({ children }: PropsWithChildren) {
  return <div className="page-shell">{children}</div>;
}
