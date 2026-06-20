import { createSign } from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || "500097551";

export interface Ga4ConversionMetrics {
  sessions: number;
  purchases: number;
  conversionRate: number;
  source: "ga4-live";
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function privateKey(): string {
  return (process.env.GA_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

function clientEmail(): string {
  return process.env.GA_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL || "";
}

function hasGa4Keys(): boolean {
  return !!(GA4_PROPERTY_ID && clientEmail() && privateKey());
}

async function getAccessToken(): Promise<string> {
  const email = clientEmail();
  const key = privateKey();
  if (!email) throw new Error("GA_CLIENT_EMAIL or GSC_CLIENT_EMAIL is not set");
  if (!key) throw new Error("GA_PRIVATE_KEY or GSC_PRIVATE_KEY is not set");

  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify({
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))}`;
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

  if (!res.ok) throw new Error(`Google Analytics auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("Google Analytics auth did not return an access token");
  return String(data.access_token);
}

export async function fetchGa4ConversionMetrics(
  startDate: string,
  endDate: string,
  purchasesFallback: number
): Promise<Ga4ConversionMetrics | null> {
  if (!hasGa4Keys()) return null;

  const accessToken = await getAccessToken();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: "sessions" }, { name: "ecommercePurchases" }],
    }),
  });

  if (!res.ok) throw new Error(`GA4 Data API failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const values = data.rows?.[0]?.metricValues ?? [];
  const sessions = Number(values[0]?.value || 0);
  const gaPurchases = Number(values[1]?.value || 0);
  const purchases = purchasesFallback || gaPurchases;
  const conversionRate = sessions > 0 ? Math.round((purchases / sessions) * 100 * 100) / 100 : 0;

  return { sessions, purchases, conversionRate, source: "ga4-live" };
}
