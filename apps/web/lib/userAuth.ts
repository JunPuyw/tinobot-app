import { cookies } from "next/headers";

const API_BASE = process.env.INTERNAL_API_URL || "http://localhost:3001";

export async function getPortalUser() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Forward all cookies to the Express API so both session (Google) and auth-token (email/pw) work
    const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const res = await fetch(`${API_BASE}/api/auth/user/me`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}
