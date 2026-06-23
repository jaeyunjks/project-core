"use client";

import { useId, useState } from "react";
import { formatCurrency, formatHours, cn } from "@/lib/utils";

export interface HoursBarDatum {
  id: string;
  label: string;          // short axis label, e.g. "16 Jun"
  hours: number;
  gross: number;
  isCurrent?: boolean;    // highlights the active period
}

interface Props {
  data: HoursBarDatum[];  // oldest → newest
  height?: number;
}

/**
 * Minimal SVG bar chart — no external deps.
 * Hover reveals the exact hours/gross for that period.
 */
export function HoursBarChart({ data, height = 160 }: Props) {
  const uid = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) return null;

  const maxRaw = Math.max(...data.map((d) => d.hours));
  // Round the axis up to a clean number for visual stability
  const max = maxRaw === 0 ? 10 : Math.ceil(maxRaw / 10) * 10;

  const W = 100;            // logical width units
  const H = 100;            // logical height units
  const PAD_T = 10;
  const PAD_B = 4;          // baseline padding only (axis labels render in HTML)
  const innerH = H - PAD_T - PAD_B;
  const slot = W / data.length;
  const barW = slot * 0.5;
  const gapBetween = slot - barW;
  const xOffset = gapBetween / 2;

  const active = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className="relative w-full">
      {/* Y-axis max indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost">
          Hours per period
        </span>
        <span className="text-[9px] font-mono text-ghost tabular-nums">
          peak {formatHours(maxRaw)}
        </span>
      </div>

      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full overflow-visible"
          style={{ height: `calc(100% - 20px)` }}
          aria-label="Hours per pay period"
        >
          {/* Baseline */}
          <line
            x1={0}
            x2={W}
            y1={H - PAD_B}
            y2={H - PAD_B}
            stroke="var(--color-border-soft)"
            strokeWidth="0.4"
          />

          {/* Gridline at 50% */}
          <line
            x1={0}
            x2={W}
            y1={PAD_T + innerH / 2}
            y2={PAD_T + innerH / 2}
            stroke="var(--color-border-soft)"
            strokeWidth="0.3"
            strokeDasharray="0.6 0.8"
            opacity="0.6"
          />

          {data.map((d, i) => {
            const h = max === 0 ? 0 : (d.hours / max) * innerH;
            const x = xOffset + i * slot;
            const y = H - PAD_B - h;
            const isHover = hoverIdx === i;
            const fill = d.isCurrent
              ? "var(--color-sage)"
              : isHover
                ? "var(--color-sage)"
                : "var(--color-sage-border)";

            return (
              <g
                key={d.id}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx(null)}
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${formatHours(d.hours)}, ${formatCurrency(d.gross)}`}
                className="cursor-pointer focus:outline-none"
              >
                {/* Invisible wider hit area */}
                <rect
                  x={x - gapBetween / 2}
                  y={PAD_T}
                  width={slot}
                  height={innerH + PAD_B}
                  fill="transparent"
                />
                {/* Bar */}
                <rect
                  x={x}
                  y={y === H - PAD_B ? H - PAD_B - 0.4 : y}
                  width={barW}
                  height={Math.max(h, 0.4)}
                  fill={fill}
                  rx="0.8"
                  className="transition-[fill,y,height] duration-200"
                />
              </g>
            );
          })}
        </svg>

        {/* HTML axis labels — positioned over the chart, not stretched by SVG */}
        <div className="absolute inset-x-0 bottom-0 h-5 pointer-events-none">
          {data.map((d, i) => {
            const isHover = hoverIdx === i;
            const centerPct = xOffset + i * slot + barW / 2; // align with bar center
            return (
              <span
                key={`${d.id}-label`}
                className={cn(
                  "absolute -translate-x-1/2 text-[10px] font-mono tabular-nums tracking-tight transition-colors",
                  d.isCurrent || isHover
                    ? "text-ink font-semibold"
                    : "text-ghost font-medium"
                )}
                style={{ left: `${centerPct}%` }}
              >
                {d.label}
              </span>
            );
          })}
        </div>

        {/* Hover tooltip */}
        {active && (
          <div
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{
              left: `${xOffset + hoverIdx! * slot + barW / 2}%`,
              top: 0,
            }}
          >
            <div className="bg-ink text-white text-[10px] font-mono px-2 py-1.5 rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.18)] whitespace-nowrap">
              <div className="font-semibold mb-0.5 tracking-tight">{active.label}</div>
              <div className="opacity-80 tabular-nums">{formatHours(active.hours)}</div>
              <div className="text-[var(--color-sage-tint)] tabular-nums">
                {formatCurrency(active.gross)}
              </div>
            </div>
          </div>
        )}
      </div>
      <span className="sr-only" id={uid}>
        Bar chart of hours worked across the last {data.length} pay periods.
      </span>
    </div>
  );
}
