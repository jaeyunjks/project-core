"use client";

import { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MoneyCategoryDisplay, MoneyEntryDisplay } from "@/types";
import { cn } from "@/lib/utils";
import {
  formatMoney,
  parseAmountInput,
  sanitizeAmountInput,
  getSeparators,
  isWholeNumberCurrency,
} from "@/domain/moneyboard";
import { CategoryIcon } from "./CategoryIcon";
import { CURRENCIES, DEFAULT_CURRENCY, type CurrencyOption } from "@/domain/moneyboard";
import {
  createMoneyEntryAction,
  updateMoneyEntryAction,
} from "@/server/actions/moneyboard";

interface Props {
  open: boolean;
  onClose: () => void;
  categories: MoneyCategoryDisplay[];
  /** When set, modal is in edit mode for this entry */
  editEntry?: MoneyEntryDisplay | null;
  /** Initial kind when creating; defaults to "expense" */
  initialKind?: "income" | "expense";
  /** Currency to use for a NEW entry (the page's active currency view) */
  defaultCurrency?: CurrencyOption;
  /** Per-category remaining budget, keyed by categoryId — drives the "comes from" hint. */
  categoryBudgetHints?: Record<string, { name: string; remaining: number }>;
  /** Flexible pool remaining — used when the picked category has no budget. */
  leftToSpend?: number;
  /** When set, the expense category list is limited to these plan categories (+ "Other"). */
  planCategoryIds?: string[];
}

function lookupCurrency(code: string | undefined): CurrencyOption {
  if (!code) return DEFAULT_CURRENCY;
  return CURRENCIES.find((c) => c.code === code) ?? DEFAULT_CURRENCY;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EntryModal({
  open,
  onClose,
  categories,
  editEntry,
  initialKind = "expense",
  defaultCurrency = DEFAULT_CURRENCY,
  categoryBudgetHints,
  leftToSpend,
  planCategoryIds,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Currency is FIXED per-entry: it comes from the entry being edited,
  // or from the page's active currency when creating a new one.
  const currency = editEntry
    ? lookupCurrency(editEntry.currency)
    : defaultCurrency;
  const { decimal: decimalSep } = getSeparators(currency);

  // Convert a number → input-string in the active locale's decimal style.
  const numberToInputStr = (n: number): string => {
    if (!Number.isFinite(n)) return "";
    const decimals = isWholeNumberCurrency(currency) ? 0 : 2;
    return n.toFixed(decimals).replace(".", decimalSep);
  };

  const isEditing = !!editEntry;
  const [kind, setKind] = useState<"income" | "expense">(
    editEntry?.kind ?? initialKind
  );
  const [amountStr, setAmountStr] = useState("");
  const [date, setDate] = useState(todayStr());
  const [categoryId, setCategoryId] = useState<string>("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const catWrapRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    if (editEntry) {
      setKind(editEntry.kind);
      setAmountStr(numberToInputStr(editEntry.amount));
      setDate(editEntry.date);
      setCategoryId(editEntry.category.id);
      setNote(editEntry.note ?? "");
    } else {
      setKind(initialKind);
      setAmountStr("");
      setDate(todayStr());
      setCategoryId("");
      setNote("");
    }
    setError(null);
    setCatOpen(false);
  }, [open, editEntry, initialKind]);

  // Close the category dropdown on outside click / Escape
  useEffect(() => {
    if (!catOpen) return;
    const onDown = (e: MouseEvent) => {
      if (catWrapRef.current && !catWrapRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [catOpen]);

  // Categories filtered by current kind. For expenses, when the plan has
  // category budgets, limit the picker to those plan categories (+ "Other").
  const visibleCats = useMemo(() => {
    const all = categories.filter((c) => c.kind === kind);
    if (kind !== "expense" || !planCategoryIds || planCategoryIds.length === 0) return all;
    const allow = new Set(planCategoryIds);
    return all.filter(
      (c) => allow.has(c.id) || c.key === "expense_other" || c.label.trim().toLowerCase() === "other"
    );
  }, [categories, kind, planCategoryIds]);

  // Reset category if switching kind makes the selection invalid
  useEffect(() => {
    if (categoryId && !visibleCats.find((c) => c.id === categoryId)) {
      setCategoryId("");
    }
  }, [kind, visibleCats, categoryId]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const amountNum = parseAmountInput(amountStr, currency);
  const validAmount = Number.isFinite(amountNum) && amountNum > 0;
  const canSubmit = validAmount && !!categoryId && !!date && !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("amount", String(amountNum));
    fd.set("currency", currency.code);
    fd.set("date", date);
    fd.set("categoryId", categoryId);
    fd.set("note", note);
    if (editEntry) fd.set("id", editEntry.id);

    startTransition(async () => {
      const result = editEntry
        ? await updateMoneyEntryAction(null, fd)
        : await createMoneyEntryAction(null, fd);
      if (result.ok) {
        onClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) return null;

  const isExpense = kind === "expense";
  const previewAmount = validAmount
    ? formatMoney(amountNum, { currency })
    : `${currency.symbol}0${currency.code === "JPY" ? "" : ".00"}`;
  const ctaLabel = isEditing
    ? `Save changes`
    : `Add ${kind} · ${previewAmount}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 backdrop-blur-sm p-4 pb-20 md:pb-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] max-h-[calc(100dvh-7rem)] md:max-h-[calc(100dvh-3rem)] overflow-y-auto bg-paper rounded-[16px] border border-border-soft shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 pb-3">
            <div>
              <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint">
                {isEditing ? "Edit entry" : "New entry"}
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-ink mt-1">
                {isEditing ? "Edit entry" : isExpense ? "Add expense" : "Add income"}
              </h2>
            </div>
            {!isEditing && (
              <div className="flex gap-1 p-[3px] bg-[#EFE9DC] border border-border-soft rounded-full">
                {(["income", "expense"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors",
                      kind === k
                        ? "bg-ink text-paper"
                        : "text-muted hover:text-ink"
                    )}
                  >
                    {k[0].toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            )}
            {isEditing && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-ink"
                aria-label="Close"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-6 pb-4 flex flex-col gap-4">
            {/* Big amount input */}
            <div className="bg-white border border-border-soft rounded-[12px] px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">
                  Amount
                </div>
                <div className="text-[10px] font-mono text-muted tracking-wide">
                  {currency.code}
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[18px] font-mono text-muted">{currency.symbol}</span>
                <input
                  type="text"
                  inputMode={isWholeNumberCurrency(currency) ? "numeric" : "decimal"}
                  value={amountStr}
                  onChange={(e) => setAmountStr(sanitizeAmountInput(e.target.value, currency))}
                  placeholder={isWholeNumberCurrency(currency) ? "0" : `0${decimalSep}00`}
                  autoFocus={!isEditing}
                  className={cn(
                    "flex-1 min-w-0 bg-transparent border-0 outline-none font-mono text-[28px] font-semibold tracking-tight placeholder:text-pale",
                    isExpense ? "text-[#8A3F2E]" : "text-[#2D4A2E]"
                  )}
                />
              </div>
            </div>

            {/* Date */}
            <div className="bg-white border border-border-soft rounded-[12px] px-4 py-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">
                  Date
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="mt-1 bg-transparent border-0 outline-none font-mono text-[14px] text-ink p-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Categories */}
            <div>
              <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint mb-2">
                Category
              </div>
              <div className="relative" ref={catWrapRef}>
                {(() => {
                  const selectedCat = visibleCats.find((c) => c.id === categoryId);
                  return (
                    <button
                      type="button"
                      onClick={() => setCatOpen((v) => !v)}
                      aria-haspopup="listbox"
                      aria-expanded={catOpen}
                      className={cn(
                        "w-full h-12 pl-2 pr-3 rounded-[12px] border bg-white flex items-center justify-between gap-2 text-left transition-colors",
                        catOpen ? "border-sage ring-[3px] ring-sage/10" : "border-border-soft hover:border-sage/40"
                      )}
                    >
                      {selectedCat ? (
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: selectedCat.color + "1F" }}
                          >
                            <CategoryIcon icon={selectedCat.icon} size={16} color={selectedCat.color} />
                          </span>
                          <span className="text-[14px] font-semibold text-ink truncate">{selectedCat.label}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-full bg-[#EFE9DC] flex items-center justify-center shrink-0 text-faint">
                            <CategoryIcon icon="tag" size={16} color="currentColor" />
                          </span>
                          <span className="text-[14px] text-pale">Select category</span>
                        </span>
                      )}
                      <svg
                        width="10"
                        height="6"
                        viewBox="0 0 10 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-faint shrink-0"
                        style={{ transition: "transform 0.15s", transform: `rotate(${catOpen ? 180 : 0}deg)` }}
                      >
                        <path d="M1 1L5 5L9 1" />
                      </svg>
                    </button>
                  );
                })()}
                {catOpen && (
                  <div
                    role="listbox"
                    className="absolute z-10 top-[calc(100%+6px)] left-0 right-0 max-h-64 overflow-y-auto bg-white rounded-[14px] border border-border-soft shadow-lg p-1.5"
                  >
                    {visibleCats.map((c) => {
                      const selected = c.id === categoryId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            setCategoryId(c.id);
                            setCatOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 pl-2 pr-2.5 py-2 rounded-[10px] text-left transition-colors",
                            selected ? "bg-sage/10" : "hover:bg-paper"
                          )}
                        >
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: c.color + "1F" }}
                          >
                            <CategoryIcon icon={c.icon} size={16} color={c.color} />
                          </span>
                          <span
                            className={cn(
                              "text-[14px] flex-1 truncate",
                              selected ? "font-semibold text-ink" : "font-medium text-ink"
                            )}
                          >
                            {c.label}
                          </span>
                          {selected && (
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-sage shrink-0"
                            >
                              <path d="M4 10.5l4 4 8-9" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Budget impact hint */}
            {isExpense && categoryId && (() => {
              const hint = categoryBudgetHints?.[categoryId];
              const base = hint ? hint.remaining : (leftToSpend ?? 0);
              const label = hint ? `${hint.name} budget` : "Left to spend";
              const after = base - (validAmount ? amountNum : 0);
              return (
                <div className="px-4 py-3 rounded-[12px] bg-[#EFE9DC] border border-border-soft text-[12.5px] text-muted">
                  Comes from your <span className="font-semibold text-ink">{label}</span> ·{" "}
                  <span className="font-mono">{formatMoney(base, { currency })}</span> left
                  {validAmount && (
                    <>
                      {" "}→{" "}
                      <span
                        className={cn(
                          "font-mono font-semibold",
                          after < 0 ? "text-[#8A3F2E]" : "text-sage"
                        )}
                      >
                        {formatMoney(after, { currency })}
                      </span>{" "}
                      after
                    </>
                  )}
                </div>
              );
            })()}

            {/* Note */}
            <div className="bg-white border border-border-soft rounded-[12px] px-4 py-3">
              <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">
                Note <span className="font-normal normal-case tracking-normal text-faint">· optional</span>
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Groceries — Coles"
                maxLength={120}
                className="mt-1 w-full bg-transparent border-0 outline-none text-[14px] text-ink p-0 placeholder:text-pale"
              />
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-[10px] bg-red-50 border border-red-200 text-[13px] text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-soft bg-white/50 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-[10px] text-[13px] font-medium text-muted hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "h-10 px-5 rounded-[10px] text-[13px] font-semibold transition-colors",
                isExpense
                  ? "bg-ink text-paper hover:bg-ink/90"
                  : "bg-sage text-paper hover:bg-sage-deep",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {isPending ? "Saving…" : ctaLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
