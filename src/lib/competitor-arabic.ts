// ─── Arabic Competitor Intelligence — deterministic layer ────────────────
// Egypt runs on Arabic. English-only competitor search misses the real
// signal (offers, garment focus, campaign angles). This module:
//   1. searches each competitor in Arabic + English + Franco (BATCHED to
//      keep Serper credits tiny — many keywords per call via OR),
//   2. classifies every snippet BY CODE (offer type, garment, gender, angle),
//   3. clusters repeated signals and ISOLATES noise (one-offs are dropped),
//   4. hands Groq only the clean clustered signals to write copy.
//
// Reuses the garment/fabric/gender dictionaries from catalog-taxonomy.ts —
// one source of truth, no duplication.

import {
  normalize, detectGarment, detectFabric, detectGender, Gender,
} from "./catalog-taxonomy";

const hasArabic = (s: string) => /[؀-ۿ]/.test(s);

// Word-bounded (English/Franco) or substring (Arabic) match.
function matchAny(paddedNorm: string, aliases: string[]): string[] {
  const hits: string[] = [];
  for (const raw of aliases) {
    const a = normalize(raw);
    if (!a) continue;
    if (hasArabic(a)) {
      if (paddedNorm.includes(a)) hits.push(raw);
    } else {
      const esc = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(?:^| )${esc}(?:$| )`).test(paddedNorm)) hits.push(raw);
    }
  }
  return hits;
}

// ─── BRAND REGISTRY ─────────────────────────────────────────────────────────
export interface CompetitorBrand {
  key: string;
  name: string;              // display name
  segment: "premium" | "mass";
  aliases: string[];         // EN + AR variations (used in queries + relevance)
  website?: string;
  instagram: string;
  tiktok: string;
  metaAds: string;           // Meta Ad Library keyword search (always valid)
}

const META = (q: string) =>
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=EG&q=${encodeURIComponent(q)}&search_type=keyword_unordered`;
const TT = (q: string) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`;
const IG_SEARCH = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q + " instagram")}`;

export const COMPETITOR_BRANDS: CompetitorBrand[] = [
  {
    key: "tie-house", name: "Tie House", segment: "premium",
    aliases: ["Tie House", "TieHouse", "تاي هاوس", "تاى هاوس"],
    website: "tiehouse.ae",
    instagram: "https://www.instagram.com/tiehouse/", tiktok: "https://www.tiktok.com/@tiehouse", metaAds: META("tie house"),
  },
  {
    key: "british-house", name: "British House", segment: "premium",
    aliases: ["British House", "BritishHouse", "بريتش هاوس", "البريطانية"],
    website: "britishhouse.shop",
    instagram: "https://www.instagram.com/british.house.official/", tiktok: "https://www.tiktok.com/@britishhouse", metaAds: META("british house egypt"),
  },
  {
    key: "massimo-dutti", name: "Massimo Dutti", segment: "premium",
    aliases: ["Massimo Dutti", "MassimoDutti", "ماسيمو دوتي", "ماسيمو دوتى"],
    website: "massimodutti.com",
    instagram: "https://www.instagram.com/massimodutti/", tiktok: "https://www.tiktok.com/@massimodutti", metaAds: META("massimo dutti"),
  },
  {
    key: "defacto", name: "DeFacto", segment: "mass",
    aliases: ["DeFacto", "De Facto", "ديفاكتو", "دي فاكتو"],
    website: "defacto.com.eg",
    instagram: "https://www.instagram.com/defacto/", tiktok: TT("defacto egypt"), metaAds: META("defacto"),
  },
  {
    key: "town-team", name: "Town Team", segment: "mass",
    aliases: ["Town Team", "TownTeam", "تاون تيم"],
    website: "townteam.com",
    instagram: IG_SEARCH("town team egypt"), tiktok: TT("town team egypt"), metaAds: META("town team"),
  },
  {
    key: "lc-waikiki", name: "LC Waikiki", segment: "mass",
    aliases: ["LC Waikiki", "LCWaikiki", "Waikiki", "ال سي وايكيكي", "إل سي وايكيكي", "وايكيكي"],
    website: "lcwaikiki.com",
    instagram: "https://www.instagram.com/lcwaikiki/", tiktok: "https://www.tiktok.com/@lcwaikiki", metaAds: META("lc waikiki"),
  },
];

// ─── OFFER TYPES (Arabic + English + Franco) ────────────────────────────────
export const OFFER_TYPES: Record<string, string[]> = {
  discount: ["خصم", "تخفيض", "تخفيضات", "سيل", "اوفر", "وفر", "عرض", "عروض", "نص السعر", "خصومات", "كوبون", "كود خصم", "sale", "discount", "offer", "off", "%", "khasm", "5asm", "takhfeed", "3orood", "3ard"],
  "new-arrival": ["كولكشن جديد", "الجديد", "وصل حديثا", "وصل جديد", "نزل جديد", "احدث كولكشن", "احدث", "new collection", "new arrival", "new in", "gedid", "gded", "collection gedida"],
  bundle: ["عرض قطعتين", "قطعتين", "اشتري قطعه", "اتنين بسعر", "باكدج", "طقم", "2 قطعه", "bundle", "package", "2 for"],
  "free-shipping": ["شحن مجاني", "توصيل مجاني", "دليفري مجاني", "شحن مجانا", "free delivery", "free shipping"],
  urgency: ["لفتره محدوده", "اخر فرصه", "الكميه محدوده", "قبل النفاد", "الحق", "مستني ايه", "العرض لفتره محدوده", "limited", "last chance", "ends soon"],
};

// ─── CAMPAIGN ANGLES (Arabic + English) ─────────────────────────────────────
export const CAMPAIGN_ANGLES: Record<string, string[]> = {
  "summer-essentials": ["صيف", "صيفي", "كولكشن الصيف", "خفيف", "مريح", "مناسب للحر", "حر الصيف", "summer", "lightweight", "breathable"],
  "office-wear": ["شغل", "مكتب", "لوك الشغل", "لبس الشغل", "office", "work", "workwear"],
  "smart-casual": ["سمارت كاجوال", "شيك وكاجوال", "كاجوال شيك", "يومي وشيك", "smart casual"],
  "formal-elegance": ["كلاسيك", "فورمال", "اناقه", "شيك", "مناسبات", "formal", "elegant", "classic", "occasion"],
  "sahel-vacation": ["الساحل", "ساحل", "مصيف", "بحر", "اجازه", "خروجه", "سفر", "sahel", "north coast", "vacation", "resort", "beach"],
  "price-value": ["اقل سعر", "اسعار", "ارخص", "value", "affordable", "best price"],
  "everyday-basics": ["يومي", "اساسي", "لبس كل يوم", "basic", "basics", "everyday", "essentials"],
  "premium-quality": ["خامه", "جوده", "فخامه", "تقفيل", "تفصيل", "premium", "quality", "luxury", "craftsmanship"],
};

// Extra gender tokens beyond the taxonomy set (Egyptian colloquial / Franco).
const MEN_EXTRA = ["شبابي", "شباب", "regaly", "ragaly", "shababy"];
const WOMEN_EXTRA = ["للسيدات", "harimy", "nesai", "banaty"];

// ─── BATCHED QUERY BUILDER (credit-cheap, full-keyword coverage) ─────────────
// 5 calls per brand. Each call packs many keywords via OR — so one call covers
// the whole offer list, the whole garment list, etc.
export function buildBrandQueries(b: CompetitorBrand): { q: string; days: number }[] {
  const brand = `(${b.aliases.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" OR ")})`;
  const offers = `(خصم OR تخفيضات OR عروض OR "كود خصم" OR "كولكشن جديد" OR "شحن مجاني" OR sale OR discount OR offer)`;
  const menG = `(قميص OR بنطلون OR بولو OR تيشيرت OR بدله OR بليزر OR جينز OR shirt OR polo OR trousers OR suit)`;
  const womenG = `(فستان OR بلوزه OR جيبه OR بنطلون OR توب OR dress OR blouse OR skirt)`;
  const social = `(انستجرام OR فيسبوك OR "تيك توك" OR instagram OR tiktok OR reels)`;
  const season = `(صيف OR "صيف 2026" OR summer OR الساحل OR sahel OR شغل OR formal OR كلاسيك)`;

  return [
    { q: `${brand} ${offers} مصر`, days: 60 },
    { q: `${brand} رجالي ${menG} مصر`, days: 60 },
    { q: `${brand} حريمي ${womenG} مصر`, days: 60 },
    { q: `${brand} ${social} ${offers}`, days: 45 },
    { q: `${brand} ${season} مصر 2026`, days: 60 },
  ];
}

// ─── SNIPPET CLASSIFIER ─────────────────────────────────────────────────────
export interface SnippetSignal {
  text: string;
  url: string;
  lang: "ar" | "en";
  offers: string[];
  garment: string | null;
  fabric: string | null;
  gender: Gender;
  angles: string[];
  matchedKeywords: string[];   // raw alias hits (for "keywords detected" chips)
}

export function classifySnippet(snippet: { title: string; summary?: string; url: string }, brand: CompetitorBrand): SnippetSignal | null {
  const text = `${snippet.title} ${snippet.summary || ""}`.trim();
  const padded = ` ${normalize(text)} `;

  // Relevance gate #1 — must actually mention the brand (kills noise).
  const mentionsBrand = matchAny(padded, brand.aliases).length > 0;
  if (!mentionsBrand) return null;

  const offers: string[] = [];
  const matchedKeywords: string[] = [];
  for (const [type, words] of Object.entries(OFFER_TYPES)) {
    const hits = matchAny(padded, words);
    if (hits.length) { offers.push(type); matchedKeywords.push(...hits); }
  }
  const angles: string[] = [];
  for (const [angle, words] of Object.entries(CAMPAIGN_ANGLES)) {
    const hits = matchAny(padded, words);
    if (hits.length) { angles.push(angle); matchedKeywords.push(...hits); }
  }
  const g = detectGarment(text);
  const garment = g?.def.type ?? null;
  if (garment) matchedKeywords.push(garment);
  const fabric = detectFabric(text)?.fabric ?? null;

  let gender = detectGender(text);
  if (gender === "unknown") {
    if (matchAny(padded, MEN_EXTRA).length) gender = "men";
    else if (matchAny(padded, WOMEN_EXTRA).length) gender = "women";
  }

  // Relevance gate #2 — must carry at least ONE business signal, else noise.
  if (!offers.length && !garment && !angles.length) return null;

  return {
    text: text.length > 220 ? text.slice(0, 217) + "…" : text,
    url: snippet.url,
    lang: hasArabic(text) ? "ar" : "en",
    offers, garment, fabric, gender, angles,
    matchedKeywords: Array.from(new Set(matchedKeywords)),
  };
}

// ─── CLUSTER + NOISE ISOLATION ──────────────────────────────────────────────
export interface BrandSignalCluster {
  offerCounts: { type: string; count: number }[];
  garmentCounts: { garment: string; count: number }[];
  angleCounts: { angle: string; count: number }[];
  genderSplit: { men: number; women: number; unisex: number };
  arabicKeywords: string[];
  englishKeywords: string[];
  arabicEvidence: { text: string; url: string }[];
  englishEvidence: { text: string; url: string }[];
  totalSignals: number;
  strongOffers: string[];     // offers seen ≥2 times (a real, repeated signal)
  strongGarments: string[];
  strongAngles: string[];
}

function rank(map: Record<string, number>): { k: string; count: number }[] {
  return Object.entries(map).map(([k, count]) => ({ k, count })).sort((a, b) => b.count - a.count);
}

export function clusterBrandSignals(signals: SnippetSignal[]): BrandSignalCluster {
  const offer: Record<string, number> = {};
  const garment: Record<string, number> = {};
  const angle: Record<string, number> = {};
  const genderSplit = { men: 0, women: 0, unisex: 0 };
  const arSet = new Set<string>(); const enSet = new Set<string>();
  const arEv: { text: string; url: string }[] = []; const enEv: { text: string; url: string }[] = [];
  const seenEv = new Set<string>();

  for (const s of signals) {
    for (const o of s.offers) offer[o] = (offer[o] || 0) + 1;
    if (s.garment) garment[s.garment] = (garment[s.garment] || 0) + 1;
    for (const a of s.angles) angle[a] = (angle[a] || 0) + 1;
    if (s.gender === "men") genderSplit.men++;
    else if (s.gender === "women") genderSplit.women++;
    else if (s.gender === "unisex") genderSplit.unisex++;
    for (const k of s.matchedKeywords) (hasArabic(k) ? arSet : enSet).add(k);
    const evKey = s.url + s.text.slice(0, 40);
    if (!seenEv.has(evKey)) {
      seenEv.add(evKey);
      if (s.lang === "ar" && arEv.length < 6) arEv.push({ text: s.text, url: s.url });
      if (s.lang === "en" && enEv.length < 6) enEv.push({ text: s.text, url: s.url });
    }
  }

  const offerCounts = rank(offer).map(({ k, count }) => ({ type: k, count }));
  const garmentCounts = rank(garment).map(({ k, count }) => ({ garment: k, count }));
  const angleCounts = rank(angle).map(({ k, count }) => ({ angle: k, count }));

  return {
    offerCounts, garmentCounts, angleCounts, genderSplit,
    arabicKeywords: [...arSet].slice(0, 20),
    englishKeywords: [...enSet].slice(0, 20),
    arabicEvidence: arEv, englishEvidence: enEv,
    totalSignals: signals.length,
    // NOISE ISOLATION: a signal only counts as "strong" if it repeats (≥2).
    strongOffers: offerCounts.filter((o) => o.count >= 2).map((o) => o.type),
    strongGarments: garmentCounts.filter((g) => g.count >= 2).map((g) => g.garment),
    strongAngles: angleCounts.filter((a) => a.count >= 2).map((a) => a.angle),
  };
}
