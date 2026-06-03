"use client";

import { AlertCircle, Clock } from "lucide-react";
import { friendlyError } from "@/lib/friendly-error";

interface GenerationErrorProps {
  /** Raw error string (e.g. from a failed fetch). */
  error: string;
}

// Calm, plain-English error card for the whole team. Translates raw API
// errors (daily limit, per-minute limit, etc.) into something readable.
export function GenerationError({ error }: GenerationErrorProps) {
  const f = friendlyError(error);
  const isLimit = f.kind === "daily-limit" || f.kind === "minute-limit";

  const accent = isLimit
    ? "bg-amber-500/10 border-amber-500/30"
    : "bg-red-500/10 border-red-500/30";
  const iconColor = isLimit ? "text-amber-400" : "text-red-400";
  const titleColor = isLimit ? "text-amber-400" : "text-red-400";
  const Icon = isLimit ? Clock : AlertCircle;

  return (
    <div className={`rounded-xl p-4 mb-6 flex gap-3 border ${accent}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
      <div>
        <p className={`text-sm font-semibold mb-1 ${titleColor}`}>{f.title}</p>
        <p className="text-sm text-foreground-muted leading-relaxed">{f.message}</p>
        {f.hint && <p className="text-xs text-muted mt-2">{f.hint}</p>}
      </div>
    </div>
  );
}
