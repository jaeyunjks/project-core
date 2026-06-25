"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  description?: string;
  group: "Navigate" | "Create";
  href?: string;
  onSelect?: () => void;
  icon: React.ReactNode;
  keywords?: string;     // extra search tokens
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Icons ───────────────────────────────────────────────────────────────────

const SI = (path: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const I = {
  home: SI(<><path d="M3 9.5 12 3l9 6.5" /><path d="M5 9V20h14V9" /></>),
  clock: SI(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  wallet: SI(<><rect x="3" y="7" width="18" height="13" rx="2.5" /><circle cx="16" cy="13.5" r="1.6" /></>),
  settings: SI(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
  plus: SI(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),
  income: SI(<><polyline points="17 6 17 18 5 18" /><polyline points="20 9 12 17 8 13 4 17" /></>),
  expense: SI(<><polyline points="17 18 17 6 5 6" /><polyline points="20 15 12 7 8 11 4 7" /></>),
  calendar: SI(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  signout: SI(<><path d="M15 17l5-5-5-5M20 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /></>),
};

export function CommandBar({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = useMemo(
    () => [
      { id: "home", group: "Navigate", label: "Home", description: "Dashboard overview", href: "/dashboard", icon: I.home, keywords: "dashboard start" },
      { id: "hb", group: "Navigate", label: "HoursBoard", description: "Pay periods & worksheets", href: "/dashboard/hoursboard", icon: I.clock, keywords: "shifts hours work" },
      { id: "mb", group: "Navigate", label: "MoneyBoard", description: "Income, expenses & net balance", href: "/dashboard/moneyboard", icon: I.wallet, keywords: "money balance spending" },
      { id: "settings", group: "Navigate", label: "Settings", description: "Employer + award levels", href: "/dashboard/hoursboard/settings", icon: I.settings, keywords: "employer rate award" },
      { id: "logout", group: "Navigate", label: "Sign out", description: "End your session", href: "/api/logout", icon: I.signout, keywords: "logout exit" },
      { id: "log-hours", group: "Create", label: "Log hours", description: "Open the latest pay-period worksheet", href: "/dashboard/hoursboard", icon: I.plus, keywords: "shift add" },
      { id: "new-period", group: "Create", label: "New pay period", description: "Start a new HoursBoard period", href: "/dashboard/hoursboard?new=period", icon: I.calendar, keywords: "fortnight week" },
      { id: "income", group: "Create", label: "Add income", description: "Log money in", href: "/dashboard/moneyboard?new=income", icon: I.income, keywords: "money in earnings" },
      { id: "expense", group: "Create", label: "Add expense", description: "Log money out", href: "/dashboard/moneyboard?new=expense", icon: I.expense, keywords: "money out spending" },
    ],
    []
  );

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => {
      const hay = `${c.label} ${c.description ?? ""} ${c.keywords ?? ""}`.toLowerCase();
      return q.split(/\s+/).every((tok) => hay.includes(tok));
    });
  }, [commands, query]);

  // Group by section, preserving filter order
  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const c of filtered) {
      const list = map.get(c.group) ?? [];
      list.push(c);
      map.set(c.group, list);
    }
    return [...map.entries()];
  }, [filtered]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[activeIdx];
        if (!cmd) return;
        runCommand(cmd);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIdx, onClose]);

  // Keep active item in view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function runCommand(cmd: Command) {
    onClose();
    if (cmd.onSelect) cmd.onSelect();
    else if (cmd.href) router.push(cmd.href);
  }

  if (!open) return null;

  let globalIdx = -1;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/40 backdrop-blur-sm px-4 pt-[14vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] bg-white rounded-[14px] border border-border-soft shadow-[0_24px_60px_rgba(0,0,0,0.22)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search */}
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border-soft">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-faint shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            placeholder="Search or type a command…"
            className="flex-1 bg-transparent border-0 outline-none text-[14px] text-ink placeholder:text-faint"
          />
          <kbd className="text-[10px] font-mono text-faint border border-border-soft rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted">
              No commands match <span className="font-mono text-ink">&ldquo;{query}&rdquo;</span>
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="py-1">
                <div className="px-4 py-1 text-[9.5px] font-semibold font-mono uppercase tracking-[0.16em] text-ghost">
                  {group}
                </div>
                {items.map((cmd) => {
                  globalIdx++;
                  const isActive = globalIdx === activeIdx;
                  const idx = globalIdx;
                  return cmd.href ? (
                    <Link
                      key={cmd.id}
                      href={cmd.href}
                      onClick={() => onClose()}
                      data-idx={idx}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 mx-1 rounded-[8px] transition-colors",
                        isActive ? "bg-sage/10" : "hover:bg-paper"
                      )}
                    >
                      <CommandItemInner cmd={cmd} active={isActive} />
                    </Link>
                  ) : (
                    <button
                      key={cmd.id}
                      type="button"
                      data-idx={idx}
                      onClick={() => runCommand(cmd)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={cn(
                        "w-[calc(100%-8px)] flex items-center gap-3 px-4 py-2.5 mx-1 rounded-[8px] text-left transition-colors",
                        isActive ? "bg-sage/10" : "hover:bg-paper"
                      )}
                    >
                      <CommandItemInner cmd={cmd} active={isActive} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 h-9 border-t border-border-soft bg-paper/60 text-[10px] font-mono text-faint">
          <div className="flex items-center gap-3">
            <span><kbd className="border border-border-soft rounded px-1 py-0.5">↑↓</kbd> navigate</span>
            <span><kbd className="border border-border-soft rounded px-1 py-0.5">↵</kbd> select</span>
          </div>
          <span>{filtered.length} {filtered.length === 1 ? "result" : "results"}</span>
        </div>
      </div>
    </div>
  );
}

function CommandItemInner({ cmd, active }: { cmd: Command; active: boolean }) {
  return (
    <>
      <span
        className={cn(
          "w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0",
          active ? "bg-sage/15 text-sage" : "bg-paper text-muted"
        )}
      >
        {cmd.icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className={cn("text-[13.5px] font-medium block truncate", active ? "text-ink" : "text-ink/90")}>
          {cmd.label}
        </span>
        {cmd.description && (
          <span className="text-[11.5px] text-muted block truncate">{cmd.description}</span>
        )}
      </span>
      {active && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sage shrink-0">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )}
    </>
  );
}
