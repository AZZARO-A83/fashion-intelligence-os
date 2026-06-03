"use client";

import { ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";

export interface Source {
  title: string;
  url: string;
  date?: string;
  score?: number;
}

// Shows the REAL web sources behind a live research result so the user can
// click and verify every claim. If there are no sources, it says so loudly —
// never lets the app pretend something is "live" when it isn't.
export function Sources({ sources }: { sources: Source[] }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-400 mb-1">No live sources found</p>
          <p className="text-xs text-foreground-muted">
            The live web search returned nothing this time — so treat this as an AI estimate, not verified live data.
            (If this always happens, the TAVILY_API_KEY may not be set in Vercel.)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-green-500/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-green-400" />
        <h3 className="text-sm font-bold text-foreground">Sources — verify these yourself</h3>
        <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">{sources.length} live</span>
      </div>
      <p className="text-xs text-muted mb-3">Every claim above is built from these real web pages. Click any to check it.</p>
      <div className="space-y-2">
        {sources.map((s, i) => {
          let host = s.url;
          try { host = new URL(s.url).hostname.replace("www.", ""); } catch { /* keep raw */ }
          return (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 p-3 bg-surface-2 rounded-lg border border-border hover:border-accent/40 transition-colors group"
            >
              <span className="text-[10px] font-bold text-muted w-5 flex-shrink-0 mt-0.5">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate group-hover:text-accent">{s.title || host}</p>
                <p className="text-[11px] text-muted truncate">
                  {host}{s.date ? ` · ${new Date(s.date).toLocaleDateString("en-EG", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-accent flex-shrink-0 mt-0.5" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
