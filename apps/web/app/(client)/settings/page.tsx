"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useWorkspace } from "@/context/WorkspaceContext";

const Card = ({ children, className, title, subtitle }: any) => (
  <div className={`rounded-2xl border border-border bg-card shadow-sm ${className || ""}`}>
    {(title || subtitle) && (
      <div className="flex flex-col gap-1.5 p-6 pb-0">
        {title && <h3 className="font-semibold leading-none tracking-tight">{title}</h3>}
        {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
      </div>
    )}
    <div className={title || subtitle ? "p-6 pt-4" : className ? "" : "p-6"}>{children}</div>
  </div>
);

const Button = ({ children, className, variant = "primary", size = "md", loading, fullWidth, ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    secondary: "border border-border bg-transparent shadow-sm hover:bg-surface",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 py-2",
    lg: "h-11 px-8 py-3",
  };
  return (
    <button className={`${baseStyle} ${variants[variant as keyof typeof variants] || variants.primary} ${sizes[size as keyof typeof sizes] || sizes.md} ${fullWidth ? "w-full" : ""} ${className || ""}`} disabled={loading} {...props}>
      {loading && <span className="material-symbols-outlined animate-spin mr-2 text-[16px]">progress_activity</span>}
      {children}
    </button>
  );
};

const Input = ({ className, ...props }: any) => (
  <input className={`flex h-10 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className || ""}`} {...props} />
);

const Badge = ({ children, className, variant = "primary" }: any) => {
  const variants = {
    primary: "bg-primary/10 text-primary",
    neutral: "bg-secondary/10 text-text-muted",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant as keyof typeof variants] || variants.primary} ${className || ""}`}>
      {children}
    </span>
  );
};
import InviteManager from "@/app/portal/InviteManager";
import ApiKeyManager from "@/app/portal/ApiKeyManager";
import { useRouter } from "next/navigation";

export default function WorkspaceSettingsPage() {
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [wsName, setWsName] = useState("");
  const [budgetLimit, setBudgetLimit] = useState(0);

  useEffect(() => {
    if (activeWorkspace) {
      setWsName(activeWorkspace.name);
      setBudgetLimit(activeWorkspace.budgetLimitUSD || 10);
    }
  }, [activeWorkspace]);

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/auth/user/workspaces/${activeWorkspace?.id || ""}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace?.id || ""
        },
        body: JSON.stringify({ name: wsName, budgetLimitUSD: budgetLimit })
      });
      if (res.ok) await refreshWorkspaces();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const isOwner = activeWorkspace?.role === "owner";

  return (
    <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 sm:gap-8">

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Workspace Settings</h1>
          <p className="text-sm text-text-muted mt-1">Configure identity, members, and budget rules.</p>
        </div>
        <Badge variant={activeWorkspace?.type === 'personal' ? 'neutral' : 'primary'} className="uppercase tracking-widest px-3">
          {activeWorkspace?.type} Mode
        </Badge>
      </div>

      {/* Pending Invitations Section */}
      <PendingInvitesSection />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">

        {/* General Settings */}
        <div className="lg:col-span-1">
          <Card className="p-6 h-full" title="Profile">
            <form onSubmit={handleUpdateWorkspace} className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Display Name</label>
                <Input value={wsName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWsName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Monthly Budget ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={budgetLimit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBudgetLimit(parseFloat(e.target.value))}
                  disabled={!isOwner}
                />
              </div>
              <div className="pt-4 border-t border-border mt-2">
                <Button type="submit" variant="primary" loading={saving} fullWidth>Save Changes</Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Members Management */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card className="p-6" title="Identity & Access" subtitle="Manage who can access this workspace">
            <div className="mt-4">
              <InviteManager />
            </div>
          </Card>
          
          <ApiKeyManager />
        </div>

      </div>

      {/* Advanced Section */}
      {isOwner && activeWorkspace?.type !== 'personal' && (
        <Card className="p-6 border-red-500/20 bg-red-500/[0.02]" title="Advanced Operations">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-main">Archive Workspace</p>
              <p className="text-xs text-text-muted mt-1">This will disable all API keys and stop all routing for this workspace.</p>
            </div>
            <Button variant="secondary" className="!text-red-500 border-red-500/20 hover:bg-red-500/10">Archive</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function PendingInvitesSection() {
  const [processing, setProcessing] = useState<string | null>(null);
  const { refreshWorkspaces } = useWorkspace();
  const router = useRouter();

  const { data, mutate, isLoading } = useSWR("/api/auth/user/pending-invites", url => fetch(url).then(r => r.json()));
  const invites = data?.invites || [];

  const handleAction = async (token: string, action: 'accept' | 'decline') => {
    setProcessing(token);
    try {
      const endpoint = action === 'accept' 
        ? "/api/auth/user/invites/accept" 
        : "/api/auth/user/invites/decline";
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (res.ok) {
        await mutate(); // Refresh invites automatically via SWR
        if (action === 'accept') {
          await refreshWorkspaces();
          // Optional: redirect to dashboard or show success
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  if (isLoading) return null;
  if (invites.length === 0) return null;

  return (
    <Card className="p-6 border-primary/20 bg-primary/[0.02]" title="Thư mời đang chờ" subtitle="Bạn đã được mời tham gia vào các workspace sau">
      <div className="flex flex-col gap-4 mt-4">
        {invites.map((invite: any) => (
          <div key={invite.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">group_add</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-main">{invite.workspaceName || `Workspace ID: ${invite.workspaceId}`}</p>
                <p className="text-[10px] text-text-muted capitalize">{invite.workspaceType} workspace · Vai trò: {invite.role} · Hết hạn: {new Date(invite.expiresAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button 
                size="sm" 
                variant="primary" 
                loading={processing === invite.token}
                onClick={() => handleAction(invite.token, 'accept')}
              >
                Chấp nhận
              </Button>
              <Button 
                size="sm" 
                variant="secondary"
                loading={processing === invite.token}
                onClick={() => handleAction(invite.token, 'decline')}
              >
                Từ chối
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
