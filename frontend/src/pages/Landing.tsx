import { motion } from "framer-motion";
import { ArrowRight, Building2, RadioTower, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDiagnostics } from "@/hooks/useDiagnostics";

export function LandingPage() {
  const diagnosticsQuery = useDiagnostics();

  return (
    <motion.main
      className="page-shell space-y-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-4">
            <Badge className="w-fit border-teal-200 bg-teal-50 text-teal-800">Phase 1 scaffold live</Badge>
            <CardTitle className="max-w-3xl text-4xl leading-tight md:text-5xl">
              Closing Day gives agents live AI context before confusion becomes a lost deal.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-slate-600">
              This fresh TypeScript rebuild now has the monorepo scaffold, Prisma data model, AI service wrappers,
              and a live frontend-to-backend diagnostics loop in place.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/agent/login">
                Agent Login Shell
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/client/login">Client Login Shell</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <RadioTower className="h-5 w-5 text-primary" />
              Backend handshake
            </CardTitle>
            <CardDescription>
              The frontend calls `GET /api/diagnostics/health` so Phase 1 finishes with a real integration check.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnosticsQuery.isLoading ? <p className="text-sm text-slate-500">Checking API status...</p> : null}
            {diagnosticsQuery.isError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                Unable to reach the backend yet. Start `pnpm dev` after install and this card will light up.
              </div>
            ) : null}
            {diagnosticsQuery.data ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  API connected at {diagnosticsQuery.data.timestamp}
                </div>
                <div className="space-y-2">
                  {diagnosticsQuery.data.diagnostics.services.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="font-medium capitalize text-slate-900">{service.name}</p>
                        <p className="text-sm text-slate-500">{service.detail}</p>
                      </div>
                      <Badge>{service.state}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Sparkles,
            title: "AI wrappers ready",
            body: "Groq and ElevenLabs helpers already follow the live-or-fallback pattern with transparency metadata."
          },
          {
            icon: Building2,
            title: "Schema modeled",
            body: "The full Prisma schema is in place so later phases can plug into seeded transactions without rebuilding the data layer."
          },
          {
            icon: RadioTower,
            title: "Realtime foundation",
            body: "The singleton event bus is live and ready for SSE fanout in the triage and client portals."
          }
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <item.icon className="h-5 w-5 text-primary" />
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-600">{item.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </motion.main>
  );
}
