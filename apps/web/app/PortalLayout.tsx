"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useWorkspace();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);


  const navItems = [
    { name: "Dashboard", href: "/usage", icon: "dashboard" },
    { name: "Providers", href: "/providers", icon: "settings_input_component" },
    { name: "Combos", href: "/combos", icon: "layers" },
    { name: "Models", href: "/models", icon: "layers" },
    { name: "Playground", href: "/playground", icon: "play_circle" },
    { name: "Billing", href: "/billing", icon: "payments" },
    { name: "Settings", href: "/settings", icon: "settings" },
    ...(user?.role === "admin" ? [{ name: "Admin CMS", href: "/admin", icon: "admin_panel_settings" }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-bg text-text-main relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-surface border-r border-border transform transition-[width,transform] duration-300 ease-in-out sm:translate-x-0 sm:static shrink-0 overflow-x-hidden ${isCollapsed ? "w-20" : "w-64"
          } ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Floating Collapse Button for PC */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-8 z-50 hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text-muted hover:text-text-main shadow-sm transition-transform hover:scale-110 focus:outline-none"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>

        <div className={`p-4 border-b border-border flex items-center h-20 shrink-0 ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <Link href="/" className={`flex items-center gap-3 ${isCollapsed ? "mx-auto" : ""}`}>
            <div className="size-10 min-w-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-[24px]">bolt</span>
            </div>
            {!isCollapsed && <span className="text-xl font-bold tracking-tight whitespace-nowrap">Tinobot</span>}
          </Link>
          <button
            className="sm:hidden text-text-muted hover:text-text-main focus:outline-none flex items-center justify-center p-1"
            onClick={() => setIsSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden ${isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-text-muted hover:bg-surface-hover hover:text-text-main"
                    } ${isCollapsed ? "justify-center px-0" : ""}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <span className={`material-symbols-outlined shrink-0 ${isActive ? "text-[22px]" : "text-[20px]"}`}>{item.icon}</span>
                  {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border flex flex-col gap-2 shrink-0">
          <div className={`flex ${isCollapsed ? "flex-col justify-center items-center gap-4" : "items-center gap-3 px-2"} py-2`}>
            <div className="size-10 min-w-10 shrink-0 rounded-full bg-surface-hover border border-border flex items-center justify-center text-sm font-bold text-text-main">
              {user?.name?.[0] || "U"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 transition-opacity duration-300">
                <p className="text-sm font-semibold truncate text-text-main">{user?.name || "User"}</p>
                <p className="text-xs text-text-muted truncate">{user?.email}</p>
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
              className={`text-text-muted hover:text-red-500 focus:outline-none p-1 transition-colors ${isCollapsed ? "" : "shrink-0"}`}
              title="Logout"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 sm:pl-0">
        <header className="h-16 border-b border-border bg-surface px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              className="sm:hidden text-text-muted hover:text-text-main focus:outline-none flex items-center justify-center p-1"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
