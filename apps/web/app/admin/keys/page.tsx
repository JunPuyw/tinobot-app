"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-surface-hover rounded-md animate-pulse ${className}`} />
);

type Key = {
  id: string;
  name: string;
  key: string;
  prefix: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
};

export default function AdminKeysPage() {
  const { data, isLoading, mutate } = useSWR<{ keys: Key[] }>("/api/admin/keys", fetcher, {
    refreshInterval: 60000,
  });
  const [revoking, setRevoking] = useState<string | null>(null);
  const [filter,   setFilter]   = useState("");

  const keys = (data?.keys || []).filter(k =>
    !filter ||
    k.name.toLowerCase().includes(filter.toLowerCase()) ||
    k.user.email.toLowerCase().includes(filter.toLowerCase())
  );

  async function revoke(userId: string, keyId: string) {
    if (!confirm("Permanently revoke this API key?")) return;
    setRevoking(keyId);
    await fetch(`/api/admin/users/${userId}/keys/${keyId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setRevoking(null);
    mutate();
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">vpn_key</span>
            API Key Management
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {isLoading ? "Loading…" : `${keys.length} key${keys.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by name or user email…"
          className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary/60 transition-colors w-72"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/40">
                {["Key Name", "Owner", "Prefix", "Created", "Action"].map(h => (
                  <th key={h} className="px-5 py-4 font-bold text-text-muted uppercase text-[10px] tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl opacity-10">key_off</span>
                      <p className="italic">No keys found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-5 py-4 font-semibold text-text-main">{k.name}</td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-text-main">{k.user.name || "—"}</p>
                        <p className="text-[11px] text-text-muted">{k.user.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-[11px] bg-surface px-2.5 py-1 rounded-lg border border-border text-amber-500">
                        {k.prefix}_••••••••
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[11px] text-text-muted whitespace-nowrap">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => revoke(k.user.id, k.id)}
                        disabled={revoking === k.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-semibold transition-all disabled:opacity-40"
                      >
                        <span className={`material-symbols-outlined text-[14px] ${revoking === k.id ? "animate-spin" : ""}`}>
                          {revoking === k.id ? "progress_activity" : "delete"}
                        </span>
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
