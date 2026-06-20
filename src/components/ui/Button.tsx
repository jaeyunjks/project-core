import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold cursor-pointer border-0 transition-opacity active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-sage text-white rounded-[13px] shadow-[0_4px_12px_rgba(62,91,77,0.22)]",
    secondary: "bg-white text-ink border border-border rounded-[13px]",
    ghost: "bg-transparent text-sage rounded-[11px]",
    icon: "bg-white text-sage border border-border rounded-[11px] w-11 h-11 p-0",
  };

  const sizes = {
    sm: "h-10 px-4 text-[13px]",
    md: "h-12 px-5 text-[15px]",
    lg: "h-[52px] px-6 text-[15px]",
  };

  return (
    <button
      className={cn(
        base,
        variants[variant],
        variant !== "icon" && sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
