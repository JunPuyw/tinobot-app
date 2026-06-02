"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-surface-hover rounded-md animate-pulse ${className}`} />
);

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isBanned: boolean;
  createdAt: string;
  _count: { apiKeys: number; connections: number };
};

type DetailUser = User & {
  apiKeys: { id: string; name: string; key: string; prefix: string; createdAt: string }[];
  connections: { id: string; provider: string; name: string | null; isActive: boolean; testStatus: string }[];
};

// ── User Detail Drawer ────────────────────────────────────────────────────────
function UserDrawer({
  userId,
  onClose,
  onMutate,
}: {
  userId: string;
  onClose: () => void;
  onMutate: () => void;
}) {
  const { data, isLoading, mutate } = useSWR<{ user: DetailUser }>(
    `/api/admin/users/${userId}`,
    fetcher
  );
  const u = data?.user;

  async function revokeKey(keyId: string) {
    if (!confirm("Revoke this API key permanently?")) return;
    await fetch(`/api/admin/users/${userId}/keys/${keyId}`, {
      method: "DELETE",
      credentials: "include",
    });
    mutate();
    onMutate();
  }

  async function toggleBan() {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBanned: !u?.isBanned }),
    });
    mutate();
    onMutate();
  }

  async function setRole(role: string) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    mutate();
    onMutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-xl h-full bg-surface border-l border-border flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text-main">{u?.name || "Unknown"}</h2>
            <p className="text-sm text-text-muted">{u?.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-main transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : u ? (
            <>
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Role" value={u.role} />
                <InfoItem label="Status" value={u.isBanned ? "⛔ Banned" : "✅ Active"} />
                <InfoItem label="API Keys" value={String(u._count.apiKeys)} />
                <InfoItem label="Connections" value={String(u._count.connections)} />
                <InfoItem label="Joined" value={new Date(u.createdAt).toLocaleDateString()} className="col-span-2" />
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={toggleBan}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    u.isBanned
                      ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                      : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{u.isBanned ? "check_circle" : "block"}</span>
                  {u.isBanned ? "Unban User" : "Ban User"}
                </button>
                {u.role !== "admin" ? (
                  <button
                    onClick={() => setRole("admin")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">shield</span>
                    Make Admin
                  </button>
                ) : (
                  <button
                    onClick={() => setRole("user")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-surface-hover text-text-muted hover:text-text-main transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    Remove Admin
                  </button>
                )}
              </div>

              {/* API Keys */}
              <div>
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-3">
                  API Keys ({u.apiKeys.length})
                </h3>
                {u.apiKeys.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No API keys</p>
                ) : (
                  <div className="space-y-2">
                    {u.apiKeys.map((k) => (
                      <div key={k.id} className="flex items-center justify-between gap-2 bg-bg rounded-xl px-4 py-3 border border-border">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-main truncate">{k.name}</p>
                          <p className="text-[11px] text-text-muted font-mono">{k.prefix}-••••••••</p>
                        </div>
                        <button
                          onClick={() => revokeKey(k.id)}
                          className="shrink-0 p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Revoke key"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connections */}
              <div>
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-3">
                  AI Connections ({u.connections.length})
                </h3>
                {u.connections.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No connections</p>
                ) : (
                  <div className="space-y-2">
                    {u.connections.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 bg-bg rounded-xl px-4 py-3 border border-border">
                        <span className="material-symbols-outlined text-[18px] text-text-muted">hub</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-main">{c.provider}</p>
                          <p className="text-[11px] text-text-muted">{c.name || "Unnamed"}</p>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            c.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {c.isActive ? "Active" : "Off"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-text-muted italic">User not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`bg-bg rounded-xl px-4 py-3 border border-border ${className || ""}`}>
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{label}</p>
      <p className="text-sm font-semibold text-text-main mt-0.5">{value}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState("");
  const [query,   setQuery]   = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const url = `/api/admin/users?page=${page}&limit=20${query ? `&search=${encodeURIComponent(query)}` : ""}`;
  const { data, isLoading, mutate } = useSWR<{ users: User[]; total: number; pages: number }>(
    url,
    fetcher
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  };

  const handleDelete = useCallback(async (userId: string) => {
    if (!confirm("Permanently delete this user and ALL their data? This cannot be undone.")) return;
    setDeleting(userId);
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE", credentials: "include" });
    setDeleting(null);
    if (selected === userId) setSelected(null);
    mutate();
  }, [selected, mutate]);

  const users  = data?.users  || [];
  const pages  = data?.pages  || 1;
  const total  = data?.total  || 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">group</span>
            User Management
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {isLoading ? "Loading…" : `${total} user${total !== 1 ? "s" : ""} total`}
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary/60 transition-colors w-64"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/40">
                {["User", "Role", "Status", "Keys", "Connections", "Joined", "Actions"].map(h => (
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
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl opacity-10">person_search</span>
                      <p className="italic">No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-primary/[0.02] transition-colors group cursor-pointer ${
                      selected === u.id ? "bg-primary/5" : ""
                    }`}
                    onClick={() => setSelected(u.id)}
                  >
                    {/* User */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-surface-hover border border-border flex items-center justify-center text-sm font-bold text-text-main shrink-0">
                          {u.name?.[0] || (u.email?.[0] ? u.email[0].toUpperCase() : "U")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-main truncate max-w-[160px] group-hover:text-primary transition-colors">
                            {u.name || "—"}
                          </p>
                          <p className="text-[11px] text-text-muted truncate max-w-[160px]">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        u.role === "admin"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-surface text-text-muted border border-border"
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${
                        u.isBanned
                          ? "bg-red-500/10 text-red-500"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}>
                        <span className="material-symbols-outlined text-[12px]">
                          {u.isBanned ? "block" : "check_circle"}
                        </span>
                        {u.isBanned ? "Banned" : "Active"}
                      </span>
                    </td>

                    {/* Counts */}
                    <td className="px-5 py-4 tabular-nums font-medium text-text-muted">{u._count.apiKeys}</td>
                    <td className="px-5 py-4 tabular-nums font-medium text-text-muted">{u._count.connections}</td>

                    {/* Joined */}
                    <td className="px-5 py-4 text-[11px] text-text-muted whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelected(u.id)}
                          className="p-1.5 rounded-lg hover:bg-blue-500/10 text-text-muted hover:text-blue-500 transition-colors"
                          title="View details"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deleting === u.id}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Delete user"
                        >
                          <span className={`material-symbols-outlined text-[16px] ${deleting === u.id ? "animate-spin" : ""}`}>
                            {deleting === u.id ? "progress_activity" : "delete"}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-surface/20">
            <p className="text-sm text-text-muted">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <UserDrawer
          userId={selected}
          onClose={() => setSelected(null)}
          onMutate={() => mutate()}
        />
      )}
    </div>
  );
}
