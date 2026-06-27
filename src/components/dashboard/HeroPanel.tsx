interface Props {
  name: string;
  greeting: string;
  dateLabel: string;
}

export function HeroPanel({ name, greeting, dateLabel }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[18px] border border-border-soft bg-gradient-to-br from-white via-white to-sage/[0.06] shadow-card mb-7 md:mb-8">
      {/* Decorative right-side blob — calm, abstract, no image */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-2/3 md:w-1/2">
        <div className="absolute -right-24 -top-24 w-[420px] h-[420px] rounded-full bg-sage/10 blur-3xl opacity-70" />
        <div className="absolute right-16 top-1/2 -translate-y-1/2 w-32 h-32 rounded-[28px] border border-sage/15 rotate-[18deg]" />
        <div className="absolute right-44 top-1/3 w-16 h-16 rounded-[14px] bg-gradient-to-br from-sand-tint to-paper border border-border-soft rotate-[-12deg]" />
        <div className="absolute right-8 bottom-10 w-20 h-1.5 rounded-full bg-sage/30" />
      </div>

      <div className="relative px-5 py-5 md:px-10 md:py-10 max-w-[720px]">
        <div className="text-[9px] md:text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-sage mb-1.5 md:mb-2">
          Welcome back
        </div>
        <h1 className="text-[22px] md:text-[36px] font-semibold tracking-tight text-ink leading-tight">
          {greeting}, {name}
        </h1>
        <p className="text-[13px] md:text-[15px] text-muted mt-1.5 md:mt-2.5 leading-relaxed max-w-[480px]">
          Focus on what matters. Track, plan, and make progress.
        </p>
        <div className="mt-3 md:mt-5 inline-flex items-center gap-2 text-[11px] md:text-[12px] font-medium text-faint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span className="font-mono tabular-nums">{dateLabel}</span>
        </div>
      </div>
    </section>
  );
}
