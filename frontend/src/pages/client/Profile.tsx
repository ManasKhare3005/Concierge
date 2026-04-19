import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Home, LoaderCircle, LogOut, PhoneCall, SearchCheck, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";

import { ClientShell } from "@/components/client/ClientShell";
import { LanguageToggle } from "@/components/client/LanguageToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useClientDiscoveryProfile } from "@/hooks/useClientDiscoveryProfile";
import { api } from "@/lib/api";
import { normalizeLanguage, type SupportedLanguage } from "@/lib/i18n";
import { useClientAuthStore } from "@/store/clientAuthStore";

const profileFormSchema = z.object({
  firstName: z.string().trim().min(1, "Required"),
  lastName: z.string().trim().min(1, "Required"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9()\-\s]+$/, "Enter a valid phone number")
    .or(z.literal("")),
  preferredLanguage: z.enum(["en", "es"]),
  targetCitiesText: z.string().trim(),
  priceMinText: z.string().trim(),
  priceMaxText: z.string().trim(),
  bedroomsMinText: z.string().trim(),
  bathroomsMinText: z.string().trim(),
  timeline: z.string().trim(),
  propertyStyle: z.string().trim(),
  mustHavesText: z.string().trim(),
  dealBreakersText: z.string().trim(),
  notes: z.string().trim()
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface CallMeResponse {
  call: {
    success: boolean;
    message: string;
    generatedBy: "elevenlabs" | "fallback";
    conversationId?: string;
    callSid?: string;
  };
}

const pageCopy = {
  en: {
    badge: "Profile and search",
    title: "Tell Concierge what home fits your life.",
    description:
      "Save your contact details and search preferences so we can surface better Arizona matches and, if configured, let the AI call you to refine your criteria.",
    back: "Back to Portfolio",
    save: "Save Profile",
    saving: "Saving...",
    call: "Call Me About My Search",
    calling: "Starting call...",
    basicTitle: "Your details",
    basicBody: "These details power your client experience and give the AI enough context to personalize follow-up.",
    searchTitle: "Search preferences",
    searchBody: "Use plain English. The current matching layer turns these into ranked demo property suggestions.",
    matchesTitle: "Suggested matches",
    matchesBody: "These are demo Arizona listings scored against your saved profile.",
    noMatches: "Save a few preferences to get tighter matches.",
    liveCall: "Live call",
    fallbackCall: "Fallback",
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone number",
    language: "Preferred language",
    targetCities: "Target cities",
    targetCitiesHint: "One city per line or comma-separated",
    priceMin: "Minimum price",
    priceMax: "Maximum price",
    bedroomsMin: "Minimum bedrooms",
    bathroomsMin: "Minimum bathrooms",
    timeline: "Timeline",
    propertyStyle: "Property style",
    mustHaves: "Must-haves",
    dealBreakers: "Deal-breakers",
    notes: "Notes for the AI",
    recommendationReasons: "Why it matches",
    saveSuccess: "Profile saved and recommendations refreshed.",
    saveError: "Could not save the profile.",
    callNeedsPhone: "Add a phone number before requesting a call."
  },
  es: {
    badge: "Perfil y busqueda",
    title: "Dile a Concierge que tipo de casa encaja contigo.",
    description:
      "Guarda tus datos y preferencias para mostrar mejores opciones en Arizona y, si esta configurado, dejar que la IA te llame para afinar tu busqueda.",
    back: "Volver al portafolio",
    save: "Guardar perfil",
    saving: "Guardando...",
    call: "Llamarme sobre mi busqueda",
    calling: "Iniciando llamada...",
    basicTitle: "Tus datos",
    basicBody: "Estos datos ayudan a personalizar tu experiencia y la siguiente conversacion.",
    searchTitle: "Preferencias de busqueda",
    searchBody: "Usa lenguaje sencillo. La capa actual convierte esto en coincidencias demo clasificadas.",
    matchesTitle: "Propiedades sugeridas",
    matchesBody: "Estas son propiedades demo de Arizona ordenadas segun tu perfil guardado.",
    noMatches: "Guarda algunas preferencias para obtener mejores coincidencias.",
    liveCall: "Llamada en vivo",
    fallbackCall: "Alternativa",
    firstName: "Nombre",
    lastName: "Apellido",
    phone: "Telefono",
    language: "Idioma preferido",
    targetCities: "Ciudades objetivo",
    targetCitiesHint: "Una ciudad por linea o separadas por comas",
    priceMin: "Precio minimo",
    priceMax: "Precio maximo",
    bedroomsMin: "Habitaciones minimas",
    bathroomsMin: "Banos minimos",
    timeline: "Tiempo esperado",
    propertyStyle: "Tipo de propiedad",
    mustHaves: "Imprescindibles",
    dealBreakers: "Lo que no quieres",
    notes: "Notas para la IA",
    recommendationReasons: "Por que coincide",
    saveSuccess: "Perfil guardado y coincidencias actualizadas.",
    saveError: "No se pudo guardar el perfil.",
    callNeedsPhone: "Agrega un telefono antes de pedir una llamada.",
    aiFollowUpTitle: "Seguimiento con IA",
    aiFollowUpBody:
      "Concierge puede usar tu telefono guardado para iniciar una llamada guiada por IA cuando ElevenLabs tenga la llamada saliente configurada."
  }
} as const;

const englishFollowUpCopy = {
  aiFollowUpTitle: "AI follow-up",
  aiFollowUpBody:
    "Concierge can use your saved phone number to start an AI-led discovery call when ElevenLabs outbound calling is configured."
} as const;

const localizedPageCopy = {
  en: {
    ...pageCopy.en,
    ...englishFollowUpCopy
  }
};

function splitList(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeNumericValue(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function ClientProfilePage() {
  const queryClient = useQueryClient();
  const token = useClientAuthStore((state) => state.token);
  const preferredLanguage = useClientAuthStore((state) => state.preferredLanguage);
  const setPreferredLanguage = useClientAuthStore((state) => state.setPreferredLanguage);
  const logout = useClientAuthStore((state) => state.logout);
  const profileQuery = useClientDiscoveryProfile(token);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<"elevenlabs" | "fallback" | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      preferredLanguage: "en",
      targetCitiesText: "",
      priceMinText: "",
      priceMaxText: "",
      bedroomsMinText: "",
      bathroomsMinText: "",
      timeline: "",
      propertyStyle: "",
      mustHavesText: "",
      dealBreakersText: "",
      notes: ""
    }
  });

  useEffect(() => {
    if (profileQuery.isError) {
      logout();
    }
  }, [logout, profileQuery.isError]);

  useEffect(() => {
    if (!profileQuery.data || preferredLanguage) {
      return;
    }

    setPreferredLanguage(normalizeLanguage(profileQuery.data.client.preferredLanguage));
  }, [preferredLanguage, profileQuery.data, setPreferredLanguage]);

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    const searchProfile = profileQuery.data.client.searchProfile;

    form.reset({
      firstName: profileQuery.data.client.firstName,
      lastName: profileQuery.data.client.lastName,
      phone: profileQuery.data.client.phone ?? "",
      preferredLanguage: normalizeLanguage(profileQuery.data.client.preferredLanguage),
      targetCitiesText: searchProfile?.targetCities.join("\n") ?? "",
      priceMinText: searchProfile?.priceMin ? String(searchProfile.priceMin) : "",
      priceMaxText: searchProfile?.priceMax ? String(searchProfile.priceMax) : "",
      bedroomsMinText: searchProfile?.bedroomsMin ? String(searchProfile.bedroomsMin) : "",
      bathroomsMinText: searchProfile?.bathroomsMin ? String(searchProfile.bathroomsMin) : "",
      timeline: searchProfile?.timeline ?? "",
      propertyStyle: searchProfile?.propertyStyle ?? "",
      mustHavesText: searchProfile?.mustHaves.join("\n") ?? "",
      dealBreakersText: searchProfile?.dealBreakers.join("\n") ?? "",
      notes: searchProfile?.notes ?? ""
    });
  }, [form, profileQuery.data]);

  if (!token) {
    return <Navigate to="/client/login" replace />;
  }

  if (profileQuery.isLoading) {
    return (
      <ClientShell>
        <Card>
          <CardContent className="p-8 text-sm text-slate-600">Loading your profile...</CardContent>
        </Card>
      </ClientShell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return <Navigate to="/client/portfolio" replace />;
  }

  const language: SupportedLanguage =
    preferredLanguage ?? normalizeLanguage(profileQuery.data.client.preferredLanguage);
  const copy = language === "es" ? pageCopy.es : localizedPageCopy.en;

  async function handleSave(values: ProfileFormValues) {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      await api.patch(
        "/api/client/profile",
        {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
          preferredLanguage: values.preferredLanguage,
          searchProfile: {
            targetCities: splitList(values.targetCitiesText),
            ...(normalizeNumericValue(values.priceMinText)
              ? { priceMin: normalizeNumericValue(values.priceMinText) }
              : {}),
            ...(normalizeNumericValue(values.priceMaxText)
              ? { priceMax: normalizeNumericValue(values.priceMaxText) }
              : {}),
            ...(normalizeNumericValue(values.bedroomsMinText)
              ? { bedroomsMin: normalizeNumericValue(values.bedroomsMinText) }
              : {}),
            ...(normalizeNumericValue(values.bathroomsMinText)
              ? { bathroomsMin: normalizeNumericValue(values.bathroomsMinText) }
              : {}),
            ...(values.timeline.trim() ? { timeline: values.timeline.trim() } : {}),
            ...(values.propertyStyle.trim() ? { propertyStyle: values.propertyStyle.trim() } : {}),
            mustHaves: splitList(values.mustHavesText),
            dealBreakers: splitList(values.dealBreakersText),
            ...(values.notes.trim() ? { notes: values.notes.trim() } : {})
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setPreferredLanguage(values.preferredLanguage);
      setSaveMessage(copy.saveSuccess);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["client", "discovery-profile", token] }),
        queryClient.invalidateQueries({ queryKey: ["client", "me", token] })
      ]);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : copy.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCallMe() {
    const phoneValue = form.getValues("phone");
    if (!phoneValue.trim()) {
      setCallMessage(copy.callNeedsPhone);
      setCallStatus("fallback");
      return;
    }

    setIsCalling(true);
    setCallMessage(null);
    setCallStatus(null);

    try {
      const response = await api.post<CallMeResponse>(
        "/api/client/profile/call-me",
        {
          ...(phoneValue.trim() ? { phone: phoneValue.trim() } : {})
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setCallMessage(response.data.call.message);
      setCallStatus(response.data.call.generatedBy);
    } catch (error) {
      setCallMessage(error instanceof Error ? error.message : copy.saveError);
      setCallStatus("fallback");
    } finally {
      setIsCalling(false);
    }
  }

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <ClientShell>
        <div className="mx-auto max-w-7xl space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <Badge className="w-fit border-teal-200 bg-teal-50 text-teal-800">{copy.badge}</Badge>
                <CardTitle className="text-4xl">{copy.title}</CardTitle>
                <CardDescription className="max-w-3xl text-base">{copy.description}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link to="/client/portfolio">{copy.back}</Link>
                </Button>
                <Button variant="outline" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[0.8fr_0.4fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <UserRound className="h-5 w-5 text-primary" />
                  {copy.basicTitle}
                </CardTitle>
                <CardDescription>{copy.basicBody}</CardDescription>
              </CardHeader>
              <CardContent>
                <LanguageToggle language={language} label={copy.language} onChange={setPreferredLanguage} />
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
              <CardHeader>
                <CardTitle className="text-white">{copy.aiFollowUpTitle}</CardTitle>
                <CardDescription className="text-emerald-50/90">
                  {copy.aiFollowUpBody}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full text-teal-900 hover:text-teal-900" variant="white" disabled={isCalling} onClick={() => void handleCallMe()}>
                  {isCalling ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      {copy.calling}
                    </>
                  ) : (
                    <>
                      <PhoneCall className="mr-2 h-4 w-4" />
                      {copy.call}
                    </>
                  )}
                </Button>
                {callMessage ? (
                  <div className="rounded-[20px] border border-white/20 bg-white/10 p-4 text-sm text-white">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="glass">
                        {callStatus === "elevenlabs" ? copy.liveCall : copy.fallbackCall}
                      </Badge>
                    </div>
                    {callMessage}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <form className="space-y-6" onSubmit={form.handleSubmit(handleSave)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <SearchCheck className="h-5 w-5 text-primary" />
                  {copy.searchTitle}
                </CardTitle>
                <CardDescription>{copy.searchBody}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.firstName}</label>
                    <Input {...form.register("firstName")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.lastName}</label>
                    <Input {...form.register("lastName")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.phone}</label>
                    <Input placeholder="+1 480 555 0199" {...form.register("phone")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.language}</label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/40"
                      {...form.register("preferredLanguage")}
                    >
                      <option value="en">English</option>
                      <option value="es">Espanol</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.targetCities}</label>
                    <Textarea placeholder={copy.targetCitiesHint} {...form.register("targetCitiesText")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.mustHaves}</label>
                    <Textarea placeholder={copy.targetCitiesHint} {...form.register("mustHavesText")} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.priceMin}</label>
                    <Input inputMode="numeric" placeholder="450000" {...form.register("priceMinText")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.priceMax}</label>
                    <Input inputMode="numeric" placeholder="750000" {...form.register("priceMaxText")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.bedroomsMin}</label>
                    <Input inputMode="numeric" placeholder="3" {...form.register("bedroomsMinText")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.bathroomsMin}</label>
                    <Input inputMode="numeric" placeholder="2" {...form.register("bathroomsMinText")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.propertyStyle}</label>
                    <Input placeholder="single_family" {...form.register("propertyStyle")} />
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.timeline}</label>
                    <Input placeholder="Need to move in 2-3 months" {...form.register("timeline")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">{copy.dealBreakers}</label>
                    <Textarea placeholder={copy.targetCitiesHint} {...form.register("dealBreakersText")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{copy.notes}</label>
                  <Textarea
                    className="min-h-32"
                    placeholder="Need a quiet work-from-home setup, good school access, and less weekend maintenance."
                    {...form.register("notes")}
                  />
                </div>

                {saveMessage ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {saveMessage}
                  </div>
                ) : null}
                {saveError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {saveError}
                  </div>
                ) : null}

                <Button disabled={isSaving} type="submit">
                  {isSaving ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      {copy.saving}
                    </>
                  ) : (
                    copy.save
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Home className="h-5 w-5 text-primary" />
                {copy.matchesTitle}
              </CardTitle>
              <CardDescription>{copy.matchesBody}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileQuery.data.recommendedProperties.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  {copy.noMatches}
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-3">
                  {profileQuery.data.recommendedProperties.map((property) => (
                    <div key={property.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-lg font-semibold text-slate-900">{property.address}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {property.city}, {property.state} {property.zip}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge>${property.price.toLocaleString()}</Badge>
                        <Badge>{property.bedrooms} bd</Badge>
                        <Badge>{property.bathrooms} ba</Badge>
                        <Badge>{property.squareFeet.toLocaleString()} sf</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{property.summary}</p>
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {copy.recommendationReasons}
                        </p>
                        {property.matchReasons.map((reason) => (
                          <div key={reason} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ClientShell>
    </motion.main>
  );
}

