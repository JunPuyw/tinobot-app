"use client";

import { createContext, useContext, useMemo, useState } from "react";
import useSWR from "swr";

export type WorkspaceType = "personal" | "team";
export type WorkspaceRole = "owner" | "admin" | "member";

export const useWorkspaceSWR = <T,>(url: string | null) => {
  return useSWR<T>(url);
};

export type Workspace = {
  id: string;
  name: string;
  type: WorkspaceType;
  role?: WorkspaceRole;
  credits?: number;
  budgetLimitUSD?: number;
  usedUSD?: number;
  reservedUSD?: number;
};

export type UserPersona = "individual" | "business";

export type User = {
  name?: string;
  email?: string;
  persona?: UserPersona;
};

type WorkspaceContextValue = {
  isLoading: boolean;
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  switchWorkspace: (workspace: Workspace) => void;
  refreshAll: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  applyOptimisticUpdate: (update: any) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ 
  children,
  initialUser,
  initialWorkspaces 
}: { 
  children: React.ReactNode;
  initialUser?: User;
  initialWorkspaces?: Workspace[];
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces || []);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(initialWorkspaces?.[0]?.id || "ws-1");

  const value = useMemo<WorkspaceContextValue>(() => {
    const activeWorkspace =
      workspaces.find((ws) => ws.id === activeWorkspaceId) ??
      workspaces[0] ??
      null;

    return {
      isLoading: false,
      user: initialUser || {
        name: "User",
        email: "user@tinobot.local",
        persona: "individual",
      },
      workspaces,
      activeWorkspace,
      switchWorkspace: (workspace) => setActiveWorkspaceId(workspace.id),
      refreshAll: async () => {},
      refreshWorkspaces: async () => {},
      applyOptimisticUpdate: () => {},
    };
  }, [activeWorkspaceId, workspaces, initialUser]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    return {
      isLoading: false,
      user: null,
      workspaces: [],
      activeWorkspace: null,
      switchWorkspace: () => {},
      refreshAll: async () => {},
      refreshWorkspaces: async () => {},
      applyOptimisticUpdate: () => {},
    };
  }
  return value;
}

