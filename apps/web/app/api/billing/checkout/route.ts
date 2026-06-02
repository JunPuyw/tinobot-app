import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSettings } from "@/lib/localDb";
import { getPricingPackageById } from "@/lib/pricingPackages";


const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "tinobot-default-secret-change-me"
);

// Secrets strictly from ENV
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const POLAR_PRODUCT_ID = process.env.POLAR_PRODUCT_ID;

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const portalToken = cookieStore.get("portal_auth_token")?.value;

  const JWT_SECRET = process.env.JWT_SECRET;

  // Try Dashboard Admin Auth
  if (token) {
    try {
      const adminSecret = new TextEncoder().encode(JWT_SECRET || "tinobot-default-secret-change-me");
      const { payload } = await jwtVerify(token, adminSecret);
      return payload;
    } catch (err) { }
  }

  // Try Portal User Auth
  if (portalToken) {
    try {
      const portalSecret = new TextEncoder().encode(JWT_SECRET || "tinobot-portal-default-secret-change-me");
      const { payload } = await jwtVerify(portalToken, portalSecret);
      return payload;
    } catch (err) { }
  }

  return null;
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { packageId, customAmount, workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    let amountUSD = 0;
    let credits = 0;
    let packageName = "Custom Top-up";

    if (packageId) {
      const pkg = await getPricingPackageById(packageId);
      if (!pkg || !pkg.isActive) {
        return NextResponse.json({ error: "Invalid or inactive package" }, { status: 400 });
      }
      amountUSD = pkg.priceUSD;
      credits = pkg.credits;
      packageName = pkg.name;
    } else if (customAmount) {
      const settings = await getSettings();
      const ratio = settings.topupExchangeRate || 1.0;
      amountUSD = parseFloat(customAmount);
      credits = amountUSD * ratio;
    } else {
      return NextResponse.json({ error: "No package or amount specified" }, { status: 400 });
    }

    if (amountUSD <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!POLAR_ACCESS_TOKEN || !POLAR_PRODUCT_ID) {
      console.error("[Polar Checkout] Missing ENV config:", { token: !!POLAR_ACCESS_TOKEN, productId: !!POLAR_PRODUCT_ID });
      return NextResponse.json({
        error: "Polar integration not configured on server (Missing Token or Product ID)",
      }, { status: 500 });
    }

    const referer = request.headers.get("referer") || "";
    const isPortal = referer.includes("/portal/");
    const origin = request.headers.get("origin") || "";

    const successUrl = isPortal
      ? `${origin}/portal/billing?success=true`
      : `${origin}/dashboard/quota?success=true`;

    const cancelUrl = isPortal
      ? `${origin}/portal/billing?cancelled=true`
      : `${origin}/dashboard/topup?cancelled=true`;

    // Create Polar Checkout Session using DYNAMIC PRICING (Ad-hoc prices)
    const response = await fetch("https://sandbox-api.polar.sh/v1/checkouts/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products: [POLAR_PRODUCT_ID],
        prices: {
          [POLAR_PRODUCT_ID as string]: [
            {
              amount_type: "fixed",
              price_amount: Math.round(amountUSD * 100),
              price_currency: "usd",
            },
          ],
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          workspaceId: workspaceId,
          credits: credits.toFixed(2),
          amountUSD: amountUSD.toString(),
          packageName: packageName
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Polar Checkout] API Error Detail:", JSON.stringify(errorData, null, 2));
      return NextResponse.json({
        error: `Polar API Error: ${errorData.detail || errorData.error || "Failed to create checkout"}`,
        debug: errorData
      }, { status: 500 });
    }

    const session = await response.json();

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[Polar Checkout] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
