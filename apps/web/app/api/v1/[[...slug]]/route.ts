import { NextRequest, NextResponse } from "next/server";
import { fetchPlatformUpstream, PlatformUpstreamConfigurationError } from "@/lib/platformUpstreams";

export { POST } from "@/app/v1/[[...slug]]/route";

function rewriteBeeknoeeBrand(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/beeknoee/gi, "tinobot");
  if (Array.isArray(value)) return value.map(rewriteBeeknoeeBrand);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, rewriteBeeknoeeBrand(entry)]),
    );
  }
  return value;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const resolvedParams = await params;
  const path = resolvedParams.slug?.join("/") || "";

  if (path !== "management/models/text") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const upstreamResponse = await fetchPlatformUpstream(path, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    const data = await upstreamResponse.json();

    return NextResponse.json(rewriteBeeknoeeBrand(data), {
      status: upstreamResponse.status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch models" },
      { status: error instanceof PlatformUpstreamConfigurationError ? 500 : 502 },
    );
  }
}
