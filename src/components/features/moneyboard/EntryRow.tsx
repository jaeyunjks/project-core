"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MoneyEntryDisplay, MoneyCategoryDisplay } from "@/types";
import { cn } from "@/lib/utils";
import { formatMoney, CURRENCIES, DEFAULT_CURRENCY } from "@/domain/moneyboard";
import type { CurrencyOption } from "@/domain/moneyboard";
import { CategoryIcon } from "./CategoryIcon";
import { EntryModal } from "./EntryModal";
import {
  deleteMoneyEntryAction,
  duplicateMoneyEntryAction,
} from "@/server/actions/moneyboard";

interface Props {
  entry: MoneyEntryDisplay;
  categories: MoneyCategoryDisplay[];
  /** Visual: top-radius / bottom-radius / both / none — for grouping inside a multi-row card */
  position?: "single" | "top" | "middle" | "bottom";
}

export function EntryRow({ entry, categories, position = "single" }: Props) {
  // Each entry is displayed in the currency it was saved with.
  const currency: CurrencyOption =
    CURRENCIES.find((c) => c.code === entry.currency) ?? DEFAULT_CURRENCY;
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const isIncome = entry.kind === "income";
  const isHoursImport = entry.source === "hoursboard";

  const radiusClass =
    position === "single"
      ? "rounded-[10px] border"
      : position === "top"
        ? "rounded-t-[10px] border border-b-0"
        : position === "middle"
          ? "border border-t-0 border-b-0"
          : "rounded-b-[10px] border border-t-0";

  function handleDelete() {
    const fd = new FormData();
    fd.set("id", entry.id);
    startTransition(async () => {
      await deleteMoneyEntryAction(fd);
      router.refresh();
    });
  }

  function handleDuplicate() {
    const fd = new FormData();
    fd.set("id", entry.id);
    startTransition(async () => {
      await duplicateMoneyEntryAction(fd);
      router.refresh();
      setMenuOpen(false);
    });
  }

  return (
    <>
      <div
        className={cn(
          "relative flex items-center gap-3 bg-white border-border-soft px-4 py-3",
          radiusClass
        )}
      >
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{
            backgroundColor: isIncome ? "#E8EEDF" : "#E8E2D0",
          }}
        >
          <CategoryIcon icon={entry.category.icon} size={14} color={entry.category.color} />
        </div>

        {/* Title + category */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[14px] font-medium text-ink truncate">
              {entry.note || entry.category.label}
            </div>
            {isHoursImport && (
              <span className="text-[9px] font-semibold font-mono uppercase tracking-[0.1em] text-sage bg-sage/10 px-1.5 py-0.5 rounded">
                HoursBoard
              </span>
            )}
          </div>
          <div className="text-[12px] text-muted mt-0.5">
            {entry.category.label}
            {isHoursImport && " · est. gross"}
          </div>
        </div>

        {/* Amount */}
        <div
          className={cn(
            "text-[14px] font-mono font-medium tabular-nums",
            isIncome ? "text-sage" : "text-[#8A3F2E]"
          )}
        >
          {isIncome ? "+" : "−"}
          {formatMoney(entry.amount, { currency })}
        </div>

        {/* Menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Entry actions"
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
              menuOpen
                ? "bg-ink text-paper"
                : "text-muted hover:bg-paper hover:text-ink"
            )}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 w-44 bg-white border border-border rounded-[10px] shadow-[0_12px_28px_rgba(0,0,0,0.12)] py-1.5 z-30">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
                className="w-full px-3 py-2 text-left text-[13px] text-ink hover:bg-paper flex items-center gap-2.5"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit entry
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={isPending}
                className="w-full px-3 py-2 text-left text-[13px] text-ink hover:bg-paper flex items-center gap-2.5 disabled:opacity-40"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Duplicate
              </button>
              <div className="h-px bg-border-soft my-1 mx-2" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
                className="w-full px-3 py-2 text-left text-[13px] text-[#8A3F2E] hover:bg-red-50 flex items-center gap-2.5"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <EntryModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        categories={categories}
        editEntry={entry}
      />

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 backdrop-blur-sm px-4 pb-20 md:pb-4"
          onClick={() => !isPending && setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-[400px] max-h-[calc(100dvh-6rem)] overflow-y-auto bg-paper border border-border-soft rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-[12px] bg-red-50 flex items-center justify-center text-[#8A3F2E] mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </div>
            <h3 className="text-[16px] font-semibold tracking-tight text-ink mb-1">
              Delete this entry?
            </h3>
            <p className="text-[13px] text-muted mb-5">
              {entry.note || entry.category.label} ·{" "}
              {isIncome ? "+" : "−"}
              {formatMoney(entry.amount, { currency })}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className="h-10 px-4 rounded-[10px] text-[13px] font-medium text-muted hover:bg-white disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="h-10 px-5 rounded-[10px] bg-[#8A3F2E] text-paper text-[13px] font-semibold hover:bg-[#6E3225] disabled:opacity-40"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
