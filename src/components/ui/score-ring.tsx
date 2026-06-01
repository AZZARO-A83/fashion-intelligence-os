import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function ScoreRing({ score, size = "md", label }: ScoreRingProps) {
  const radius = size === "sm" ? 18 : size === "lg" ? 32 : 24;
  const strokeWidth = size === "sm" ? 3 : 4;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2;

  const color =
    score >= 80 ? "#4ade80" : score >= 60 ? "#f59e0b" : "#f87171";

  const textSize =
    size === "sm" ? "text-[10px]" : size === "lg" ? "text-xl" : "text-sm";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg
          width={svgSize}
          height={svgSize}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", textSize)} style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      {label && <span className="text-[10px] text-muted">{label}</span>}
    </div>
  );
}
