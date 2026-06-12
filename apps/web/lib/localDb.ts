import prisma from "@/lib/prisma";

type LegacySettingsClient = {
  settings?: {
    findFirst: (args: {
      select: { topupExchangeRate: true; vndUsdRate: true };
    }) => Promise<{ topupExchangeRate?: number | null; vndUsdRate?: number | null } | null>;
  };
};

const DEFAULT_SETTINGS = {
  topupExchangeRate: 1,
  vndUsdRate: 25000,
  modelOriginalPriceMultiplier: 1,
};

export async function getSettings() {
  try {
    if (prisma?.gatewaySetting) {
      const settings = await prisma.gatewaySetting.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default" },
      });

      return {
        ...DEFAULT_SETTINGS,
        vndUsdRate: settings.vndUsdRate ?? DEFAULT_SETTINGS.vndUsdRate,
        modelOriginalPriceMultiplier:
          settings.modelOriginalPriceMultiplier ?? DEFAULT_SETTINGS.modelOriginalPriceMultiplier,
      };
    }

    const legacyPrisma = prisma as unknown as LegacySettingsClient;
    if (
      legacyPrisma.settings &&
      typeof legacyPrisma.settings.findFirst === "function"
    ) {
      const settings = await legacyPrisma.settings.findFirst({
        select: { topupExchangeRate: true, vndUsdRate: true },
      });

      return {
        ...DEFAULT_SETTINGS,
        topupExchangeRate: settings?.topupExchangeRate ?? DEFAULT_SETTINGS.topupExchangeRate,
        vndUsdRate: settings?.vndUsdRate ?? DEFAULT_SETTINGS.vndUsdRate,
      };
    }

    return DEFAULT_SETTINGS;
  } catch (e) {
    console.warn("[localDb] Settings lookup failed, using defaults.", e);
    return DEFAULT_SETTINGS;
  }
}
