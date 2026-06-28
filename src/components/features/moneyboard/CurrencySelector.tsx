"use client";

import { useEffect, useRef, useState } from "react";
import { CURRENCIES, type CurrencyOption } from "@/domain/moneyboard";
import { cn } from "@/lib/utils";

interface Props {
  currency: CurrencyOption;
  onChange: (c: CurrencyOption) => void;
}

export function CurrencySelector({ currency, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "group inline-flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-full bg-white border border-border-soft",
          "text-[12px] font-medium text-ink shadow-sm",
          "hover:border-sage/40 hover:shadow transition-all",
          open && "border-sage/60 ring-[3px] ring-sage/10"
        )}
      >
        <GlobeIcon />
        <span className="font-mono tabular-nums text-faint">{currency.symbol}</span>
        <span className="text-ink/90 tracking-wide">{currency.code}</span>
        <ChevronIcon className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute right-0 mt-2 w-[240px] z-30",
            "bg-white border border-border-soft rounded-[12px] shadow-lg",
            "p-1.5 max-h-[320px] overflow-y-auto",
            "animate-[fadeIn_120ms_ease-out]"
          )}
        >
          <div className="px-2 pt-1.5 pb-2 text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint">
            Currency
          </div>
          {CURRENCIES.map((c) => {
            const selected = c.code === currency.code;
            return (
              <button
                key={c.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-2.5 py-2 rounded-[9px] text-left transition-colors",
                  selected
                    ? "bg-sage/10 text-ink"
                    : "text-ink/85 hover:bg-paper"
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-8 h-8 rounded-[8px] font-mono text-[13px] font-semibold tabular-nums",
                    selected
                      ? "bg-sage text-paper"
                      : "bg-paper text-ink/80 group-hover:bg-sand/20"
                  )}
                >
                  {c.symbol}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-ink truncate">
                    {c.label}
                  </span>
                  <span className="block text-[11px] font-mono text-faint tracking-wide">
                    {c.code}
                  </span>
                </span>
                {selected && <CheckIcon />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-muted", className)}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-sage"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
