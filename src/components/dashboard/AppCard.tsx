import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Metadata {
  label: string;
  value: string;
}

interface Props {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  /** Status pill copy — defaults to "Active" */
  status?: string;
  meta: Metadata[];
  /** Right-side decorative SVG (mini chart, sparkline, etc.) */
  visual?: ReactNode;
  /** Accent color — sage by default */
  accent?: "sage" | "ink";
}

export function AppCard({
  title,
  description,
  href,
  icon,
  status = "Active",
  meta,
  visual,
  accent = "sage",
}: Props) {
  const ctaClass =
    accent === "sage"
      ? "bg-sage text-paper hover:bg-sage-deep"
      : "bg-ink text-paper hover:bg-ink/90";

  return (
    <Link
      href={href}
      className="group relative overflow-hidden bg-white border border-border-soft rounded-[16px] md:rounded-[18px] p-4 md:p-6 shadow-card hover:shadow-card-lg hover:border-border transition-all duration-200 flex flex-col"
    >
      {/* Faint decorative right-side block — hidden on small */}
      {visual && (
        <div className="pointer-events-none absolute top-4 right-4 opacity-90 hidden md:block">
          {visual}
        </div>
      )}

      <div className="flex items-center gap-3 md:items-start md:justify-between mb-3 md:mb-5">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-[11px] md:rounded-[13px] bg-sage text-paper flex items-center justify-center shadow-[0_4px_12px_rgba(62,91,77,0.22)] shrink-0">
          {icon}
        </div>
        <div className="flex-1 md:hidden">
          <div className="text-[16px] font-semibold tracking-tight text-ink leading-snug">
            {title}
          </div>
          <p className="text-[12px] text-muted leading-snug">{description}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage/10 text-sage text-[10px] font-semibold tracking-wide shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sage" />
          {status}
        </span>
      </div>

      <div className="hidden md:block text-[18px] md:text-[19px] font-semibold tracking-tight text-ink leading-snug">
        {title}
      </div>
      <p className="hidden md:block text-[13px] text-muted mt-1 leading-relaxed">{description}</p>

      {/* Metadata strip */}
      <div className="mt-3 md:mt-5 grid grid-cols-2 gap-2 md:gap-3">
        {meta.map((m) => (
          <div key={m.label}>
            <div className="text-[9px] md:text-[9.5px] font-semibold font-mono uppercase tracking-[0.16em] text-faint mb-0.5 md:mb-1">
              {m.label}
            </div>
            <div className="text-[13px] md:text-[15px] font-semibold font-mono tracking-tight text-ink tabular-nums">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-4 md:mt-6 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 h-9 md:h-10 px-3.5 md:px-4 rounded-[11px] text-[12px] md:text-[13px] font-semibold transition-colors",
            ctaClass
          )}
        >
          Open {title}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

// ── Decorative visuals (pure SVG) ───────────────────────────────────────────

export function BarChartVisual({ values, color = "var(--color-sage)" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <svg width="96" height="48" viewBox={`0 0 ${values.length * 10} 48`}>
      {values.map((v, i) => {
        const h = (v / max) * 38;
        return (
          <rect
            key={i}
            x={i * 10 + 1}
            y={48 - h}
            width="6"
            height={Math.max(h, 2)}
            rx="1.5"
            fill={color}
            opacity={i === values.length - 1 ? 1 : 0.35 + (i / values.length) * 0.4}
          />
        );
      })}
    </svg>
  );
}

export function SparklineVisual({ values, color = "var(--color-sage)" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 96;
  const H = 40;
  const step = W / (values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${H - ((v - min) / range) * (H - 6) - 3}`)
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(values.length - 1) * step}
        cy={H - ((values[values.length - 1] - min) / range) * (H - 6) - 3}
        r="2.4"
        fill={color}
      />
    </svg>
  );
}
