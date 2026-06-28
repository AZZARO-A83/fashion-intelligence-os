import { createSign } from "crypto";

export interface SearchConsoleQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  score: number;
}

export interface SearchConsolePageOpportunity extends SearchConsoleQuery {
  page: string;
  action: string;
  reason: string;
}

export interface SearchConsoleResult {
  queries: SearchConsoleQuery[];
  pageOpportunities: SearchConsolePageOpportunity[];
  generatedAt: string;
  startDate: string;
  endDate: string;
  siteUrl: string;
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

const FASHION_QUERY = /\b(fashion|style|outfit|wear|clothing|dress|shirt|polo|tee|t-shirt|trouser|pants|jeans|chino|blazer|suit|jacket|skirt|blouse|top|co-ord|set|abaya|kaftan|vest|shoe|shoes|loafer|sneaker|tie|belt|cufflink|brooch|socks|linen|cotton|denim|viscose|silk|satin|chiffon|modest|menswear|womenswear|wide.?leg|summer|beachwear|buy|shop|collection|casual|formal|women|men|ladies|رجالي|نسائي|فستان|قميص|بنطلون|جينز|بلوزة|عباية|فيست|حذاء|جزمة|حزام|كرافت|شراب|كتان|قطن)\b/i;
const REJECT_QUERY = /\b(job|career|wholesale supplier|factory|login|contact|return policy|tracking|complaint|politics|tourism|weather)\b/i;

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function privateKey(): string {
  return (process.env.GSC_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function getAccessToken(): Promise<string> {
  const clientEmail = requiredEnv("GSC_CLIENT_EMAIL");
  const key = privateKey();
  if (!key) throw new Error("GSC_PRIVATE_KEY is not set");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) throw new Error(`Google auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("Google auth did not return an access token");
  return String(data.access_token);
}

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function scoreQuery(q: Omit<SearchConsoleQuery, "score">): number {
  const clickScore = Math.min(45, q.clicks * 5);
  const impressionScore = Math.min(40, Math.log10(q.impressions + 1) * 14);
  const ctrScore = Math.min(10, q.ctr * 100);
  const positionScore = q.position <= 10 ? 5 : q.position <= 20 ? 2 : 0;
  const languageBoost = /[؀-ۿ]/.test(q.query) ? 1.7 : 1.0;
  return Math.min(100, Math.round((clickScore + impressionScore + ctrScore + positionScore) * languageBoost));
}

function keepFashionQuery(query: string): boolean {
  return query.length >= 3 && FASHION_QUERY.test(query) && !REJECT_QUERY.test(query);
}

function actionForOpportunity(q: Omit<SearchConsolePageOpportunity, "score" | "action" | "reason">): { action: string; reason: string } {
  if (q.impressions >= 100 && q.ctr < 0.015 && q.position <= 10) {
    return {
      action: "Rewrite title/meta for CTR",
      reason: "High impressions and page-one visibility, but CTR is weak.",
    };
  }
  if (q.impressions >= 80 && q.position > 10 && q.position <= 20) {
    return {
      action: "Add content section and internal links",
      reason: "Demand exists, but ranking is stuck on page two.",
    };
  }
  if (q.clicks >= 5 && q.position <= 5) {
    return {
      action: "Protect ranking and match page copy",
      reason: "Already winning clicks; keep page aligned with this exact query.",
    };
  }
  if (q.impressions >= 50 && q.ctr < 0.03) {
    return {
      action: "Improve search snippet",
      reason: "People see the result but do not click enough.",
    };
  }
  return {
    action: "Monitor",
    reason: "Useful signal, but not urgent yet.",
  };
}

export function searchConsoleDemandSet(result: SearchConsoleResult | null | undefined): Set<string> {
  return new Set((result?.queries ?? []).map((q) => q.query.toLowerCase().trim()).filter(Boolean));
}

export async function fetchSearchConsoleQueries(options: { startDate?: string; endDate?: string } = {}): Promise<SearchConsoleResult> {
  const siteUrl = requiredEnv("GSC_SITE_URL");
  const accessToken = await getAccessToken();
  const startDate = options.startDate || process.env.GSC_START_DATE || isoDateDaysAgo(30);
  const endDate = options.endDate || process.env.GSC_END_DATE || isoDateDaysAgo(2);
  const rowLimit = Math.min(Number(process.env.GSC_ROW_LIMIT || 250), 1000);

  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const baseBody = {
    startDate,
    endDate,
    type: "web",
    rowLimit,
    dimensionFilterGroups: [
      {
        groupType: "and",
        filters: [{ dimension: "country", operator: "equals", expression: "EGY" }],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...baseBody,
      dimensions: ["query"],
    }),
  });

  if (!res.ok) throw new Error(`Search Console query failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const queries: SearchConsoleQuery[] = (data.rows ?? [])
    .map((row: any) => {
      const query = String(row.keys?.[0] || "").trim();
      const base = {
        query,
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
        ctr: Number(row.ctr || 0),
        position: Number(row.position || 0),
      };
      return { ...base, score: scoreQuery(base) };
    })
    .filter((q: SearchConsoleQuery) => keepFashionQuery(q.query))
    .sort((a: SearchConsoleQuery, b: SearchConsoleQuery) => b.score - a.score)
    .slice(0, 120);

  const pageRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...baseBody,
      dimensions: ["query", "page"],
    }),
  });

  if (!pageRes.ok) throw new Error(`Search Console page query failed: ${pageRes.status} ${await pageRes.text()}`);
  const pageData = await pageRes.json();
  const pageOpportunities: SearchConsolePageOpportunity[] = (pageData.rows ?? [])
    .map((row: any) => {
      const query = String(row.keys?.[0] || "").trim();
      const page = String(row.keys?.[1] || "").trim();
      const base = {
        query,
        page,
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
        ctr: Number(row.ctr || 0),
        position: Number(row.position || 0),
      };
      const action = actionForOpportunity(base);
      return { ...base, ...action, score: scoreQuery(base) };
    })
    .filter((q: SearchConsolePageOpportunity) => keepFashionQuery(q.query))
    .filter((q: SearchConsolePageOpportunity) => q.impressions >= 20 || q.clicks >= 3)
    .sort((a: SearchConsolePageOpportunity, b: SearchConsolePageOpportunity) => {
      const aOpportunity = a.impressions * Math.max(0.01, 0.08 - a.ctr) + Math.max(0, a.position - 5) * 5;
      const bOpportunity = b.impressions * Math.max(0.01, 0.08 - b.ctr) + Math.max(0, b.position - 5) * 5;
      return bOpportunity - aOpportunity;
    })
    .slice(0, 30);

  return { queries, pageOpportunities, generatedAt: new Date().toISOString(), startDate, endDate, siteUrl };
}
