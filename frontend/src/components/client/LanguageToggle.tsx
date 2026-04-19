import type { SupportedLanguage } from "@/lib/i18n";

interface LanguageToggleProps {
  language: SupportedLanguage;
  label: string;
  onChange: (language: SupportedLanguage) => void;
}

export function LanguageToggle({ language, label, onChange }: LanguageToggleProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(248,250,252,0.94)_100%)] p-3 shadow-glass">
      <p className="px-2 pb-3 pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: "en" as const, label: "English" },
          { value: "es" as const, label: "Espanol" }
        ].map((option) => (
          <button
            key={option.value}
            className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
              language === option.value
                ? "bg-primary text-white shadow-[0_12px_28px_rgba(15,79,76,0.18)]"
                : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
