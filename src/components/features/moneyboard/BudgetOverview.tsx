"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { BudgetPeriodDisplay, MoneyCategoryDisplay, RecurringBillDisplay } from "@/types";
import type { BudgetPeriodType, CurrencyOption } from "@/domain/moneyboard";
import { cn, parseLocalDate } from "@/lib/utils";
import { formatMoney, shiftPeriodAnchor, derivePeriodEnd } from "@/domain/moneyboard";

const PERIOD_LABEL: Record<BudgetPeriodType, string> = {
  week: "Weekly",
  fortnight: "Fortnightly",
  month: "Monthly",
};

function formatLongDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
import { CurrencySelector } from "./CurrencySelector";
import { EntryModal } from "./EntryModal";
import { CategoryIcon } from "./CategoryIcon";
import { PlanBudgetSheet } from "./PlanBudgetSheet";
import { BillPlanningModal } from "./BillPlanningModal";
import { deleteMoneyEntryAction } from "@/server/actions/moneyboard";

interface Props {
  budget: BudgetPeriodDisplay;
  categories: MoneyCategoryDisplay[];
  currency: CurrencyOption;
  anchor: string | undefined;
  bills: RecurringBillDisplay[];
}

export function BudgetOverview({ budget, categories, currency, anchor, bills }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [planOpen, setPlanOpen] = useState(false);
  const [spendOpen, setSpendOpen] = useState(false);
  const [billsOpen, setBillsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  const deleteEntry = (id: string) => {
    setDeletingId(id);
    const fd = new FormData();
    fd.set("id", id);
    startDelete(async () => {
      await deleteMoneyEntryAction(fd);
      router.refresh();
      setDeletingId(null);
    });
  };

  const setCurrency = (c: CurrencyOption) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("currency", c.code);
    router.push(`${pathname}?${params.toString()}`);
  };

  const setPeriodType = (t: BudgetPeriodType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", t);
    params.delete("date");
    params.delete("end");
    router.push(`${pathname}?${params.toString()}`);
  };

  const navToAnchor = (newAnchor: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", newAnchor);
    params.delete("end");
    router.push(`${pathname}?${params.toString()}`);
  };

  const setStartDate = (newStart: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newStart)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", newStart);
    params.delete("end");
    router.push(`${pathname}?${params.toString()}`);
  };

  const setEndDate = (newEnd: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newEnd)) return;
    if (newEnd < budget.startDate) return;
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get("date")) params.set("date", budget.startDate);
    const naturalEnd = derivePeriodEnd(budget.periodType, budget.startDate);
    if (newEnd === naturalEnd) params.delete("end");
    else params.set("end", newEnd);
    router.push(`${pathname}?${params.toString()}`);
  };

  const naturalEnd = derivePeriodEnd(budget.periodType, budget.startDate);
  const isCustomEnd = budget.endDate !== naturalEnd;
  const [protectHidden, setProtectHidden] = useState(true);
  const [committedOpen, setCommittedOpen] = useState(false);

  const positive = budget.leftToSpend >= 0;
  const perDayLabel = budget.daysLeft > 0
    ? `${budget.daysLeft} day${budget.daysLeft === 1 ? "" : "s"} left · about ${formatMoney(budget.perDay, { currency })}/day`
    : budget.isFuture
      ? "Starts soon"
      : "Period ended";

  return (
    <div className="md:grid md:grid-cols-5 md:gap-6">
      <div className="md:col-span-3 flex flex-col pb-4 md:pb-0">
        {/* Row 1 — selectors */}
        <div className="flex items-center gap-2 mb-3">
          <CurrencySelector currency={currency} onChange={setCurrency} />
          <PeriodDropdown value={budget.periodType} onChange={setPeriodType} />
        </div>

        {/* Row 2 — date range */}
        <div className="flex items-end gap-2 mb-4">
          <DateField label="Start" value={budget.startDate} onChange={setStartDate} className="w-[150px]" />
          <span className="h-9 flex items-center text-muted text-[13px] shrink-0">→</span>
          <DateField
            label="End"
            value={budget.endDate}
            min={budget.startDate}
            onChange={setEndDate}
            className="w-[150px]"
          />
        </div>
        {isCustomEnd && (
          <div className="-mt-2 mb-4">
            <button
              type="button"
              onClick={() => navToAnchor(budget.startDate)}
              className="h-8 px-3 rounded-full bg-sage/10 text-sage text-[11.5px] font-semibold hover:bg-sage/15"
            >
              Reset to {PERIOD_LABEL[budget.periodType].toLowerCase()}
            </button>
          </div>
        )}

        {/* Hero card */}
        <div className="bg-white border border-border-soft rounded-[18px] p-5 md:p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint pt-1.5">
              {budget.heroLabel}
            </div>
            <div className="flex items-center gap-1.5">
              <NavBtn
                dir="prev"
                onClick={() => navToAnchor(shiftPeriodAnchor(budget.periodType, budget.startDate, -1))}
              />
              <NavBtn
                dir="next"
                onClick={() => navToAnchor(shiftPeriodAnchor(budget.periodType, budget.startDate, 1))}
              />
            </div>
          </div>

          <div className="text-[20px] md:text-[22px] font-semibold tracking-tight text-ink mt-1">
            {budget.rangeLabel}
          </div>
          <div className="text-[11.5px] font-mono text-muted mt-1">
            {formatLongDate(budget.startDate)} → {formatLongDate(budget.endDate)}
          </div>

          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint mt-5">
            Left to spend
          </div>
          <div
            className={cn(
              "font-mono font-semibold tracking-tight leading-none text-[46px] md:text-[56px] mt-1.5",
              positive ? "text-sage" : "text-[#8A3F2E]",
            )}
          >
            {formatMoney(budget.leftToSpend, { signed: !positive, currency })}
          </div>

          {/* Overall progress */}
          <div className="h-1.5 rounded-full bg-paper overflow-hidden mt-4">
            <div
              className={cn("h-full rounded-full transition-[width] duration-300", positive ? "bg-sage" : "bg-[#8A3F2E]")}
              style={{ width: `${budget.progressPercent}%` }}
            />
          </div>
          <div className="text-[12.5px] text-muted mt-2">{perDayLabel}</div>
          {budget.categoryBudgets.length > 0 && (
            <div className="text-[11.5px] text-faint mt-1">
              Flexible pool · {budget.categoryBudgets.length} category budget
              {budget.categoryBudgets.length === 1 ? "" : "s"} tracked separately below
            </div>
          )}

          {/* Committed items breakdown — collapsible, visible once a plan is saved */}
          {budget.hasPlan && budget.committedItems.length > 0 && (
            <div className="mt-4 rounded-[12px] bg-paper/60 border border-border-soft/70">
              <button
                type="button"
                onClick={() => setCommittedOpen((v) => !v)}
                aria-expanded={committedOpen}
                aria-controls="committed-items-list"
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
              >
                <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">
                  Committed items · {budget.committedItems.length}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[12px] font-mono font-semibold text-ink tabular-nums">
                    {formatMoney(budget.committedTotal, { currency })}
                  </span>
                  <svg
                    width="9"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-faint"
                    style={{ transition: "transform 0.15s", transform: `rotate(${committedOpen ? 180 : 0}deg)` }}
                  >
                    <path d="M1 1L5 5L9 1" />
                  </svg>
                </span>
              </button>
              {committedOpen && (
                <div id="committed-items-list" className="flex flex-col px-3.5 pb-3 pt-0.5">
                  {budget.committedItems.map((it, i) => (
                    <div
                      key={it.id}
                      className={cn(
                        "flex items-center justify-between py-1.5",
                        i < budget.committedItems.length - 1 && "border-b border-border-soft/60",
                      )}
                    >
                      <span className="text-[13px] text-ink/80 truncate mr-3">{it.name}</span>
                      <span className="text-[13px] font-mono font-semibold text-ink tabular-nums shrink-0">
                        {formatMoney(it.amount, { currency })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="h-px bg-border-soft my-5" />

          {/* Committed / Protected */}
          <div className="flex items-stretch">
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <LockIcon />
                <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.14em] text-faint">Committed</span>
              </div>
              <div className="text-[16px] font-mono font-semibold text-muted">
                {formatMoney(budget.committedTotal, { currency })}
              </div>
            </div>
            <div className="w-px bg-border-soft mx-4" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <ShieldIcon />
                <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.14em] text-faint">Protected</span>
                <button
                  type="button"
                  onClick={() => setProtectHidden((v) => !v)}
                  aria-label={protectHidden ? "Show protected balance" : "Hide protected balance"}
                  aria-pressed={!protectHidden}
                  className="ml-auto text-faint hover:text-ink"
                >
                  {protectHidden ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <div className="text-[16px] font-mono font-semibold text-muted tabular-nums">
                {protectHidden ? "••••••" : formatMoney(budget.protectValue, { currency })}
              </div>
            </div>
          </div>
        </div>

        <div className="text-[12.5px] text-subtle mt-3 px-1">
          of {formatMoney(Math.max(0, budget.plannedSpendable), { currency })} planned · protected stays untouched
        </div>

        {/* Plan budget CTA */}
        <button
          type="button"
          onClick={() => setPlanOpen(true)}
          className="w-full h-[52px] rounded-[14px] bg-sage text-white text-[15px] font-semibold shadow-btn hover:bg-sage-deep transition-colors mt-4"
        >
          {budget.hasPlan ? "Edit plan" : "Plan budget"}
        </button>

        {/* Action row */}
        <div className="flex items-end justify-between mt-6 px-1">
          <ActionBtn label="Cash flow" icon={<CashIcon />} onClick={() => { /* future */ }} />
          <ActionBtn label="Bill planning" icon={<BillIcon />} onClick={() => setBillsOpen(true)} />
          <ActionBtn label="Add spend" icon={<PlusIcon size={22} />} primary onClick={() => setSpendOpen(true)} />
          <ActionBtn label="Insights" icon={<BarsIcon />} onClick={() => { /* future */ }} />
        </div>

        {/* Category budgets — drawdown bar chart */}
        {budget.categoryBudgets.length > 0 && (
          <div className="mt-8">
            <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint mb-3">
              Category budgets
            </div>
            <div className="bg-white border border-border-soft rounded-[16px] shadow-card p-4 md:p-5 flex flex-col gap-4">
              {budget.categoryBudgets.map((b) => (
                <div key={b.key}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[13.5px] font-medium text-ink">{b.name}</span>
                      {b.paid && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-sage bg-sage/10 px-1.5 py-0.5 rounded-full">
                          Paid
                        </span>
                      )}
                    </span>
                    <span className="text-[12.5px] font-mono text-muted tabular-nums">
                      {formatMoney(b.spent, { currency })} / {formatMoney(b.budgeted, { currency })}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-paper overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: `${b.percentUsed}%`,
                        background: b.overBudget ? "#8A3F2E" : b.color,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span
                      className={cn(
                        "text-[12px] font-mono font-semibold tabular-nums",
                        b.overBudget ? "text-[#8A3F2E]" : b.paid ? "text-faint" : "text-sage",
                      )}
                    >
                      {b.overBudget
                        ? `${formatMoney(Math.abs(b.remaining), { currency })} over`
                        : b.paid
                          ? "Fully paid"
                          : `${formatMoney(b.remaining, { currency })} left`}
                    </span>
                    <span className="text-[11px] font-mono text-faint">{b.percentUsed}% used</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent entries */}
        <div className="mt-8">
          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint mb-3">
            Recent entries
          </div>
          {budget.recentEntries.length === 0 ? (
            <div className="bg-white border border-dashed border-border rounded-[14px] p-8 text-center">
              <p className="text-[14px] font-medium text-ink">No spends logged yet</p>
              <p className="text-[12.5px] text-muted mt-1.5">
                Tap <span className="font-semibold">Add spend</span> to record your first transaction.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-border-soft rounded-[16px] shadow-card overflow-hidden">
              {budget.recentEntries.map((e, i) => (
                <div
                  key={e.id}
                  className={cn(
                    "flex items-center justify-between px-4 py-3.5",
                    i < budget.recentEntries.length - 1 && "border-b border-border-soft",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "#EFE9DC" }}
                    >
                      <CategoryIcon icon={e.category.icon} size={16} color={e.category.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-medium text-ink truncate">
                        {e.note?.trim() || e.category.label}
                      </div>
                      <div className="text-[11.5px] text-muted mt-0.5 font-mono">
                        {e.category.label} · {e.date.slice(5)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[14.5px] font-mono font-semibold text-ink tabular-nums">
                      −{formatMoney(e.amount, { currency })}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteEntry(e.id)}
                      disabled={deletingId === e.id}
                      aria-label={`Delete ${e.note?.trim() || e.category.label}`}
                      className="w-7 h-7 rounded-full text-pale hover:text-[#8A3F2E] hover:bg-[#8A3F2E]/8 flex items-center justify-center transition-colors disabled:opacity-40"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right column — plan snapshot */}
      <aside className="hidden md:block md:col-span-2">
        <div className="md:sticky md:top-6 flex flex-col gap-4">
          <PlanSnapshotCard budget={budget} currency={currency} protectHidden={protectHidden} />
        </div>
      </aside>

      {/* Sheets */}
      <PlanBudgetSheet
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        budget={budget}
        currency={currency}
        anchor={anchor}
        bills={bills}
      />
      <BillPlanningModal
        open={billsOpen}
        onClose={() => setBillsOpen(false)}
        bills={bills}
        currency={currency}
      />
      <EntryModal
        open={spendOpen}
        onClose={() => setSpendOpen(false)}
        categories={categories}
        initialKind="expense"
        defaultCurrency={currency}
        categoryBudgetHints={Object.fromEntries(
          budget.categoryBudgets.map((b) => [b.categoryId, { name: b.name, remaining: b.remaining }]),
        )}
        leftToSpend={budget.leftToSpend}
        planCategoryIds={budget.categoryBudgets.map((b) => b.categoryId)}
      />
    </div>
  );
}

function PlanSnapshotCard({
  budget,
  currency,
  protectHidden,
}: {
  budget: BudgetPeriodDisplay;
  currency: CurrencyOption;
  protectHidden: boolean;
}) {
  return (
    <div className="bg-white border border-border-soft rounded-[16px] p-5 shadow-card">
      <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint mb-4">
        Plan snapshot
      </div>
      <SummaryRow label="Money in" value={formatMoney(budget.moneyIn, { currency })} />
      <SummaryRow label="Protected" value={protectHidden ? "••••••" : formatMoney(budget.protectValue, { currency })} />
      <SummaryRow label="Committed" value={formatMoney(budget.committedTotal, { currency })} />
      <div className="h-px bg-border-soft my-2" />
      <SummaryRow
        label="Spendable"
        value={formatMoney(Math.max(0, budget.plannedSpendable), { currency })}
        bold
      />
      <SummaryRow label="Spent so far" value={formatMoney(budget.spent, { currency })} muted />
      <SummaryRow
        label="Left to spend"
        value={formatMoney(budget.leftToSpend, { signed: budget.leftToSpend < 0, currency })}
        bold
        color={budget.leftToSpend >= 0 ? "sage" : "red"}
      />

      {budget.committedItems.length > 0 && (
        <>
          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint mt-5 mb-2">
            Committed items
          </div>
          <div className="flex flex-col">
            {budget.committedItems.map((it, i) => (
              <div
                key={it.id}
                className={cn(
                  "flex items-center justify-between py-2",
                  i < budget.committedItems.length - 1 && "border-b border-border-soft",
                )}
              >
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium text-ink truncate">{it.name}</div>
                  <div className="text-[11px] text-muted mt-0.5 font-mono">{it.recur}</div>
                </div>
                <span className="text-[13px] font-mono font-semibold text-ink tabular-nums">
                  {formatMoney(it.amount, { currency })}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  muted,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  color?: "sage" | "red";
}) {
  const colorClass = color === "sage" ? "text-sage" : color === "red" ? "text-[#8A3F2E]" : "text-ink";
  return (
    <div className="flex items-center justify-between py-2">
      <span className={cn("text-[13px]", muted ? "text-muted" : "text-ink/80")}>{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums tracking-tight",
          bold ? "text-[16px] font-semibold" : "text-[14px] font-medium",
          colorClass,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function DateField({
  label,
  value,
  min,
  onChange,
  className,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.14em] text-faint">
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full px-2.5 rounded-[10px] bg-white border border-border-soft shadow-sm text-[13px] font-medium text-ink font-mono outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
      />
    </label>
  );
}

function PeriodDropdown({
  value,
  onChange,
}: {
  value: BudgetPeriodType;
  onChange: (v: BudgetPeriodType) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const options: BudgetPeriodType[] = ["week", "fortnight", "month"];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-9 pl-3.5 pr-2.5 rounded-full bg-white border border-border-soft shadow-sm text-[12px] font-semibold text-ink flex items-center gap-2 hover:border-sage/40 transition-colors"
      >
        <span>{PERIOD_LABEL[value]}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-faint"
          style={{ transition: "transform 0.15s", transform: `rotate(${open ? 180 : 0}deg)` }}
        >
          <path d="M1 1L5 5L9 1" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+6px)] left-0 min-w-[160px] bg-white rounded-[14px] border border-border-soft shadow-lg p-1.5 z-30"
        >
          {options.map((opt) => {
            const active = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-[9px] text-[13px] font-medium transition-colors",
                  active
                    ? "bg-sage/10 text-sage font-semibold"
                    : "text-ink hover:bg-paper",
                )}
              >
                {PERIOD_LABEL[opt]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavBtn({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  const arrow = dir === "prev" ? "M5 1L1 5L5 9" : "M1 1L5 5L1 9";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous period" : "Next period"}
      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-ink hover:border-sage/40 transition-colors"
    >
      <svg width="6" height="10" viewBox="0 0 6 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={arrow} />
      </svg>
    </button>
  );
}

function ActionBtn({
  label,
  icon,
  onClick,
  primary,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2"
      aria-label={label}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center transition-colors",
          primary
            ? "w-16 h-16 bg-sage text-white shadow-btn hover:bg-sage-deep"
            : "w-14 h-14 bg-white text-ink border border-border-soft shadow-card hover:border-sage/40 hover:text-sage",
        )}
      >
        {icon}
      </div>
      <span className={cn("text-[11.5px] font-medium", primary ? "text-ink font-semibold" : "text-muted")}>
        {label}
      </span>
    </button>
  );
}

function PlusIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6L18 6M2 6L6 2M2 6L6 10" />
      <path d="M18 14L2 14M18 14L14 10M18 14L14 18" />
    </svg>
  );
}

function BillIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="12" height="16" rx="1.5" />
      <path d="M7 7H13M7 10.5H13M7 14H10.5" strokeWidth="1.4" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <rect x="2" y="11" width="4" height="7" rx="1" />
      <rect x="8" y="6" width="4" height="12" rx="1" />
      <rect x="14" y="2" width="4" height="16" rx="1" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="13" viewBox="0 0 12 13" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-faint">
      <rect x="1.5" y="5.5" width="9" height="6.5" rx="1.4" />
      <path d="M3.5 5.5V3.5C3.5 1.8 4.6 1 6 1C7.4 1 8.5 1.8 8.5 3.5V5.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 10C3 6.5 6.2 4.5 10 4.5S17 6.5 18.5 10C17 13.5 13.8 15.5 10 15.5S3 13.5 1.5 10Z" />
      <circle cx="10" cy="10" r="2.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3L17 17" />
      <path d="M6.5 6.4C4.5 7.5 2.7 9.4 1.5 10C3 13.5 6.2 15.5 10 15.5C11.4 15.5 12.7 15.2 13.8 14.7" />
      <path d="M8.4 5C8.9 4.9 9.4 4.5 10 4.5C13.8 4.5 17 6.5 18.5 10C18 11.1 17.3 12.1 16.4 12.9" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" className="text-faint">
      <path d="M6 1L11 3V6.5C11 9.8 9 12 6 13C3 12 1 9.8 1 6.5V3L6 1Z" />
    </svg>
  );
}
