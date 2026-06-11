// lib/auth.ts – shared authentication helper
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getPortalUser } from "@/lib/userAuth";

/**
 * Retrieve the authenticated user payload from cookies.
 * Returns the JWT payload if a valid token is present, otherwise null.
 */
export async function getAuthUser() {
  const portalUser = await getPortalUser();
  if (portalUser) return portalUser;

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const portalToken = cookieStore.get("portal_auth_token")?.value;

  const JWT_SECRET = process.env.JWT_SECRET;

  // Try Dashboard Admin Auth
  if (token) {
    try {
      const adminSecret = new TextEncoder().encode(
        JWT_SECRET || "tinobot-default-secret-change-me"
      );
      const { payload } = await jwtVerify(token, adminSecret);
      return payload;
    } catch (err) {}
  }

  // Try Portal User Auth
  if (portalToken) {
    try {
      const portalSecret = new TextEncoder().encode(
        JWT_SECRET || "tinobot-portal-default-secret-change-me"
      );
      const { payload } = await jwtVerify(portalToken, portalSecret);
      return payload;
    } catch (err) {}
  }

  return null;
}
