"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useWorkspace } from "@/context/WorkspaceContext";

const Button = ({ children, className, variant = "primary", size = "md", loading, disabled, ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    secondary: "border border-border bg-transparent shadow-sm hover:bg-surface",
    danger: "bg-red-500 text-white shadow hover:bg-red-600",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 py-2",
  };
  return (
    <button 
      className={`${baseStyle} ${variants[variant as keyof typeof variants] || variants.primary} ${sizes[size as keyof typeof sizes] || sizes.md} ${className || ""}`} 
      disabled={loading || disabled} 
      {...props}
    >
      {loading && <span className="material-symbols-outlined animate-spin mr-2 text-[16px]">progress_activity</span>}
      {children}
    </button>
  );
};

const Input = ({ className, ...props }: any) => (
  <input className={`flex h-10 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className || ""}`} {...props} />
);

export default function ApiKeyManager() {
  const { activeWorkspace } = useWorkspace();
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR(
    activeWorkspace ? `/api/auth/user/api-keys?workspaceId=${activeWorkspace.id}` : null,
    (url) => fetch(url, {
      headers: { "X-Workspace-Id": activeWorkspace?.id || "" }
    }).then(r => r.json())
  );

  const keys = data?.keys || [];

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || !activeWorkspace) return;

    setCreating(true);
    try {
      const res = await fetch("/api/auth/user/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace.id
        },
        body: JSON.stringify({ name: newKeyName, workspaceId: activeWorkspace.id })
      });

      if (res.ok) {
        const result = await res.json();
        setCreatedKey(result.key);
        setNewKeyName("");
        await mutate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?") || !activeWorkspace) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/auth/user/api-keys/${id}`, {
        method: "DELETE",
        headers: { "X-Workspace-Id": activeWorkspace.id }
      });

      if (res.ok) {
        await mutate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-6 border border-border rounded-2xl bg-surface/50">
        <h3 className="text-lg font-bold">Workspace API Keys</h3>
        <p className="text-sm text-text-muted">Use these keys to authenticate your requests from external applications.</p>
        
        {createdKey && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-widest">Key Created Successfully</p>
            <p className="text-sm text-text-main mb-3">Copy this key now. You won&apos;t be able to see it again.</p>
            <div className="flex gap-2">
              <code className="flex-1 p-2 bg-black/20 rounded border border-border text-xs break-all select-all font-mono">
                {createdKey}
              </code>
              <Button size="sm" variant="secondary" onClick={() => setCreatedKey(null)}>Done</Button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateKey} className="mt-6 flex flex-col sm:flex-row gap-3">
          <Input 
            placeholder="Key Name (e.g., Production Server)" 
            value={newKeyName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewKeyName(e.target.value)}
          />
          <Button type="submit" loading={creating} disabled={!newKeyName.trim()}>Create New Key</Button>
        </form>

        <div className="mt-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-text-muted text-[10px] uppercase font-bold tracking-widest">
                  <th className="py-3 px-2">Name</th>
                  <th className="py-3 px-2">Key Prefix</th>
                  <th className="py-3 px-2">Created</th>
                  <th className="py-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-2"><div className="h-4 w-32 bg-muted rounded"></div></td>
                      <td className="py-4 px-2"><div className="h-4 w-16 bg-muted rounded"></div></td>
                      <td className="py-4 px-2"><div className="h-4 w-24 bg-muted rounded"></div></td>
                      <td className="py-4 px-2 text-right"><div className="h-4 w-16 bg-muted rounded ml-auto"></div></td>
                    </tr>
                  ))
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-text-muted italic">No API keys found for this workspace.</td>
                  </tr>
                ) : (
                  keys.map((key: any) => (
                    <tr key={key.id} className="hover:bg-primary/[0.02] transition-colors">
                      <td className="py-4 px-2 font-medium">{key.name}</td>
                      <td className="py-4 px-2 font-mono text-xs opacity-60">{key.prefix}-...</td>
                      <td className="py-4 px-2 text-text-muted text-xs">{new Date(key.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-2 text-right">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="!text-red-500 border-red-500/20 hover:bg-red-500/10"
                          onClick={() => handleDeleteKey(key.id)}
                          loading={deletingId === key.id}
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
