"use client";

import { createContext, useContext, useMemo, useState } from "react";
import useSWR from "swr";

export type WorkspaceRole = "owner" | "admin" | "member";

export const useWorkspaceSWR = <T,>(url: string | null) => {
  return useSWR<T>(url);
};

export type Workspace = {
  id: string;
  name: string;
  type?: "personal" | "team" | string;
  role?: WorkspaceRole;
  credits?: number;
  budgetLimitUSD?: number;
  usedUSD?: number;
  reservedUSD?: number;
};

export type UserPersona = "individual" | "business";

export type User = {
  id?: string;
  name?: string;
  email?: string;
  persona?: UserPersona;
  role?: string;       // "user" | "admin"
  isBanned?: boolean;
};

type WorkspaceContextValue = {
  isLoading: boolean;
  user: User | null;
  activeWorkspace: Workspace | null;
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
  const [workspaces] = useState<Workspace[]>(initialWorkspaces || []);

  const value = useMemo<WorkspaceContextValue>(() => {
    const activeWorkspace = workspaces[0] ?? null;

    return {
      isLoading: false,
      user: initialUser || {
        name: "User",
        email: "user@tinobot.local",
        persona: "individual",
      },
      activeWorkspace,
      refreshAll: async () => {},
      refreshWorkspaces: async () => {},
      applyOptimisticUpdate: () => {},
    };
  }, [workspaces, initialUser]);

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
      activeWorkspace: null,
      refreshAll: async () => {},
      refreshWorkspaces: async () => {},
      applyOptimisticUpdate: () => {},
    };
  }
  return value;
}
