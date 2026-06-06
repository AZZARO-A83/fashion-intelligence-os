import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Diagnostic: tests ShopifyQL via shopifyqlQuery GraphQL field.
// Visit /api/debug-search on Vercel to see if ShopifyQL is accessible.
export async function GET() {
  const url = process.env.SHOPIFY_STORE_URL;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ error: "Shopify env vars missing" }, { status: 500 });
  }

  const query = `FROM sales SHOW average_order_value, orders, gross_sales, net_sales SINCE -30d UNTIL today`;

  const res = await fetch(`https://${url}/admin/api/2025-01/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `{ shopifyqlQuery(query: ${JSON.stringify(query)}) { tableData { columns { name dataType } rows } } }`,
    }),
  });

  const data = await res.json();

  return NextResponse.json({
    httpStatus: res.status,
    hasData: !!data?.data?.shopifyqlQuery,
    errors: data?.errors ?? null,
    tableData: data?.data?.shopifyqlQuery?.tableData ?? null,
    raw: JSON.stringify(data).slice(0, 500),
  });
}
