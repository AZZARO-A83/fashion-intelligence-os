"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

interface Usage {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  estGenerationsLeft: number;
}

// Live "AI budget left today" — so the team can see how much of the free daily
// budget is left and roughly how many generations remain, instead of guessing.
export function AiBudget() {
  const [u, setU] = useState<Usage | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/usage").then((r) => r.json()).then(setU).catch(() => {});
    load();
    const t = setInterval(load, 60_000); // refresh every minute
    return () => clearInterval(t);
  }, []);

  if (!u) return null;

  const pct = u.percentUsed;
  const barColor = pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-green-400";
  const low = u.estGenerationsLeft <= 2;

  return (
    <div className="px-1 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1 text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
          <Zap className="w-3 h-3 text-accent" /> AI budget today
        </span>
        <span className="text-[10px] text-muted">{pct}% used</span>
      </div>
      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <p className={`text-[10px] mt-1.5 ${low ? "text-amber-400" : "text-muted"}`}>
        {u.remaining <= 0
          ? "Budget used up — refills overnight"
          : `~${u.estGenerationsLeft} generation${u.estGenerationsLeft === 1 ? "" : "s"} left today`}
      </p>
    </div>
  );
}
