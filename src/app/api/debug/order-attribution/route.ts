import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SHOPIFY_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

type DebugOrder = {
  name: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  source_name?: string;
  app_id?: number;
  referring_site?: string;
  landing_site?: string;
  payment_gateway_names?: string[];
};

function hasShopifyKeys() {
  return !!(SHOPIFY_URL && SHOPIFY_TOKEN && SHOPIFY_TOKEN !== "your_token_here");
}

function shopifyHeaders() {
  return {
    "X-Shopify-Access-Token": SHOPIFY_TOKEN!,
    "Content-Type": "application/json",
  };
}

function detectChannel(order: DebugOrder) {
  const raw = [
    order.source_name,
    ...(order.payment_gateway_names ?? []),
    order.referring_site,
    order.landing_site,
  ].filter(Boolean).join(" ").toLowerCase();

  if (/cartsaver|cart saver|otp/.test(raw)) return "Cartsaver OTP / CoD";
  if (/cod|cash on delivery|cash/.test(raw)) return "Cash on Delivery";
  if (/facebook|instagram|meta/.test(raw)) return "Meta / Social";
  if (/google/.test(raw)) return "Google";
  if (/shopify|web|online_store/.test(raw)) return "Online Store";
  return order.source_name || "Unknown";
}

export async function GET(request: Request) {
  if (!hasShopifyKeys()) {
    return NextResponse.json(
      { ok: false, error: "Shopify credentials are not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 30), 1), 100);
  const days = Math.min(Math.max(Number(searchParams.get("days") || 14), 1), 90);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const fields = [
    "name",
    "created_at",
    "financial_status",
    "fulfillment_status",
    "source_name",
    "app_id",
    "referring_site",
    "landing_site",
    "payment_gateway_names",
  ].join(",");

  try {
    const res = await fetch(
      `https://${SHOPIFY_URL}/admin/api/2025-01/orders.json?status=any&created_at_min=${since}&limit=${limit}&fields=${fields}`,
      { headers: shopifyHeaders() }
    );

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Shopify orders failed: ${res.status}`, details: await res.text() },
        { status: 500 }
      );
    }

    const data = await res.json();
    const orders: DebugOrder[] = data.orders ?? [];
    const rows = orders.map((order) => ({
      order: order.name,
      createdAt: order.created_at,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status || "unfulfilled",
      sourceName: order.source_name || null,
      appId: order.app_id || null,
      paymentGateways: order.payment_gateway_names ?? [],
      referringSite: order.referring_site || null,
      landingSite: order.landing_site || null,
      detectedChannel: detectChannel(order),
      containsCartsaverText: /cartsaver|cart saver|otp/i.test([
        order.source_name,
        ...(order.payment_gateway_names ?? []),
        order.referring_site,
        order.landing_site,
      ].filter(Boolean).join(" ")),
    }));

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      note: "Debug endpoint only exposes order attribution fields. It does not include customer names, email, phone, or address.",
      days,
      limit,
      count: rows.length,
      cartsaverDetectedCount: rows.filter((row) => row.containsCartsaverText).length,
      detectedChannels: rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.detectedChannel] = (acc[row.detectedChannel] || 0) + 1;
        return acc;
      }, {}),
      rows,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
