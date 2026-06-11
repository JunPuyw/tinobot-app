"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useTranslation } from "@/i18n/runtime";

const adminNav = [
  { name: "Overview",  href: "/admin",       icon: "admin_panel_settings" },
  { name: "Users",     href: "/admin/users",  icon: "group" },
  { name: "Packages",  href: "/admin/packages", icon: "inventory_2" },
  { name: "Gateway Billing", href: "/admin/gateway-settings", icon: "payments" },
  { name: "API Keys",  href: "/admin/keys",   icon: "key" },
  { name: "Router Log",href: "/admin/logs",   icon: "route" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-bg text-text-main">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 sm:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-surface border-r border-border transform transition-[width,transform] duration-300 ease-in-out sm:sticky sm:top-0 sm:h-[100dvh] sm:translate-x-0 shrink-0 overflow-x-hidden ${
          collapsed ? "w-20" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-4 top-8 z-50 hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text-muted hover:text-text-main shadow-sm transition-transform hover:scale-110 focus:outline-none"
        >
          <span className="material-symbols-outlined text-[20px]">
            {collapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>

        {/* Logo */}
        <div className={`p-4 border-b border-border flex items-center h-20 shrink-0 ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="size-10 min-w-10 rounded-xl bg-error flex items-center justify-center shrink-0 shadow-lg shadow-error/20">
            <span className="material-symbols-outlined text-white text-[22px]">shield_person</span>
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-text-main leading-tight">{t("Admin CMS")}</p>
              <p className="text-[10px] text-error font-semibold uppercase tracking-widest">Tinobot</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="p-3 flex-1 overflow-y-auto min-h-0">
          <nav className="space-y-1.5">
            {adminNav.map((item) => {
              const isActive = item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden ${
                    isActive
                      ? "bg-error/10 text-error shadow-sm"
                      : "text-text-muted hover:bg-surface-hover hover:text-text-main"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? t(item.name) : undefined}
                >
                  <span className={`material-symbols-outlined shrink-0 ${isActive ? "text-[22px]" : "text-[20px]"}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="whitespace-nowrap">{t(item.name)}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border shrink-0 flex flex-col gap-2">
          {!collapsed && <LanguageSwitcher className="mb-1 w-full justify-center" />}
          <Link
            href="/usage"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-hover hover:text-text-main transition-all ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? t("Back to App") : undefined}
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            {!collapsed && <span>{t("Back to App")}</span>}
          </Link>
          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/user/logout");
                window.location.href = "/login";
              } catch (e) {
                console.error("Logout failed", e);
              }
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-all w-full text-left ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? t("Logout") : undefined}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            {!collapsed && <span>{t("Logout")}</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="sm:hidden text-text-muted hover:text-text-main p-1 focus:outline-none"
              onClick={() => setMobileOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="text-xs font-bold text-error uppercase tracking-widest bg-error/10 px-2.5 py-1 rounded-full">
              {t("Admin Panel")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact className="hidden sm:inline-flex" />
            <Link href="/usage" className="text-text-muted hover:text-text-main text-sm flex items-center gap-1.5 transition-colors">
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              {t("User Portal")}
            </Link>
          </div>
        </header>
        <div className="app-scrollbar min-h-0 flex-1 overflow-auto p-4 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
