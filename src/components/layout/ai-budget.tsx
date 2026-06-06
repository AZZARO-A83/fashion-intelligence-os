"use client";

import { useEffect, useState } from "react";
import { Zap, Search } from "lucide-react";

interface Usage {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  estGenerationsLeft: number;
  serper: {
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
}

export function AiBudget() {
  const [u, setU] = useState<Usage | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/usage").then((r) => r.json()).then(setU).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  if (!u) return null;

  const aiPct = u.percentUsed;
  const aiColor = aiPct >= 90 ? "bg-red-400" : aiPct >= 70 ? "bg-amber-400" : "bg-green-400";
  const aiLow = u.estGenerationsLeft <= 2;

  const sPct = u.serper?.percentUsed ?? 0;
  const sColor = sPct >= 90 ? "bg-red-400" : sPct >= 70 ? "bg-amber-400" : "bg-blue-400";
  const sRemaining = u.serper?.remaining ?? 0;

  return (
    <div className="px-1 py-2 space-y-3">
      {/* AI token budget — daily */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1 text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
            <Zap className="w-3 h-3 text-accent" /> AI budget today
          </span>
          <span className="text-[10px] text-muted">{aiPct}% used</span>
        </div>
        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <div className={`h-full ${aiColor} rounded-full transition-all`} style={{ width: `${Math.max(2, aiPct)}%` }} />
        </div>
        <p className={`text-[10px] mt-1.5 ${aiLow ? "text-amber-400" : "text-muted"}`}>
          {u.remaining <= 0
            ? "Budget used up — refills overnight"
            : `~${u.estGenerationsLeft} generation${u.estGenerationsLeft === 1 ? "" : "s"} left today`}
        </p>
      </div>

      {/* Serper search credits — monthly */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1 text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
            <Search className="w-3 h-3 text-blue-400" /> Search credits
          </span>
          <span className="text-[10px] text-muted">{sPct}% used</span>
        </div>
        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <div className={`h-full ${sColor} rounded-full transition-all`} style={{ width: `${Math.max(2, sPct)}%` }} />
        </div>
        <p className={`text-[10px] mt-1.5 ${sPct >= 90 ? "text-amber-400" : "text-muted"}`}>
          {sRemaining <= 0
            ? "Search credits used — refills next month"
            : `${sRemaining.toLocaleString()} of 2,500 left this month`}
        </p>
      </div>
    </div>
  );
}
