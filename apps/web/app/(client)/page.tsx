import PortalClient from "../PortalClient";
import { cookies } from "next/headers";

/**
 * Portal Page (Server Component)
 * Acts as a entry point that can handle server-side data fetching or auth checks.
 */
export default async function PortalPage() {
  // Access cookies if needed for auth verification
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  // In the future, we can fetch user/workspace data here and pass to PortalClient
  // as initialData to eliminate the "Loading..." flicker.
  
  return <PortalClient />;
}
