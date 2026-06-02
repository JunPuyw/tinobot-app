type PlatformUpstreamConfig = {
  name?: string;
  baseUrl: string;
  apiKeys: string[];
};

type PlatformTarget = {
  name: string;
  baseUrl: string;
  apiKey: string;
};

export class PlatformUpstreamConfigurationError extends Error {}

let nextTargetIndex = 0;

function splitKeys(value: string | undefined) {
  return (value || "")
    .split(/[\n,]/)
    .map((key) => key.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function normalizeBeeknoeeKey(apiKey: string) {
  return /^[a-f0-9]{64}$/i.test(apiKey) ? `sk-bee-${apiKey}` : apiKey;
}

function parseJsonUpstreams(value: string): PlatformUpstreamConfig[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new PlatformUpstreamConfigurationError("PLATFORM_UPSTREAMS_JSON must be valid JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new PlatformUpstreamConfigurationError("PLATFORM_UPSTREAMS_JSON must be an array");
  }

  return parsed.map((entry, index) => {
    const baseUrl = typeof entry?.baseUrl === "string" ? normalizeBaseUrl(entry.baseUrl) : "";
    const apiKeys: string[] = Array.isArray(entry?.apiKeys)
      ? entry.apiKeys.filter((key: unknown): key is string => typeof key === "string" && !!key.trim())
      : [];

    if (!baseUrl || apiKeys.length === 0) {
      throw new PlatformUpstreamConfigurationError(
        `PLATFORM_UPSTREAMS_JSON[${index}] must include baseUrl and at least one apiKey`,
      );
    }

    return {
      name: typeof entry?.name === "string" && entry.name.trim() ? entry.name.trim() : `platform-${index + 1}`,
      baseUrl,
      apiKeys: apiKeys.map((key) => key.trim()),
    };
  });
}

function getLegacyUpstreams(): PlatformUpstreamConfig[] {
  const genericKeys = [
    ...splitKeys(process.env.PLATFORM_API_KEYS),
    ...splitKeys(process.env.PLATFORM_API_KEY),
  ];
  const beeknoeeKeys = [
    ...splitKeys(process.env.BEEKNOEE_KEYS),
    ...splitKeys(process.env.BEEKNOEE_KEY),
  ];
  const openaiKeys = [
    ...splitKeys(process.env.PLATFORM_OPENAI_API_KEYS),
    ...splitKeys(process.env.PLATFORM_OPENAI_API_KEY),
    ...splitKeys(process.env.OPENAI_API_KEY),
  ];

  if (genericKeys.length > 0) {
    return [{
      name: "platform-default",
      baseUrl: normalizeBaseUrl(process.env.PLATFORM_API_BASE_URL || "https://platform.beeknoee.com/api/v1"),
      apiKeys: [...new Set(genericKeys)],
    }];
  }

  if (beeknoeeKeys.length > 0) {
    return [{
      name: "beeknoee",
      baseUrl: normalizeBaseUrl(process.env.BEEKNOEE_API_BASE || "https://platform.beeknoee.com/api/v1"),
      apiKeys: [...new Set(beeknoeeKeys.map(normalizeBeeknoeeKey))],
    }];
  }

  return openaiKeys.length > 0
    ? [{
        name: "openai",
        baseUrl: normalizeBaseUrl(process.env.PLATFORM_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"),
        apiKeys: [...new Set(openaiKeys)],
      }]
    : [];
}

export function getPlatformTargets(): PlatformTarget[] {
  const upstreams = process.env.PLATFORM_UPSTREAMS_JSON
    ? parseJsonUpstreams(process.env.PLATFORM_UPSTREAMS_JSON)
    : getLegacyUpstreams();

  return upstreams.flatMap((upstream) =>
    upstream.apiKeys.map((apiKey, index) => ({
      name: `${upstream.name || "platform"}-key-${index + 1}`,
      baseUrl: upstream.baseUrl,
      apiKey,
    })),
  );
}

function shouldTryNextTarget(status: number) {
  return status === 401 || status === 403 || status === 429 || status >= 500;
}

export async function fetchPlatformUpstream(path: string, init: RequestInit = {}) {
  const targets = getPlatformTargets();
  if (targets.length === 0) {
    throw new PlatformUpstreamConfigurationError("Platform upstream is not configured");
  }

  const startIndex = nextTargetIndex++ % targets.length;
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < targets.length; attempt += 1) {
    const target = targets[(startIndex + attempt) % targets.length]!;

    try {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${target.apiKey}`);
      const response = await fetch(`${target.baseUrl}/${path.replace(/^\/+/, "")}`, {
        ...init,
        headers,
      });

      lastResponse = response;
      if (!shouldTryNextTarget(response.status) || attempt === targets.length - 1) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error("Failed to reach platform upstream");
}
