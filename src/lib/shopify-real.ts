// ─── Real Shopify Data Connector ─────────────────────────────────────
// 🟢 LIVE DATA — fetches real orders, products, revenue from Shopify API
// Falls back to mock data if API fails

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_URL || "debackers.myshopify.com";
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = "2024-01";

async function shopifyFetch(endpoint: string) {
  if (!SHOPIFY_TOKEN) throw new Error("SHOPIFY_ACCESS_TOKEN not set");

  const res = await fetch(
    `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/${endpoint}`,
    {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 }, // cache 1 hour
    }
  );

  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  return res.json();
}

// ─── Real Orders (last 30 days) ──────────────────────────────────────
export async function getRealOrders() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString();

  const data = await shopifyFetch(
    `orders.json?status=any&created_at_min=${dateStr}&limit=250&fields=id,total_price,line_items,created_at,financial_status`
  );

  return data.orders || [];
}

// ─── Real Products ────────────────────────────────────────────────────
export async function getRealProducts() {
  const data = await shopifyFetch(
    `products.json?limit=250&fields=id,title,variants,product_type,status`
  );
  return data.products || [];
}

// ─── Real Sales Summary ───────────────────────────────────────────────
export async function getRealSalesSummary() {
  try {
    const orders = await getRealOrders();

    if (!orders.length) {
      return { isLive: false, reason: "No orders found in last 30 days" };
    }

    const totalRevenue = orders.reduce(
      (sum: number, o: { total_price: string }) => sum + parseFloat(o.total_price || "0"),
      0
    );
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Revenue by day
    const revenueByDay: Record<string, { revenue: number; orders: number }> = {};
    orders.forEach((order: { created_at: string; total_price: string }) => {
      const date = order.created_at.split("T")[0];
      if (!revenueByDay[date]) revenueByDay[date] = { revenue: 0, orders: 0 };
      revenueByDay[date].revenue += parseFloat(order.total_price || "0");
      revenueByDay[date].orders += 1;
    });

    // Top products by revenue
    const productRevenue: Record<string, { revenue: number; units: number }> = {};
    orders.forEach((order: { line_items: { title: string; price: string; quantity: number }[] }) => {
      order.line_items?.forEach((item) => {
        if (!productRevenue[item.title]) productRevenue[item.title] = { revenue: 0, units: 0 };
        productRevenue[item.title].revenue += parseFloat(item.price) * item.quantity;
        productRevenue[item.title].units += item.quantity;
      });
    });

    const topProducts = Object.entries(productRevenue)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        revenue: Math.round(data.revenue),
        units: data.units,
        growth: 0, // Would need historical data to calculate
        category: "shopify",
      }));

    return {
      isLive: true,
      totalRevenue: Math.round(totalRevenue),
      totalOrders,
      avgOrderValue: Math.round(avgOrderValue),
      topProducts,
      revenueByDay: Object.entries(revenueByDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, d]) => ({ date, revenue: Math.round(d.revenue), orders: d.orders })),
      dataNote: "🟢 LIVE — Real data from Shopify (last 30 days)",
    };
  } catch (err) {
    console.error("Shopify real sales error:", err);
    return {
      isLive: false,
      reason: err instanceof Error ? err.message : "Shopify connection failed",
      dataNote: "🔴 MOCK — Using placeholder data (Shopify connection failed)",
    };
  }
}
