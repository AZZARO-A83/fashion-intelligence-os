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
  const revenueGrowth = pct(current.netSales, previous.netSales);
  const productRows = compareRows(currentBreakdown.products, previousBreakdown.products, "key");
  const channelRows = compareRows(currentBreakdown.channels, previousBreakdown.channels);
  const cityRows = compareRows(currentBreakdown.cities, previousBreakdown.cities);
  const categoryRows = compareRows(currentBreakdown.categories, previousBreakdown.categories);
  const topProduct = productRows[0];
  const secondProduct = productRows[1];
  const topCategory = categoryRows[0];
  const topChannel = channelRows[0];
  const topCity = cityRows[0];
  const pendingValue = pending24h.reduce((sum, order) => sum + Number(order.total_price || 0), 0);
  const revenue = Math.max(current.netSales, 1);
  const topProductShare = topProduct ? Math.round((topProduct.revenue / revenue) * 1000) / 10 : 0;
  const topCategoryShare = topCategory ? Math.round((topCategory.revenue / revenue) * 1000) / 10 : 0;
  const topChannelShare = topChannel ? Math.round((topChannel.revenue / revenue) * 1000) / 10 : 0;
  const topCityShare = topCity ? Math.round((topCity.revenue / revenue) * 1000) / 10 : 0;
  const stockRiskProducts = productRows.filter((p) => p.stockRisk).slice(0, 3);

  findings.push({
    type: "executive-thesis",
    title:
      (revenueGrowth ?? 0) >= 0
        ? `Growth thesis: ${current.orders} orders are producing EGP ${current.netSales.toLocaleString("en-EG")} because volume and/or basket quality are holding`
        : `Downturn thesis: revenue is down ${revenueGrowth}% because the current 7-day base is not matching the previous period`,
    evidence: `Revenue changed ${revenueGrowth === null ? "with no baseline" : `${revenueGrowth}%`}; orders changed ${orderGrowth === null ? "with no baseline" : `${orderGrowth}%`}; AOV changed ${aovGrowth === null ? "with no baseline" : `${aovGrowth}%`} from EGP ${previous.aov.toLocaleString("en-EG")} to EGP ${current.aov.toLocaleString("en-EG")}.`,
    action:
      (aovGrowth ?? 0) >= 0
        ? "Do not start with blanket discounts. Scale the winning product/category/channel combination and use bundles to increase units per order while protecting AOV."
        : "Do not scale spend until basket quality is fixed. Audit discounts, low-price product mix, and cart composition first.",
    confidence: current.orders >= 50 ? 92 : current.orders >= 20 ? 84 : 72,
  });

  if (topProduct && topCategory) {
    findings.push({
      type: "product-strategy",
      title: `Product engine: ${topCategory.name} is the commercial lane, led by ${topProduct.title}`,
      evidence: `${topCategory.name} generated EGP ${topCategory.revenue.toLocaleString("en-EG")} (${topCategoryShare}% of revenue). ${topProduct.title} alone generated EGP ${topProduct.revenue.toLocaleString("en-EG")} from ${topProduct.units} units (${topProductShare}% of revenue). ${secondProduct ? `Second product: ${secondProduct.title}, EGP ${secondProduct.revenue.toLocaleString("en-EG")}.` : ""}`,
      action: `Build the next 48-hour push around this lane: hero ${topProduct.title}, cross-sell the next strongest ${topCategory.name} product, and keep weaker categories out of paid traffic until they prove demand.`,
      confidence: 90,
      productUrl: topProduct.url,
    });
  }

  if (topProduct && topProductShare >= 20) {
    findings.push({
      type: "concentration-risk",
      title: `Concentration risk: one product family is carrying ${topProductShare}% of revenue`,
      evidence: `${topProduct.title} is strong, but over-dependence creates a stockout and creative-fatigue risk. Inventory shown: ${topProduct.inventoryTotal ?? "N/A"} units. Revenue change: ${topProduct.revenueChange === null ? "new/no baseline" : `${topProduct.revenueChange}%`}.`,
      action: "Keep it as the hero, but pair it with 2 backup products in the same category. If inventory is low, reduce cold traffic and shift to retargeting or alternatives.",
      confidence: 86,
      productUrl: topProduct.url,
    });
  }

  if (topChannel) {
    findings.push({
      type: "channel-strategy",
      title: `Channel lever: ${topChannel.name} is responsible for ${topChannelShare}% of revenue`,
      evidence: `${topChannel.name} produced ${topChannel.orders} orders and EGP ${topChannel.revenue.toLocaleString("en-EG")} revenue. ${topChannel.isNew ? "It is new vs the previous period." : `Revenue changed ${topChannel.revenueChange === null ? "with no baseline" : `${topChannel.revenueChange}%`}.`}`,
      action:
        /cash|cod|cartsaver/i.test(topChannel.name)
          ? "Treat this as a conversion/recovery channel: improve WhatsApp/OTP copy, call out COD clarity, and follow up pending orders within 30-60 minutes."
          : "Scale this channel only with the winning product/category creative. Do not spread budget across weak product types.",
      confidence: topChannel.name === "Unknown" ? 58 : 82,
    });
  }

  if (topCity && topCity.name !== "Unknown city") {
    findings.push({
      type: "geo-strategy",
      title: `Geo play: ${topCity.name} is the current scale market, not just another city`,
      evidence: `${topCity.name} generated ${topCity.orders} orders and EGP ${topCity.revenue.toLocaleString("en-EG")} revenue (${topCityShare}% of revenue). City variants are normalized, so New Cairo/Arabic Cairo areas are counted under Cairo.`,
      action: "Run a city-specific angle: fast delivery promise, COD trust, and best-selling category creatives. Keep other cities visible, but use Cairo as the scaling base until another city shows comparable order depth.",
      confidence: 82,
    });
  }

  if (stockRiskProducts.length) {
    findings.push({
      type: "inventory-risk",
      title: `${stockRiskProducts.length} winner products have stock-risk flags`,
      evidence: stockRiskProducts.map((p) => `${p.title}: ${p.inventoryTotal} inventory vs ${p.units} units sold`).join("; "),
      action: "Before increasing spend, confirm size-level stock. If key sizes are thin, switch the hero product or cap campaign budget to avoid wasted traffic.",
      confidence: 84,
    });
  }

  if (pending24h.length) {
    findings.push({
      type: "leakage-recovery",
      title: `Revenue leakage: ${pending24h.length} pending/unfulfilled orders worth about EGP ${money(pendingValue).toLocaleString("en-EG")} appeared in the last 24 hours`,
      evidence: pending24h.slice(0, 6).map((o) => `${o.name} (${o.financial_status}, ${o.fulfillment_status || "unfulfilled"})`).join(", "),
      action: "This is the fastest money to recover. Create a 24-hour operating rule: contact pending COD/OTP orders within 30 minutes, then again after 2 hours, then mark reason if not recovered.",
      confidence: 88,
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
      products: productComparison.slice(0, 80),
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
