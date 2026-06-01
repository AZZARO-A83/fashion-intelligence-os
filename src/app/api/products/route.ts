import { NextResponse } from "next/server";

const SHOPIFY_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export interface ShopifyProduct {
  id: number;
  title: string;
  type: string;
  price: string;
  image: string;
  images: string[];
  tags: string[];
  vendor: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";
  const limit = searchParams.get("limit") ?? "50";

  try {
    const url = `https://${SHOPIFY_URL}/admin/api/2025-01/products.json?limit=${limit}&fields=id,title,product_type,variants,images,tags,vendor${type ? `&product_type=${encodeURIComponent(type)}` : ""}`;

    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN! },
      next: { revalidate: 3600 }, // cache 1 hour
    });

    if (!res.ok) throw new Error(`Shopify products failed: ${res.status}`);
    const data = await res.json();

    const products: ShopifyProduct[] = (data.products ?? [])
      .filter((p: any) => p.images && p.images.length > 0)
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        type: p.product_type ?? "",
        price: p.variants?.[0]?.price ?? "0",
        image: p.images[0]?.src ?? "",
        images: p.images.slice(0, 4).map((img: any) => img.src),
        tags: (p.tags ?? "").split(",").map((t: string) => t.trim()).filter(Boolean),
        vendor: p.vendor ?? "",
      }));

    return NextResponse.json({ products });
  } catch (err) {
    console.error("[Products API]", err);
    return NextResponse.json({ products: [] });
  }
}
