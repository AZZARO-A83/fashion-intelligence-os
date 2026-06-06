"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

export interface DateRange {
  from: string | null; // "YYYY-MM-DD" or null = default (last 30 days)
  to: string | null;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString).
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Preset = "today" | "48h" | "7d" | "30d" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "48h", label: "Last 48h" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "custom", label: "Custom" },
];

export function DateRangePicker({ value, onChange }: Props) {
  const [active, setActive] = useState<Preset>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Fire the default "7d" range on mount so the parent's initial fetch uses 7 days, not null (30d).
  useEffect(() => {
    const now = new Date();
    onChange({ from: ymd(new Date(now.getTime() - 7 * 86400000)), to: ymd(now) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (preset: Preset) => {
    setActive(preset);
    const now = new Date();
    const today = ymd(now);

    // Shopify-style: "Last N days" starts N days before today (so today−7 .. today).
    if (preset === "today") onChange({ from: today, to: today });
    else if (preset === "48h") onChange({ from: ymd(new Date(now.getTime() - 2 * 86400000)), to: today });
    else if (preset === "7d") onChange({ from: ymd(new Date(now.getTime() - 7 * 86400000)), to: today });
    else if (preset === "30d") onChange({ from: ymd(new Date(now.getTime() - 30 * 86400000)), to: today });
    // "custom" waits for the date inputs + Apply button below
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1 border border-border">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => pick(p.key)}
            className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              active === p.key ? "bg-accent text-black" : "text-foreground-muted hover:text-foreground hover:bg-surface"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {active === "custom" && (
        <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-1.5 border border-border">
          <Calendar className="w-3.5 h-3.5 text-muted" />
          <input
            type="date"
            value={customFrom}
            max={customTo || ymd(new Date())}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="bg-transparent text-xs text-foreground outline-none"
          />
          <span className="text-muted text-xs">→</span>
          <input
            type="date"
            value={customTo}
            max={ymd(new Date())}
            onChange={(e) => setCustomTo(e.target.value)}
            className="bg-transparent text-xs text-foreground outline-none"
          />
          <button
            type="button"
            disabled={!customFrom || !customTo}
            onClick={() => onChange({ from: customFrom, to: customTo })}
            className="text-xs px-3 py-1 rounded-md font-semibold bg-accent text-black disabled:opacity-40 hover:bg-accent/90 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
