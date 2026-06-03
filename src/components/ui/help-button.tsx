"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";
import { SECTION_HELP } from "@/lib/section-help";

interface HelpButtonProps {
  /** Route path to look up help text, e.g. "/agency/flash". */
  section: string;
}

// Small "?" button that pops a plain-English card explaining the section.
// For the whole team — what it does + who it's for. Click away to close.
export function HelpButton({ section }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const help = SECTION_HELP[section];

  // Close when clicking outside the popover
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!help) return null;

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="What does this section do?"
        title="What does this section do?"
        className="w-5 h-5 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-accent/10 transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-50 w-72 bg-surface border border-border rounded-xl shadow-xl p-4 text-left animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-bold text-accent uppercase tracking-wider">What this does</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted hover:text-foreground transition-colors -mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm text-foreground-muted leading-relaxed mb-3">{help.what}</p>
          <div className="flex items-start gap-1.5 pt-2 border-t border-border">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-0.5">For:</span>
            <span className="text-xs text-foreground">{help.who}</span>
          </div>
        </div>
      )}
    </div>
  );
}
