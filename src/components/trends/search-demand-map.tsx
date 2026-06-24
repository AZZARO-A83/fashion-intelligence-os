"use client";

import { useState } from "react";
import { DemandMapRow } from "@/lib/trend-engine";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Table2 } from "lucide-react";

const CONF_STYLES: Record<string, string> = {
  strong: "bg-green-400/10 text-green-400 border-green-400/20",
  medium: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  weak: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
};

const GENDER_STYLES: Record<string, string> = {
  men: "bg-sky-400/10 text-sky-300 border-sky-400/20",
  women: "bg-pink-400/10 text-pink-300 border-pink-400/20",
  unisex: "bg-purple-400/10 text-purple-300 border-purple-400/20",
  unknown: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
};

const SCORE_LABELS: Record<string, { label: string; help: string }> = {
  recurrence: { label: "Search repetition", help: "How many different real searches repeated this garment." },
  multiSource: { label: "Source spread", help: "Whether the signal appears from more than one search source." },
  buyingIntent: { label: "Buying intent", help: "How much the wording looks like shopping, price, store, or product intent." },
  catalogMatch: { label: "Debackers fit", help: "Whether Debackers already has matching live products/categories." },
  articleSupport: { label: "Article support", help: "Whether fresh fashion articles also mention this garment." },
  customerDemand: { label: "Own-site demand", help: "Match with Search Console / cached customer search demand when connected." },
};

function Row({ row }: { row: DemandMapRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        onClick={() => setOpen(!open)}
        className="border-b border-border/50 hover:bg-surface-2/50 cursor-pointer transition-colors"
      >
        <td className="px-3 py-2.5 text-xs font-bold text-muted">{row.rank}</td>
        <td className="px-3 py-2.5">
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold capitalize", GENDER_STYLES[row.gender] || GENDER_STYLES.unknown)}>
            {row.gender}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">{row.garmentLabel}</p>
          <p className="text-[10px] text-muted truncate max-w-[180px]">{row.catalogCategory}</p>
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className="text-sm font-bold text-foreground">{row.searchSignalCount}</span>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {row.topFabrics.length ? row.topFabrics.map((f) => (
              <span key={f} className="text-[9px] bg-surface-2 text-foreground-muted px-1.5 py-0.5 rounded capitalize">{f}</span>
            )) : <span className="text-[10px] text-muted">—</span>}
          </div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {row.topModifiers.length ? row.topModifiers.slice(0, 3).map((m) => (
              <span key={m} className="text-[9px] bg-surface-2 text-foreground-muted px-1.5 py-0.5 rounded capitalize">{m}</span>
            )) : <span className="text-[10px] text-muted">—</span>}
          </div>
        </td>
        <td className="px-3 py-2.5">
          {row.inCatalog ? (
            <span className="text-[9px] bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-0.5 rounded-full font-bold">In catalog</span>
          ) : (
            <span className="text-[9px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full font-bold">Opportunity</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className="text-sm font-bold text-accent">{row.score}</span>
        </td>
        <td className="px-3 py-2.5 text-center">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-muted inline" /> : <ChevronRight className="w-3.5 h-3.5 text-muted inline" />}
        </td>
      </tr>
      {open && (
        <tr className="bg-surface-2/30 border-b border-border/50">
          <td colSpan={9} className="px-4 py-3">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Real searches behind this (sample)</p>
                <div className="flex flex-wrap gap-1.5">
                  {row.exampleQueries.map((q, i) => (
                    <span key={i} className="text-[10px] bg-surface border border-border text-foreground-muted px-2 py-1 rounded-full">{q}</span>
                  ))}
                </div>
                {row.topColors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Top colours</p>
                    <div className="flex flex-wrap gap-1.5">
                      {row.topColors.map((c) => (
                        <span key={c} className="text-[10px] bg-surface border border-border text-foreground-muted px-2 py-0.5 rounded-full capitalize">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Score breakdown</p>
                  <span className={cn("text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase", CONF_STYLES[row.confidence])}>{row.confidence}</span>
                  <span className="text-[10px] text-muted">· intent: {row.topIntent}</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(row.scoreBreakdown).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted w-28" title={SCORE_LABELS[k]?.help}>{SCORE_LABELS[k]?.label || k}</span>
                      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-accent/60 rounded-full" style={{ width: `${Math.min(100, v)}%` }} />
                      </div>
                      <span className="text-[10px] text-foreground-muted w-7 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function SearchDemandMap({ rows }: { rows: DemandMapRow[] }) {
  if (!rows?.length) return null;
  return (
    <div className="bg-surface border border-border/50 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Table2 className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-bold text-foreground">Search Demand Map</h2>
          <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">🟢 LIVE · DETERMINISTIC</span>
        </div>
        <p className="text-xs text-muted">
          What Egyptians actually search for, grouped by <strong className="text-foreground-muted">gender → garment type</strong>. The orange bars inside each row explain why the score is high: repeated searches, source spread, buying intent, Debackers fit, article support, and own-site demand when connected.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider">#</th>
              <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider">Gender</th>
              <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider">Garment / Category</th>
              <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider text-center">Signals</th>
              <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider">Top Fabric</th>
              <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider">Top Modifiers</th>
              <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider">Status</th>
              <th className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-wider text-center">Score</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => <Row key={`${row.gender}-${row.garmentType}`} row={row} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
