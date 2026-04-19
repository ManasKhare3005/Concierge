import { motion } from "framer-motion";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { AgentShell } from "@/components/agent/AgentShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AgentLoginPage() {
  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <AgentShell>
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="bg-primary text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-3xl text-white">
                <ShieldCheck className="h-7 w-7 text-emerald-300" />
                Agent workspace
              </CardTitle>
              <CardDescription className="text-base text-teal-50/90">
                Phase 2 will turn this into the live agent login flow with seeded credentials and the initial triage shell.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-teal-50/90">
              <p>Planned first agent credential: james@closingday.demo / demo123</p>
              <p>The backend auth routes are scaffolded already, so this page is ready for the next phase.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <LockKeyhole className="h-5 w-5 text-primary" />
                Login shell ready
              </CardTitle>
              <CardDescription>
                The visual shell is in place so we can wire the real auth flow without redoing layout work.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Auth endpoints will be activated in Phase 2:
                <div className="mt-2 font-mono text-xs text-slate-500">
                  POST /api/auth/agent/login
                  <br />
                  GET /api/auth/agent/me
                </div>
              </div>
              <Button asChild variant="outline">
                <Link to="/">Back to system status</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AgentShell>
    </motion.main>
  );
}
