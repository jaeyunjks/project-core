import type { ReactNode } from "react";

interface Props {
  title: string;
  description: string;
  icon: ReactNode;
}

export function ComingSoonCard({ title, description, icon }: Props) {
  return (
    <div className="relative bg-[#FAF7F0] border border-border-soft rounded-[14px] p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-[10px] bg-sand-tint text-[#A47B3F] flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[9px] font-semibold font-mono uppercase tracking-[0.14em] text-faint bg-paper border border-border-soft rounded-md px-1.5 py-0.5">
          Soon
        </span>
      </div>
      <div className="text-[14px] font-semibold tracking-tight text-ink">
        {title}
      </div>
      <p className="text-[12px] text-muted mt-1 leading-snug">{description}</p>
    </div>
  );
}
