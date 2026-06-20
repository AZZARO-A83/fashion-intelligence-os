import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SHOPIFY_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const PUBLIC_STORE_URL = (process.env.SHOPIFY_PUBLIC_URL || "https://de-backers.com").replace(/\/$/, "");

type Order = {
  id: number;
  name: string;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  source_name?: string;
  app_id?: number;
  referring_site?: string;
  landing_site?: string;
  payment_gateway_names?: string[];
  shipping_address?: { city?: string; province?: string; province_code?: string; country_code?: string };
  refunds?: any[];
  fulfillments?: any[];
  customer?: { id?: number };
  email?: string;
  line_items?: Array<{
    product_id?: number;
    variant_id?: number;
    title: string;
    variant_title?: string;
    price: string;
    quantity: number;
  }>;
};

type ProductInfo = {
  id: number;
  title: string;
  handle: string;
  product_type?: string;
  inventoryTotal: number;
};

function hasShopifyKeys() {
  return !!(SHOPIFY_URL && SHOPIFY_TOKEN && SHOPIFY_TOKEN !== "your_token_here");
}

function headers() {
  return {
    "X-Shopify-Access-Token": SHOPIFY_TOKEN!,
    "Content-Type": "application/json",
  };
}

async function shopifyFetch(endpoint: string, attempt = 0): Promise<Response> {
  const res = await fetch(`https://${SHOPIFY_URL}/admin/api/2025-01/${endpoint}`, {
    headers: headers(),
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    const wait = Number(res.headers.get("Retry-After") || 1) * 1000;
    await new Promise((r) => setTimeout(r, wait || 1000));
    return shopifyFetch(endpoint, attempt + 1);
  }
  return res;
}

async function fetchOrders(minISO: string, maxISO: string): Promise<Order[]> {
  const fields = [
    "id",
    "name",
    "total_price",
    "subtotal_price",
    "total_discounts",
    "line_items",
    "created_at",
    "financial_status",
    "fulfillment_status",
    "source_name",
    "app_id",
    "referring_site",
    "landing_site",
    "payment_gateway_names",
    "shipping_address",
    "refunds",
    "fulfillments",
    "customer",
    "email",
  ].join(",");
  const orders: Order[] = [];
  let pageInfo: string | null = null;
  let first = true;

  while (true) {
    const endpoint = first
      ? `orders.json?status=any&created_at_min=${minISO}&created_at_max=${maxISO}&limit=250&fields=${fields}`
      : `orders.json?limit=250&page_info=${pageInfo}&fields=${fields}`;
    const res = await shopifyFetch(endpoint);
    if (!res.ok) throw new Error(`Shopify orders failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    orders.push(...(data.orders ?? []));

    const link = res.headers.get("Link") || "";
    const next = link.match(/<[^>]*page_info=([^>&"]+)[^>]*>;\s*rel="next"/);
    if (!next || (data.orders ?? []).length < 250) break;
    pageInfo = next[1];
    first = false;
  }

  return orders;
}

async function fetchProducts(): Promise<Map<number, ProductInfo>> {
  const map = new Map<number, ProductInfo>();
  let pageInfo: string | null = null;
  let first = true;

  while (true) {
    const endpoint = first
      ? "products.json?status=active&limit=250&fields=id,title,handle,product_type,variants"
      : `products.json?limit=250&page_info=${pageInfo}&fields=id,title,handle,product_type,variants`;
    const res = await shopifyFetch(endpoint);
    if (!res.ok) break;
    const data = await res.json();
    for (const p of data.products ?? []) {
      const inventoryTotal = (p.variants ?? []).reduce(
        (sum: number, v: any) => sum + Number(v.inventory_quantity || 0),
        0
      );
      map.set(Number(p.id), {
        id: Number(p.id),
        title: p.title,
        handle: p.handle,
        product_type: p.product_type,
        inventoryTotal,
      });
    }

    const link = res.headers.get("Link") || "";
    const next = link.match(/<[^>]*page_info=([^>&"]+)[^>]*>;\s*rel="next"/);
    if (!next || (data.products ?? []).length < 250) break;
    pageInfo = next[1];
    first = false;
  }

  return map;
}

function inferCategory(title: string) {
  const t = title.toLowerCase();
  if (/\bpolo\b/.test(t)) return "Polo";
  if (/t-shirt|tee/.test(t)) return "T-Shirt";
  if (/shirt|overshirt/.test(t)) return "Shirt";
  if (/suit/.test(t)) return "Suit";
  if (/blazer|jacket/.test(t)) return "Blazer";
  if (/pant|trouser|jean|chino/.test(t)) return "Pants";
  if (/dress/.test(t)) return "Dress";
  if (/blouse|top/.test(t)) return "Women Top";
  return "Other";
}

function familyKey(title: string) {
  return title
    .toLowerCase()
    .replace(/\b(white|black|navy|blue|teal|gray|grey|charcoal|beige|solid|light|dark|off white|bamboo|cotton|linen|pique|piqué)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pct(now: number, prev: number) {
  return prev > 0 ? Math.round(((now - prev) / prev) * 1000) / 10 : null;
}

function money(v: number) {
  return Math.round(v);
}

function inRange(order: Order, start: number, end: number) {
  const t = new Date(order.created_at).getTime();
  return t >= start && t <= end;
}

function periodStats(orders: Order[]) {
  const nonVoided = orders.filter((o) => o.financial_status !== "voided");
  const gross = orders.reduce((sum, order) => {
    return sum + (order.line_items ?? []).reduce((x, item) => x + Number(item.price || 0) * item.quantity, 0);
  }, 0);
  const discounts = orders.reduce((sum, o) => sum + Number(o.total_discounts || 0), 0);
  const net = gross - discounts;
  return {
    orders: orders.length,
    grossSales: money(gross),
    netSales: money(net),
    aov: nonVoided.length ? money(net / nonVoided.length) : 0,
  };
}

function channelName(order: Order) {
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

function normalizeCityName(city?: string, province?: string) {
  const raw = `${city || ""} ${province || ""}`.trim();
  if (!raw) return "Unknown city";

  const normalized = raw
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

  if (
    /\bcairo\b|\bnew cairo\b|\bc, cairo\b/.test(normalized) ||
    /القاهره|التجمع|التجمع الخامس|مدينتي|مدينه نصر|مصر الجديده|المعادي|الرحاب|الشروق|بدر|القطاميه/.test(normalized)
  ) {
    return "Cairo";
  }

  if (/\bgiza\b|\bagouza\b|\bdokki\b|\bmohandessin\b|\bharam\b|\bfaisal\b|الجيزه|الدقي|المهندسين|العجوزه|الهرم|فيصل/.test(normalized)) {
    return "Giza";
  }

  if (/\balexandria\b|الاسكندريه|اسكندريه/.test(normalized)) return "Alexandria";
  if (/\bsharqia\b|الشرقيه|فاقوس|ديرب نجم|بلبيس|ابو كبير/.test(normalized)) return "Al Sharqia";
  if (/\bmansoura\b|\bdakahlia\b|الدقهليه|المنصوره/.test(normalized)) return "Dakahlia";
  if (/\btanta\b|\bgharbia\b|الغربيه|طنطا/.test(normalized)) return "Gharbia";
  if (/\bminya\b|المنيا/.test(normalized)) return "Minya";
  if (/\bassiut\b|\basyut\b|اسيوط/.test(normalized)) return "Assiut";

  return city?.trim() || province?.trim() || "Unknown city";
}

function buildBreakdown(orders: Order[], products: Map<number, ProductInfo>) {
  const productsMap = new Map<string, any>();
  const categories = new Map<string, any>();
  const channels = new Map<string, any>();
  const cities = new Map<string, any>();

  for (const order of orders) {
    const channel = channelName(order);
    if (!channels.has(channel)) channels.set(channel, { name: channel, orders: 0, revenue: 0 });
    channels.get(channel).orders += 1;
    channels.get(channel).revenue += Number(order.total_price || 0);

    const cityKey = normalizeCityName(order.shipping_address?.city, order.shipping_address?.province);
    if (!cities.has(cityKey)) cities.set(cityKey, { name: cityKey, orders: 0, revenue: 0 });
    cities.get(cityKey).orders += 1;
    cities.get(cityKey).revenue += Number(order.total_price || 0);

    for (const item of order.line_items ?? []) {
      const productInfo = item.product_id ? products.get(Number(item.product_id)) : undefined;
      const title = productInfo?.title || item.title;
      const category = inferCategory(title);
      const key = `${category}:${familyKey(title) || title.toLowerCase()}`;
      const lineRevenue = Number(item.price || 0) * item.quantity;

      if (!productsMap.has(key)) {
        productsMap.set(key, {
          key,
          title,
          category,
          productId: item.product_id || null,
          url: productInfo?.handle ? `${PUBLIC_STORE_URL}/products/${productInfo.handle}` : null,
          revenue: 0,
          units: 0,
          variants: new Set<string>(),
          inventoryTotal: productInfo?.inventoryTotal ?? null,
        });
      }
      const row = productsMap.get(key);
      row.revenue += lineRevenue;
      row.units += item.quantity;
      row.variants.add(item.variant_title || item.title);

      if (!categories.has(category)) categories.set(category, { name: category, units: 0, revenue: 0 });
      categories.get(category).units += item.quantity;
      categories.get(category).revenue += lineRevenue;
    }
  }

  const clean = (row: any) => ({
    ...row,
    revenue: money(row.revenue),
    aov: row.units ? money(row.revenue / row.units) : 0,
    variants: row.variants instanceof Set ? row.variants.size : row.variants,
    stockRisk:
      typeof row.inventoryTotal === "number" && row.units > 0
        ? row.inventoryTotal <= row.units * 2
        : false,
  });

  return {
    products: [...productsMap.values()].map(clean).sort((a, b) => b.revenue - a.revenue),
    categories: [...categories.values()].map((x) => ({ ...x, revenue: money(x.revenue) })).sort((a, b) => b.revenue - a.revenue),
    channels: [...channels.values()].map((x) => ({ ...x, revenue: money(x.revenue) })).sort((a, b) => b.revenue - a.revenue),
    cities: [...cities.values()].map((x) => ({ ...x, revenue: money(x.revenue) })).sort((a, b) => b.revenue - a.revenue),
  };
}

function compareRows(current: any[], previous: any[], key = "name") {
  const prev = new Map(previous.map((row) => [row[key], row]));
  return current.map((row) => ({
    ...row,
    previousRevenue: prev.get(row[key])?.revenue ?? 0,
    previousUnits: prev.get(row[key])?.units ?? 0,
    revenueChange: pct(row.revenue, prev.get(row[key])?.revenue ?? 0),
    unitChange: pct(row.units ?? row.orders ?? 0, prev.get(row[key])?.units ?? prev.get(row[key])?.orders ?? 0),
    isNew: !prev.has(row[key]),
  }));
}

function buildFindings(current: any, previous: any, currentBreakdown: any, previousBreakdown: any, pending24h: Order[]) {
  const findings = [];
  const aovGrowth = pct(current.aov, previous.aov);
  const orderGrowth = pct(current.orders, previous.orders);
  const topProduct = currentBreakdown.products[0];
  const topChannel = compareRows(currentBreakdown.channels, previousBreakdown.channels)[0];
  const topCity = compareRows(currentBreakdown.cities, previousBreakdown.cities)[0];

  if ((aovGrowth ?? 0) > 10 && (orderGrowth ?? 0) < 0) {
    findings.push({
      type: "growth-driver",
      title: "AOV is carrying revenue while order volume is weaker",
      evidence: `AOV changed ${aovGrowth}% while orders changed ${orderGrowth}%. This means the current performance is product-mix/basket-value driven, not demand-volume driven.`,
      action: "Protect premium product visibility and use bundles that increase units per order without deep discounting.",
      confidence: 90,
    });
  } else if ((orderGrowth ?? 0) < 0) {
    findings.push({
      type: "downturn",
      title: "Demand volume is the main pressure point",
      evidence: `Orders changed ${orderGrowth}% vs the previous equal period.`,
      action: "Use retargeting, WhatsApp recovery, and region/category-specific reactivation before changing fulfillment operations.",
      confidence: 86,
    });
  } else {
    findings.push({
      type: "growth-driver",
      title: "Order volume is supporting the period",
      evidence: `Orders are ${current.orders}, with ${orderGrowth === null ? "no previous baseline" : `${orderGrowth}% change`} vs the previous equal period.`,
      action: "Scale only the product/channel combinations that are already converting.",
      confidence: 80,
    });
  }

  if (topProduct) {
    findings.push({
      type: "product",
      title: `${topProduct.category} winner: ${topProduct.title}`,
      evidence: `${topProduct.units} units, EGP ${topProduct.revenue.toLocaleString("en-EG")} revenue, ${topProduct.variants} variants grouped.`,
      action: topProduct.url ? "Feature this product in homepage, best sellers, ads, and retargeting creatives." : "Feature this product in homepage, best sellers, ads, and retargeting creatives. Product URL missing from Shopify product map.",
      confidence: 88,
      productUrl: topProduct.url,
    });
  }

  if (topChannel) {
    findings.push({
      type: "channel",
      title: `Channel signal: ${topChannel.name}`,
      evidence: `${topChannel.orders} orders, EGP ${topChannel.revenue.toLocaleString("en-EG")} revenue${topChannel.isNew ? ", new vs previous period" : ""}.`,
      action: topChannel.isNew ? "Audit and scale carefully; check message timing, CoD clarity, and recovery copy." : "Keep budget and CRM effort tied to this channel if conversion quality holds.",
      confidence: topChannel.name === "Unknown" ? 55 : 78,
    });
  }

  if (topCity && topCity.name !== "Unknown city") {
    findings.push({
      type: "geo",
      title: `Top delivery geography: ${topCity.name}`,
      evidence: `${topCity.orders} orders, EGP ${topCity.revenue.toLocaleString("en-EG")} revenue.`,
      action: "Use this city/region for localized creatives, delivery promise, and retargeting segments.",
      confidence: 75,
    });
  }

  if (pending24h.length) {
    findings.push({
      type: "operations",
      title: `${pending24h.length} pending/unfulfilled orders from the last 24 hours need follow-up`,
      evidence: pending24h.slice(0, 5).map((o) => `${o.name} (${o.financial_status}, ${o.fulfillment_status || "unfulfilled"})`).join(", "),
      action: "Follow up manually or through Flow/Cartsaver before treating this as lost demand.",
      confidence: 85,
    });
  }

  return findings;
}

export async function GET() {
  if (!hasShopifyKeys()) {
    return NextResponse.json(
      { isLive: false, error: "Shopify credentials are not configured" },
      { status: 500 }
    );
  }

  try {
    const now = new Date();
    const currentEnd = now.getTime();
    const currentStart = currentEnd - 7 * 86400000;
    const previousEnd = currentStart - 1;
    const previousStart = previousEnd - 7 * 86400000;

    const [orders, products] = await Promise.all([
      fetchOrders(new Date(previousStart).toISOString(), new Date(currentEnd).toISOString()),
      fetchProducts(),
    ]);

    const currentOrders = orders.filter((o) => inRange(o, currentStart, currentEnd));
    const previousOrders = orders.filter((o) => inRange(o, previousStart, previousEnd));
    const current = periodStats(currentOrders);
    const previous = periodStats(previousOrders);
    const currentBreakdown = buildBreakdown(currentOrders, products);
    const previousBreakdown = buildBreakdown(previousOrders, products);
    const last24Start = currentEnd - 24 * 60 * 60 * 1000;
    const pending24h = orders.filter((o) =>
      inRange(o, last24Start, currentEnd) &&
      o.fulfillment_status !== "fulfilled" &&
      ["pending", "authorized", "partially_paid"].includes(o.financial_status)
    );

    const productComparison = compareRows(currentBreakdown.products, previousBreakdown.products, "key");
    const channelComparison = compareRows(currentBreakdown.channels, previousBreakdown.channels);
    const cityComparison = compareRows(currentBreakdown.cities, previousBreakdown.cities);
    const categoryComparison = compareRows(currentBreakdown.categories, previousBreakdown.categories);
    const findings = buildFindings(current, previous, currentBreakdown, previousBreakdown, pending24h);

    return NextResponse.json({
      isLive: true,
      generatedAt: new Date().toISOString(),
      source: "Shopify Admin REST API",
      window: {
        current: { from: new Date(currentStart).toISOString(), to: new Date(currentEnd).toISOString() },
        previous: { from: new Date(previousStart).toISOString(), to: new Date(previousEnd).toISOString() },
      },
      summary: {
        current,
        previous,
        revenueGrowth: pct(current.netSales, previous.netSales),
        ordersGrowth: pct(current.orders, previous.orders),
        aovGrowth: pct(current.aov, previous.aov),
      },
      findings,
      products: productComparison.slice(0, 12),
      channels: channelComparison.slice(0, 8),
      cities: cityComparison.slice(0, 12),
      categories: categoryComparison.slice(0, 8),
      pendingWindow: { from: new Date(last24Start).toISOString(), to: new Date(currentEnd).toISOString(), label: "Last rolling 24 hours" },
      pendingOrders: pending24h.slice(0, 10).map((o) => ({
        name: o.name,
        createdAt: o.created_at,
        financialStatus: o.financial_status,
        fulfillmentStatus: o.fulfillment_status || "unfulfilled",
        total: Number(o.total_price || 0),
        city: normalizeCityName(o.shipping_address?.city, o.shipping_address?.province),
      })),
      dataLimits: [
        "New vs returning customer revenue requires longer customer order history than this 14-day diagnostic fetch.",
        "Inventory risk is based on active product variant inventory totals when available from Shopify products API.",
        "Channel labels are derived from Shopify order source, gateway, referrer, and landing fields; app-specific names depend on Shopify exposing them.",
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { isLive: false, error: err instanceof Error ? err.message : "Unknown Shopify report error" },
      { status: 500 }
    );
  }
}
