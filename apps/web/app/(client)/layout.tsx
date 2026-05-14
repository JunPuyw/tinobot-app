import { WorkspaceProvider } from "@/context/WorkspaceContext";
import PortalLayout from "../PortalLayout";
import { getPortalUser } from "@/lib/userAuth";
import { getWorkspacesByUser } from "@/lib/userDb";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({ children }) {
  const user = await getPortalUser();

  if (!user) {
    redirect("/portal/login");
  }

  // Fetch workspaces in parallel on the server
  const workspaces = await getWorkspacesByUser(user.id);

  return (
    <WorkspaceProvider initialUser={user as any} initialWorkspaces={workspaces as any}>
      <PortalLayout>
        {children}
      </PortalLayout>
    </WorkspaceProvider>
  );
}
