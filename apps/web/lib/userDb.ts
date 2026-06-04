import prisma from "@/lib/prisma";

export async function getWorkspacesByUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  if (!user) return [];

  return [
    {
      id: `user-${userId}`,
      name: "Personal",
      type: "personal",
      role: "owner",
      credits: user.credits,
      budgetLimitUSD: 0,
      usedUSD: 0,
      reservedUSD: 0,
    }
  ];
}
