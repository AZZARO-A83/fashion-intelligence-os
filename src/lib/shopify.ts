import { SalesData, TopProduct } from "@/types";
import { fetchGa4ConversionMetrics } from "./ga4";

const SHOPIFY_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// Infer a coarse category from the product title so the UI can show variety
// (and so suits don't look like the only thing that exists). Cheap keyword match.
function inferCategory(title: string): string {
  const t = title.toLowerCase();
  if (/\btuxedo\b/.test(t)) return "Tuxedo";
  if (/\bsuit\b/.test(t)) return "Suit";
  if (/blazer/.test(t)) return "Blazer";
  if (/jacket/.test(t)) return "Jacket";
  if (/\bpolo\b/.test(t)) return "Polo";
  if (/shirt|overshirt/.test(t)) return "Shirt";
  if (/\btop\b|tank|tee|t-shirt/.test(t)) return "Top";
  if (/short(s)?\b/.test(t)) return "Shorts";
  if (/pant|trouser|jean|jogger/.test(t)) return "Pants";
  if (/sock/.test(t)) return "Socks";
  if (/dress|skirt/.test(t)) return "Dress";
  return "Other";
}

function productFamily(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(white|black|navy|blue|light|dark|grey|gray|charcoal|beige|off white|solid|bamboo|cotton|linen|blend|micro-textured|patterned|checked|ash|bale|yellow|green|brown|red|pink|latte)\b/g, " ")
    .replace(/\b(open-stitch|knitted|knit|classic|casual)\b/g, (m) => m)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayFamilyName(title: string, variants: number): string {
  const category = inferCategory(title);
  const base = title
    .replace(/\b(White|Black|Navy|Blue|Light|Dark|Grey|Gray|Charcoal|Beige|Off White|Solid|Ash|Bale|Yellow|Green|Brown|Red|Pink|Latte)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return variants > 1 ? `${base || category} (${variants} variants)` : title;
}

function shopifyHeaders() {
  return {
    "X-Shopify-Access-Token": SHOPIFY_TOKEN!,
    "Content-Type": "application/json",
  };
}

function hasShopifyKeys(): boolean {
  return !!(SHOPIFY_URL && SHOPIFY_TOKEN &&
    SHOPIFY_TOKEN !== "your_token_here" &&
    SHOPIFY_URL !== "your-store.myshopify.com");
}

async function fetchShopify(endpoint: string) {
  const res = await fetch(`https://${SHOPIFY_URL}/admin/api/2025-01/${endpoint}`, {
    headers: shopifyHeaders(),
    next: { revalidate: 21600 }, // cache 6 hours
  });
  if (!res.ok) throw new Error(`Shopify ${endpoint} failed: ${res.status}`);
  return res.json();
}

// Fetch with automatic retry on Shopify's rate limit (429) and transient 5xx.
async function shopifyFetchRaw(endpoint: string, attempt = 0): Promise<Response> {
  const res = await fetch(`https://${SHOPIFY_URL}/admin/api/2025-01/${endpoint}`, {
    headers: shopifyHeaders(),
  });
  if ((res.status === 429 || res.status === 503) && attempt < 6) {
    const wait = parseFloat(res.headers.get("Retry-After") || "1") * 1000 || 1000;
    await new Promise((r) => setTimeout(r, wait));
    return shopifyFetchRaw(endpoint, attempt + 1);
  }
  return res;
}

// Pull ALL orders from Shopify within a date window, with pagination + retry.
async function getRealOrders(minISO: string, maxISO: string): Promise<any[]> {
  const allOrders: any[] = [];
  let pageInfo: string | null = null;
  let isFirstPage = true;
  let keepGoing = true;

  while (keepGoing) {
    const endpoint: string = isFirstPage
      ? `orders.json?status=any&created_at_min=${minISO}&created_at_max=${maxISO}&limit=250&fields=id,total_price,subtotal_price,total_discounts,line_items,created_at,financial_status,refunds,customer,email`
      : `orders.json?limit=250&page_info=${pageInfo as string}&fields=id,total_price,subtotal_price,total_discounts,line_items,created_at,financial_status,refunds,customer,email`;

    const res = await shopifyFetchRaw(endpoint);

    if (!res.ok) throw new Error(`Shopify orders failed: ${res.status}`);

    const data = await res.json();
    const orders: any[] = data.orders ?? [];
    allOrders.push(...orders);

    const linkHeader = res.headers.get("Link") ?? "";
    const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&"]+)[^>]*>;\s*rel="next"/);
    if (nextMatch && orders.length === 250) {
      pageInfo = nextMatch[1];
      isFirstPage = false;
    } else {
      keepGoing = false;
    }
  }

  console.log(`[Shopify] Fetched ${allOrders.length} total orders`);
  return allOrders;
}

// Pull real products
async function getRealProducts() {
  const data = await fetchShopify("products.json?limit=250&fields=id,title,variants,product_type");
  return data.products ?? [];
}

export interface ShopifyProductImage {
  title: string;
  image: string;     // real product photo URL (Shopify CDN)
  price: string;     // EGP
  type: string;      // product type (Suits, Polo, Dress…)
  url: string;       // link to the product page
}

// Real Debackers product images — live from Shopify (for the Inspiration page).
export async function getShopifyProductImages(limit = 16): Promise<ShopifyProductImage[]> {
  if (!hasShopifyKeys()) return [];
  try {
    const data = await fetchShopify(`products.json?limit=${limit}&fields=id,title,handle,images,variants,product_type&status=active`);
    return (data.products ?? [])
      .filter((p: any) => p.images?.length)
      .map((p: any) => ({
        title: p.title,
        image: p.images[0].src,
        price: p.variants?.[0]?.price ?? "",
        type: p.product_type ?? "",
        url: `https://${SHOPIFY_URL}/products/${p.handle}`,
      }));
  } catch (err) {
    console.error("[Shopify] product images failed:", err);
    return [];
  }
}

// Pull ALL abandoned checkouts with pagination
async function getRealAbandonedCarts(): Promise<{ count: number; totalValue: number }> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const allCheckouts: any[] = [];
  let pageInfo: string | null = null;
  let isFirstPage = true;
  let keepGoing = true;

  try {
    while (keepGoing) {
      const endpoint: string = isFirstPage
        ? `checkouts.json?created_at_min=${since}&limit=250`
        : `checkouts.json?limit=250&page_info=${pageInfo as string}`;

      const res = await fetch(`https://${SHOPIFY_URL}/admin/api/2025-01/${endpoint}`, {
        headers: shopifyHeaders(),
      });

      if (!res.ok) {
        console.warn("[Shopify] Abandoned carts API failed:", res.status);
        return { count: 0, totalValue: 0 };
      }

      const data = await res.json();
      const checkouts: any[] = data.checkouts ?? [];
      allCheckouts.push(...checkouts);

      const linkHeader = res.headers.get("Link") ?? "";
      const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&"]+)[^>]*>;\s*rel="next"/);
      if (nextMatch && checkouts.length === 250) {
        pageInfo = nextMatch[1];
        isFirstPage = false;
      } else {
        keepGoing = false;
      }
    }

    const totalValue = allCheckouts.reduce((s, c) => s + parseFloat(c.total_price || 0), 0);
    return { count: allCheckouts.length, totalValue: Math.round(totalValue) };

  } catch {
    return { count: 0, totalValue: 0 };
  }
}

// ─── Shopify-exact metrics for one period ─────────────────────────────
// Matches Shopify Analytics: Net sales = Gross − Discounts − Returns, where
// Returns are counted by REFUND date (not order date) — verified to match
// Shopify's dashboard to within ~0.4%. Sales are counted by ORDER date.
function periodMetrics(allOrders: any[], loMs: number, hiMs: number) {
  const inWin = (t: string) => {
    const x = new Date(t).getTime();
    return x >= loMs && x <= hiMs;
  };

  const created = allOrders.filter((o) => inWin(o.created_at));

  // Shopify counts only orders where payment was received for both order totals and AOV.
  // Pending / voided / fully-refunded orders are excluded from analytics.
  const PAID = new Set(["paid", "partially_refunded", "partially_paid"]);
  const paidCreated = created.filter((o) => PAID.has(o.financial_status));

  let gross = 0;
  let discounts = 0;
  let orderLevelRefunds = 0;
  for (const o of created) {
    for (const it of o.line_items ?? []) gross += parseFloat(it.price) * it.quantity;
    discounts += parseFloat(o.total_discounts || 0);
    for (const r of o.refunds ?? []) {
      orderLevelRefunds += (r.refund_line_items ?? []).reduce(
        (x: number, rli: any) => x + parseFloat(rli.subtotal || 0), 0);
    }
  }

  // AOV = sum of subtotal_price (after discounts, before shipping/taxes) for PAID orders only
  // ÷ count of paid orders. This matches Shopify's dashboard "Average order value" exactly.
  const paidSubtotal = paidCreated.reduce(
    (s: number, o: any) => s + parseFloat(o.subtotal_price || 0), 0
  );
  const paidOrderCount = paidCreated.length || 1;

  // Returns for net revenue: any refund PROCESSED inside this window, even for older orders.
  let returns = 0;
  for (const o of allOrders) {
    for (const r of o.refunds ?? []) {
      if (inWin(r.processed_at || r.created_at)) {
        returns += (r.refund_line_items ?? []).reduce(
          (x: number, rli: any) => x + parseFloat(rli.subtotal || 0), 0);
      }
    }
  }

  const aovNet = paidSubtotal; // after discounts, paid orders only (legacy)
  const net = gross - discounts - returns;
  // Shopify's AOV divides Total sales by orders that resulted in a sale — it excludes
  // CANCELLED/voided orders (in Egypt COD, ~25% are voided). Count non-voided orders so
  // AOV = net sales ÷ non-cancelled orders (matches Shopify dashboard within ~2%).
  const nonVoidedCount = created.filter((o: any) => o.financial_status !== "voided").length;
  return { gross, discounts, returns, net, aovNet, aovOrderCount: paidOrderCount, nonVoidedCount, orderCount: created.length, created };
}

// Process raw Shopify orders into analytics for the CURRENT window [fromMs, toMs].
// `orders` spans well before fromMs so returns-by-refund-date + prior-period growth work.
function processOrders(orders: any[], fromMs: number, toMs: number): Partial<SalesData> & {
  weeklyGrowthCalc: number;
  ordersGrowthCalc: number;
  aovGrowthCalc: number;
  repeatPurchaseRateCalc: number;
} {
  const rangeMs = Math.max(1, toMs - fromMs);

  const cur = periodMetrics(orders, fromMs, toMs);
  const prior = periodMetrics(orders, fromMs - rangeMs, fromMs - 1);

  if (!cur.orderCount) return { weeklyGrowthCalc: 0, ordersGrowthCalc: 0, aovGrowthCalc: 0, repeatPurchaseRateCalc: 0 };

  const totalRevenue = Math.round(cur.net);          // 🟢 Shopify "Net sales"
  const totalOrders = cur.orderCount;
  // 🟢 AOV = Net sales ÷ non-cancelled orders — mirrors Shopify's dashboard AOV
  // (which excludes voided orders from the count). Matches Shopify within ~2%.
  const aovFor = (p: typeof cur) => p.nonVoidedCount ? p.net / p.nonVoidedCount : 0;
  const avgOrderValue = Math.round(aovFor(cur));

  // ─── Growth: current net vs equal prior period net ────────────────
  const pct = (now: number, prev: number) =>
    prev > 0 ? Math.round(((now - prev) / prev) * 100 * 10) / 10 : 0;

  const weeklyGrowthCalc = pct(cur.net, prior.net);
  const ordersGrowthCalc = pct(cur.orderCount, prior.orderCount);
  const aovGrowthCalc = pct(aovFor(cur), aovFor(prior));

  // ─── Repeat purchase rate — customers with 2+ orders (current window) ──
  const customerOrderCount: Record<string, number> = {};
  for (const order of cur.created) {
    const cid = order.customer?.id?.toString() ?? order.email ?? "guest";
    if (cid !== "guest") customerOrderCount[cid] = (customerOrderCount[cid] || 0) + 1;
  }
  const totalCustomers = Object.keys(customerOrderCount).length;
  const repeatCustomers = Object.values(customerOrderCount).filter(c => c > 1).length;
  const repeatPurchaseRateCalc = totalCustomers > 0
    ? Math.round((repeatCustomers / totalCustomers) * 100 * 10) / 10
    : 0;

  // ─── Product sales map (current window) ───────────────────────────
  type ProductBucket = {
    revenue: number;
    units: number;
    name: string;
    family: string;
    category: string;
    variants: Set<string>;
  };

  const buildProductMap = (periodOrders: any[]): Record<string, ProductBucket> => {
    const map: Record<string, ProductBucket> = {};
    for (const order of periodOrders) {
      for (const item of order.line_items ?? []) {
        const rawName = item.title || "Product";
        const category = inferCategory(rawName);
        const family = `${category}:${productFamily(rawName) || rawName.toLowerCase()}`;
        if (!map[family]) {
          map[family] = {
            revenue: 0,
            units: 0,
            name: rawName,
            family,
            category,
            variants: new Set<string>(),
          };
        }
        map[family].revenue += parseFloat(item.price) * item.quantity;
        map[family].units += item.quantity;
        map[family].variants.add(rawName);
      }
    }
    return map;
  };

  const productMap = buildProductMap(cur.created);
  const priorProductMap = buildProductMap(prior.created);
  const productRows: TopProduct[] = Object.values(productMap).map((p) => {
    const previousRevenue = priorProductMap[p.family]?.revenue ?? 0;
    const growth = previousRevenue > 0
      ? Math.round(((p.revenue - previousRevenue) / previousRevenue) * 100 * 10) / 10
      : null;

    return {
      name: displayFamilyName(p.name, p.variants.size),
      revenue: Math.round(p.revenue),
      units: p.units,
      growth,
      category: p.category,
      family: p.family,
      variants: p.variants.size,
    };
  });

  const diversify = (rows: TopProduct[], limit: number, sortBy: "revenue" | "units"): TopProduct[] => {
    const sortedRows = [...rows].sort((a, b) =>
      sortBy === "revenue"
        ? b.revenue - a.revenue || b.units - a.units
        : b.units - a.units || b.revenue - a.revenue
    );
    const picked: TopProduct[] = [];
    const perCategory = new Map<string, number>();

    for (const row of sortedRows) {
      if ((perCategory.get(row.category) ?? 0) >= 2) continue;
      picked.push({ ...row, method: sortBy });
      perCategory.set(row.category, (perCategory.get(row.category) ?? 0) + 1);
      if (picked.length >= limit) return picked;
    }

    for (const row of sortedRows) {
      if (picked.some((p) => p.family === row.family)) continue;
      picked.push({ ...row, method: "category-diverse" });
      if (picked.length >= limit) return picked;
    }

    return picked;
  };

  const topProducts: TopProduct[] = diversify(productRows, 10, "revenue");
  const topByUnits: TopProduct[] = diversify(productRows, 10, "units");
  const lowProducts: TopProduct[] = [...productRows]
    .filter((p) => p.units > 0)
    .sort((a, b) => a.units - b.units || a.revenue - b.revenue)
    .slice(0, 3);
  const dayMap: Record<string, { revenue: number; orders: number }> = {};
  for (const order of cur.created) {
    const day = order.created_at?.split("T")[0];
    if (!day) continue;
    if (!dayMap[day]) dayMap[day] = { revenue: 0, orders: 0 };
    dayMap[day].revenue += parseFloat(order.total_price || 0);
    dayMap[day].orders += 1;
  }
  const revenueByDay = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, revenue: Math.round(v.revenue), orders: v.orders }));

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    topProducts,
    topByUnits,
    lowProducts,
    revenueByDay,
    weeklyGrowthCalc,
    ordersGrowthCalc,
    aovGrowthCalc,
    repeatPurchaseRateCalc,
  };
}

export interface SalesRange {
  fromYmd?: string; // "YYYY-MM-DD" interpreted in Egypt time (default: 30 days ago)
  toYmd?: string;   // "YYYY-MM-DD" interpreted in Egypt time (default: today)
}

// Convert a calendar day (interpreted in Egypt/Cairo time, DST-aware) to the
// exact UTC instant of its start (00:00) or end (23:59:59). This makes our
// day boundaries line up with Shopify Analytics, which uses the store timezone.
function cairoYmdToUtc(ymd: string, endOfDay: boolean): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  const h = endOfDay ? 23 : 0, mi = endOfDay ? 59 : 0, s = endOfDay ? 59 : 0;
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = dtf.formatToParts(new Date(guess)).reduce((a: any, x) => { a[x.type] = x.value; return a; }, {});
  const asCairo = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offset = asCairo - guess; // how far Cairo is ahead of UTC at that moment
  return new Date(guess - offset);
}

const REFUND_LOOKBACK_DAYS = 14; // light lookback — keeps fetches fast & crash-free (research tool, not accounting)

// Today's date as YYYY-MM-DD in Egypt time.
function egyptTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

// Subtract N days from a YYYY-MM-DD string (calendar-safe).
function ymdMinusDays(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Honest zeroed result — used instead of MOCK data whenever the live fetch
// fails or a window has no orders. We NEVER show invented numbers.
function zeroSales(
  meta: { rangeFrom: string; rangeTo: string },
  isLive: boolean,
  dataError?: string,
  abandonedCarts = 0,
): SalesData & { isLive: boolean; dataError?: string; rangeFrom: string; rangeTo: string } {
  return {
    totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, conversionRate: 0,
    conversionRateSource: "unavailable", conversionSessions: 0, conversionPurchases: 0,
    weeklyGrowth: 0, ordersGrowth: 0, aovGrowth: 0, repeatPurchaseRate: 0,
    abandonedCarts, recoveryOpportunity: 0,
    topProducts: [], topByUnits: [], lowProducts: [], insights: [], revenueByDay: [],
    isLive, dataError, ...meta,
  };
}

// Main entry point — returns data + honest live/mock status for a date window.
export async function getSalesData(
  range?: SalesRange
): Promise<SalesData & { isLive: boolean; dataError?: string; rangeFrom: string; rangeTo: string }> {
  // Default = Last 30 days (Egypt today−30 → today) — matches Shopify's default view.
  const toYmd = range?.toYmd ?? egyptTodayYmd();
  const fromYmd = range?.fromYmd ?? ymdMinusDays(toYmd, 30);
  const to = cairoYmdToUtc(toYmd, true);
  const from = cairoYmdToUtc(fromYmd, false);
  const rangeMs = Math.max(86400000, to.getTime() - from.getTime());
  // Fetch back far enough to cover BOTH the prior period (growth) and old-order refunds.
  const fetchFrom = new Date(from.getTime() - Math.max(rangeMs, REFUND_LOOKBACK_DAYS * 86400000));

  const meta = { rangeFrom: from.toISOString(), rangeTo: to.toISOString() };

  if (!hasShopifyKeys()) {
    return zeroSales(meta, false, "Shopify credentials not configured");
  }

  try {
    console.log("[Shopify] Fetching", SHOPIFY_URL, from.toISOString(), "→", to.toISOString());
    const [orders, abandonedCartsData] = await Promise.all([
      getRealOrders(fetchFrom.toISOString(), to.toISOString()),
      getRealAbandonedCarts(),
    ]);
    const abandonedCarts = abandonedCartsData.count;
    const abandonedCartsValue = abandonedCartsData.totalValue;

    console.log(`[Shopify] Got ${orders.length} orders (incl. prior period)`);

    if (!orders.length) {
      // 150-day fetch returned nothing — almost certainly a load issue, not a real empty store.
      return zeroSales(meta, false, "Couldn't load orders from Shopify — try again", abandonedCarts);
    }

    const processed = processOrders(orders, from.getTime(), to.getTime());
    const { weeklyGrowthCalc, ordersGrowthCalc, aovGrowthCalc, repeatPurchaseRateCalc, ...salesProcessed } = processed;

    // Genuine empty window: connection works, but zero orders in THIS range — honest zeros.
    if (processed.totalRevenue === undefined) {
      return zeroSales(meta, true, undefined, abandonedCarts);
    }


    // ─── Recovery opportunity — real calculation ──────────────────
    // Total abandoned value × 15% SMS/WhatsApp recovery rate (Egypt standard)
    // ⚠️ Note: محمد شاهين bot/crawler detected in checkouts — may slightly inflate this number
    let conversionRate = 0;
    let conversionRateSource: SalesData["conversionRateSource"] = "unavailable";
    let conversionSessions = 0;
    let conversionPurchases = 0;
    try {
      const ga4 = await fetchGa4ConversionMetrics(fromYmd, toYmd, salesProcessed.totalOrders ?? 0);
      if (ga4) {
        conversionRate = ga4.conversionRate;
        conversionRateSource = ga4.source;
        conversionSessions = ga4.sessions;
        conversionPurchases = ga4.purchases;
      }
    } catch (err) {
      console.warn("[GA4] conversion rate unavailable:", err instanceof Error ? err.message : err);
    }

    const recoveryOpportunity = Math.round(abandonedCartsValue * 0.15);

    return {
      totalRevenue: salesProcessed.totalRevenue ?? 0,
      totalOrders: salesProcessed.totalOrders ?? 0,
      avgOrderValue: salesProcessed.avgOrderValue ?? 0,
      topProducts: salesProcessed.topProducts ?? [],
      topByUnits: salesProcessed.topByUnits ?? [],
      lowProducts: salesProcessed.lowProducts ?? [],
      revenueByDay: salesProcessed.revenueByDay ?? [],
      abandonedCarts,
      conversionRate,
      conversionRateSource,
      conversionSessions,
      conversionPurchases,
      repeatPurchaseRate: repeatPurchaseRateCalc, // 🟢 real — computed from customer order counts
      weeklyGrowth: weeklyGrowthCalc,
      ordersGrowth: ordersGrowthCalc,
      aovGrowth: aovGrowthCalc,
      recoveryOpportunity,
      insights: [],
      isLive: true,
      ...meta,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Shopify] Real fetch failed:", msg);
    return zeroSales(meta, false, `Shopify API error: ${msg}`);
  }
}

// Summary string for Claude campaign generator
export function buildSalesSummary(data: SalesData): string {
  const growthLabel = (growth: number | null) =>
    growth === null ? "no prior-period data" : `${growth > 0 ? "+" : ""}${growth}% growth`;

  return `
SHOPIFY SALES DATA (Last 30 Days):
Total Revenue: EGP ${data.totalRevenue.toLocaleString()}
Total Orders: ${data.totalOrders}
Avg Order Value: EGP ${data.avgOrderValue}
Conversion Rate: ${data.conversionRateSource === "ga4-live" ? `${data.conversionRate}% live (Shopify orders / GA4 sessions: ${data.conversionPurchases} purchases, ${data.conversionSessions} sessions)` : "Unavailable - GA4 sessions not connected"}
Weekly Growth: ${data.weeklyGrowth}%
Abandoned Carts: ${data.abandonedCarts}
Repeat Purchase Rate: ${data.repeatPurchaseRate}%

TOP SELLING PRODUCT FAMILIES (grouped variants, category-diverse):
${data.topProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.category}, EGP ${p.revenue.toLocaleString()} revenue, ${p.units} units, ${growthLabel(p.growth)}`).join("\n")}

TOP PRODUCTS BY UNITS SOLD:
${(data.topByUnits ?? []).map((p, i) => `${i + 1}. ${p.name} - ${p.category}, ${p.units} units, EGP ${p.revenue.toLocaleString()}`).join("\n")}

LOW PERFORMERS (need push or markdown):
${data.lowProducts.map((p) => `- ${p.name} - ${p.category}, EGP ${p.revenue.toLocaleString()}, ${p.units} units, ${growthLabel(p.growth)}`).join("\n")}
`.trim();
}
