import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Module } from "@/types";

const icons: Record<Module["icon"], JSX.Element> = {
  clock: (
    <svg
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  ),
  wallet: (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="18" height="11" rx="2.5" />
      <circle cx="12" cy="12.5" r="2.2" />
    </svg>
  ),
  book: (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="4" width="14" height="16" rx="2.5" />
      <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
    </svg>
  ),
  target: (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  ),
  briefcase: (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="8" width="18" height="13" rx="2.5" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  ),
};

interface FeatureCardProps {
  module: Module;
  featured?: boolean;
}

export function FeatureCard({ module, featured = false }: FeatureCardProps) {
  const isActive = module.status === "active";

  if (featured && isActive) {
    return (
      <div className="bg-white border border-[#e7e1d5] rounded-[18px] p-5 shadow-[0_3px_14px_rgba(41,38,33,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <div className="w-[52px] h-[52px] rounded-[15px] bg-sage text-white flex items-center justify-center shadow-[0_6px_16px_rgba(62,91,77,0.24)]">
            {icons[module.icon]}
          </div>
          <Badge variant="active">Active</Badge>
        </div>
        <div className="text-[19px] font-semibold text-ink mb-1">
          {module.name}
        </div>
        <div className="text-[13px] leading-relaxed text-faint mb-4">
          {module.description}
        </div>
        <Link href={module.href}>
          <Button className="w-full" size="md">
            Open {module.name}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#faf7f1] border border-border-soft rounded-[14px] p-3 px-3">
      <div className="w-[34px] h-[34px] rounded-[10px] bg-sand-tint text-[#a89372] flex items-center justify-center mb-3.5">
        {icons[module.icon]}
      </div>
      <div className="text-[13px] font-semibold text-[#6f685c]">
        {module.name.replace(" Tracker", "").replace(" Planner", "")}
      </div>
      <div className="text-[9px] font-semibold font-mono uppercase tracking-[0.06em] text-[#b9a17e] mt-0.5">
        Soon
      </div>
    </div>
  );
}
