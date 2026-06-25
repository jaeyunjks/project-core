import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  subtext?: string;
  icon: ReactNode;
  /** Optional bottom slot — progress bar, mini chart, etc. */
  visual?: ReactNode;
  /** Tint applied to the icon background */
  tint?: "sage" | "sand" | "neutral";
  /** Trend hint shown next to the subtext */
  trend?: "up" | "down" | null;
}

const TINTS = {
  sage: "bg-sage/10 text-sage",
  sand: "bg-[#F1ECE2] text-[#A47B3F]",
  neutral: "bg-paper text-muted",
};

export function StatCard({
  label,
  value,
  subtext,
  icon,
  visual,
  tint = "sage",
  trend,
}: Props) {
  return (
    <div className="group relative overflow-hidden bg-white border border-border-soft rounded-[14px] p-4 md:p-5 shadow-card hover:shadow-card-lg hover:border-border transition-all duration-200">
      <div className="flex items-start justify-between mb-3.5">
        <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">
          {label}
        </span>
        <span
          className={cn(
            "w-8 h-8 rounded-[9px] flex items-center justify-center",
            TINTS[tint]
          )}
        >
          {icon}
        </span>
      </div>
      <div className="text-[22px] md:text-[24px] font-semibold font-mono tracking-tight text-ink leading-none tabular-nums">
        {value}
      </div>
      {subtext && (
        <div className="flex items-center gap-1.5 mt-2 text-[12px] text-muted">
          {trend && (
            <span
              className={cn(
                "font-mono font-semibold",
                trend === "up" ? "text-sage" : "text-[#8A3F2E]"
              )}
            >
              {trend === "up" ? "↑" : "↓"}
            </span>
          )}
          <span className="truncate">{subtext}</span>
        </div>
      )}
      {visual && <div className="mt-3.5">{visual}</div>}
    </div>
  );
}

// ── Reusable visual slots ───────────────────────────────────────────────────

export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-1.5 w-full bg-paper rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-sage transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function CircularProgress({
  percent,
  size = 36,
}: {
  percent: number;
  size?: number;
}) {
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(100, percent)) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border-soft)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-sage)"
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-[stroke-dashoffset] duration-500 ease-out"
      />
    </svg>
  );
}
