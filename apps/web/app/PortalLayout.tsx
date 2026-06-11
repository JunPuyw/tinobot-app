"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useTranslation } from "@/i18n/runtime";

const navItems = [
  { name: "Dashboard", href: "/usage", icon: "dashboard" },
  { name: "Providers", href: "/providers", icon: "settings_input_component" },
  { name: "Combos", href: "/combos", icon: "layers" },
  { name: "Models", href: "/models", icon: "dataset" },
  { name: "Playground", href: "/playground", icon: "play_circle" },
  { name: "Billing", href: "/billing", icon: "payments" },
  { name: "Settings", href: "/settings", icon: "settings" },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useWorkspace();
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const allNavItems = [
    ...navItems,
    ...(user?.role === "admin"
      ? [{ name: "Admin CMS", href: "/admin", icon: "admin_panel_settings" }]
      : []),
  ];

  const currentPage = allNavItems.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
  const pageTitle = t(currentPage?.name ?? "Portal");
  const pageIcon = currentPage?.icon ?? "grid_view";
  const avatarLetter = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-bg text-text-main">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/35 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          border-r border-border bg-surface/95 shadow-[18px_0_50px_-35px_rgba(36,33,29,0.35)] backdrop-blur-xl
          transform transition-[width,transform] duration-300 ease-in-out
          lg:translate-x-0 lg:sticky lg:top-0 lg:h-[100dvh] shrink-0 overflow-x-hidden
          ${isCollapsed ? "w-[72px]" : "w-64"}
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_10px_24px_-14px_rgba(217,120,47,0.9)]">
              <span className="material-symbols-outlined text-[20px] text-white">bolt</span>
            </div>
            {!isCollapsed && (
              <span className="whitespace-nowrap text-[17px] font-bold tracking-tight text-text-main">
                Tinobot
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-text-main focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 lg:flex"
            title={isCollapsed ? t("Expand") : t("Collapse")}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>

          <button
            className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-main focus:outline-none lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <nav className="app-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3">
          {allNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <div key={item.href} className="group/nav relative">
                <Link
                  href={item.href}
                  className={`
                    flex items-center overflow-hidden rounded-xl text-sm font-medium
                    transition-all duration-150 active:scale-[0.98]
                    ${isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_12px_26px_-18px_rgba(217,120,47,0.95)]"
                        : "text-text-muted hover:bg-surface-hover hover:text-text-main"
                    }
                  `}
                >
                  {isActive && !isCollapsed && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-foreground/90" />
                  )}
                  <span
                    className={`material-symbols-outlined shrink-0 transition-all duration-150 ${
                      isActive ? "text-[22px]" : "text-[20px]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="whitespace-nowrap">{t(item.name)}</span>}
                </Link>

                {isCollapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/nav:opacity-100">
                    <div className="whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-main shadow-lg">
                      {t(item.name)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          {!isCollapsed && <LanguageSwitcher className="mb-3 w-full justify-center" />}

          <div className={`flex ${isCollapsed ? "flex-col items-center gap-3" : "items-center gap-3"} py-1`}>
            <div className="group/avatar relative">
              <div className="flex size-8 min-w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-xs font-bold text-primary">
                {avatarLetter}
              </div>
              {isCollapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/avatar:opacity-100">
                  <div className="min-w-[140px] rounded-lg border border-border bg-surface px-2.5 py-2 shadow-lg">
                    <p className="truncate text-xs font-semibold text-text-main">
                      {user?.name || t("User")}
                    </p>
                    <p className="truncate text-[11px] text-text-muted">{user?.email}</p>
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-main">
                  {user?.name || t("User")}
                </p>
                <p className="truncate text-xs text-text-muted">{user?.email}</p>
              </div>
            )}

            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/user/logout");
                  window.location.href = "/login";
                } catch (e) {
                  console.error("Logout failed", e);
                }
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
              title={t("Logout")}
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-bg/85 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-main focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <span className="material-symbols-outlined shrink-0 rounded-lg bg-primary/10 p-1 text-[18px] text-primary">
                {pageIcon}
              </span>
              <span className="truncate text-sm font-semibold text-text-main">{pageTitle}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <LanguageSwitcher compact className="hidden sm:inline-flex" />
            <div className="hidden cursor-default items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 shadow-sm transition-colors hover:border-primary/30 sm:flex">
              <div className="flex size-6 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-[11px] font-bold text-primary">
                {avatarLetter}
              </div>
              <span className="max-w-[120px] truncate text-xs font-medium text-text-main">
                {user?.name || t("User")}
              </span>
            </div>
          </div>
        </header>

        <div className="app-scrollbar min-h-0 min-w-0 flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
