"use client";

import Link from "next/link";

interface Props {
  /** The parent page this button navigates to */
  fallback?: string;
  ariaLabel?: string;
}

export function BackButton({ fallback = "/dashboard", ariaLabel = "Go back" }: Props) {
  return (
    <Link
      href={fallback}
      aria-label={ariaLabel}
      className="w-[38px] h-[38px] rounded-[11px] border border-border bg-white flex items-center justify-center text-sage hover:border-sage/40 transition-colors"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </Link>
  );
}
