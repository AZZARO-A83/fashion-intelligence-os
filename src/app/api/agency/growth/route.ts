import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { fetchSearchConsoleQueries, type SearchConsoleResult } from "@/lib/search-console";
import { callClaude } from "@/lib/claude-api";
import { CACHE_KEYS, getCachedReport, isFresh, setCachedReport } from "@/lib/cache";

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

type GrowthAiSummary = {
  status: "ai" | "rule-based";
  headline: string;
  summary: string[];
  advice: string[];
  sectionNotes: {
    sales: string;
    seo: string;
    products: string;
    channels: string;
    pending: string;
  };
  generatedAt: string;
};

type GrowthTrendContext = {
  generatedAt: string | null;
  topTrends: Array<{
    name: string;
    gender?: string;
    garmentType?: string;
    trendScore?: number;
    searchSignalCount?: number;
    recommendedAction?: string;
  }>;
  demandMap: Array<{
    garmentLabel?: string;
    gender?: string;
    score?: number;
    searchSignalCount?: number;
    topIntent?: string;
    exampleQueries?: string[];
  }>;
};

type GrowthDiagnosis = {
  id: string;
  ownerArea: "Sales" | "SEO" | "Ads" | "Product" | "Ops";
  priority: "high" | "medium" | "low";
  score: number;
  problem: string;
  evidence: string;
  action: string;
  confidence: number;
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
  if (/\b(t-shirt|t shirt|tshirt|tee)\b/.test(t)) return "T-Shirt";
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

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned) as T;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function cleanSummaryText(text: string): string {
  return text.replace(/\bdown\s+-/gi, "down ").replace(/\bdecrease(?:d|s|ing)?\s+by\s+-/gi, "decreased by ");
}

function cleanSummaryList(values: string[]): string[] {
  return values.map(cleanSummaryText);
}

function trendLabel(trends: GrowthTrendContext): string | null {
  const topDemand = trends.demandMap[0];
  if (topDemand?.garmentLabel) return `${topDemand.gender ? `${topDemand.gender} ` : ""}${topDemand.garmentLabel}`;
  const topTrend = trends.topTrends[0];
  return topTrend?.name || null;
}

function queryClothingType(query: string) {
  const q = query.toLowerCase();
  if (/\b(tuxedo|suit|suits)\b/.test(q)) return "Suit";
  if (/\bshirt|shirts|overshirt\b/.test(q)) return "Shirt";
  if (/\btank\s*top|top|blouse\b/.test(q)) return "Women Top";
  if (/\bpant|pants|trouser|trousers|chino|jeans|gabardine\b/.test(q)) return "Pants";
  if (/\bpolo\b/.test(q)) return "Polo";
  if (/\bdress|dresses\b/.test(q)) return "Dress";
  if (/\bvest\b/.test(q)) return "Vest";
  return "Other";
}

function priorityFromScore(score: number): GrowthDiagnosis["priority"] {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function diagnosis(
  id: string,
  ownerArea: GrowthDiagnosis["ownerArea"],
  score: number,
  problem: string,
  evidence: string,
  action: string,
  confidence: number
): GrowthDiagnosis {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return {
    id,
    ownerArea,
    priority: priorityFromScore(clamped),
    score: clamped,
    problem,
    evidence,
    action,
    confidence: Math.max(0, Math.min(100, Math.round(confidence))),
  };
}

function buildGrowthDiagnostics(args: {
  current: any;
  previous: any;
  productRows: any[];
  channelRows: any[];
  cityRows: any[];
  categoryRows: any[];
  pending24h: Order[];
  searchConsole: SearchConsoleResult | null;
  trends: GrowthTrendContext;
}): GrowthDiagnosis[] {
  const rows: GrowthDiagnosis[] = [];
  const { current, previous, productRows, channelRows, cityRows, categoryRows, pending24h, searchConsole, trends } = args;
  const revenueGrowth = pct(current.netSales, previous.netSales);
  const ordersGrowth = pct(current.orders, previous.orders);
  const aovGrowth = pct(current.aov, previous.aov);
  const revenue = Math.max(current.netSales, 1);
  const topProduct = productRows[0];
  const topCategory = categoryRows[0];
  const topChannel = channelRows[0];
  const topCity = cityRows[0];
  const topQuery = searchConsole?.queries?.[0];
  const topSeo = searchConsole?.pageOpportunities?.[0];
  const lowCtr = searchConsole?.pageOpportunities?.find((x) => /ctr|snippet|title\/meta/i.test(`${x.action} ${x.reason}`));
  const pageTwo = searchConsole?.pageOpportunities?.find((x) => x.position > 10 && x.position <= 20);
  const trend = trendLabel(trends);

  if (typeof revenueGrowth === "number" && revenueGrowth < -5) {
    rows.push(diagnosis(
      "sales-drop",
      "Sales",
      85 + Math.min(10, Math.abs(revenueGrowth) / 2),
      "Revenue is down in the current 7-day window.",
      `Net sales changed ${revenueGrowth}% while orders changed ${ordersGrowth === null ? "with no baseline" : `${ordersGrowth}%`} and AOV changed ${aovGrowth === null ? "with no baseline" : `${aovGrowth}%`}.`,
      (aovGrowth ?? 0) >= 0
        ? "Do not start with blanket discounts. Fix order volume using the strongest product/channel/SEO levers while protecting AOV."
        : "Audit discounting, low-price mix, and cart composition before scaling traffic.",
      current.orders >= 100 ? 91 : 78
    ));
  }

  if (topCategory && topProduct) {
    const categoryShare = Math.round((topCategory.revenue / revenue) * 1000) / 10;
    rows.push(diagnosis(
      "product-lane",
      "Product",
      Math.min(92, 55 + categoryShare),
      `${topCategory.name} is the strongest commercial lane.`,
      `${topCategory.name} generated EGP ${topCategory.revenue.toLocaleString("en-EG")} (${categoryShare}% of revenue). ${topProduct.title} generated EGP ${topProduct.revenue.toLocaleString("en-EG")} from ${topProduct.units} units.`,
      `Use ${topProduct.title} as the hero, then cross-sell the next strongest ${topCategory.name} products. Confirm size-level stock before increasing spend.`,
      88
    ));
  }

  if (topChannel) {
    const share = Math.round((topChannel.revenue / revenue) * 1000) / 10;
    if (share >= 60) {
      rows.push(diagnosis(
        "channel-concentration",
        "Ops",
        Math.min(95, 45 + share / 1.2),
        `${topChannel.name} is carrying most revenue.`,
        `${topChannel.name} produced ${topChannel.orders} orders and EGP ${topChannel.revenue.toLocaleString("en-EG")} (${share}% of revenue).`,
        /cash|cod|cartsaver/i.test(topChannel.name)
          ? "Treat COD as the recovery engine: clearer WhatsApp/OTP copy, COD trust message, and follow-up inside 30-60 minutes."
          : "Scale only the product/category creative proven in this channel; avoid spreading budget across weak lanes.",
        topChannel.name === "Unknown" ? 60 : 84
      ));
    }
  }

  if (topCity && topCity.name !== "Unknown city") {
    const share = Math.round((topCity.revenue / revenue) * 1000) / 10;
    if (share >= 35) {
      rows.push(diagnosis(
        "geo-concentration",
        "Ads",
        Math.min(84, 42 + share),
        `${topCity.name} is the current scale market.`,
        `${topCity.name} generated ${topCity.orders} orders and EGP ${topCity.revenue.toLocaleString("en-EG")} (${share}% of revenue).`,
        `Run a ${topCity.name}-specific angle: fast delivery, COD trust, and the best-selling category creative.`,
        82
      ));
    }
  }

  if (pending24h.length) {
    const pendingValue = pending24h.reduce((sum, order) => sum + Number(order.total_price || 0), 0);
    rows.push(diagnosis(
      "pending-recovery",
      "Ops",
      Math.min(92, 65 + pending24h.length * 4),
      "Pending/unfulfilled orders are the fastest recovery lever.",
      `${pending24h.length} pending/unfulfilled orders worth about EGP ${money(pendingValue).toLocaleString("en-EG")} appeared in the last 24 hours.`,
      "Create a 24-hour rule: contact within 30 minutes, follow up after 2 hours, and tag unrecovered reason.",
      88
    ));
  }

  if (topSeo) {
    rows.push(diagnosis(
      "seo-top-page",
      "SEO",
      topSeo.clicks >= 10 ? 88 : 72,
      `Organic search has a page/query pair worth protecting.`,
      `"${topSeo.query}" has ${topSeo.clicks} clicks, ${topSeo.impressions} impressions, CTR ${Math.round(topSeo.ctr * 1000) / 10}%, and average position ${Math.round(topSeo.position * 10) / 10}.`,
      `${topSeo.action}: keep the page copy, title, and internal links aligned with this exact query.`,
      86
    ));
  }

  if (lowCtr && `${lowCtr.query}-${lowCtr.page}` !== `${topSeo?.query}-${topSeo?.page}`) {
    rows.push(diagnosis(
      "seo-low-ctr",
      "SEO",
      lowCtr.impressions >= 500 ? 86 : 72,
      "A visible search result is not getting enough clicks.",
      `"${lowCtr.query}" has ${lowCtr.impressions} impressions, CTR ${Math.round(lowCtr.ctr * 1000) / 10}%, and average position ${Math.round(lowCtr.position * 10) / 10}.`,
      `${lowCtr.action}: rewrite title/meta around the exact customer phrase and test clearer product/price intent.`,
      83
    ));
  }

  if (pageTwo) {
    rows.push(diagnosis(
      "seo-page-two",
      "SEO",
      70,
      "One search opportunity is close but not ranking high enough.",
      `"${pageTwo.query}" is averaging position ${Math.round(pageTwo.position * 10) / 10} with ${pageTwo.impressions} impressions.`,
      "Add collection content, FAQs, internal links from relevant products, and stronger product coverage for this query.",
      78
    ));
  }

  if (topQuery && topCategory) {
    const searchType = queryClothingType(topQuery.query);
    if (searchType !== "Other" && searchType !== topCategory.name) {
      rows.push(diagnosis(
        "search-sales-gap",
        "SEO",
        82,
        "Search demand and current sales winner are not the same category.",
        `Top GSC query "${topQuery.query}" points to ${searchType}; Shopify top category is ${topCategory.name}.`,
        `Protect ${searchType} SEO for organic demand while using ${topCategory.name} for paid/COD conversion until sales data shifts.`,
        84
      ));
    }
  }

  if (trend && topCategory && !trend.toLowerCase().includes(topCategory.name.toLowerCase())) {
    rows.push(diagnosis(
      "trend-cross-check",
      "Product",
      64,
      "Trend context should be used as a cross-check, not as proof to buy inventory.",
      `Cached trend scan points to ${trend}; Shopify top category is ${topCategory.name}.`,
      `Only push trend-overlapping products if they also have Shopify sales depth or Search Console demand. Keep ${topCategory.name} as the commercial base for now.`,
      70
    ));
  }

  return rows
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
    .slice(0, 10);
}

function includesAny(values: string[], patterns: RegExp[]): boolean {
  const text = values.join(" ").toLowerCase();
  return patterns.some((pattern) => pattern.test(text));
}

function enforceSignalCoverage(
  summary: GrowthAiSummary,
  args: {
    searchConsole: SearchConsoleResult | null;
    trends: GrowthTrendContext;
    pending24h: Order[];
  }
): GrowthAiSummary {
  const result: GrowthAiSummary = {
    ...summary,
    summary: [...summary.summary],
    advice: [...summary.advice],
    sectionNotes: { ...summary.sectionNotes },
  };
  const topQuery = args.searchConsole?.queries?.[0];
  const topSeoAction = args.searchConsole?.pageOpportunities?.[0];
  const topTrend = trendLabel(args.trends);

  if (topQuery && !includesAny(result.summary, [/search console|query|impression|ctr|organic|seo/])) {
    result.summary.splice(2, 0, `Search demand: "${topQuery.query}" leads organic demand with ${topQuery.clicks} clicks, ${topQuery.impressions} impressions, CTR ${Math.round(topQuery.ctr * 1000) / 10}%, and average position ${Math.round(topQuery.position * 10) / 10}.`);
  }

  if (topTrend && !includesAny(result.summary, [/trend|demand map|market signal|search signal/])) {
    result.summary.push(`Trend context: cached trend scan points to ${topTrend} as a market signal to compare against Shopify winners before scaling.`);
  }

  if (topSeoAction && !includesAny(result.advice, [/title|meta|snippet|internal link|seo|query|ranking|ctr/])) {
    const path = (() => {
      try { return new URL(topSeoAction.page).pathname || "/"; } catch { return topSeoAction.page; }
    })();
    result.advice.splice(1, 0, `${topSeoAction.action} for "${topSeoAction.query}" on ${path}; ${topSeoAction.reason}`);
  }

  if (topTrend && !includesAny(result.advice, [/trend|search demand|market signal|demand map/])) {
    result.advice.splice(2, 0, `Use the trend scan as a cross-check: push products that overlap ${topTrend} only when Shopify sales and stock also support the move.`);
  }

  if (args.pending24h.length && !includesAny(result.advice, [/pending|follow up|recovery|unfulfilled/])) {
    result.advice.push(`Recover ${args.pending24h.length} pending/unfulfilled orders before buying more traffic.`);
  }

  result.summary = cleanSummaryList(result.summary).slice(0, 4);
  result.advice = cleanSummaryList(result.advice).slice(0, 4);
  return result;
}

async function fetchGrowthSearchConsole(): Promise<{ data: SearchConsoleResult | null; error: string | null }> {
  try {
    return { data: await fetchSearchConsoleQueries(), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Search Console unavailable" };
  }
}

async function fetchGrowthTrendContext(): Promise<GrowthTrendContext> {
  const cached = await getCachedReport<{
    trends?: any[];
    demandMap?: any[];
  }>(CACHE_KEYS.trends);
  const trends = cached?.data?.trends ?? [];
  const demandMap = cached?.data?.demandMap ?? [];
  return {
    generatedAt: cached?.generatedAt ?? null,
    topTrends: trends.slice(0, 8).map((t) => ({
      name: String(t.name || ""),
      gender: t.gender,
      garmentType: t.garmentType,
      trendScore: t.trendScore,
      searchSignalCount: t.searchSignalCount,
      recommendedAction: t.recommendedAction,
    })),
    demandMap: demandMap.slice(0, 10).map((d) => ({
      garmentLabel: d.garmentLabel,
      gender: d.gender,
      score: d.score,
      searchSignalCount: d.searchSignalCount,
      topIntent: d.topIntent,
      exampleQueries: Array.isArray(d.exampleQueries) ? d.exampleQueries.slice(0, 3) : [],
    })),
  };
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

function compareRows(current: any[], previous: any[], key = "name", includePreviousOnly = false) {
  const prev = new Map(previous.map((row) => [row[key], row]));
  const currentKeys = new Set(current.map((row) => row[key]));
  const currentRows = current.map((row) => ({
    ...row,
    previousRevenue: prev.get(row[key])?.revenue ?? 0,
    previousUnits: prev.get(row[key])?.units ?? 0,
    revenueChange: pct(row.revenue, prev.get(row[key])?.revenue ?? 0),
    unitChange: pct(row.units ?? row.orders ?? 0, prev.get(row[key])?.units ?? prev.get(row[key])?.orders ?? 0),
    isNew: !prev.has(row[key]),
  }));

  if (!includePreviousOnly) return currentRows;

  const previousOnlyRows = previous
    .filter((row) => !currentKeys.has(row[key]))
    .map((row) => ({
      ...row,
      revenue: 0,
      units: 0,
      orders: 0,
      previousRevenue: row.revenue ?? 0,
      previousUnits: row.units ?? row.orders ?? 0,
      revenueChange: pct(0, row.revenue ?? 0),
      unitChange: pct(0, row.units ?? row.orders ?? 0),
      isNew: false,
    }));

  return [...currentRows, ...previousOnlyRows];
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

function buildRuleBasedGrowthSummary(args: {
  current: any;
  previous: any;
  findings: any[];
  productRows: any[];
  channelRows: any[];
  cityRows: any[];
  categoryRows: any[];
  pending24h: Order[];
  searchConsole: SearchConsoleResult | null;
  trends: GrowthTrendContext;
}): GrowthAiSummary {
  const { current, previous, findings, productRows, channelRows, cityRows, categoryRows, pending24h, searchConsole, trends } = args;
  const revenueGrowth = pct(current.netSales, previous.netSales);
  const ordersGrowth = pct(current.orders, previous.orders);
  const aovGrowth = pct(current.aov, previous.aov);
  const topProduct = productRows[0];
  const topChannel = channelRows[0];
  const topCity = cityRows[0];
  const topCategory = categoryRows[0];
  const topQuery = searchConsole?.queries?.[0];
  const topSeoAction = searchConsole?.pageOpportunities?.[0];
  const topTrend = trends.topTrends[0] || trends.demandMap[0];

  return {
    status: "rule-based",
    headline: (revenueGrowth ?? 0) >= 0
      ? "Growth is being carried by current sales depth; protect winners before widening spend."
      : "Revenue is under pressure; fix the highest-signal sales and SEO leaks before scaling.",
    summary: [
      `Current 7-day net sales are EGP ${current.netSales.toLocaleString("en-EG")} from ${current.orders} orders; revenue change is ${revenueGrowth === null ? "new/no baseline" : `${revenueGrowth}%`}.`,
      `AOV is EGP ${current.aov.toLocaleString("en-EG")} (${aovGrowth === null ? "new/no baseline" : `${aovGrowth}%`} vs previous).`,
      topQuery ? `Top Search Console demand is "${topQuery.query}" with ${topQuery.clicks} clicks and ${topQuery.impressions} impressions.` : "Search Console is not available in this report.",
      topTrend ? `Trend context supports ${"garmentLabel" in topTrend ? topTrend.garmentLabel : topTrend.name} as a demand area.` : "No cached trend context is available.",
    ],
    advice: [
      findings[0]?.action || "Use the strongest product/category/channel combination before adding new campaigns.",
      topSeoAction ? `${topSeoAction.action} for "${topSeoAction.query}" on ${new URL(topSeoAction.page).pathname || "/"}.` : "Connect or refresh Search Console before making SEO decisions.",
      pending24h.length ? "Recover pending/unfulfilled orders first; this is nearer money than new traffic." : "No urgent pending-order recovery signal is shown in the last rolling 24 hours.",
    ],
    sectionNotes: {
      sales: `Sales changed ${revenueGrowth === null ? "with no baseline" : `${revenueGrowth}%`}; orders changed ${ordersGrowth === null ? "with no baseline" : `${ordersGrowth}%`}; AOV changed ${aovGrowth === null ? "with no baseline" : `${aovGrowth}%`}.`,
      seo: topSeoAction
        ? `Highest SEO action: ${topSeoAction.action} for "${topSeoAction.query}" because ${topSeoAction.reason.toLowerCase()}`
        : "No page-level Search Console opportunity is available.",
      products: topProduct
        ? `${topProduct.title} leads product movement; ${topCategory?.name || topProduct.category} is the main product lane.`
        : "No product movement rows are available.",
      channels: topChannel
        ? `${topChannel.name} is the strongest channel; ${topCity?.name || "no city"} is the strongest geo signal.`
        : "No channel or city rows are available.",
      pending: pending24h.length
        ? `${pending24h.length} pending/unfulfilled orders need recovery follow-up.`
        : "No pending/unfulfilled order recovery queue is visible in the last rolling 24 hours.",
    },
    generatedAt: new Date().toISOString(),
  };
}

async function buildGrowthAiSummary(args: {
  current: any;
  previous: any;
  findings: any[];
  productRows: any[];
  channelRows: any[];
  cityRows: any[];
  categoryRows: any[];
  pending24h: Order[];
  searchConsole: SearchConsoleResult | null;
  trends: GrowthTrendContext;
  diagnostics: GrowthDiagnosis[];
}): Promise<GrowthAiSummary> {
  const fallback = buildRuleBasedGrowthSummary(args);
  const payload = {
    sales: {
      current: args.current,
      previous: args.previous,
      revenueGrowth: pct(args.current.netSales, args.previous.netSales),
      ordersGrowth: pct(args.current.orders, args.previous.orders),
      aovGrowth: pct(args.current.aov, args.previous.aov),
    },
    findings: args.findings.slice(0, 5).map((f) => ({ title: f.title, evidence: f.evidence, action: f.action })),
    topProducts: args.productRows.slice(0, 8).map((p) => ({ title: p.title, category: p.category, units: p.units, revenue: p.revenue, unitChange: p.unitChange, stockRisk: p.stockRisk })),
    channels: args.channelRows.slice(0, 5),
    cities: args.cityRows.slice(0, 5),
    categories: args.categoryRows.slice(0, 5),
    pendingCount: args.pending24h.length,
    searchConsole: args.searchConsole ? {
      window: { startDate: args.searchConsole.startDate, endDate: args.searchConsole.endDate },
      topQueries: args.searchConsole.queries.slice(0, 8),
      opportunities: args.searchConsole.pageOpportunities.slice(0, 8),
    } : null,
    trends: args.trends,
    diagnostics: args.diagnostics.slice(0, 8),
  };
  const cacheKey = `report:growth-ai-summary:v6:${stableHash(payload)}`;
  const cached = await getCachedReport<GrowthAiSummary>(cacheKey);
  if (cached && isFresh(cached.generatedAt, 24 * 60 * 60)) return cached.data;

  try {
    const text = await callClaude(
      [
        "You are the DE BACKERS Growth Analyst for an Egyptian fashion ecommerce brand.",
        "Use only the JSON facts supplied. Do not invent causes, numbers, products, pages, queries, customers, or behavior.",
        "Hard metrics are the source of truth. AI is only an interpretation layer.",
        "Use Shopify for commercial reality, Search Console for search demand/page actions, and cached trend scan data for market reinforcement. If these disagree, say so.",
        "The diagnostics array is rule-generated. Treat it as the recommendation source. Do not replace it with generic advice.",
        "Do not say 'because' or 'due to' unless the data explicitly proves causality. Prefer 'while', 'with', and 'shown by'.",
        "Prioritize actions in this order when supported by data: pending order recovery, top organic query/page protection, high-impression low-CTR snippet fixes, page-two SEO content/internal links, product/category/channel scale with stock awareness, bundle/AOV protection.",
        "Every recommendation must point to an observable lever: product, page, category, channel, city, stock, pending order, title/meta, internal link, collection content, bundle, or creative.",
        "Use Egypt context only when relevant to the data: salary week, summer demand, Cairo/Giza/Alexandria, COD/WhatsApp follow-up.",
        "Return JSON only.",
      ].join("\n"),
      `Summarize this Growth report for an operator. Keep it short, direct, and action-first. Base advice on diagnostics first, then use search and trend data as support. Return this exact JSON shape:
{
  "headline": "one sentence",
  "summary": ["3-4 factual bullets"],
  "advice": ["3-4 action bullets"],
  "sectionNotes": {
    "sales": "one sentence",
    "seo": "one sentence",
    "products": "one sentence",
    "channels": "one sentence",
    "pending": "one sentence"
  }
}

Facts:
${JSON.stringify(payload)}`,
      1200
    );
    const parsed = parseJson<Omit<GrowthAiSummary, "status" | "generatedAt">>(text);
    const result = enforceSignalCoverage({
      status: "ai",
      headline: cleanSummaryText(parsed.headline || fallback.headline),
      summary: Array.isArray(parsed.summary) ? cleanSummaryList(parsed.summary.slice(0, 4)) : fallback.summary,
      advice: Array.isArray(parsed.advice) ? cleanSummaryList(parsed.advice.slice(0, 4)) : fallback.advice,
      sectionNotes: {
        sales: cleanSummaryText(parsed.sectionNotes?.sales || fallback.sectionNotes.sales),
        seo: cleanSummaryText(parsed.sectionNotes?.seo || fallback.sectionNotes.seo),
        products: cleanSummaryText(parsed.sectionNotes?.products || fallback.sectionNotes.products),
        channels: cleanSummaryText(parsed.sectionNotes?.channels || fallback.sectionNotes.channels),
        pending: cleanSummaryText(parsed.sectionNotes?.pending || fallback.sectionNotes.pending),
      },
      generatedAt: new Date().toISOString(),
    }, {
      searchConsole: args.searchConsole,
      trends: args.trends,
      pending24h: args.pending24h,
    });
    await setCachedReport(cacheKey, result, 6 * 60 * 60);
    return result;
  } catch {
    return fallback;
  }
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

    const [orders, products, searchConsole, trends] = await Promise.all([
      fetchOrders(new Date(previousStart).toISOString(), new Date(currentEnd).toISOString()),
      fetchProducts(),
      fetchGrowthSearchConsole(),
      fetchGrowthTrendContext(),
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
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const productComparison = compareRows(currentBreakdown.products, previousBreakdown.products, "key", true);
    const channelComparison = compareRows(currentBreakdown.channels, previousBreakdown.channels);
    const cityComparison = compareRows(currentBreakdown.cities, previousBreakdown.cities);
    const categoryComparison = compareRows(currentBreakdown.categories, previousBreakdown.categories);
    const findings = buildFindings(current, previous, currentBreakdown, previousBreakdown, pending24h);
    const diagnostics = buildGrowthDiagnostics({
      current,
      previous,
      productRows: productComparison,
      channelRows: channelComparison,
      cityRows: cityComparison,
      categoryRows: categoryComparison,
      pending24h,
      searchConsole: searchConsole.data,
      trends,
    });
    const aiSummary = await buildGrowthAiSummary({
      current,
      previous,
      findings,
      productRows: productComparison,
      channelRows: channelComparison,
      cityRows: cityComparison,
      categoryRows: categoryComparison,
      pending24h,
      searchConsole: searchConsole.data,
      trends,
      diagnostics,
    });

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
      aiSummary,
      diagnostics,
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
      searchConsole: searchConsole.data
        ? {
            generatedAt: searchConsole.data.generatedAt,
            startDate: searchConsole.data.startDate,
            endDate: searchConsole.data.endDate,
            siteUrl: searchConsole.data.siteUrl,
            topQueries: searchConsole.data.queries.slice(0, 8),
            opportunities: searchConsole.data.pageOpportunities.slice(0, 12),
          }
        : null,
      searchConsoleError: searchConsole.error,
      dataLimits: [
        "New vs returning customer revenue requires longer customer order history than this 14-day diagnostic fetch.",
        "Inventory risk is based on active product variant inventory totals when available from Shopify products API.",
        "Channel labels are derived from Shopify order source, gateway, referrer, and landing fields; app-specific names depend on Shopify exposing them.",
        "Search Console growth rows use Egypt web search data for the configured property only.",
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { isLive: false, error: err instanceof Error ? err.message : "Unknown Shopify report error" },
      { status: 500 }
    );
  }
}
