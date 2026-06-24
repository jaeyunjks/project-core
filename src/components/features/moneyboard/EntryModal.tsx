"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MoneyCategoryDisplay, MoneyEntryDisplay } from "@/types";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/domain/moneyboard";
import { CategoryIcon } from "./CategoryIcon";
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
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEditing = !!editEntry;
  const [kind, setKind] = useState<"income" | "expense">(
    editEntry?.kind ?? initialKind
  );
  const [amountStr, setAmountStr] = useState("");
  const [date, setDate] = useState(todayStr());
  const [categoryId, setCategoryId] = useState<string>("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    if (editEntry) {
      setKind(editEntry.kind);
      setAmountStr(editEntry.amount.toFixed(2));
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
  }, [open, editEntry, initialKind]);

  // Categories filtered by current kind
  const visibleCats = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind]
  );

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

  const amountNum = parseFloat(amountStr);
  const validAmount = Number.isFinite(amountNum) && amountNum > 0;
  const canSubmit = validAmount && !!categoryId && !!date && !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("amount", String(amountNum));
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
  const previewAmount = validAmount ? formatMoney(amountNum) : "A$0.00";
  const ctaLabel = isEditing
    ? `Save changes`
    : `Add ${kind} · ${previewAmount}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/45 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] bg-paper rounded-t-[24px] md:rounded-[16px] border border-border-soft shadow-[0_24px_60px_rgba(0,0,0,0.22)] overflow-hidden"
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
              <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">
                Amount
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[18px] font-mono text-muted">A$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
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
              <div className="grid grid-cols-3 gap-2">
                {visibleCats.map((c) => {
                  const selected = c.id === categoryId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={cn(
                        "rounded-[10px] px-3 py-3 flex flex-col items-start gap-1.5 border transition-colors text-left",
                        selected
                          ? "text-paper border-transparent"
                          : "bg-white text-ink border-border hover:border-sage/40"
                      )}
                      style={selected ? { backgroundColor: c.color } : undefined}
                    >
                      <CategoryIcon
                        icon={c.icon}
                        size={15}
                        color={selected ? "currentColor" : c.color}
                      />
                      <span className="text-[12px] font-medium">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

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
