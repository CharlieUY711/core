"use client";

import { useI18n } from "@/lib/experience/i18n-context";
import { Locale } from "@/lib/experience/i18n";

const LOCALES: { value: Locale; label: string }[] = [
  { value: "es", label: "ES" },
  { value: "pt", label: "PT" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map((l, i) => (
        <span key={l.value} className="flex items-center gap-1">
          <button
            onClick={() => setLocale(l.value)}
            className={`text-xs font-medium tracking-widest uppercase transition-colors px-1 py-0.5 ${
              locale === l.value
                ? "text-white"
                : "text-[var(--subtle)] hover:text-[var(--muted)]"
            }`}
          >
            {l.label}
          </button>
          {i < LOCALES.length - 1 && (
            <span className="text-[var(--subtle)] text-xs">·</span>
          )}
        </span>
      ))}
    </div>
  );
}
