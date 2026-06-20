"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PayPeriodDisplay, PayPeriodDayDisplay, PayPeriodSummary } from "@/types";
import { AWARD_LABELS, getDefaultPayRate } from "@/lib/hoursboard";
import { formatCurrency, formatHours, cn } from "@/lib/utils";
import { saveWorksheetAction, createNextPayPeriodAction } from "@/app/actions/hoursboard";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RowState {
  id: string;
  workHours: number;
  payAwardType: string;
  payRate: number;
  notes: string;
  estimatedPay: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dayToRow(d: PayPeriodDayDisplay): RowState {
  return {
    id: d.id,
    workHours: d.workHours,
    payAwardType: d.payAwardType,
    payRate: d.payRate,
    notes: d.notes ?? "",
    estimatedPay: d.estimatedPay,
  };
}

function rowsToSummary(rows: RowState[]): PayPeriodSummary {
  const worked = rows.filter((r) => r.workHours > 0);
  const totalHours = rows.reduce((s, r) => s + r.workHours, 0);
  const estimatedGross = rows.reduce((s, r) => s + r.estimatedPay, 0);
  return {
    totalHours: Math.round(totalHours * 100) / 100,
    estimatedGross: Math.round(estimatedGross * 100) / 100,
    workedDays: worked.length,
    avgHoursPerWorkedDay:
      worked.length > 0
        ? Math.round((totalHours / worked.length) * 100) / 100
        : 0,
  };
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ summary, baseRate }: { summary: PayPeriodSummary; baseRate: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border-soft rounded-[14px] overflow-hidden border border-border-soft">
      {[
        { label: "Total Hours", value: formatHours(summary.totalHours) },
        { label: "Est. Gross", value: formatCurrency(summary.estimatedGross), accent: true },
        { label: "Days Worked", value: String(summary.workedDays) },
        { label: "Avg Hrs / Day", value: summary.avgHoursPerWorkedDay > 0 ? formatHours(summary.avgHoursPerWorkedDay) : "—" },
      ].map((item) => (
        <div key={item.label} className="bg-white px-4 py-3">
          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost mb-0.5">
            {item.label}
          </div>
          <div className={cn("text-[22px] font-semibold font-mono", item.accent ? "text-sage" : "text-ink")}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Award type select ─────────────────────────────────────────────────────────

function AwardSelect({
  value,
  baseRate,
  onChange,
}: {
  value: string;
  baseRate: number;
  onChange: (type: string, rate: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const type = e.target.value;
        const rate = type === "custom" ? baseRate : getDefaultPayRate(type, baseRate);
        onChange(type, rate);
      }}
      className="h-8 px-2 rounded-[8px] border border-border bg-white text-[12px] text-ink font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
    >
      {Object.entries(AWARD_LABELS).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </select>
  );
}

// ── Hours input ───────────────────────────────────────────────────────────────

function HoursInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (h: number) => void;
}) {
  const [raw, setRaw] = useState(value > 0 ? String(value) : "");

  const commit = () => {
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 0 && n <= 24) onChange(Math.round(n * 100) / 100);
    else if (raw === "" || raw === "0") onChange(0);
    else setRaw(value > 0 ? String(value) : "");
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={raw}
      placeholder="0"
      onChange={(e) => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
      className="w-16 h-8 px-2 rounded-[8px] border border-border bg-white text-[13px] font-mono text-ink text-right focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage placeholder:text-ghost"
    />
  );
}

// ── Desktop table row ─────────────────────────────────────────────────────────

function DesktopRow({
  day,
  row,
  baseRate,
  onRowChange,
}: {
  day: PayPeriodDayDisplay;
  row: RowState;
  baseRate: number;
  onRowChange: (id: string, patch: Partial<RowState>) => void;
}) {
  const isWeekend = day.isWeekend;

  return (
    <tr className={cn("group border-b border-border-soft last:border-0", day.isToday && "bg-sage/[0.04]")}>
      {/* Date */}
      <td className="py-2.5 pr-3 pl-4">
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-[13px] font-semibold", isWeekend ? "text-subtle" : "text-ink")}>
            {day.dayLabel}
          </span>
          <span className={cn("font-mono text-[13px]", isWeekend ? "text-ghost" : "text-subtle")}>
            {day.dayNumber} {day.monthLabel}
          </span>
          {day.isToday && (
            <span className="text-[9px] font-semibold uppercase tracking-widest text-sage bg-sage/10 px-1.5 py-0.5 rounded-full">
              Today
            </span>
          )}
        </div>
      </td>

      {/* Hours */}
      <td className="py-2.5 pr-3">
        <HoursInput
          value={row.workHours}
          onChange={(h) => {
            const estimatedPay = Math.round(h * row.payRate * 100) / 100;
            onRowChange(row.id, { workHours: h, estimatedPay });
          }}
        />
      </td>

      {/* Award type */}
      <td className="py-2.5 pr-3">
        <AwardSelect
          value={row.payAwardType}
          baseRate={baseRate}
          onChange={(type, rate) => {
            const estimatedPay = Math.round(row.workHours * rate * 100) / 100;
            onRowChange(row.id, { payAwardType: type, payRate: rate, estimatedPay });
          }}
        />
      </td>

      {/* Rate */}
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-1">
          <span className="text-[12px] text-ghost font-mono">£</span>
          <input
            type="text"
            inputMode="decimal"
            value={row.payRate > 0 ? String(row.payRate) : ""}
            placeholder="0.00"
            onChange={(e) => {
              const rate = parseFloat(e.target.value);
              if (!isNaN(rate) && rate >= 0) {
                const estimatedPay = Math.round(row.workHours * rate * 100) / 100;
                onRowChange(row.id, { payRate: rate, payAwardType: "custom", estimatedPay });
              }
            }}
            className="w-[72px] h-8 px-2 rounded-[8px] border border-border bg-white text-[13px] font-mono text-ink text-right focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage placeholder:text-ghost"
          />
        </div>
      </td>

      {/* Est. pay */}
      <td className="py-2.5 pr-3 text-right">
        <span className={cn("text-[14px] font-semibold font-mono", row.estimatedPay > 0 ? "text-sage" : "text-ghost")}>
          {row.estimatedPay > 0 ? formatCurrency(row.estimatedPay) : "—"}
        </span>
      </td>

      {/* Notes */}
      <td className="py-2.5 pr-4">
        <input
          type="text"
          value={row.notes}
          onChange={(e) => onRowChange(row.id, { notes: e.target.value })}
          placeholder="Notes…"
          className="w-full h-8 px-2.5 rounded-[8px] border border-border bg-white text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage placeholder:text-ghost/60"
        />
      </td>
    </tr>
  );
}

// ── Mobile day card ───────────────────────────────────────────────────────────

function MobileCard({
  day,
  row,
  baseRate,
  onRowChange,
}: {
  day: PayPeriodDayDisplay;
  row: RowState;
  baseRate: number;
  onRowChange: (id: string, patch: Partial<RowState>) => void;
}) {
  return (
    <div className={cn(
      "bg-white border rounded-[14px] p-4",
      day.isToday ? "border-sage/40 ring-1 ring-sage/20" : "border-border-soft"
    )}>
      {/* Date header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-[14px] font-semibold", day.isWeekend ? "text-subtle" : "text-ink")}>
            {day.dayLabel} {day.dayNumber} {day.monthLabel}
          </span>
          {day.isToday && (
            <span className="text-[9px] font-semibold uppercase tracking-widest text-sage bg-sage/10 px-1.5 py-0.5 rounded-full">
              Today
            </span>
          )}
        </div>
        <span className={cn("text-[15px] font-semibold font-mono", row.estimatedPay > 0 ? "text-sage" : "text-ghost")}>
          {row.estimatedPay > 0 ? formatCurrency(row.estimatedPay) : "—"}
        </span>
      </div>

      {/* Inputs row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <HoursInput
            value={row.workHours}
            onChange={(h) => {
              const estimatedPay = Math.round(h * row.payRate * 100) / 100;
              onRowChange(row.id, { workHours: h, estimatedPay });
            }}
          />
          <span className="text-[11px] text-ghost">hrs</span>
        </div>
        <AwardSelect
          value={row.payAwardType}
          baseRate={baseRate}
          onChange={(type, rate) => {
            const estimatedPay = Math.round(row.workHours * rate * 100) / 100;
            onRowChange(row.id, { payAwardType: type, payRate: rate, estimatedPay });
          }}
        />
        <div className="flex items-center gap-0.5">
          <span className="text-[11px] text-ghost font-mono">£</span>
          <input
            type="text"
            inputMode="decimal"
            value={row.payRate > 0 ? String(row.payRate) : ""}
            placeholder="0.00"
            onChange={(e) => {
              const rate = parseFloat(e.target.value);
              if (!isNaN(rate) && rate >= 0) {
                const estimatedPay = Math.round(row.workHours * rate * 100) / 100;
                onRowChange(row.id, { payRate: rate, payAwardType: "custom", estimatedPay });
              }
            }}
            className="w-[68px] h-8 px-2 rounded-[8px] border border-border bg-white text-[13px] font-mono text-ink text-right focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage placeholder:text-ghost"
          />
        </div>
      </div>

      {/* Notes */}
      <input
        type="text"
        value={row.notes}
        onChange={(e) => onRowChange(row.id, { notes: e.target.value })}
        placeholder="Notes…"
        className="mt-2.5 w-full h-8 px-2.5 rounded-[8px] border border-border bg-paper/60 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage placeholder:text-ghost/60"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  period: PayPeriodDisplay;
  baseRate: number;
  prevPeriodId: string | null;
  nextPeriodId: string | null;
  isLatest: boolean;
}

export function PayPeriodWorksheet({ period, baseRate, prevPeriodId, nextPeriodId, isLatest }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<RowState[]>(() => period.days.map(dayToRow));
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const onRowChange = useCallback((id: string, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
    setIsDirty(true);
    setSaveStatus("idle");
  }, []);

  const handleSave = () => {
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        await saveWorksheetAction(
          rows.map((r) => ({
            id: r.id,
            workHours: r.workHours,
            payAwardType: r.payAwardType,
            payRate: r.payRate,
            notes: r.notes.trim() || null,
          }))
        );
        setIsDirty(false);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } catch {
        setSaveStatus("error");
      }
    });
  };

  const handleNewPeriod = () => {
    startTransition(async () => {
      try {
        const result = await createNextPayPeriodAction();
        router.push(`/dashboard/hoursboard?period=${result.id}`);
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Could not create pay period.");
      }
    });
  };

  const summary = rowsToSummary(rows);

  return (
    <div className="flex flex-col gap-5">
      {/* Live summary */}
      <SummaryBar summary={summary} baseRate={baseRate} />

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-border-soft rounded-[16px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-soft">
              {["Date", "Hours", "Award Type", "Rate", "Est. Pay", "Notes"].map((h) => (
                <th
                  key={h}
                  className={cn(
                    "py-2.5 text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost font-normal",
                    h === "Est. Pay" ? "text-right pr-3" : "pl-4 text-left"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {period.days.map((day, i) => (
              <DesktopRow
                key={day.id}
                day={day}
                row={rows[i]}
                baseRate={baseRate}
                onRowChange={onRowChange}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-2.5">
        {period.days.map((day, i) => (
          <MobileCard
            key={day.id}
            day={day}
            row={rows[i]}
            baseRate={baseRate}
            onRowChange={onRowChange}
          />
        ))}
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-6">
        {/* New period */}
        {isLatest && (
          <button
            onClick={handleNewPeriod}
            disabled={isPending}
            className="h-10 px-4 rounded-[13px] border border-border bg-white text-[13px] font-semibold text-ink hover:border-sage/40 transition-colors disabled:opacity-40"
          >
            + New Pay Period
          </button>
        )}
        <div className="flex-1" />

        {/* Save status hint */}
        {saveStatus === "saved" && (
          <span className="text-[12px] text-sage font-medium">Saved</span>
        )}
        {saveStatus === "error" && (
          <span className="text-[12px] text-red-500 font-medium">Save failed</span>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isDirty || saveStatus === "saving"}
          className={cn(
            "h-10 px-5 rounded-[13px] text-[13px] font-semibold transition-all",
            isDirty
              ? "bg-sage text-white shadow-[0_4px_12px_rgba(62,91,77,0.22)] hover:bg-sage/90"
              : "bg-sage/20 text-sage/60 cursor-default",
            "disabled:cursor-default"
          )}
        >
          {saveStatus === "saving" ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
