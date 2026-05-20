"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());

const STAT_CARDS = [
  { key: "totalUsers",       label: "Total Users",       icon: "group",           color: "blue" },
  { key: "totalKeys",        label: "API Keys",           icon: "key",             color: "amber" },
  { key: "totalConnections", label: "AI Connections",     icon: "hub",             color: "emerald" },
  { key: "bannedUsers",      label: "Banned Users",       icon: "block",           color: "red" },
  { key: "totalLogs",        label: "Router Log Entries", icon: "receipt_long",    color: "indigo" },
];

const colors: Record<string, string> = {
  blue:    "bg-blue-500/10   text-blue-500   border-blue-500/20",
  amber:   "bg-amber-500/10  text-amber-500  border-amber-500/20",
  emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  red:     "bg-red-500/10    text-red-500    border-red-500/20",
  indigo:  "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-surface-hover rounded-md animate-pulse ${className}`} />
);

export default function AdminOverviewPage() {
  const { data, isLoading } = useSWR<any>("/api/admin/stats", fetcher, { refreshInterval: 30000 });

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-main flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-[32px]">admin_panel_settings</span>
          Admin Overview
        </h1>
        <p className="text-text-muted mt-1.5 font-medium">
          System-wide statistics and management shortcuts
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {STAT_CARDS.map(({ key, label, icon, color }) => (
          <div
            key={key}
            className="rounded-2xl border border-border bg-card p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-lg"
          >
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1 opacity-70">{label}</p>
                {isLoading
                  ? <Skeleton className="h-9 w-16 mt-1" />
                  : <p className="text-3xl font-bold text-text-main tracking-tight">{data?.[key] ?? "—"}</p>
                }
              </div>
              <div className={`p-2.5 rounded-2xl border-2 shadow-md ${colors[color]}`}>
                <span className="material-symbols-outlined text-[24px] group-hover:scale-125 transition-transform">{icon}</span>
              </div>
            </div>
            <div className="absolute -right-5 -bottom-5 opacity-[0.04] rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-500">
              <span className="material-symbols-outlined text-[90px]">{icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "Manage Users",     desc: "View, ban, or delete user accounts", href: "/admin/users", icon: "manage_accounts", color: "blue" },
          { title: "API Keys",         desc: "Revoke or inspect system API keys",   href: "/admin/keys",  icon: "vpn_key",         color: "amber" },
          { title: "Router Audit Log", desc: "View all routing decisions",          href: "/admin/logs",  icon: "route",           color: "indigo" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-border bg-card p-6 group hover:-translate-y-1 hover:border-border/80 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col gap-4"
          >
            <div className={`size-12 rounded-2xl flex items-center justify-center ${colors[card.color]} border-2`}>
              <span className="material-symbols-outlined text-[26px] group-hover:scale-110 transition-transform">{card.icon}</span>
            </div>
            <div>
              <p className="font-bold text-text-main group-hover:text-primary transition-colors">{card.title}</p>
              <p className="text-sm text-text-muted mt-0.5">{card.desc}</p>
            </div>
            <span className="material-symbols-outlined text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all self-end">arrow_forward</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
