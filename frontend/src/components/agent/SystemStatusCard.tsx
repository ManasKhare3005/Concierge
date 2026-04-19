import { CheckCircle2, CircleAlert, PlugZap } from "lucide-react";

import { useDiagnostics } from "@/hooks/useDiagnostics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function stateTone(state: string): string {
  if (state === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (state === "fallback" || state === "demo") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function SystemStatusCard() {
  const diagnosticsQuery = useDiagnostics();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <PlugZap className="h-5 w-5 text-primary" />
          System Status
        </CardTitle>
        <CardDescription>Live service status so the demo can show what is running on real integrations and what is in fallback.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {diagnosticsQuery.isLoading ? <p className="text-sm text-slate-500">Loading diagnostics...</p> : null}
        {diagnosticsQuery.isError ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Diagnostics could not be loaded.
          </div>
        ) : null}

        {diagnosticsQuery.data ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              {diagnosticsQuery.data.diagnostics.services.map((service) => (
                <div key={service.name} className={cn("rounded-[22px] border p-4", stateTone(service.state))}>
                  <div className="flex items-center gap-2">
                    {service.state === "error" ? <CircleAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    <p className="text-sm font-semibold uppercase tracking-[0.16em]">{service.name}</p>
                  </div>
                  <p className="mt-3 text-lg font-semibold">{service.state}</p>
                  <p className="mt-2 text-sm leading-6">{service.detail}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>Client origin: {diagnosticsQuery.data.diagnostics.clientOrigin}</p>
              <p className="mt-1">Database: {diagnosticsQuery.data.diagnostics.databaseUrl}</p>
              <p className="mt-1">Phase: {diagnosticsQuery.data.phase}</p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
