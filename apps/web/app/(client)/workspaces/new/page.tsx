"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function NewWorkspacePage() {
  const router = useRouter();
  const { refreshAll } = useWorkspace();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError("Workspace name must be at least 3 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/user/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });

      if (res.ok) {
        await refreshAll(); // Refresh global list and user status
        router.push("/portal"); // Redirect to dashboard
      } else {
        const d = await res.json();
        setError(d.error || "Failed to create workspace");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="rounded-2xl bg-card p-8 shadow-2xl border border-primary/10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[32px]">corporate_fare</span>
          </div>
          <h1 className="text-3xl font-bold text-text-main tracking-tight italic">
            New <span className="text-primary italic">Team</span> Workspace
          </h1>
          <p className="text-sm text-text-muted mt-2">
            Collaborate with your team, share models, and manage pooled usage.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1">Workspace Name</label>
            <input
              placeholder="e.g. Acme AI Team"
              value={name}
              onChange={(e: any) => { setName(e.target.value); setError(""); }}
              className={`flex h-10 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${error ? "border-red-500" : ""}`}
              required
              autoFocus
            />
            {error && <p className="text-xs text-red-500 font-medium ml-1">{error}</p>}
          </div>

          <div className="bg-surface/50 p-4 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">Includes</span>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-xs text-text-muted">
                <span className="material-symbols-outlined text-[14px] text-primary">check_circle</span>
                Multi-user management (RBAC)
              </li>
              <li className="flex items-center gap-2 text-xs text-text-muted">
                <span className="material-symbols-outlined text-[14px] text-primary">check_circle</span>
                Shared BYOK Providers & Fallback Combos
              </li>
              <li className="flex items-center gap-2 text-xs text-text-muted">
                <span className="material-symbols-outlined text-[14px] text-primary">check_circle</span>
                Unified Transactional Quota (10.00$ Limit)
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 w-full">
              {loading ? <span className="material-symbols-outlined animate-spin text-[18px] mr-2">progress_activity</span> : null}
              Initialize Workspace
            </button>
            <button type="button" onClick={() => router.back()} disabled={loading} className="inline-flex items-center justify-center rounded-xl border border-border bg-transparent px-8 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 w-full">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <p className="text-[10px] text-center text-text-muted mt-8 uppercase tracking-tighter">
        9router Multi-Tenancy Architecture • v3 Hardened
      </p>
    </div>
  );
}
