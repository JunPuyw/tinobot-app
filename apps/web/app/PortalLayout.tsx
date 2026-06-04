"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const allNavItems = [
    ...navItems,
    ...(user?.role === "admin" ? [{ name: "Admin CMS", href: "/admin", icon: "admin_panel_settings" }] : []),
  ];

  // Derive current page title from pathname
  const currentPage = allNavItems.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  const pageTitle = currentPage?.name ?? "Portal";
  const pageIcon = currentPage?.icon ?? "grid_view";

  const avatarLetter = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex min-h-screen bg-bg text-text-main relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 sm:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          bg-surface border-r border-border
          transform transition-[width,transform] duration-300 ease-in-out
          sm:translate-x-0 sm:sticky sm:top-0 sm:h-screen shrink-0 overflow-x-hidden
          ${isCollapsed ? "w-[72px]" : "w-64"}
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center h-16 shrink-0 border-b border-border px-4 justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 min-w-0"
          >
            <div className="size-9 min-w-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
              <span className="material-symbols-outlined text-white text-[20px]">bolt</span>
            </div>
            {!isCollapsed && (
              <span className="text-[17px] font-bold tracking-tight whitespace-nowrap text-text-main">
                Tinobot
              </span>
            )}
          </Link>

          {/* Collapse toggle (desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors focus:outline-none shrink-0"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>

          {/* Mobile close */}
          <button
            className="sm:hidden text-text-muted hover:text-text-main p-1 rounded-lg focus:outline-none"
            onClick={() => setIsSidebarOpen(false)}
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3 space-y-0.5">
          {allNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <div key={item.href} className="relative group/nav">
                <Link
                  href={item.href}
                  className={`
                    flex items-center rounded-xl text-sm font-medium
                    transition-all duration-150 overflow-hidden
                    ${isCollapsed
                      ? "justify-center py-2.5 px-0"
                      : "gap-3 px-3 py-2.5"
                    }
                    ${isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-muted hover:bg-surface-hover hover:text-text-main"
                    }
                  `}
                >
                  {/* Active left accent bar (expanded only) */}
                  {isActive && !isCollapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
                  )}
                  <span
                    className={`material-symbols-outlined shrink-0 transition-all duration-150 ${
                      isActive ? "text-[22px]" : "text-[20px]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {/* Label — hidden when collapsed */}
                  {!isCollapsed && (
                    <span className="whitespace-nowrap">{item.name}</span>
                  )}
                </Link>

                {/* Tooltip — visible only when collapsed */}
                {isCollapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[60] opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
                    <div className="bg-surface border border-border text-text-main text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                      {item.name}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User / Bottom */}
        <div className="p-3 border-t border-border shrink-0">
          <div className={`flex ${isCollapsed ? "flex-col items-center gap-3" : "items-center gap-3"} py-1`}>
            {/* Avatar */}
            <div className={`relative group/avatar ${isCollapsed ? "" : ""}`}>
              <div className="size-8 min-w-8 shrink-0 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                {avatarLetter}
              </div>
              {/* Tooltip for avatar when collapsed */}
              {isCollapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60] opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150">
                  <div className="bg-surface border border-border rounded-lg shadow-lg px-2.5 py-2 min-w-[140px]">
                    <p className="text-xs font-semibold text-text-main truncate">{user?.name || "User"}</p>
                    <p className="text-[11px] text-text-muted truncate">{user?.email}</p>
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-text-main">{user?.name || "User"}</p>
                <p className="text-xs text-text-muted truncate">{user?.email}</p>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/user/logout");
                  window.location.href = "/login";
                } catch (e) {
                  console.error("Logout failed", e);
                }
              }}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors focus:outline-none shrink-0"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-border bg-surface/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Left: hamburger (mobile) + page title */}
          <div className="flex items-center gap-3">
            <button
              className="sm:hidden text-text-muted hover:text-text-main focus:outline-none p-1 rounded-lg hover:bg-surface-hover transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>

            {/* Page breadcrumb */}
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">{pageIcon}</span>
              <span className="text-sm font-semibold text-text-main">{pageTitle}</span>
            </div>
          </div>

          {/* Right: user chip */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface-hover hover:border-primary/30 transition-colors cursor-default">
              <div className="size-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[11px] font-bold text-primary">
                {avatarLetter}
              </div>
              <span className="text-xs font-medium text-text-main max-w-[120px] truncate">{user?.name || "User"}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 xl:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
