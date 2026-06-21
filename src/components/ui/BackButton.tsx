"use client";

import { useRouter } from "next/navigation";

interface Props {
  /** Fallback path if there is no history to go back to */
  fallback?: string;
  ariaLabel?: string;
}

export function BackButton({ fallback = "/dashboard", ariaLabel = "Go back" }: Props) {
  const router = useRouter();

  function handleClick() {
    // window.history.length > 1 means there's something to go back to in this tab
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className="w-[38px] h-[38px] rounded-[11px] border border-border bg-white flex items-center justify-center text-sage hover:border-sage/40 transition-colors"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </button>
  );
}
