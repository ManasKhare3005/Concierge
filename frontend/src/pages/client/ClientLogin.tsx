import { motion } from "framer-motion";
import { FolderOpen, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";

import { ClientShell } from "@/components/client/ClientShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ClientLoginPage() {
  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <ClientShell>
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <FolderOpen className="h-7 w-7 text-primary" />
                Client portal shell
              </CardTitle>
              <CardDescription className="text-base">
                Phase 2 will add password login, magic link access, and the seeded client portfolio experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>Planned seeded clients include Sarah Lee, Marcus Lee, Maria Gonzalez, and David Kim.</p>
              <p>This page is already routed and styled, so the next step is wiring real auth against the seeded data.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <KeyRound className="h-5 w-5 text-primary" />
                Access modes prepared
              </CardTitle>
              <CardDescription>
                Client auth will accept either a password session or a signed magic link token.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Planned Phase 2 endpoints:
                <div className="mt-2 font-mono text-xs text-slate-500">
                  POST /api/auth/client/login
                  <br />
                  POST /api/auth/client/set-password
                  <br />
                  GET /api/auth/client/me
                </div>
              </div>
              <Button asChild variant="outline">
                <Link to="/">Back to system status</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientShell>
    </motion.main>
  );
}
