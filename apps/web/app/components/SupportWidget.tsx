"use client";
import Image from "next/image";
import React, { useState, useEffect, useRef } from "react";
import { supportConfig, SupportPlatform } from "../../config/support";
import { useTranslation, Locale } from "@/i18n/runtime";


const icons = {
  zalo: "/icons/zalo.svg",
  messenger: "/icons/facebook.svg",
  telegram: "/icons/telegram.svg",
  phone: "/icons/phone.svg",
  email: "/icons/email.svg",
  default: "/icons/default.svg",
} as const;

type IconName = keyof typeof icons;

const getPlatformIcon = (iconName: string) => {
  const src =
    iconName in icons
      ? icons[iconName as IconName]
      : icons.default;

  return (
    <Image
      src={src}
      alt={iconName}
      width={20}
      height={20}
      className="w-5 h-5 shrink-0"
    />
  );
};
function localized(field: { en: string; vi: string }, locale: Locale) {
  return locale === "vi" ? field.vi : field.en;
}

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const { locale, t } = useTranslation();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        widgetRef.current &&
        !widgetRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activePlatforms = supportConfig.platforms.filter((p) => p.isActive);
  if (activePlatforms.length === 0) return null;

  return (
    <div
      ref={widgetRef}
      className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end"
    >
      {/* Popover Support Panel */}
      {isOpen && (
        <div
          className="
            absolute bottom-16 right-0 mb-3 w-[340px] max-w-[calc(100vw-2rem)]
            rounded-3xl border border-border bg-surface/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-xl
            animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out
          "
        >
          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="min-w-0">
              <h4 className="text-base font-bold text-text-main leading-tight">
                {localized(supportConfig.title, locale)}
              </h4>
              <p className="mt-1 text-xs text-text-muted leading-relaxed">
                {localized(supportConfig.subtitle, locale)}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="
                flex h-7 w-7 items-center justify-center rounded-full border border-border
                bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main
                transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20
              "
              aria-label={t("Close")}
            >
              <span className="material-symbols-outlined text-[16px] font-semibold">
                close
              </span>
            </button>
          </div>

          {/* Platforms List */}
          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto app-scrollbar pr-0.5">
            {activePlatforms.map((platform: SupportPlatform) => {
              const accentColor = platform.color;
              return (
                <a
                  key={platform.id}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="
                    group flex items-center gap-3.5 rounded-2xl border border-border/40
                    bg-surface/50 p-3 text-left transition-all duration-200
                    hover:scale-[1.02] hover:bg-surface hover:border-border hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)]
                    active:scale-[0.98]
                  "
                >
                  {/* Icon Wrapper */}
                  <div
                    className="flex size-11 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-md"
                    style={{
                      backgroundColor: `${accentColor}12`,
                      color: accentColor,
                    }}
                  >
                    {getPlatformIcon(platform.icon)}
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-text-main group-hover:text-primary transition-colors">
                      {localized(platform.name, locale)}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-text-muted">
                      {localized(platform.description, locale)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div
                    className="
                      flex size-7 items-center justify-center rounded-lg border border-border/30
                      bg-surface-hover/30 text-text-muted/60 opacity-0 -translate-x-2
                      transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0
                    "
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      arrow_forward
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Pulsing halo */}
      <div
        className="pointer-events-none absolute -inset-1.5 rounded-full bg-primary/20 animate-pulse blur-sm transition-opacity duration-300"
        style={{ opacity: isOpen ? 0 : 0.8 }}
      />

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          relative flex h-14 w-14 items-center justify-center rounded-full
          bg-gradient-to-tr from-primary to-orange-400 text-white shadow-[0_10px_30px_-6px_rgba(217,120,47,0.5)]
          transition-all duration-300 hover:scale-105 active:scale-95
          focus:outline-none focus:ring-4 focus:ring-primary/30
        "
        aria-label={localized(supportConfig.title, locale)}
        style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-6 h-6 animate-in fade-in zoom-in-50 duration-200"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-6 h-6 animate-in fade-in zoom-in-50 duration-200"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
