"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getUpcomingEvents, type EventCategory } from "@/lib/fashion-calendar";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";

const CATEGORY_STYLE: Record<EventCategory, string> = {
  sport: "bg-green-500/10 text-green-400 border-green-500/20",
  season: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  shopping: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  religious: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  national: "bg-red-500/10 text-red-400 border-red-500/20",
  school: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  wedding: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-EG", { day: "numeric", month: "short", year: "numeric" });
}

export default function CalendarPage() {
  const events = useMemo(() => getUpcomingEvents(), []);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Marketing Event Calendar"
        subtitle="Verified events through end of 2026 — plan campaigns around what's coming"
        badge="✅ Verified dates"
      />

      <div className="p-8 space-y-6">

        <div className="bg-surface-2 border border-border rounded-xl p-4 flex gap-3">
          <CalendarDays className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Real, verified event dates</p>
            <p className="text-xs text-muted">
              Key dates cross-checked via live web search (World Cup Jun 11–Jul 19, Black Friday Nov 27, back-to-school ~Sep 20).
              Each event shows the fashion angle + when to start prepping. 🟡 = approximate date.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {events.map((e) => (
            <div
              key={e.id}
              className={`bg-surface border rounded-xl p-5 ${e.isActive ? "border-accent/40" : "border-border/50"}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">{e.icon}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-bold text-foreground">{e.name}</h3>
                    {e.arabicName && <span className="text-xs text-muted" dir="rtl">{e.arabicName}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${CATEGORY_STYLE[e.category]}`}>
                      {e.category}
                    </span>
                    {!e.verified && <span className="text-[10px] text-amber-400">🟡 approx</span>}
                  </div>

                  <p className="text-xs text-muted mb-2">
                    {fmt(e.start)}{e.end ? ` → ${fmt(e.end)}` : ""}
                  </p>

                  <p className="text-xs text-foreground-muted leading-relaxed mb-2">{e.fashionAngle}</p>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {e.isActive ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-accent">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Happening now
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-foreground">{e.daysAway} days</span>
                  )}
                  {e.inPrepWindow && (
                    <span className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> Start prepping
                    </span>
                  )}
                  {!e.isActive && !e.inPrepWindow && (
                    <span className="text-[10px] text-muted">prep {e.prepDaysBefore}d before</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="bg-surface border border-dashed border-border rounded-xl p-12 text-center">
              <CalendarDays className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-sm text-foreground">No upcoming events left this year</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
