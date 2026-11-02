"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface Props {
  values: {
    q?: string;
    kind?: string;
    category?: string;
    account?: string;
    start: string;
    end: string;
    sort: string;
  };
  currency: string;
  view: string;
  categories: Option[];
  accounts: Option[];
}

const KIND_OPTIONS: Option[] = [
  { value: "", label: "All types" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expenses" },
];
const SORT_OPTIONS: Option[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount-high", label: "Amount high to low" },
  { value: "amount-low", label: "Amount low to high" },
];

const fieldLabel = "min-w-0 text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-faint";
// Mobile inputs are forced to 16px (globals.css, prevents iOS focus zoom), which
// is too wide for two date pickers side by side below 360px — those stack.
const dateControl = "px-2 [&::-webkit-calendar-picker-indicator]:ml-0.5 [&::-webkit-calendar-picker-indicator]:p-0";
const dateField = "col-span-2 min-[360px]:col-span-1";
const fieldControl = "mt-1 w-full min-w-0 h-10 px-2.5 rounded-[10px] border border-border-soft bg-paper text-[13.5px] normal-case tracking-normal font-sans font-normal text-ink outline-none focus:border-sage";

/**
 * Search stays visible; the rest folds behind "Filters" on phones. Collapsing
 * only hides the panel — its fields stay mounted, so values persist and submit.
 */
export function TransactionFilters({ values, currency, view, categories, accounts }: Props) {
  const [open, setOpen] = useState(false);

  const base = { start: values.start, end: values.end, currency, view };
  const hrefWithout = (key: keyof Props["values"]) => {
    const params = new URLSearchParams(base);
    for (const k of ["q", "kind", "category", "account", "sort"] as const) {
      const v = values[k];
      if (k !== key && v && !(k === "sort" && v === "newest")) params.set(k, v);
    }
    return `?${params.toString()}`;
  };

  const labelOf = (options: Option[], value?: string) => options.find((o) => o.value === value)?.label ?? value;
  const chips = [
    values.kind && { key: "kind" as const, label: labelOf(KIND_OPTIONS, values.kind) },
    values.category && { key: "category" as const, label: labelOf(categories, values.category) },
    values.account && { key: "account" as const, label: values.account === "unassigned" ? "Unassigned" : labelOf(accounts, values.account) },
    values.sort !== "newest" && { key: "sort" as const, label: labelOf(SORT_OPTIONS, values.sort) },
  ].filter((chip): chip is { key: "kind" | "category" | "account" | "sort"; label: string } => !!chip);

  return (
    <form className="bg-white border border-border-soft rounded-[16px] shadow-card p-2.5 md:p-4 mb-3">
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="view" value={view} />

      <div className="flex items-center gap-2">
        <label className="relative flex-1 min-w-0">
          <span className="sr-only">Search descriptions</span>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={values.q}
            placeholder="Search descriptions"
            enterKeyHint="search"
            className="w-full h-10 pl-9 pr-3 rounded-[10px] border border-border-soft bg-paper text-[14px] text-ink outline-none focus:border-sage"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="transaction-filters"
          className={cn(
            "md:hidden shrink-0 h-10 px-3 rounded-[10px] border flex items-center gap-1.5 text-[13px] font-semibold",
            open ? "bg-sage-tint border-sage-border text-sage" : "bg-white border-border-soft text-ink",
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters
          {chips.length > 0 && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-sage text-white text-[11px] font-mono flex items-center justify-center" aria-label={`${chips.length} active`}>
              {chips.length}
            </span>
          )}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="md:hidden flex flex-wrap gap-1.5 mt-2">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={hrefWithout(chip.key)}
              aria-label={`Remove filter: ${chip.label}`}
              className="max-w-full h-7 pl-2.5 pr-2 rounded-full bg-sage-tint border border-sage-border text-sage text-[12px] font-semibold flex items-center gap-1"
            >
              <span className="truncate">{chip.label}</span>
              <span aria-hidden className="text-[13px] leading-none">×</span>
            </Link>
          ))}
        </div>
      )}

      <div
        id="transaction-filters"
        className={cn(
          "grid-cols-2 lg:grid-cols-4 gap-x-2 gap-y-2.5 mt-2.5 pt-2.5 border-t border-border-soft md:grid md:mt-3 md:pt-3 md:gap-3",
          open ? "grid" : "hidden",
        )}
      >
        <label className={fieldLabel}>Type
          <select name="kind" defaultValue={values.kind ?? ""} className={fieldControl}>
            {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className={fieldLabel}>Sort
          <select name="sort" defaultValue={values.sort} className={fieldControl}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className={fieldLabel}>Category
          <select name="category" defaultValue={values.category ?? ""} className={fieldControl}>
            <option value="">All categories</option>
            {categories.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className={fieldLabel}>Account
          <select name="account" defaultValue={values.account ?? ""} className={fieldControl}>
            <option value="">All accounts</option>
            <option value="unassigned">Unassigned legacy entries</option>
            {accounts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className={cn(fieldLabel, dateField)}>From
          <input type="date" name="start" defaultValue={values.start} className={cn(fieldControl, dateControl)} />
        </label>
        <label className={cn(fieldLabel, dateField)}>To
          <input type="date" name="end" defaultValue={values.end} min={values.start} className={cn(fieldControl, dateControl)} />
        </label>
        <div className="col-span-2 lg:col-span-4 flex items-center justify-end gap-2">
          <Link
            href={`?${new URLSearchParams(base).toString()}`}
            className="h-10 px-3.5 rounded-[10px] border border-border-soft flex items-center text-[13px] font-semibold text-muted hover:text-ink"
          >
            Clear
          </Link>
          <button type="submit" className="h-10 px-5 rounded-[10px] bg-sage text-white text-[13px] font-semibold hover:bg-sage-deep">
            Apply
          </button>
        </div>
      </div>
    </form>
  );
}
