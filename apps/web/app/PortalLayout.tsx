"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeWorkspace, workspaces, switchWorkspace, user } = useWorkspace();

  const navItems = [
    { name: "Dashboard", href: "/usage", icon: "dashboard" },
    { name: "Providers", href: "/providers", icon: "settings_input_component" },
    { name: "Combos", href: "/combos", icon: "layers" },
    { name: "Playground", href: "/playground", icon: "play_circle" },
    { name: "Billing", href: "/billing", icon: "payments" },
    { name: "Settings", href: "/settings", icon: "settings" },
  ];

  return (
    <div className="flex min-h-screen bg-bg text-text-main">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col">
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[20px]">bolt</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Tinobot</span>
          </Link>
        </div>

        <div className="p-4 flex-1">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-muted hover:bg-surface-hover hover:text-text-main"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="size-8 rounded-full bg-surface-hover flex items-center justify-center text-xs font-bold">
              {user?.name?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name || "User"}</p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-surface px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <select
              value={activeWorkspace?.id}
              onChange={(e) => {
                const ws = workspaces.find((w) => w.id === e.target.value);
                if (ws) switchWorkspace(ws);
              }}
              className="bg-surface-hover border border-border rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
