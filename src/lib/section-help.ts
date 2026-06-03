// ─── Section Help Text ────────────────────────────────────────────────
// Plain-English explanation of every section — so the whole team understands
// what each tab does without training. Edit text here, it updates everywhere.
// Keyed by route path.

export interface SectionHelp {
  what: string;   // what this section does
  who: string;    // who it's for
}

export const SECTION_HELP: Record<string, SectionHelp> = {
  "/": {
    what: "Your home base. Shows the current season, revenue snapshot, and AI insights for the day — a quick read of where things stand.",
    who: "Everyone on the team.",
  },
  "/monthly-plan": {
    what: "The full plan for the month — content ideas and campaigns laid out so you know what to post and when.",
    who: "Management + Marketing team.",
  },
  "/calendar": {
    what: "Real upcoming events through year-end (World Cup, back-to-school, Black Friday, wedding season) with the fashion angle and when to start prepping each.",
    who: "Everyone — plan campaigns around what's coming.",
  },
  "/sales": {
    what: "Real sales pulled live from Shopify — top products, revenue, and what's actually selling right now.",
    who: "Management.",
  },
  "/trends": {
    what: "What's trending on TikTok and Instagram in Egypt right now, each scored for how relevant it is to Debackers.",
    who: "Marketing team + Content creators.",
  },
  "/trends/alerts": {
    what: "Urgent trend warnings — the things moving fast that you should act on today before the moment passes.",
    who: "Marketing team.",
  },
  "/competitors": {
    what: "Track rival brands, see what they're doing, and spot the gaps they're leaving open for Debackers to take.",
    who: "Management + Marketing team.",
  },
  "/campaigns": {
    what: "AI-built campaign ideas with a confidence score and a clear 'why now' for each one — ready to launch.",
    who: "Marketing team.",
  },
  "/content": {
    what: "Ready-to-use content — TikTok scripts, reels, and captions in Arabic, English, or mixed. Copy and post.",
    who: "Content creators.",
  },
  "/inspiration": {
    what: "Visual library — mood boards, color palettes, and image references to guide the look of your content.",
    who: "Content creators + Designers.",
  },
  "/analytics": {
    what: "How everything is performing across platforms — audience segments and what the numbers are teaching us.",
    who: "Management + Marketing team.",
  },
  "/agency": {
    what: "Home of the three AI research reports — Flash, Weekly, and Monthly. This replaces paying an agency for market research.",
    who: "Everyone on the team.",
  },
  "/agency/flash": {
    what: "Every 3 days — live market research plus 3 campaign ideas and ready-to-film hooks for the next few days.",
    who: "Marketing team + Content creators.",
  },
  "/agency/weekly": {
    what: "Full week strategy — top opportunities, competitor watch, a day-by-day content plan, and KPI targets.",
    who: "Management + Marketing team.",
  },
  "/agency/monthly": {
    what: "The big-picture month — market analysis, seasonal strategy, campaign calendar, budget guidance, and forecasts.",
    who: "Management.",
  },
};
