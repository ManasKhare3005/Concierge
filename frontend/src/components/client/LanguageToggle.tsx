import type { SupportedLanguage } from "@/lib/i18n";

interface LanguageToggleProps {
  language: SupportedLanguage;
  label: string;
  onChange: (language: SupportedLanguage) => void;
}

export function LanguageToggle({ language, label, onChange }: LanguageToggleProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-2">
      <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: "en" as const, label: "English" },
          { value: "es" as const, label: "Espanol" }
        ].map((option) => (
          <button
            key={option.value}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              language === option.value
                ? "bg-primary text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
