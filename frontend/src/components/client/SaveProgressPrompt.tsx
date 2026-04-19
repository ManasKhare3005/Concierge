import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { SupportedLanguage } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getClientCopy } from "@/lib/i18n";
import { useClientAuthStore } from "@/store/clientAuthStore";

interface SaveProgressPromptProps {
  token: string;
  language: SupportedLanguage;
}

export function SaveProgressPrompt({ token, language }: SaveProgressPromptProps) {
  const copy = getClientCopy(language);
  const queryClient = useQueryClient();
  const setToken = useClientAuthStore((state) => state.setToken);
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSavePassword() {
    if (password.trim().length < 6) {
      setError(copy.passwordPlaceholder);
      setMessage(null);
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await api.post<{ token: string }>("/api/auth/client/set-password", { password }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setToken(response.data.token);
      setPassword("");
      setMessage(copy.saveProgressSuccess);
      await queryClient.invalidateQueries({ queryKey: ["client", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["client", "portfolio"] });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : copy.saveProgressError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50/90">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-amber-950">
          <ShieldCheck className="h-5 w-5" />
          {copy.saveProgressTitle}
        </CardTitle>
        <CardDescription className="text-amber-900/80">{copy.saveProgressBody}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-7 text-amber-950">{copy.saveProgressTrust}</p>
        <div className="space-y-2">
          <label className="text-sm font-medium text-amber-950">{copy.passwordLabel}</label>
          <Input
            type="password"
            value={password}
            placeholder={copy.passwordPlaceholder}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <Button type="button" variant="accent" disabled={isSaving} onClick={() => void handleSavePassword()}>
          {isSaving ? copy.savingPassword : copy.saveProgressButton}
        </Button>
      </CardContent>
    </Card>
  );
}
