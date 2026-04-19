import type { PropsWithChildren } from "react";
import { Building2, Repeat2, Settings2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

export function AgentShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const showNav = location.pathname !== "/agent/login";

  return (
    <div className="page-shell space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Closing Day</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Agent workspace</h1>
        </div>

        {showNav ? (
          <nav className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm">
            {[
              {
                to: "/agent/triage",
                label: "Triage",
                icon: Building2
              },
              {
                to: "/agent/settings",
                label: "Settings",
                icon: Settings2
              },
              {
                to: "/agent/repeat-clients",
                label: "Repeat Clients",
                icon: Repeat2
              }
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  location.pathname === item.to
                    ? "bg-primary text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      {children}
    </div>
  );
}
