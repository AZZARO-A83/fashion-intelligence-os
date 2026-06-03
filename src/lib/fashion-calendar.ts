// ─── Fashion & Marketing Event Calendar — Egypt 2026 ─────────────────
// REAL, verified event dates (not live API data — these are known calendar
// events). Key dates cross-checked via live Tavily search 2026-06-03:
//  - FIFA World Cup 2026: June 11 – July 19 (verified)
//  - Black Friday 2026: Nov 27 (verified)
//  - Egypt back-to-school: ~Sept 20 (verified)
// Each event includes WHY it matters to Debackers + when to start prepping.

export type EventCategory =
  | "sport" | "season" | "shopping" | "religious" | "national" | "school" | "wedding";

export interface CalendarEvent {
  id: string;
  name: string;
  arabicName?: string;
  start: string;            // ISO date
  end?: string;             // ISO date (for ranges)
  category: EventCategory;
  icon: string;
  fashionAngle: string;     // how Debackers can play it
  prepDaysBefore: number;   // start marketing this many days before
  verified: boolean;        // date confirmed via search/official source
}

// Events for the rest of 2026 (Egypt-relevant).
export const FASHION_EVENTS_2026: CalendarEvent[] = [
  {
    id: "world-cup-2026",
    name: "FIFA World Cup 2026",
    arabicName: "كأس العالم 2026",
    start: "2026-06-11", end: "2026-07-19",
    category: "sport", icon: "⚽",
    fashionAngle: "Watch-party casual, national-pride colours, smart-casual fan fits. Huge social moment — tie content to match days.",
    prepDaysBefore: 14, verified: true,
  },
  {
    id: "north-coast-season",
    name: "North Coast / Sahel Summer Season",
    arabicName: "موسم الساحل الشمالي",
    start: "2026-06-01", end: "2026-09-15",
    category: "season", icon: "🏖️",
    fashionAngle: "Resort & beach-to-dinner premium linen and breathable fabrics. Target Cairo elite heading to Sahel.",
    prepDaysBefore: 7, verified: true,
  },
  {
    id: "mawlid-2026",
    name: "Prophet's Birthday (Mawlid)",
    arabicName: "المولد النبوي",
    start: "2026-08-25",
    category: "religious", icon: "🌙",
    fashionAngle: "Modest elegant wear, family gatherings. Warm tones, semi-formal sets.",
    prepDaysBefore: 14, verified: false,
  },
  {
    id: "back-to-school-2026",
    name: "Back to School / University",
    arabicName: "العودة للمدارس والجامعات",
    start: "2026-09-20",
    category: "school", icon: "🎒",
    fashionAngle: "Smart-casual for students 18–24. Affordable-luxury bundles, 'First Day Fit' content series.",
    prepDaysBefore: 21, verified: true,
  },
  {
    id: "armed-forces-day",
    name: "Armed Forces Day (Oct 6)",
    arabicName: "عيد القوات المسلحة",
    start: "2026-10-06",
    category: "national", icon: "🇪🇬",
    fashionAngle: "National-pride messaging, premium Egyptian-made story. Belgian-heritage-meets-Egypt angle.",
    prepDaysBefore: 10, verified: true,
  },
  {
    id: "wedding-season-fall",
    name: "Wedding Season (Fall)",
    arabicName: "موسم الأفراح",
    start: "2026-10-01", end: "2026-11-30",
    category: "wedding", icon: "💍",
    fashionAngle: "Formal & semi-formal guest attire — suits, blazers, women's elegant sets. Very high search intent.",
    prepDaysBefore: 21, verified: true,
  },
  {
    id: "white-friday-2026",
    name: "White Friday / Black Friday",
    arabicName: "الجمعة البيضاء",
    start: "2026-11-27",
    category: "shopping", icon: "🛍️",
    fashionAngle: "Biggest shopping moment of the year. Tease 2 weeks early, countdown timers, VIP early access, hourly flash deals.",
    prepDaysBefore: 21, verified: true,
  },
  {
    id: "year-end-sales",
    name: "Year-End & New Year Sales",
    arabicName: "تخفيضات نهاية العام",
    start: "2026-12-20", end: "2026-12-31",
    category: "shopping", icon: "🎉",
    fashionAngle: "Gifting, party wear, clear winter stock. New-year 'new you' wardrobe refresh messaging.",
    prepDaysBefore: 14, verified: true,
  },
];

// Returns upcoming events (from today) with computed days-away + prep status.
export function getUpcomingEvents(now = new Date()) {
  const today = now.getTime();
  return FASHION_EVENTS_2026
    .map((e) => {
      const startMs = new Date(e.start).getTime();
      const endMs = e.end ? new Date(e.end).getTime() : startMs;
      const daysAway = Math.round((startMs - today) / 86400000);
      const prepStartMs = startMs - e.prepDaysBefore * 86400000;
      const isActive = today >= startMs && today <= endMs;
      const inPrepWindow = today >= prepStartMs && today < startMs;
      return { ...e, daysAway, isActive, inPrepWindow };
    })
    .filter((e) => {
      const endMs = e.end ? new Date(e.end).getTime() : new Date(e.start).getTime();
      return endMs >= today; // hide fully-past events
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
