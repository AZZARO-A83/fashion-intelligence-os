import { NextResponse } from "next/server";
import { getSalesData } from "@/lib/shopify";

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

// Live best sellers — ranked by REAL sales (raw Shopify order line-items, last 30 days),
// then enriched with product images/handle from the catalog so the UI can show them.
//
// NOTE: this used to call a GraphQL field `reportingQuery` that does NOT exist on the
// Shopify Admin API ("Field 'reportingQuery' doesn't exist on type 'QueryRoot'"), so it
// silently returned [] forever. Now it reuses getSalesData() — the same engine the
// dashboard/analytics use — which is verified live.
// Fetch the ENTIRE catalog across pages (Shopify caps each page at 250).
// The store has >250 products, so a single page misses most best sellers —
// that's why matching used to drop 9 of the top 10. Paginate via the Link header.
async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let endpoint = `https://${SHOPIFY_URL}/admin/api/2025-01/products.json?limit=250&fields=id,title,handle,product_type,variants,images,tags,vendor`;
  for (let page = 0; page < 20; page++) { // hard stop at 5000 products
    const res = await fetch(endpoint, { headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN! } });
    if (!res.ok) break;
    const data = await res.json();
    for (const p of data.products ?? []) {
      if (!p.images?.length) continue;
      all.push({
        id: p.id, title: p.title, handle: p.handle, type: p.product_type ?? "",
        price: p.variants?.[0]?.price ?? "0", image: p.images[0]?.src ?? "",
        url: `https://${SHOPIFY_URL}/products/${p.handle}`,
        images: p.images.slice(0, 4).map((img: any) => img.src),
        tags: (p.tags ?? "").split(",").map((t: string) => t.trim()).filter(Boolean),
        vendor: p.vendor ?? "",
      });
    }
    const link = res.headers.get("Link") ?? "";
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    if (!next || (data.products ?? []).length < 250) break;
    endpoint = next[1];
  }
  return all;
}

async function fetchBestSellers(): Promise<ShopifyProduct[]> {
  const sales = await getSalesData(); // default = last 30 days, live from Shopify
  if (!sales.isLive || !sales.topProducts.length) return [];

  // Pull the FULL catalog (paginated) to attach images/handle/type to each ranked seller.
  const details = await fetchAllProducts();
  const byTitle = new Map(details.map((p) => [p.title.toLowerCase().trim(), p]));

  return sales.topProducts
    .map((tp, rank): ShopifyProduct => {
      const d = byTitle.get(tp.name.toLowerCase().trim());
      return {
        id: d?.id ?? rank,
        title: tp.name,
        handle: d?.handle ?? "",
        type: d?.type || tp.category || "",
        price: d?.price ?? "0",
        image: d?.image ?? "",
        url: d?.url ?? (d?.handle ? `https://${SHOPIFY_URL}/products/${d.handle}` : ""),
        images: d?.images ?? [],
        tags: d?.tags ?? [],
        vendor: d?.vendor ?? "",
        grossSales: tp.revenue,   // real EGP revenue from order line-items
        ordersCount: tp.units,    // real units sold
      };
    })
    .filter((p) => p.image); // grid needs a photo; drop any without one
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
