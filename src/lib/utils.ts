import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "EGP") {
  return `${currency} ${value.toLocaleString("en-EG")}`;
}

export function formatNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

export function formatPercent(value: number, showSign = true) {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function getMonthName(month: number) {
  return new Date(2000, month - 1).toLocaleString("en-US", { month: "long" });
}

export function scoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

export function scoreBg(score: number) {
  if (score >= 80) return "bg-green-400/10 border-green-400/20";
  if (score >= 60) return "bg-amber-400/10 border-amber-400/20";
  return "bg-red-400/10 border-red-400/20";
}

export function platformIcon(platform: string) {
  const icons: Record<string, string> = {
    instagram: "📷",
    tiktok: "🎵",
    facebook: "📘",
    meta: "📘",
    email: "📧",
  };
  return icons[platform.toLowerCase()] ?? "📱";
}

export function platformColor(platform: string) {
  const colors: Record<string, string> = {
    instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    tiktok: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    facebook: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    meta: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    email: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return colors[platform.toLowerCase()] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
}
