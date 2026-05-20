import { getPortalUser } from "@/lib/userAuth";
import { redirect } from "next/navigation";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getPortalUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  // Check if the user is an admin
  if (user.role !== "admin") {
    // If not an admin, send them back to the user portal
    redirect("/usage");
  }

  return (
    <AdminLayoutClient>
      {children}
    </AdminLayoutClient>
  );
}
