"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import type {
  MoneyCategoryDisplay,
  MonthlyMoneySummary,
  MonthNavOption,
  LifetimeMoneyStats,
} from "@/types";
import type { HoursBoardImportPreview } from "@/server/queries/moneyboard";
import type { ViewMode } from "@/domain/moneyboard";
import { cn } from "@/lib/utils";
import { formatMoney, formatDayHeader, shiftMonth, shiftWeek, shiftFortnight, todayDateStr } from "@/domain/moneyboard";
import type { CurrencyOption } from "@/domain/moneyboard";
import { CurrencySelector } from "./CurrencySelector";
import { EntryModal } from "./EntryModal";
import { ImportHoursBoardModal } from "./ImportHoursBoardModal";
import { EntryRow } from "./EntryRow";

interface Props {
  summary: MonthlyMoneySummary;
  categories: MoneyCategoryDisplay[];
  navOptions: MonthNavOption[];
  lifetime: LifetimeMoneyStats;
  hoursBoardPreview: HoursBoardImportPreview | null;
  view?: ViewMode;
  currency: CurrencyOption;
}

const INITIAL_ENTRY_COUNT = 6;

function getNavHrefs(view: ViewMode, summary: MonthlyMoneySummary, currencyCode: string) {
  const cur = `&currency=${currencyCode}`;
  if (view === "week") {
    const prev = shiftWeek(summary.monthKey, -1);
    const next = shiftWeek(summary.monthKey, 1);
    return {
      prevHref: `/dashboard/moneyboard?view=week&date=${prev}${cur}`,
      nextHref: `/dashboard/moneyboard?view=week&date=${next}${cur}`,
      hasNext: next <= todayDateStr(),
    };
  }
  if (view === "fortnight") {
    const prev = shiftFortnight(summary.monthKey, -1);
    const next = shiftFortnight(summary.monthKey, 1);
    return {
      prevHref: `/dashboard/moneyboard?view=fortnight&date=${prev}${cur}`,
      nextHref: `/dashboard/moneyboard?view=fortnight&date=${next}${cur}`,
      hasNext: next <= todayDateStr(),
    };
  }
  const prev = shiftMonth(summary.monthKey, -1);
  const next = shiftMonth(summary.monthKey, 1);
  return {
    prevHref: `/dashboard/moneyboard?month=${prev}${cur}`,
    nextHref: `/dashboard/moneyboard?month=${next}${cur}`,
    hasNext: next <= currentMonthKey(),
  };
}

export function MoneyBoardOverview({
  summary,
  categories,
  navOptions,
  lifetime,
  hoursBoardPreview,
  view = "month",
  currency,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [entryModal, setEntryModal] = useState<{ open: boolean; kind: "income" | "expense" }>({
    open: false,
    kind: "expense",
  });
  const [importOpen, setImportOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");

  const setCurrency = (c: CurrencyOption) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("currency", c.code);
    router.push(`${pathname}?${params.toString()}`);
  };

  const isEmpty = summary.totalCount === 0;
  const nav = getNavHrefs(view, summary, currency.code);

  // Filter entries by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return summary.groups;
    const q = search.toLowerCase();
    return summary.groups
      .map((g) => ({
        ...g,
        entries: g.entries.filter(
          (e) =>
            e.note?.toLowerCase().includes(q) ||
            e.category.label.toLowerCase().includes(q) ||
            e.amount.toFixed(2).includes(q)
        ),
      }))
      .filter((g) => g.entries.length > 0);
  }, [summary.groups, search]);

  const filteredCount = filteredGroups.reduce((s, g) => s + g.entries.length, 0);

  // Slice entry groups by row count for "show more"
  const visibleGroups = showAll
    ? filteredGroups
    : sliceGroupsByEntryCount(filteredGroups, INITIAL_ENTRY_COUNT);
  const visibleCount = visibleGroups.reduce((s, g) => s + g.entries.length, 0);
  const hiddenCount = filteredCount - visibleCount;

  return (
    <div className="md:grid md:grid-cols-5 md:gap-6">
      {/* ── LEFT (60%) ── */}
      <div className="md:col-span-3 flex flex-col pb-4 md:pb-0">
        {/* View toggle + currency selector */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-1 p-1 bg-paper rounded-[12px]">
            {(["month", "fortnight", "week"] as const).map((v) => (
              <Link
                key={v}
                href={
                  v === "month"
                    ? `/dashboard/moneyboard?currency=${currency.code}`
                    : `/dashboard/moneyboard?view=${v}&currency=${currency.code}`
                }
                className={cn(
                  "flex-1 h-9 rounded-[9px] text-[12px] font-semibold flex items-center justify-center transition-all capitalize",
                  view === v
                    ? "bg-white text-ink shadow-sm"
                    : "text-subtle hover:text-ink"
                )}
              >
                {v === "fortnight" ? "Fortnight" : v === "week" ? "Week" : "Month"}
              </Link>
            ))}
          </div>
          <CurrencySelector currency={currency} onChange={setCurrency} />
        </div>

        {/* Overview card */}
        <OverviewCard
          summary={summary}
          prevHref={nav.prevHref}
          nextHref={nav.nextHref}
          hasPrev={true}
          hasNext={nav.hasNext}
          currency={currency}
        />

        {/* Quick add */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            type="button"
            onClick={() => setEntryModal({ open: true, kind: "income" })}
            className="h-[54px] rounded-[10px] bg-sage text-paper font-medium text-[14px] flex items-center justify-center gap-2 hover:bg-sage-deep transition-colors shadow-btn"
          >
            <PlusIcon />
            Income
          </button>
          <button
            type="button"
            onClick={() => setEntryModal({ open: true, kind: "expense" })}
            className="h-[54px] rounded-[10px] bg-white text-ink font-medium text-[14px] border border-border flex items-center justify-center gap-2 hover:border-sage/40 hover:text-sage transition-colors"
          >
            <PlusIcon />
            Expense
          </button>
        </div>

        {/* Mobile-only: condensed breakdown right under quick add */}
        {!isEmpty && (
          <div className="md:hidden mt-4">
            <BreakdownCard summary={summary} compact currency={currency} />
          </div>
        )}

        {/* Search + entries header */}
        <div className="mt-8 mb-3 flex flex-col gap-3">
          {summary.totalCount > 0 && (
            <div className="relative">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowAll(false); }}
                placeholder="Search entries…"
                className="w-full h-10 pl-9 pr-3 rounded-[11px] border border-border-soft bg-white text-[13px] text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ghost hover:text-ink"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] font-semibold font-mono uppercase tracking-[0.18em] text-muted">
              {search ? "Search results" : "Recent entries"}
            </div>
            <div className="text-[12px] text-faint">
              {search
                ? `${filteredCount} of ${summary.totalCount}`
                : `${summary.totalCount} ${summary.totalCount === 1 ? "entry" : "entries"}`}
            </div>
          </div>
        </div>

        {/* Entries — empty state OR grouped list */}
        {isEmpty ? (
          <EmptyState
            onAddExpense={() => setEntryModal({ open: true, kind: "expense" })}
            onAddIncome={() => setEntryModal({ open: true, kind: "income" })}
            onImport={hoursBoardPreview && !hoursBoardPreview.alreadyImported
              ? () => setImportOpen(true)
              : null}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {visibleGroups.map((g) => (
              <div key={g.date}>
                <div className="text-[11px] font-mono text-faint tracking-wide px-1 mb-1.5">
                  {formatDayHeader(g.date)}
                </div>
                <div className="flex flex-col">
                  {g.entries.map((entry, i) => {
                    const position =
                      g.entries.length === 1
                        ? "single"
                        : i === 0
                          ? "top"
                          : i === g.entries.length - 1
                            ? "bottom"
                            : "middle";
                    return (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        categories={categories}
                        position={position}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="w-full py-3.5 border border-dashed border-border rounded-[10px] text-[13px] text-muted hover:text-ink hover:border-sage/40 transition-colors"
              >
                Show {hiddenCount} earlier {hiddenCount === 1 ? "entry" : "entries"}
              </button>
            )}

            {hoursBoardPreview && !hoursBoardPreview.alreadyImported && (
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="w-full py-3 mt-1 border border-border bg-white rounded-[10px] text-[12px] font-medium text-muted hover:text-sage hover:border-sage/40 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                Import latest pay period from HoursBoard
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT (40%) — desktop only ── */}
      <div className="hidden md:block md:col-span-2 mt-0">
        <div className="md:sticky md:top-6 flex flex-col gap-4">
          {/* This month summary */}
          <ThisMonthCard summary={summary} currency={currency} />

          {/* Breakdown */}
          {!isEmpty && summary.breakdown.length > 0 && (
            <BreakdownCard summary={summary} currency={currency} />
          )}

          {/* Across all time */}
          {lifetime.months > 1 && <LifetimeCard lifetime={lifetime} currency={currency} />}
        </div>
      </div>

      {/* Mobile-only stacked extras */}
      <div className="md:hidden mt-6 flex flex-col gap-4">
        {!isEmpty && <ThisMonthCard summary={summary} currency={currency} />}
        {lifetime.months > 1 && <LifetimeCard lifetime={lifetime} currency={currency} />}
      </div>

      {/* Modals */}
      <EntryModal
        open={entryModal.open}
        onClose={() => setEntryModal((s) => ({ ...s, open: false }))}
        categories={categories}
        initialKind={entryModal.kind}
        defaultCurrency={currency}
      />
      <ImportHoursBoardModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        preview={hoursBoardPreview}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function OverviewCard({
  summary,
  prevHref,
  nextHref,
  hasPrev,
  hasNext,
  currency,
}: {
  summary: MonthlyMoneySummary;
  prevHref: string;
  nextHref: string;
  hasPrev: boolean;
  hasNext: boolean;
  currency: CurrencyOption;
}) {
  const isEmpty = summary.totalCount === 0;
  const positive = summary.net >= 0;

  return (
    <div className="bg-white border border-border-soft rounded-[14px] px-6 py-5 md:px-7 md:py-6 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint">
          Current month
        </div>
        <div className="flex items-center gap-1.5">
          <NavBtn href={prevHref} disabled={!hasPrev} dir="prev" />
          <NavBtn href={nextHref} disabled={!hasNext} dir="next" />
        </div>
      </div>

      <div className="flex items-baseline gap-3.5 mt-1">
        <div className="text-[26px] md:text-[30px] font-semibold tracking-tight text-ink leading-tight">
          {summary.monthLabel}
        </div>
        <div className="text-[12px] md:text-[13px] font-mono text-muted">
          {summary.monthRange}
        </div>
      </div>

      <div className="mt-6 md:mt-7">
        <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint mb-1.5">
          Net balance
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div
            className={cn(
              "font-mono font-semibold tracking-tight leading-none text-[40px] md:text-[48px]",
              isEmpty ? "text-faint" : positive ? "text-sage" : "text-[#8A3F2E]"
            )}
          >
            {isEmpty
              ? `${currency.symbol}0${currency.code === "JPY" ? "" : ".00"}`
              : formatMoney(summary.net, { signed: true, currency })}
          </div>
          {!isEmpty && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium mb-1",
                positive
                  ? "bg-sage/10 text-sage-deep"
                  : "bg-[#EFDFD9] text-[#5A2A1F]"
              )}
            >
              {positive ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 6 17 18 5 18" />
                  <polyline points="20 9 12 17 8 13 4 17" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 18 17 6 5 6" />
                  <polyline points="20 15 12 7 8 11 4 7" />
                </svg>
              )}
              {positive ? "positive" : "negative"}
            </div>
          )}
        </div>
        {isEmpty && (
          <div className="text-[13px] text-muted mt-2">
            Nothing logged yet for this month
          </div>
        )}
      </div>

      {!isEmpty && (
        <div className="mt-6 grid grid-cols-2 bg-[#EFE9DC] rounded-[8px] px-5 py-4">
          <div className="border-r border-border-soft pr-5">
            <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint mb-1.5">
              Money in
            </div>
            <div className="text-[20px] md:text-[22px] font-mono font-semibold text-sage tracking-tight">
              {formatMoney(summary.totalIncome, { currency })}
            </div>
            <div className="text-[12px] text-muted mt-1">
              {summary.incomeCount} {summary.incomeCount === 1 ? "entry" : "entries"}
            </div>
          </div>
          <div className="pl-5">
            <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint mb-1.5">
              Money out
            </div>
            <div className="text-[20px] md:text-[22px] font-mono font-semibold text-[#8A3F2E] tracking-tight">
              {formatMoney(summary.totalExpenses, { currency })}
            </div>
            <div className="text-[12px] text-muted mt-1">
              {summary.expenseCount} {summary.expenseCount === 1 ? "entry" : "entries"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThisMonthCard({ summary, currency }: { summary: MonthlyMoneySummary; currency: CurrencyOption }) {
  return (
    <div className="bg-white border border-border-soft rounded-[14px] px-6 py-5 shadow-card">
      <div className="flex justify-between items-baseline mb-3">
        <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint">
          This month
        </div>
        <div className="text-[10px] font-mono text-muted">{summary.monthLabel}</div>
      </div>
      <SummaryRow label="Total income" value={formatMoney(summary.totalIncome, { currency })} valueColor="sage" />
      <SummaryRow label="Total expenses" value={formatMoney(summary.totalExpenses, { currency })} valueColor="red" />
      <div className="h-px bg-border-soft my-2" />
      <SummaryRow
        label="Net balance"
        value={formatMoney(summary.net, { signed: true, currency })}
        valueColor={summary.net >= 0 ? "sage" : "red"}
        bold
      />
      {summary.savingsRate !== null && (
        <SummaryRow
          label="Savings rate"
          value={`${summary.savingsRate}%`}
          muted
        />
      )}
    </div>
  );
}

function BreakdownCard({
  summary,
  compact = false,
  currency,
}: {
  summary: MonthlyMoneySummary;
  compact?: boolean;
  currency: CurrencyOption;
}) {
  const { breakdown, totalExpenses } = summary;
  if (breakdown.length === 0) return null;

  return (
    <div className="bg-white border border-border-soft rounded-[14px] px-6 py-5 shadow-card">
      <div className="flex justify-between items-baseline mb-4">
        <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint">
          Breakdown
        </div>
        <div className="text-[10px] font-mono text-muted">
          expenses · {formatMoney(totalExpenses, { currency })}
        </div>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-[#EFE9DC]">
        {breakdown.map((b) => (
          <div
            key={b.categoryId}
            style={{ width: `${b.percent}%`, backgroundColor: b.color }}
            title={`${b.label} ${b.percent}%`}
          />
        ))}
      </div>

      {!compact ? (
        <div className="flex flex-col mt-4">
          {breakdown.map((b, i) => (
            <div
              key={b.categoryId}
              className={cn(
                "grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-2",
                i < breakdown.length - 1 && "border-b border-border-soft"
              )}
            >
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: b.color }}
              />
              <div className="text-[13px] text-ink truncate">{b.label}</div>
              <div className="text-[12px] font-mono text-muted tabular-nums">
                {b.percent}%
              </div>
              <div className="text-[13px] font-mono text-ink tabular-nums">
                {formatMoney(b.total, { currency })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-3 gap-y-2 mt-3">
          {breakdown.slice(0, 3).map((b) => (
            <div key={b.categoryId} className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-sm"
                style={{ backgroundColor: b.color }}
              />
              <span className="text-[11px] text-muted">
                {b.label} {Math.round(b.percent)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LifetimeCard({ lifetime, currency }: { lifetime: LifetimeMoneyStats; currency: CurrencyOption }) {
  return (
    <div className="bg-white border border-border-soft rounded-[14px] px-6 py-4 shadow-card">
      <div className="flex justify-between items-baseline mb-3">
        <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint">
          Across all time
        </div>
        <div className="text-[10px] font-mono text-muted">
          {lifetime.months} {lifetime.months === 1 ? "month" : "months"}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Income" value={formatMoney(lifetime.totalIncome, { currency })} color="sage" />
        <MiniStat label="Expenses" value={formatMoney(lifetime.totalExpenses, { currency })} color="red" />
        <MiniStat label="Net" value={formatMoney(lifetime.net, { signed: true, currency })} color="ink" />
      </div>
    </div>
  );
}

function EmptyState({
  onAddIncome,
  onAddExpense,
  onImport,
}: {
  onAddIncome: () => void;
  onAddExpense: () => void;
  onImport: (() => void) | null;
}) {
  return (
    <div className="bg-white border border-dashed border-border rounded-[12px] p-8 md:p-10 text-center">
      <div className="w-12 h-12 rounded-full bg-[#EFE9DC] flex items-center justify-center mx-auto mb-4 text-muted">
        <PlusIcon size={20} />
      </div>
      <div className="text-[16px] font-semibold text-ink mb-1.5">
        Start a month of tracking
      </div>
      <p className="text-[13px] text-muted leading-relaxed max-w-[340px] mx-auto mb-5">
        Add your first income or expense. If you&apos;ve finished a pay period in
        HoursBoard, pull it in to start.
      </p>
      <div className="inline-flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onAddIncome}
          className="h-10 px-4 rounded-[10px] bg-sage text-paper text-[13px] font-medium flex items-center gap-1.5 hover:bg-sage-deep transition-colors"
        >
          <PlusIcon size={14} />
          Income
        </button>
        <button
          type="button"
          onClick={onAddExpense}
          className="h-10 px-4 rounded-[10px] bg-white text-ink border border-border text-[13px] font-medium flex items-center gap-1.5 hover:border-sage/40 transition-colors"
        >
          <PlusIcon size={14} />
          Expense
        </button>
        {onImport && (
          <button
            type="button"
            onClick={onImport}
            className="h-10 px-3.5 rounded-[10px] bg-transparent text-ink border border-border text-[13px] font-medium flex items-center gap-1.5 hover:border-sage/40 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            Import from HoursBoard
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tiny helpers ─────────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  valueColor = "ink",
  bold,
  muted,
}: {
  label: string;
  value: string;
  valueColor?: "ink" | "sage" | "red";
  bold?: boolean;
  muted?: boolean;
}) {
  const colorClass =
    valueColor === "sage"
      ? "text-sage"
      : valueColor === "red"
        ? "text-[#8A3F2E]"
        : "text-ink";
  return (
    <div className="flex items-center justify-between py-2">
      <span className={cn("text-[13px]", muted ? "text-muted" : "text-ink/80")}>{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums tracking-tight",
          bold ? "text-[17px] font-semibold" : "text-[14px] font-medium",
          colorClass
        )}
      >
        {value}
      </span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "sage" | "red" | "ink";
}) {
  return (
    <div>
      <div className="text-[9px] font-semibold font-mono uppercase tracking-[0.16em] text-faint mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-[15px] md:text-[16px] font-mono font-semibold tracking-tight tabular-nums",
          color === "sage" ? "text-sage" : color === "red" ? "text-[#8A3F2E]" : "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function NavBtn({
  href,
  disabled,
  dir,
}: {
  href: string;
  disabled?: boolean;
  dir: "prev" | "next";
}) {
  const arrow =
    dir === "prev" ? (
      <polyline points="15 18 9 12 15 6" />
    ) : (
      <polyline points="9 18 15 12 9 6" />
    );
  if (disabled) {
    return (
      <span className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-pale opacity-40">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {arrow}
        </svg>
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted hover:text-ink hover:border-sage/40 transition-colors"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {arrow}
      </svg>
    </Link>
  );
}

function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function sliceGroupsByEntryCount<T extends { entries: unknown[] }>(
  groups: T[],
  count: number
): T[] {
  const out: T[] = [];
  let total = 0;
  for (const g of groups) {
    if (total >= count) break;
    out.push(g);
    total += g.entries.length;
  }
  return out;
}
