"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BudgetPeriodDisplay, CommittedItemDisplay, RecurringBillDisplay } from "@/types";
import type { CurrencyOption } from "@/domain/moneyboard";
import { cn } from "@/lib/utils";
import { formatMoney, sanitizeAmountInput, parseAmountInput } from "@/domain/moneyboard";
import { saveBudgetPlanAction } from "@/server/actions/moneyboard";

interface Props {
  open: boolean;
  onClose: () => void;
  budget: BudgetPeriodDisplay;
  currency: CurrencyOption;
  anchor: string | undefined;
  bills: RecurringBillDisplay[];
}

interface DraftItem {
  key: string;
  name: string;
  amount: string;
  recur: string;
}

function itemsToDraft(items: CommittedItemDisplay[]): DraftItem[] {
  return items.map((it) => ({
    key: it.id,
    name: it.name,
    amount: String(it.amount),
    recur: it.recur,
  }));
}

function newDraftKey(): string {
  return "draft-" + Math.random().toString(36).slice(2, 9);
}

const DAY_SUFFIX = ["th", "st", "nd", "rd"];
function ordinal(n: number): string {
  const v = n % 100;
  return n + (DAY_SUFFIX[(v - 20) % 10] || DAY_SUFFIX[v] || DAY_SUFFIX[0]);
}

function billsToDraft(bills: RecurringBillDisplay[]): DraftItem[] {
  return bills.map((b) => {
    const name = b.cadence === "month" && b.dueDay ? `${b.name} · ${ordinal(b.dueDay)}` : b.name;
    return {
      key: "bill-" + b.id,
      name,
      amount: String(b.amount),
      recur: b.cadence === "week" ? "Weekly" : b.cadence === "month" ? "Monthly" : "Fortnightly",
    };
  });
}

/**
 * True when a monthly bill's dueDay falls somewhere inside the [start, end]
 * window (dates as YYYY-MM-DD, inclusive). Handles windows that straddle a
 * month boundary — a single dueDay hit anywhere in the window returns true.
 */
function monthlyBillHitsWindow(dueDay: number, start: string, end: string): boolean {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  const startDate = new Date(ys, ms - 1, ds);
  const endDate = new Date(ye, me - 1, de);
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    if (cursor.getDate() === dueDay) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

/**
 * Pick recurring bills that belong on a plan for [start, end] of periodType.
 *   • Cadence-matched bills always fill (weekly bill on a week plan, etc.)
 *   • Monthly bills with a specific dueDay ALSO fill non-monthly plans whenever
 *     the window covers that day-of-month — so a "3rd of month" bill lands on
 *     a fortnight that straddles the 3rd.
 * De-dupes by bill id so a monthly bill on a monthly plan isn't listed twice.
 */
function selectAutoBills(
  bills: RecurringBillDisplay[],
  periodType: "week" | "fortnight" | "month",
  start: string,
  end: string,
): RecurringBillDisplay[] {
  const picked = new Map<string, RecurringBillDisplay>();
  for (const b of bills) {
    if (!b.active) continue;
    if (b.cadence === periodType) {
      picked.set(b.id, b);
      continue;
    }
    if (b.cadence === "month" && b.dueDay && monthlyBillHitsWindow(b.dueDay, start, end)) {
      picked.set(b.id, b);
    }
  }
  return [...picked.values()];
}

export function PlanBudgetSheet({ open, onClose, budget, currency, bills }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [moneyIn, setMoneyIn] = useState<string>(String(budget.moneyIn || ""));
  const [protectVal, setProtectVal] = useState<string>(String(budget.protectValue || ""));
  const [items, setItems] = useState<DraftItem[]>(itemsToDraft(budget.committedItems));

  useEffect(() => {
    if (open) {
      setMoneyIn(budget.moneyIn ? String(budget.moneyIn) : "");
      setProtectVal(budget.protectValue ? String(budget.protectValue) : "");
      const picked = selectAutoBills(bills, budget.periodType, budget.startDate, budget.endDate);
      const pickedDrafts = billsToDraft(picked);
      const existing = itemsToDraft(budget.committedItems);
      const existingNames = new Set(existing.map((it) => it.name.trim().toLowerCase()));
      const missing = pickedDrafts.filter((it) => !existingNames.has(it.name.trim().toLowerCase()));
      setItems([...existing, ...missing]);
      setError(null);
    }
  }, [open, budget, bills]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const moneyInNum = useMemo(() => parseAmountInput(moneyIn, currency) || 0, [moneyIn, currency]);
  const protectNum = useMemo(() => parseAmountInput(protectVal, currency) || 0, [protectVal, currency]);
  const committedTotal = useMemo(
    () => items.reduce((s, it) => s + (parseAmountInput(it.amount, currency) || 0), 0),
    [items, currency],
  );
  const spendable = moneyInNum - protectNum - committedTotal;

  if (!open) return null;

  const heroLabel = budget.periodType === "week" ? "week" : budget.periodType === "month" ? "month" : "fortnight";

  const submit = () => {
    setError(null);
    const cleaned = items.map((it) => ({
      name: it.name.trim() || "Item",
      amount: parseAmountInput(it.amount, currency) || 0,
      recur: it.recur.trim() || "Monthly",
    }));
    const fd = new FormData();
    fd.set("periodType", budget.periodType);
    // Key the plan to the window actually on screen — covers custom / derived
    // start dates, where the URL anchor may be absent or Monday-snapped.
    fd.set("anchor", budget.startDate);
    fd.set("currency", currency.code);
    fd.set("moneyIn", String(moneyInNum));
    fd.set("protectValue", String(protectNum));
    fd.set("committedItems", JSON.stringify(cleaned));
    startTransition(async () => {
      const result = await saveBudgetPlanAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plan budget"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4 md:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[calc(100vh-2rem)] md:max-h-[90vh] overflow-y-auto bg-paper rounded-[22px] shadow-lg p-5 md:p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[20px] font-semibold tracking-tight text-ink">Plan this {heroLabel}</div>
            <div className="text-[13px] text-muted mt-1">{budget.rangeLabel}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white border border-border-soft flex items-center justify-center text-muted hover:text-ink"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M1 1L11 11M11 1L1 11" />
            </svg>
          </button>
        </div>

        <SectionCard>
          <Overline>Money in</Overline>
          <p className="text-[13px] text-muted mt-3">How much did you get paid?</p>
          <AmountInput
            currency={currency}
            value={moneyIn}
            onChange={setMoneyIn}
            large
            ariaLabel="Money in"
          />
        </SectionCard>

        <SectionCard>
          <div className="flex items-center gap-2">
            <ShieldIcon />
            <Overline>Protect</Overline>
          </div>
          <p className="text-[13px] text-muted mt-3">Set aside as savings</p>
          <AmountInput
            currency={currency}
            value={protectVal}
            onChange={setProtectVal}
            ariaLabel="Protect amount"
          />
          <p className="text-[12px] text-subtle mt-2">Kept untouched — hidden from your spendable balance</p>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center justify-between gap-2">
            <Overline>Committed · Fixed costs</Overline>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [...prev, { key: newDraftKey(), name: "", amount: "", recur: "Monthly" }])
              }
              className="h-8 px-3 rounded-full bg-sage/10 text-sage text-[12px] font-semibold hover:bg-sage/15"
            >
              + Add
            </button>
          </div>

          {!budget.hasPlan && items.some((it) => it.key.startsWith("bill-")) && (
            <p className="text-[12px] text-sage-deep bg-sage/10 rounded-[10px] px-3 py-2 mt-3">
              Auto-filled from Bill planning · adjust or remove as needed
            </p>
          )}

          <div className="flex flex-col gap-2.5 mt-4">
            {items.length === 0 && (
              <p className="text-[13px] text-subtle italic">No committed items yet.</p>
            )}
            {items.map((it) => (
              <div
                key={it.key}
                className="flex items-center gap-2 bg-white border border-border-soft rounded-[12px] px-3 py-2"
              >
                <input
                  type="text"
                  value={it.name}
                  onChange={(e) =>
                    setItems((prev) => prev.map((x) => (x.key === it.key ? { ...x, name: e.target.value } : x)))
                  }
                  placeholder="Item"
                  aria-label="Item name"
                  className="flex-1 min-w-0 bg-transparent text-[14px] font-medium text-ink outline-none placeholder:text-pale"
                />
                <span className="text-[13px] text-muted">{currency.symbol}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={it.amount}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x) =>
                        x.key === it.key ? { ...x, amount: sanitizeAmountInput(e.target.value, currency) } : x,
                      ),
                    )
                  }
                  placeholder="0"
                  aria-label="Item amount"
                  className="w-16 bg-transparent text-[14px] font-mono font-semibold text-ink outline-none text-right"
                />
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((x) => x.key !== it.key))}
                  aria-label={`Remove ${it.name || "item"}`}
                  className="w-6 h-6 rounded-full text-pale hover:text-ink text-[16px] leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-subtle mt-3">Recurring items carry over automatically</p>
        </SectionCard>

        <div className="bg-sage/10 rounded-[18px] p-5 mt-4">
          <Overline color="sage">Your spending budget</Overline>
          <div className="text-[40px] font-mono font-semibold tracking-tight text-sage leading-none mt-2">
            {formatMoney(Math.max(0, spendable), { currency })}
          </div>
          <p className="text-[13px] text-sage-deep mt-2">
            {formatMoney(moneyInNum, { currency })} − {formatMoney(protectNum, { currency })} protected −{" "}
            {formatMoney(committedTotal, { currency })} committed
          </p>
          <p className="text-[12px] text-sage-deep/80 mt-2">
            Your cap for the {heroLabel} — spend within it
          </p>
        </div>

        {error && (
          <div className="mt-3 text-[13px] text-[#8A3F2E] bg-[#F1DDD5] border border-[#E4C8BD] rounded-[10px] px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="w-full h-13 mt-5 h-[52px] rounded-[14px] bg-sage text-white text-[15px] font-semibold shadow-btn hover:bg-sage-deep transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : budget.hasPlan ? "Save changes" : "Start " + heroLabel}
        </button>
      </div>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border-soft rounded-[16px] p-4 md:p-5 mt-3 shadow-card">
      {children}
    </div>
  );
}

function Overline({ children, color = "faint" }: { children: React.ReactNode; color?: "faint" | "sage" }) {
  return (
    <div
      className={cn(
        "text-[10px] font-semibold font-mono uppercase tracking-[0.16em]",
        color === "sage" ? "text-sage-deep" : "text-faint",
      )}
    >
      {children}
    </div>
  );
}

function AmountInput({
  currency,
  value,
  onChange,
  large,
  ariaLabel,
}: {
  currency: CurrencyOption;
  value: string;
  onChange: (v: string) => void;
  large?: boolean;
  ariaLabel: string;
}) {
  const size = large ? "text-[32px]" : "text-[26px]";
  const shared = cn(
    "font-mono font-semibold text-ink leading-none tracking-tight",
    size,
  );
  return (
    <div className="flex items-baseline gap-1.5 mt-2">
      <span className={shared}>{currency.symbol}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(sanitizeAmountInput(e.target.value, currency))}
        placeholder="0"
        aria-label={ariaLabel}
        style={{ fontSize: "inherit", lineHeight: "inherit" }}
        className={cn(
          shared,
          "bg-transparent outline-none border-0 p-0 m-0 flex-1 min-w-0 h-auto placeholder:text-pale",
        )}
      />
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="13" height="15" viewBox="0 0 13 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className="text-faint">
      <path d="M6.5 1L12 3V6.5C12 10.3 9.7 12.8 6.5 14C3.3 12.8 1 10.3 1 6.5V3L6.5 1Z" />
    </svg>
  );
}
