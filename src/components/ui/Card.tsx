import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "tinted" | "dashed";
}

export function Card({
  children,
  variant = "default",
  className,
  ...props
}: CardProps) {
  const variants = {
    default:
      "bg-white border border-border-soft rounded-[18px] shadow-[0_2px_10px_rgba(41,38,33,0.06)]",
    tinted:
      "bg-[#faf7f1] border border-border-soft rounded-[18px]",
    dashed:
      "bg-white border border-dashed border-border rounded-[16px]",
  };

  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  );
}
