import { getFeedPool, searchFeedPool } from "./src/lib/feeds.ts";
const pool = await getFeedPool();
const byHost = new Map<string, number>();
for (const p of pool) byHost.set(p.host, (byHost.get(p.host) ?? 0) + 1);
console.log("POOL:", pool.length, "items from", byHost.size, "publishers");
console.log([...byHost.entries()].map(([h, n]) => `${h}:${n}`).join("  "));
const res = await searchFeedPool([
  "new fashion colours fabrics Egypt 2026",
  "Egypt men women new clothing styles linen cotton 2026",
  "trending fabrics silhouettes menswear womenswear 2026",
]);
console.log("\nSEARCH HITS:", res.length);
for (const s of res) console.log("•", (s.score ?? 0).toFixed(2), new URL(s.url).hostname.replace("www.", ""), "|", s.title.slice(0, 70), "|", (s.date ?? "").slice(0, 10));
