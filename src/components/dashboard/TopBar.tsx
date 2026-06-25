"use client";

import { useEffect, useState } from "react";

interface Props {
  userName: string;
  dateLabel: string;
}

export function TopBar({ userName, dateLabel }: Props) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    }
  }, []);

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 mb-7 md:mb-8">
      {/* Search / command bar */}
      <button
        type="button"
        className="group flex-1 flex items-center gap-2.5 h-11 pl-3.5 pr-2 rounded-[12px] bg-white/70 backdrop-blur-sm border border-border-soft hover:border-border transition-colors text-left"
        aria-label="Open command bar"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-faint group-hover:text-muted transition-colors shrink-0"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <span className="flex-1 text-[13px] text-faint group-hover:text-muted transition-colors">
          Search or type a command…
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 h-6 px-1.5 rounded-md bg-paper border border-border-soft text-[10px] font-mono text-faint">
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
      </button>

      {/* Date pill — desktop only */}
      <div className="hidden lg:flex items-center gap-2 h-11 px-3.5 rounded-[12px] bg-white/70 backdrop-blur-sm border border-border-soft">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-faint">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span className="text-[12.5px] font-medium text-subtle tabular-nums">
          {dateLabel}
        </span>
      </div>

      {/* Notifications */}
      <button
        type="button"
        aria-label="Notifications"
        className="relative w-11 h-11 rounded-[12px] bg-white/70 backdrop-blur-sm border border-border-soft flex items-center justify-center text-subtle hover:text-ink hover:border-border transition-colors"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a1.99 1.99 0 0 1-3.4 0" />
        </svg>
        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-sage" />
      </button>

      {/* Avatar */}
      <button
        type="button"
        aria-label="Account menu"
        className="flex items-center gap-1.5 h-11 pl-1 pr-2 rounded-[12px] bg-white/70 backdrop-blur-sm border border-border-soft hover:border-border transition-colors"
      >
        <div className="w-8 h-8 rounded-[9px] bg-sage text-paper flex items-center justify-center text-[12px] font-semibold">
          {initials}
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-faint">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}
