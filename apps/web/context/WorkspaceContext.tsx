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
  credits?: number;
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces || []);
  const [user, setUser] = useState<User | null>(initialUser || {
    name: "User",
    email: "user@tinobot.local",
    persona: "individual",
  });

  const refreshUser = async () => {
    const [userResponse, workspacesResponse] = await Promise.all([
      fetch("/api/auth/user/me", { credentials: "include", cache: "no-store" }),
      fetch("/api/auth/user/workspaces", { credentials: "include", cache: "no-store" }),
    ]);
    if (userResponse.ok) {
      const data = await userResponse.json();
      setUser(data.user || null);
    }
    if (workspacesResponse.ok) {
      const data = await workspacesResponse.json();
      setWorkspaces(data.workspaces || []);
    }
  };

  const value = useMemo<WorkspaceContextValue>(() => {
    const activeWorkspace = workspaces[0] ?? null;

    return {
      isLoading: false,
      user,
      activeWorkspace,
      refreshAll: refreshUser,
      refreshWorkspaces: refreshUser,
      applyOptimisticUpdate: () => {},
    };
  }, [workspaces, user]);

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
