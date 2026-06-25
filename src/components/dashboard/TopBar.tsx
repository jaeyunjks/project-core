"use client";

import { useEffect, useState } from "react";
import { CommandBar } from "./CommandBar";
import { NotificationsMenu, type DashboardNotification } from "./NotificationsMenu";
import { DateMenu, type DateContext } from "./DateMenu";

interface Props {
  dateContext: DateContext;
  notifications: DashboardNotification[];
}

export function TopBar({ dateContext, notifications }: Props) {
  const [isMac, setIsMac] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    }
  }, []);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="flex items-center gap-3 mb-7 md:mb-8">
        {/* Search / command bar — opens palette */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="group flex-1 flex items-center gap-2.5 h-11 pl-3.5 pr-2 rounded-[12px] bg-white/70 backdrop-blur-sm border border-border-soft hover:border-border transition-colors text-left"
          aria-label="Open command palette"
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

        {/* Date pill — opens today's context popover */}
        <DateMenu context={dateContext} />

        {/* Notifications */}
        <NotificationsMenu notifications={notifications} />

        {/* Avatar — generic user icon (no initials) */}
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-1.5 h-11 pl-1 pr-2 rounded-[12px] bg-white/70 backdrop-blur-sm border border-border-soft hover:border-border transition-colors"
        >
          <span className="w-8 h-8 rounded-[9px] bg-sage text-paper flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="9" r="3.4" />
              <path d="M5.5 19c1-3.2 3.5-4.8 6.5-4.8s5.5 1.6 6.5 4.8" />
            </svg>
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-faint">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <CommandBar open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
