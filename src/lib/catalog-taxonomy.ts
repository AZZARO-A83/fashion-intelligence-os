// ─── Catalog Taxonomy + Detection Dictionaries ───────────────────────────
// Single source of truth for the Trend Engine's DETERMINISTIC layer.
//
// Core principle (do NOT break it): a search query is classified into
// structured layers (gender → garment → fabric → modifier → intent) by CODE,
// using these dictionaries — BEFORE any AI sees it. The AI never decides the
// garment type. "jeans" is a GARMENT. "denim" is a FABRIC. A search for jeans
// can never become a denim-jacket trend.
//
// Built from the official Debackers Shopify menu (For Him / For Her).

export type Gender = "men" | "women" | "unisex" | "unknown";
export type Intent = "buying" | "styling" | "informational" | "brand" | "noise";
export type Season = "summer" | "winter" | "all-season" | "unknown";

// ─── Text normalization ───────────────────────────────────────────────────
// English: lowercase, hyphens/slashes → spaces, strip punctuation, collapse.
// Arabic: unify alef/ya/ta-marbuta variants + strip tashkeel so spelling
// differences ("عباية" vs "عباءة") still match.
export function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ْٰ]/g, "") // tashkeel / diacritics
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/گ/g, "ك");
}

export function normalize(s: string): string {
  if (!s) return "";
  const lowered = s.toLowerCase().normalize("NFKC");
  const noPunct = lowered
    .replace(/[‐‑‒–—_/\\.,،؛;:!?"'`(){}\[\]]+/g, " ")
    .replace(/[-]+/g, " ");
  return normalizeArabic(noPunct).replace(/\s+/g, " ").trim();
}

const hasArabic = (s: string) => /[؀-ۿ]/.test(s);

// Whole-word (English) or substring (Arabic) match of `alias` inside `text`.
// `text` must already be normalized + space-padded.
function aliasMatches(paddedText: string, alias: string): boolean {
  const a = normalize(alias);
  if (!a) return false;
  if (hasArabic(a)) return paddedText.includes(a);
  // English: require non-alphanumeric boundaries so "tee" ≠ "canteen".
  const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^| )${escaped}(?:$| )`).test(paddedText);
}

// ─── GARMENT TYPES ─────────────────────────────────────────────────────────
// priority: higher wins when several garments match the same query.
//   - outerwear (jacket/blazer/suit/overshirt/coat) beats fabric-garments (jeans)
//     so "denim jacket" / "jean jacket" → jacket, never jeans.
//   - specific (polo/jeans/chino) beats generic (tshirt/shirt/pants).
// defaultFabric: e.g. jeans always implies denim.
// seasonCold: garment is cold-weather → Winter Backlog when seasonMode=summer.
export interface GarmentDef {
  type: string;          // canonical garmentType (cluster key)
  family: string;        // garmentFamily
  priority: number;
  en: string[];          // english aliases (whole-word match)
  ar: string[];          // arabic aliases (substring match)
  defaultFabric?: string;
  seasonCold?: boolean;
  womenOnly?: boolean;
  menOnly?: boolean;
  catalog: { men?: string; women?: string }; // Shopify catalog path
}

export const GARMENTS: GarmentDef[] = [
  // ── Outerwear / structured (high priority) ──
  {
    type: "overshirt", family: "Shirts / Light Outerwear", priority: 93,
    en: ["overshirt", "over shirt", "shirt jacket", "shacket"],
    ar: ["اوفر شيرت", "اوفرشيرت"],
    catalog: { men: "For Him > Shirts > Over-Shirt" },
  },
  {
    type: "polo", family: "T-Shirts", priority: 90,
    en: ["polo", "polo shirt", "polo t shirt", "polo tshirt", "polo tee"],
    ar: ["بولو", "تيشيرت بولو", "بولو شيرت"],
    defaultFabric: "pique",
    catalog: { men: "For Him > T-Shirts > Polo T-Shirts" },
  },
  {
    type: "blazer", family: "Suits & Blazers", priority: 88,
    en: ["blazer", "blazers", "sport coat", "sports jacket"],
    ar: ["بليزر", "بليزر رجالي", "بليزر حريمي"],
    catalog: { men: "For Him > Suits & Blazers", women: "For Her > Women's Suit" },
  },
  {
    type: "suit", family: "Suits & Blazers", priority: 87,
    en: ["suit", "suits", "formal suit", "two piece suit", "three piece suit", "tuxedo"],
    ar: ["بدله", "بدله رجالي", "بدله حريمي", "بدل"],
    catalog: { men: "For Him > Suits & Blazers", women: "For Her > Women's Suit" },
  },
  {
    type: "jacket", family: "Outerwear", priority: 86,
    en: ["jacket", "jackets", "denim jacket", "jean jacket", "bomber", "bomber jacket", "windbreaker", "varsity jacket"],
    ar: ["جاكيت", "جاكت", "جاكيت جينز"],
    catalog: {}, // not a current Debackers category → Opportunity
  },
  {
    type: "cardigan", family: "Knitwear", priority: 85,
    en: ["cardigan", "cardigans", "knit cardigan"],
    ar: ["كارديجان", "كارديغان"],
    seasonCold: true,
    catalog: { women: "For Her > Cardigan" },
  },
  {
    type: "vest", family: "Vests", priority: 84,
    en: ["vest", "vests", "women vest", "women's vest", "sleeveless vest", "tailored vest", "waistcoat"],
    ar: ["فيست", "فست", "جيليه", "ويست كوت"],
    catalog: { women: "For Her > Women Vest" },
  },
  {
    type: "jumpsuit", family: "One-Piece", priority: 84,
    en: ["jumpsuit", "jumpsuits", "playsuit", "romper"],
    ar: ["جمبسوت", "جامبسوت", "اوفرول"],
    womenOnly: true,
    catalog: {}, // Opportunity
  },
  {
    type: "dress", family: "Dresses", priority: 83,
    en: ["dress", "dresses", "midi dress", "maxi dress", "mini dress", "wrap dress", "shirt dress", "summer dress", "floral dress", "gown", "evening dress"],
    ar: ["فستان", "فساتين", "فستان ميدي", "فستان ماكسي", "فستان سواريه", "فستان كاجوال"],
    womenOnly: true,
    catalog: { women: "For Her > Dresses" },
  },
  {
    type: "skirt", family: "Skirts", priority: 82,
    en: ["skirt", "skirts", "midi skirt", "maxi skirt", "mini skirt", "pleated skirt", "denim skirt"],
    ar: ["تنوره", "جيبه", "جونله"],
    womenOnly: true,
    catalog: { women: "For Her > Skirt" },
  },
  {
    type: "abaya", family: "Modest", priority: 81,
    en: ["abaya", "abayas"],
    ar: ["عبايه", "عبايات"],
    womenOnly: true,
    catalog: {}, // Opportunity
  },
  {
    type: "kaftan", family: "Modest", priority: 80,
    en: ["kaftan", "caftan", "kaftans"],
    ar: ["قفطان", "قفاطين"],
    womenOnly: true,
    catalog: {},
  },
  {
    type: "coat", family: "Outerwear", priority: 78,
    en: ["coat", "overcoat", "trench coat", "trench", "parka", "puffer", "puffer jacket", "puffer coat"],
    ar: ["معطف", "بالطو", "كوت", "بفر"],
    seasonCold: true,
    catalog: {},
  },
  // ── Pants family ──
  {
    type: "jeans", family: "Pants", priority: 70,
    en: ["jeans", "jean", "denim jeans", "baggy jeans", "skinny jeans", "mom jeans", "straight jeans", "wide leg jeans", "ripped jeans", "blue jeans", "black jeans"],
    ar: ["جينز", "بنطلون جينز", "بنطال جينز", "بنطلون جينs"],
    defaultFabric: "denim",
    catalog: { men: "For Him > Pants > Jeans", women: "For Her > Women Pants > Jeans" },
  },
  {
    type: "chino", family: "Pants", priority: 69,
    en: ["chino", "chinos", "chino pants", "chino trousers"],
    ar: ["شينو", "بنطلون شينو", "بنطال شينو"],
    defaultFabric: "cotton",
    catalog: { men: "For Him > Pants > Casual Pants" },
  },
  {
    type: "shorts", family: "Pants", priority: 65,
    en: ["shorts", "bermuda shorts", "swim shorts", "chino shorts", "cargo shorts"],
    ar: ["شورت", "شورتات", "شورت رجالي"],
    catalog: {},
  },
  {
    type: "pants", family: "Pants", priority: 40,
    en: ["pants", "pant", "trouser", "trousers", "formal pants", "classic pants", "casual pants", "smart casual pants", "dress pants", "slacks", "gabardine pants", "cargo pants", "wide leg pants", "wide leg trousers"],
    ar: ["بنطلون", "بنطال", "بنطلون كلاسيك", "بنطلون كاجوال", "بنطلون رجالي", "بنطلون حريمي", "بنطلون قماش", "بنطلون جبردين"],
    catalog: { men: "For Him > Pants", women: "For Her > Women Pants" },
  },
  // ── Tops family ──
  {
    type: "tshirt", family: "T-Shirts", priority: 55,
    en: ["t shirt", "tshirt", "tee", "tees", "round t shirt", "round neck t shirt", "round neck tshirt", "crew neck", "graphic tee"],
    ar: ["تيشيرت", "تي شيرت", "تيشرت"],
    defaultFabric: "cotton",
    catalog: { men: "For Him > T-Shirts > Round T-Shirt", women: "For Her > Women's T-Shirts" },
  },
  {
    type: "shirt", family: "Shirts", priority: 50,
    en: ["shirt", "shirts", "formal shirt", "classic shirt", "casual shirt", "smart casual shirt", "dress shirt", "button up", "button down", "short sleeve shirt", "short sleeves shirt", "half sleeve shirt", "wing tip shirt", "wingtip shirt", "tuxedo shirt", "linen shirt", "oxford shirt"],
    ar: ["قميص", "قمصان", "قميص كلاسيك", "قميص كاجوال", "قميص رجالي", "قميص حريمي", "قميص نصف كم", "قميص كم قصير", "قميص وينج", "قميص كتان"],
    catalog: { men: "For Him > Shirts", women: "For Her > Shirts" },
  },
  {
    type: "blouse", family: "Blouse", priority: 60,
    en: ["blouse", "blouses"],
    ar: ["بلوزه", "بلايز"],
    womenOnly: true,
    catalog: { women: "For Her > Blouse" },
  },
  {
    type: "top", family: "Tops", priority: 58,
    en: ["top", "tops", "crop top", "tank top", "camisole", "cami"],
    ar: ["توب", "كروب توب"],
    womenOnly: true,
    catalog: { women: "For Her > Tops" },
  },
  // ── Sets ──
  {
    type: "set", family: "Set", priority: 45,
    en: ["set", "sets", "co ord", "coord", "two piece", "two piece set", "matching set", "tracksuit set", "outfit set"],
    ar: ["طقم", "سيت", "طقم رجالي", "طقم حريمي", "طقم كاجوال"],
    catalog: { men: "For Him > Set", women: "For Her > Set" },
  },
  // Shoes & accessories
  {
    type: "shoes", family: "Shoes & Accessories", priority: 44,
    en: ["shoe", "shoes", "loafer", "loafers", "sneaker", "sneakers", "formal shoes", "casual shoes"],
    ar: ["حذاء", "جزمة", "جزم", "لوفر", "كوتشي"],
    catalog: { men: "For Him > Shoes & Accessories > Shoes" },
  },
  {
    type: "tie", family: "Shoes & Accessories", priority: 43,
    en: ["tie", "ties", "necktie", "bow tie"],
    ar: ["كرافت", "كرافات", "بابيون"],
    menOnly: true,
    catalog: { men: "For Him > Shoes & Accessories > Ties" },
  },
  {
    type: "belt", family: "Shoes & Accessories", priority: 42,
    en: ["belt", "belts", "leather belt", "formal belt", "casual belt"],
    ar: ["حزام", "احزمة"],
    catalog: { men: "For Him > Shoes & Accessories > Belts" },
  },
  {
    type: "cufflink", family: "Shoes & Accessories", priority: 41,
    en: ["cufflink", "cufflinks", "suit brooch", "suit brooches", "brooch"],
    ar: ["زرار اكمام", "كافلينك", "بروش"],
    menOnly: true,
    catalog: { men: "For Him > Shoes & Accessories > Cufflinks & Suit Brooches" },
  },
  {
    type: "socks", family: "Shoes & Accessories", priority: 40,
    en: ["sock", "socks", "dress socks", "cotton socks"],
    ar: ["شراب", "شرابات"],
    catalog: { men: "For Him > Shoes & Accessories > Socks" },
  },
  // ── Cold-weather garments (always Winter Backlog in summer) ──
  {
    type: "sweater", family: "Knitwear", priority: 32,
    en: ["sweater", "jumper", "pullover", "knit sweater", "knitwear"],
    ar: ["سويتر", "بلوفر", "بلوڤر", "بلوزه صوف"],
    seasonCold: true,
    catalog: {},
  },
  {
    type: "hoodie", family: "Sweats", priority: 31,
    en: ["hoodie", "hoody", "sweatshirt", "sweat shirt"],
    ar: ["هودي", "هودى", "سويت شيرت"],
    seasonCold: true,
    catalog: {},
  },
];

// Garment lookup for product matching: garmentType → title keywords.
export const GARMENT_PRODUCT_KEYWORDS: Record<string, string[]> = {
  jeans: ["jean"],
  chino: ["chino"],
  pants: ["pant", "trouser", "chino", "gabardine", "slack"],
  shirt: ["shirt"],
  overshirt: ["overshirt", "over-shirt", "over shirt", "shacket"],
  polo: ["polo"],
  tshirt: ["t-shirt", "tshirt", "t shirt", "tee"],
  blazer: ["blazer"],
  suit: ["suit"],
  jacket: ["jacket"],
  cardigan: ["cardigan"],
  vest: ["vest", "waistcoat"],
  dress: ["dress"],
  skirt: ["skirt"],
  blouse: ["blouse"],
  top: ["top"],
  set: ["set", "co-ord", "coord"],
  jumpsuit: ["jumpsuit", "playsuit", "romper"],
  abaya: ["abaya"],
  kaftan: ["kaftan", "caftan"],
  shorts: ["short"],
  shoes: ["shoe", "loafer", "sneaker"],
  tie: ["tie", "necktie", "bow tie"],
  belt: ["belt"],
  cufflink: ["cufflink", "brooch"],
  socks: ["sock"],
  sweater: ["sweater", "jumper", "pullover", "knit"],
  hoodie: ["hoodie", "sweatshirt"],
  coat: ["coat", "parka", "puffer"],
};

// ─── FABRICS ────────────────────────────────────────────────────────────────
// Order = specificity. We pick the FIRST match, so "cotton gabardine" → gabardine.
// Fabric is ALWAYS a sub-layer. It can never become the trend by itself.
export interface FabricDef { fabric: string; en: string[]; ar: string[]; cold?: boolean; }
export const FABRICS: FabricDef[] = [
  { fabric: "gabardine", en: ["gabardine", "gaberdine"], ar: ["جبردين", "جابردين", "غبردين"] },
  { fabric: "linen", en: ["linen"], ar: ["كتان", "كتاني"] },
  { fabric: "denim", en: ["denim", "jean", "jeans"], ar: ["دنيم"] },
  { fabric: "viscose", en: ["viscose"], ar: ["فسكوز", "فيسكوز"] },
  { fabric: "chiffon", en: ["chiffon"], ar: ["شيفون"] },
  { fabric: "silk", en: ["silk", "satin"], ar: ["حرير", "ساتان"] },
  { fabric: "poplin", en: ["poplin"], ar: ["بوبلين"] },
  { fabric: "jersey", en: ["jersey"], ar: ["جيرسي"] },
  { fabric: "pique", en: ["pique", "piqué"], ar: ["بيكيه"] },
  { fabric: "bamboo", en: ["bamboo"], ar: ["بامبو"] },
  { fabric: "modal", en: ["modal"], ar: ["مودال"] },
  { fabric: "tencel", en: ["tencel", "lyocell"], ar: ["تنسل"] },
  { fabric: "cotton", en: ["cotton"], ar: ["قطن", "قطني"] },
  { fabric: "wool", en: ["wool", "woolen"], ar: ["صوف", "صوفي"], cold: true },
  { fabric: "cashmere", en: ["cashmere"], ar: ["كشمير"], cold: true },
  { fabric: "leather", en: ["leather", "suede"], ar: ["جلد", "شامواه"], cold: true },
];

export const COLD_FABRICS = new Set(FABRICS.filter((f) => f.cold).map((f) => f.fabric));

// ─── MODIFIERS ──────────────────────────────────────────────────────────────
export const MODIFIERS = {
  fit: ["wide leg", "straight leg", "slim fit", "slim", "regular fit", "regular", "relaxed", "oversized", "baggy", "loose", "tapered", "skinny", "bootcut", "flared", "high waist", "high waisted", "cropped"],
  style: ["classic", "casual", "smart casual", "formal", "basic", "premium", "elegant", "minimal", "vintage", "retro", "sporty", "chic", "luxury"],
  occasion: ["office", "work", "wedding", "beach", "north coast", "sahel", "summer outing", "evening", "eid", "vacation", "party", "graduation", "ساحل", "فرح", "شغل", "عيد"],
};

export const MODIFIER_WORDS: string[] = [...MODIFIERS.fit, ...MODIFIERS.style, ...MODIFIERS.occasion];

export const SEASON_WORDS = {
  summer: ["summer", "hot weather", "heat", "صيف", "صيفي", "حر"],
  winter: ["winter", "cold", "warm", "شتاء", "شتوي", "برد"],
  spring: ["spring", "ربيع"],
  autumn: ["autumn", "fall", "خريف"],
};

export const COLORS: string[] = [
  "beige", "stone", "white", "off white", "cream", "black", "navy", "blue", "light blue", "baby blue", "olive", "green", "grey", "gray", "pastel", "khaki", "brown", "tan", "sand", "burgundy", "maroon", "pink", "red", "mustard", "teal", "lilac", "nude",
  "بيج", "ابيض", "اسود", "كحلي", "ازرق", "لبني", "زيتي", "اخضر", "رمادي", "باستيل", "كاكي", "بني", "وردي", "احمر", "نبيتي",
];

// ─── INTENT ─────────────────────────────────────────────────────────────────
export const INTENT_WORDS = {
  // Checked FIRST — informational queries must NOT drive trend score.
  informational: ["meaning", "mean", "means", "history", "what is", "what are", "define", "definition", "difference between", "vs", "versus", "wikipedia", "how to make", "types of", "origin", "تعريف", "معنى", "تاريخ", "الفرق بين", "ما هو", "ما هي", "انواع"],
  styling: ["outfit", "outfits", "how to wear", "style with", "lookbook", "look", "looks", "تنسيق", "البس", "لوك", "ستايل"],
  buying: ["buy", "buying", "shop", "shopping", "store", "stores", "price", "prices", "cheap", "online", "order", "sale", "sales", "discount", "offer", "offers", "near me", "best", "brand", "brands", "collection", "new arrivals", "outlet", "اشتري", "شراء", "سعر", "اسعار", "اونلاين", "متجر", "محل", "محلات", "براند", "براندات", "تخفيض", "عروض", "اطلب", "تسوق"],
};

export const BRAND_WORDS = ["brand", "brands", "براند", "براندات"];

// ─── GENDER ─────────────────────────────────────────────────────────────────
const GENDER_WORDS: Record<"men" | "women", string[]> = {
  men: ["men", "mens", "man", "male", "boys", "boy", "gentlemen", "رجالي", "رجال", "للرجال", "رجاليه", "رجل"],
  women: ["women", "womens", "woman", "ladies", "lady", "female", "girls", "girl", "نسائي", "نساء", "حريمي", "للنساء", "حريمى", "ستاتي", "بناتي"],
};

// ─── NAVIGATION LABELS (ignore — these are pages, not garments) ──────────────
export const NAV_LABELS = new Set([
  "all men", "all women", "all shirts", "all pants", "all t shirts", "all tshirts",
  "all dresses", "all tops", "all", "shop all", "view all", "new in", "for him", "for her",
]);

// ─── DETECTORS ──────────────────────────────────────────────────────────────
export function detectGender(text: string, hint?: Gender): Gender {
  const padded = ` ${normalize(text)} `;
  const men = GENDER_WORDS.men.some((w) => aliasMatches(padded, w));
  const women = GENDER_WORDS.women.some((w) => aliasMatches(padded, w));
  if (men && !women) return "men";
  if (women && !men) return "women";
  if (men && women) return "unisex";
  if (hint && hint !== "unknown") return hint;
  return "unknown";
}

export interface GarmentHit { def: GarmentDef; matchedLen: number; }
export function detectGarment(text: string): GarmentHit | null {
  const padded = ` ${normalize(text)} `;
  let best: GarmentHit | null = null;
  for (const def of GARMENTS) {
    let matchedLen = 0;
    for (const alias of [...def.en, ...def.ar]) {
      if (aliasMatches(padded, alias)) matchedLen = Math.max(matchedLen, normalize(alias).length);
    }
    if (matchedLen > 0) {
      // Higher priority wins; tie-break on longer matched alias.
      if (!best || def.priority > best.def.priority || (def.priority === best.def.priority && matchedLen > best.matchedLen)) {
        best = { def, matchedLen };
      }
    }
  }
  return best;
}

export function detectFabric(text: string): { fabric: string; cold: boolean } | null {
  const padded = ` ${normalize(text)} `;
  for (const f of FABRICS) {
    if ([...f.en, ...f.ar].some((a) => aliasMatches(padded, a))) {
      return { fabric: f.fabric, cold: !!f.cold };
    }
  }
  return null;
}

export function detectModifiers(text: string): string[] {
  const padded = ` ${normalize(text)} `;
  return MODIFIER_WORDS.filter((m) => aliasMatches(padded, m)).map((m) => normalize(m));
}

export function detectColors(text: string): string[] {
  const padded = ` ${normalize(text)} `;
  const out = COLORS.filter((c) => aliasMatches(padded, c)).map((c) => normalize(c));
  return Array.from(new Set(out));
}

export function detectSeason(text: string, garment?: GarmentDef | null, fabricCold?: boolean): Season {
  const padded = ` ${normalize(text)} `;
  if (garment?.seasonCold || fabricCold) return "winter";
  if (SEASON_WORDS.winter.some((w) => aliasMatches(padded, w))) return "winter";
  if (SEASON_WORDS.summer.some((w) => aliasMatches(padded, w))) return "summer";
  if (SEASON_WORDS.spring.some((w) => aliasMatches(padded, w)) || SEASON_WORDS.autumn.some((w) => aliasMatches(padded, w))) return "all-season";
  return "all-season";
}

export function detectIntent(text: string): Intent {
  const padded = ` ${normalize(text)} `;
  if (INTENT_WORDS.informational.some((w) => aliasMatches(padded, w))) return "informational";
  if (INTENT_WORDS.styling.some((w) => aliasMatches(padded, w))) return "styling";
  if (BRAND_WORDS.some((w) => aliasMatches(padded, w))) return "brand";
  if (INTENT_WORDS.buying.some((w) => aliasMatches(padded, w))) return "buying";
  // Bare garment query (no markers) = browsing demand → treated as buying-lite.
  return "buying";
}

export function isBuyingIntent(intent: Intent): boolean {
  return intent === "buying" || intent === "brand";
}

export function isNavLabel(text: string): boolean {
  return NAV_LABELS.has(normalize(text));
}

// Catalog path for a garment + gender (falls back to either side).
export function catalogPathFor(def: GarmentDef, gender: Gender): string | null {
  if (gender === "men") return def.catalog.men ?? null;
  if (gender === "women") return def.catalog.women ?? null;
  return def.catalog.men ?? def.catalog.women ?? null;
}

// Egypt season by month (Apr–Oct = summer). Server-runtime only.
export function currentSeasonEgypt(now: Date = new Date()): "summer" | "winter" {
  const m = now.getMonth() + 1; // 1-12
  return m >= 4 && m <= 10 ? "summer" : "winter";
}
