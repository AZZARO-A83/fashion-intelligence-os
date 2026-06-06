import { NextResponse } from "next/server";

const SHOPIFY_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  type: string;
  price: string;
  image: string;
  url: string;
  images: string[];
  tags: string[];
  vendor: string;
  grossSales?: number;
  ordersCount?: number;
}

async function fetchProductDetails(limit: string, type: string): Promise<ShopifyProduct[]> {
  const apiUrl = `https://${SHOPIFY_URL}/admin/api/2025-01/products.json?limit=${limit}&fields=id,title,handle,product_type,variants,images,tags,vendor${type ? `&product_type=${encodeURIComponent(type)}` : ""}`;
  const res = await fetch(apiUrl, {
    headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN! },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Shopify products failed: ${res.status}`);
  const data = await res.json();
  return (data.products ?? [])
    .filter((p: any) => p.images && p.images.length > 0)
    .map((p: any) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      type: p.product_type ?? "",
      price: p.variants?.[0]?.price ?? "0",
      image: p.images[0]?.src ?? "",
      url: `https://${SHOPIFY_URL}/products/${p.handle}`,
      images: p.images.slice(0, 4).map((img: any) => img.src),
      tags: (p.tags ?? "").split(",").map((t: string) => t.trim()).filter(Boolean),
      vendor: p.vendor ?? "",
    }));
}

async function fetchBestSellers(): Promise<ShopifyProduct[]> {
  // ShopifyQL: top 20 products by gross sales in last 60 days
  const gqlRes = await fetch(
    `https://${SHOPIFY_URL}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_TOKEN!,
      },
      body: JSON.stringify({
        query: `query {
          reportingQuery(query: "FROM sales SHOW gross_sales, orders GROUP BY product_title ORDER BY gross_sales DESC SINCE -60d UNTIL today LIMIT 20") {
            data
            rowCount
            columnNames
          }
        }`,
      }),
    }
  );

  const gqlData = await gqlRes.json();
  const report = gqlData?.data?.reportingQuery;
  if (!report?.data) throw new Error("ShopifyQL returned no data");

  const columns: string[] = report.columnNames;
  const rows: unknown[][] = JSON.parse(report.data);

  // Build a ranked title → sales map
  const salesMap = new Map<string, { grossSales: number; ordersCount: number; rank: number }>();
  rows.forEach((row, rank) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    const title = String(obj["product_title"] ?? "").trim();
    if (title) {
      salesMap.set(title.toLowerCase(), {
        grossSales: parseFloat(String(obj["gross_sales"] ?? "0")),
        ordersCount: parseInt(String(obj["orders"] ?? "0"), 10),
        rank,
      });
    }
  });

  // Fetch product details from REST (50 is enough to cover 20 best sellers)
  const products = await fetchProductDetails("50", "");

  // Filter + enrich with sales data, sorted by rank
  return products
    .filter((p) => salesMap.has(p.title.toLowerCase()))
    .map((p) => ({
      ...p,
      grossSales: salesMap.get(p.title.toLowerCase())!.grossSales,
      ordersCount: salesMap.get(p.title.toLowerCase())!.ordersCount,
    }))
    .sort(
      (a, b) =>
        (salesMap.get(a.title.toLowerCase())!.rank) -
        (salesMap.get(b.title.toLowerCase())!.rank)
    );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";
  const limit = searchParams.get("limit") ?? "50";
  const bestsellers = searchParams.get("bestsellers") === "true";

  try {
    const products = bestsellers
      ? await fetchBestSellers()
      : await fetchProductDetails(limit, type);

    return NextResponse.json({ products });
  } catch (err) {
    console.error("[Products API]", err);
    return NextResponse.json({ products: [] });
  }
}
