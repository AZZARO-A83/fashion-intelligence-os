"use client";

// ─── Live Serper credit pill ─────────────────────────────────────────────
// Shows how many search credits are left this month, RIGHT NEXT to the
// Refresh button — so you see the budget before you spend it. Polls every
// 30s, and updates instantly after a refresh (pages fire "serper-usage-refresh").

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";

interface SerperUsage {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}

export function SearchCreditsPill() {
  const [s, setS] = useState<SerperUsage | null>(null);

  const load = useCallback(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => { if (d?.serper) setS(d.serper); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    window.addEventListener("serper-usage-refresh", load);
    return () => {
      clearInterval(t);
      window.removeEventListener("serper-usage-refresh", load);
    };
  }, [load]);

  // Cache off (local dev) or not loaded yet → show nothing rather than a fake 0.
  if (!s) return null;

  const pct = s.percentUsed ?? 0;
  const textColor = pct >= 90 ? "text-red-400" : pct >= 70 ? "text-amber-400" : "text-blue-400";
  const dotColor = pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-blue-400";

  return (
    <span
      title={`${s.used.toLocaleString()} of ${s.limit.toLocaleString()} search credits used this month — refills on the 1st`}
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-surface-2 border border-border text-[11px] font-medium"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <Search className="w-3 h-3 text-muted" />
      <span className={textColor}>{s.remaining.toLocaleString()}</span>
      <span className="text-muted">left</span>
    </span>
  );
}
