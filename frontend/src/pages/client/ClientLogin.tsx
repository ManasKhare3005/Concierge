import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { FolderOpen, KeyRound } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { ClientShell } from "@/components/client/ClientShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useClientAuthStore } from "@/store/clientAuthStore";

const clientLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type ClientLoginValues = z.infer<typeof clientLoginSchema>;

export function ClientLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useClientAuthStore((state) => state.token);
  const setToken = useClientAuthStore((state) => state.setToken);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const magicLinkToken = searchParams.get("token");

  const form = useForm<ClientLoginValues>({
    resolver: zodResolver(clientLoginSchema),
    defaultValues: {
      email: "sarah@closingday.demo",
      password: "demo123"
    }
  });

  const magicLinkQuery = useQuery({
    queryKey: ["client", "magic-link", magicLinkToken],
    enabled: Boolean(magicLinkToken && !token),
    retry: false,
    queryFn: async () => {
      await api.get("/api/auth/client/me", {
        params: {
          token: magicLinkToken
        }
      });
      return true;
    }
  });

  useEffect(() => {
    if (magicLinkQuery.isSuccess && magicLinkToken) {
      setToken(magicLinkToken);
      navigate("/client/portfolio", { replace: true });
    }
  }, [magicLinkQuery.isSuccess, magicLinkToken, navigate, setToken]);

  if (token) {
    return <Navigate to="/client/portfolio" replace />;
  }

  async function onSubmit(values: ClientLoginValues) {
    setSubmitError(null);

    try {
      const response = await api.post<{ token: string }>("/api/auth/client/login", values);
      setToken(response.data.token);
      navigate("/client/portfolio", { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <ClientShell>
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <FolderOpen className="h-7 w-7 text-primary" />
                Client portal
              </CardTitle>
              <CardDescription className="text-base">
                Password login is live, and visiting this page with a `?token=` query now resolves a seeded magic link too.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>Try Sarah Lee with sarah@closingday.demo / demo123.</p>
              <p>Maria, Marcus, and David are seeded too, along with real transaction records and document placeholders.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <KeyRound className="h-5 w-5 text-primary" />
                Sign In
              </CardTitle>
              <CardDescription>
                Client auth accepts password sessions today and auto-validates magic-link tokens when present.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {magicLinkToken ? (
                <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                  {magicLinkQuery.isLoading
                    ? "Checking your magic link..."
                    : magicLinkQuery.isError
                      ? "That magic link could not be validated. You can still sign in with email and password."
                      : "Magic link accepted. Redirecting you into the client portal..."}
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="client-email">
                    Email
                  </label>
                  <Input id="client-email" type="email" {...form.register("email")} />
                  {form.formState.errors.email ? (
                    <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="client-password">
                    Password
                  </label>
                  <Input id="client-password" type="password" {...form.register("password")} />
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
                  {form.formState.isSubmitting ? "Signing in..." : "Open Client Portfolio"}
                </Button>
              </form>

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
