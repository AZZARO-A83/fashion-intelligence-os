# Fashion Intelligence OS - Agent Rules

## Shopify Work

When a request involves Shopify APIs, Shopify Admin data, Shopify GraphQL, Liquid, themes, app extensions, products, orders, customers, checkout, or store operations:

1. Use the installed Shopify plugin / Shopify AI Toolkit skills first.
2. Prefer Shopify docs, API schemas, and validators over memory.
3. Validate GraphQL, Liquid, and extension code when the relevant validator is available.
4. Keep analytics based on authenticated live Shopify data from this app's backend credentials.
5. Do not invent Cartsaver, channel, product, order, inventory, or customer data.
6. If the Shopify connector OAuth is broken, use the app's server-side Shopify API integration instead of guessing.

## Report Data Standard

Reports used for business decisions must show the source, time window, comparison window, and limits. If a metric cannot be proven from live data, label it as unavailable instead of filling a placeholder.
