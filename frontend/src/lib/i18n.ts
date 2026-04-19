export type SupportedLanguage = "en" | "es";

const translations = {
  en: {
    phaseBadge: "Phase 1 scaffold"
  },
  es: {
    phaseBadge: "Base de la fase 1"
  }
} as const;

export function t(language: SupportedLanguage, key: keyof (typeof translations)["en"]): string {
  return translations[language][key];
}
