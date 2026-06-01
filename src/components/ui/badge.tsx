import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "accent";
  size?: "sm" | "md";
}

const variantStyles = {
  default: "bg-surface-2 text-foreground-muted border-border",
  success: "bg-green-400/10 text-green-400 border-green-400/20",
  warning: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  danger: "bg-red-400/10 text-red-400 border-red-400/20",
  info: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  accent: "bg-accent/10 text-accent border-accent/20",
};

export function Badge({ children, variant = "default", size = "sm" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        variantStyles[variant]
      )}
    >
      {children}
    </span>
  );
}
