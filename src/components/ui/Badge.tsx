import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "active" | "coming-soon" | "payday" | "neutral";
  children: ReactNode;
  className?: string;
}

export function Badge({
  variant = "neutral",
  children,
  className,
}: BadgeProps) {
  const variants = {
    active:
      "bg-sage-tint text-sage",
    "coming-soon":
      "bg-sand-tint text-[#8a7a5c]",
    payday:
      "bg-[#f5ede4] text-amber",
    neutral:
      "bg-white border border-border text-muted",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold",
        variants[variant],
        className
      )}
    >
      {variant === "active" && (
        <span className="w-1.5 h-1.5 rounded-full bg-sage" />
      )}
      {children}
    </span>
  );
}
