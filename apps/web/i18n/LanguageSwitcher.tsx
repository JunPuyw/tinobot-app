"use client";

import { useEffect } from "react";
import { useTranslation, type Locale } from "@/i18n/runtime";

type LanguageSwitcherProps = {
  className?: string;
  compact?: boolean;
};

const options: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "EN" },
  { value: "vi", label: "VI" },
];

export default function LanguageSwitcher({ className = "", compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-1 py-1 text-xs font-semibold shadow-sm ${className}`}
      aria-label={t("Language")}
    >
      {!compact && (
        <span className="material-symbols-outlined px-1 text-[16px] text-text-muted">language</span>
      )}
      {options.map((option) => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLocale(option.value)}
            className={`min-w-8 rounded-lg px-2 py-1 transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-text-muted hover:bg-surface-hover hover:text-text-main"
            }`}
            aria-pressed={active}
            title={option.value === "en" ? t("English") : t("Vietnamese")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
