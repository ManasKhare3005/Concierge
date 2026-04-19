import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";

import { AgentShell } from "@/components/agent/AgentShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAgentAuthStore } from "@/store/agentAuthStore";

const agentLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type AgentLoginValues = z.infer<typeof agentLoginSchema>;

export function AgentLoginPage() {
  const navigate = useNavigate();
  const token = useAgentAuthStore((state) => state.token);
  const setToken = useAgentAuthStore((state) => state.setToken);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<AgentLoginValues>({
    resolver: zodResolver(agentLoginSchema),
    defaultValues: {
      email: "james@concierge.demo",
      password: "demo123"
    }
  });

  if (token) {
    return <Navigate to="/agent/triage" replace />;
  }

  async function onSubmit(values: AgentLoginValues) {
    setSubmitError(null);

    try {
      const response = await api.post<{ token: string }>("/api/auth/agent/login", values);
      setToken(response.data.token);
      navigate("/agent/triage", { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }

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
                Sign in with the seeded demo account and land directly in the live triage board.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-teal-50/90">
              <p>Seeded login: james@concierge.demo / demo123</p>
              <p>The seeded data, live triage buckets, and realtime activity stream are all connected to the local SQLite demo.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <LockKeyhole className="h-5 w-5 text-primary" />
                Sign In
              </CardTitle>
              <CardDescription>
                Bearer-token auth is live against the seeded SQLite demo database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="agent-email">
                    Email
                  </label>
                  <Input id="agent-email" type="email" {...form.register("email")} />
                  {form.formState.errors.email ? (
                    <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="agent-password">
                    Password
                  </label>
                  <Input id="agent-password" type="password" {...form.register("password")} />
                  {form.formState.errors.password ? (
                    <p className="text-xs text-rose-600">{form.formState.errors.password.message}</p>
                  ) : null}
                </div>

                {submitError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                  </div>
                ) : null}

                <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
                  {form.formState.isSubmitting ? "Signing in..." : "Enter Agent Workspace"}
                </Button>
              </form>

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

