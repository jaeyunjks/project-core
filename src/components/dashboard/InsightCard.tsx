interface Props {
  title: string;
  text: string;
  subtext?: string;
}

export function InsightCard({ title, text, subtext }: Props) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-sage/[0.08] via-white to-white border border-border-soft rounded-[14px] p-5 shadow-card">
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-sage/[0.07] blur-2xl pointer-events-none" />
      <div className="relative flex items-start gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-sage/15 text-sage flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 0 0-4 12.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26A7 7 0 0 0 12 2z" />
            <path d="M9 22h6" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-sage mb-1">
            {title}
          </div>
          <div className="text-[14px] font-medium text-ink leading-snug">{text}</div>
          {subtext && (
            <div className="text-[12px] text-muted mt-1.5">{subtext}</div>
          )}
        </div>
      </div>
    </div>
  );
}
