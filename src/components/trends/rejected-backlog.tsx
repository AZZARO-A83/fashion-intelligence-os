"use client";

import { useState } from "react";
import { RejectedRow, BacklogRow } from "@/lib/trend-engine";
import { ChevronDown, ChevronRight, Snowflake, Filter } from "lucide-react";

export function RejectedBacklog({ rejected, backlog }: { rejected: RejectedRow[]; backlog: BacklogRow[] }) {
  const [open, setOpen] = useState(false);
  const total = (rejected?.length || 0) + (backlog?.length || 0);
  if (!total) return null;

  return (
    <div className="bg-surface border border-border/50 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-5 flex items-center gap-2 text-left">
        <Filter className="w-4 h-4 text-muted" />
        <div className="flex-1">
          <h2 className="text-sm font-bold text-foreground">Rejected & Winter Backlog</h2>
          <p className="text-xs text-muted">
            {backlog.length} cold-weather item{backlog.length === 1 ? "" : "s"} parked for winter · {rejected.length} quer{rejected.length === 1 ? "y" : "ies"} filtered out — full transparency, nothing silently dropped.
          </p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
      </button>

      {open && (
        <div className="border-t border-border p-5 space-y-5">

          {backlog.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Snowflake className="w-3.5 h-3.5 text-sky-400" />
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Winter Backlog — real demand, wrong season</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {backlog.map((b, i) => (
                  <div key={i} className="bg-sky-400/5 border border-sky-400/15 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground capitalize">{b.gender} · {b.garmentLabel}</p>
                      <span className="text-[10px] text-sky-300">{b.signalCount} signals</span>
                    </div>
                    <p className="text-[10px] text-muted mt-0.5">{b.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rejected.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Rejected queries — with reason</p>
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {rejected.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 bg-surface-2 rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-foreground-muted flex-1 truncate">{r.query}</span>
                    <span className="text-[9px] text-red-300/80 bg-red-400/5 border border-red-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">{r.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
