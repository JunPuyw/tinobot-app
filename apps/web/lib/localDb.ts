import prisma from "@/lib/prisma";

export async function getSettings() {
  try {
    if (
      prisma &&
      (prisma as any).settings &&
      typeof (prisma as any).settings.findFirst === "function"
    ) {
      const settings = await (prisma as any).settings.findFirst({
        select: { topupExchangeRate: true, vndUsdRate: true },
      });

      return {
        topupExchangeRate: settings?.topupExchangeRate ?? 1,
        vndUsdRate: settings?.vndUsdRate ?? 25000,
      };
    }

    return { topupExchangeRate: 1, vndUsdRate: 25000 };
  } catch (e) {
    console.warn("[localDb] Settings lookup failed, using defaults.", e);
    return { topupExchangeRate: 1, vndUsdRate: 25000 };
  }
}
