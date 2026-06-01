"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AlertBadge() {
  const [counts, setCounts] = useState({ new: 0, urgent: 0 });

  useEffect(() => {
    const fetchCounts = () => {
      fetch("/api/trends/scan")
        .then(r => r.json())
        .then(d => setCounts({ new: d.newAlerts ?? 0, urgent: d.urgentAlerts ?? 0 }))
        .catch(() => {});
    };

    fetchCounts();
    // Re-check every 5 minutes
    const interval = setInterval(fetchCounts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (counts.new === 0) return null;

  return (
    <Link href="/trends/alerts" className="relative flex items-center">
      <Bell className={cn("w-4 h-4", counts.urgent > 0 ? "text-red-400" : "text-amber-400")} />
      <span className={cn(
        "absolute -top-1.5 -right-1.5 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center text-black",
        counts.urgent > 0 ? "bg-red-400" : "bg-amber-400"
      )}>
        {counts.new > 9 ? "9+" : counts.new}
      </span>
    </Link>
  );
}
