import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;

  const user = await prisma.user.findUnique({ where: { id: token } });
  if (!user) return null;

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (adminEmails.includes(user.email)) {
    user.role = "admin";
  }

  return user.role === "admin" ? user : null;
}
