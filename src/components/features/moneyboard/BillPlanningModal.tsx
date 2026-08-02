"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RecurringBillDisplay } from "@/types";
import type { BudgetPeriodType, CurrencyOption } from "@/domain/moneyboard";
import { cn } from "@/lib/utils";
import { formatMoney, sanitizeAmountInput, parseAmountInput } from "@/domain/moneyboard";
import {
  createRecurringBillAction,
  updateRecurringBillAction,
  deleteRecurringBillAction,
} from "@/server/actions/moneyboard";

interface Props {
  open: boolean;
  onClose: () => void;
  bills: RecurringBillDisplay[];
  currency: CurrencyOption;
}

const CADENCE_LABEL: Record<BudgetPeriodType, string> = {
  week: "Weekly",
  fortnight: "Fortnightly",
  month: "Monthly",
};

const CADENCES: BudgetPeriodType[] = ["week", "fortnight", "month"];

const DAY_SUFFIX = ["th", "st", "nd", "rd"];
function ordinalDay(n: number): string {
  const v = n % 100;
  return n + (DAY_SUFFIX[(v - 20) % 10] || DAY_SUFFIX[v] || DAY_SUFFIX[0]);
}

function billDueLabel(bill: RecurringBillDisplay): string | null {
  if (bill.cadence === "month" && bill.dueDay) return `Due ${ordinalDay(bill.dueDay)}`;
  return null;
}

export function BillPlanningModal({ open, onClose, bills, currency }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftCadence, setDraftCadence] = useState<BudgetPeriodType>("fortnight");
  const [draftDueDay, setDraftDueDay] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setEditing(null);
    setDraftName("");
    setDraftAmount("");
    setDraftCadence("fortnight");
    setDraftDueDay("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const startEdit = (bill: RecurringBillDisplay) => {
    setEditing(bill.id);
    setDraftName(bill.name);
    setDraftAmount(String(bill.amount));
    setDraftCadence(bill.cadence);
    setDraftDueDay(bill.dueDay ? String(bill.dueDay) : "");
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraftName("");
    setDraftAmount("");
    setDraftCadence("fortnight");
    setDraftDueDay("");
  };

  const submit = () => {
    setError(null);
    const amt = parseAmountInput(draftAmount, currency);
    if (!draftName.trim()) return setError("Give the bill a name.");
    if (!(amt > 0)) return setError("Amount must be greater than zero.");

    const fd = new FormData();
    fd.set("name", draftName.trim());
    fd.set("amount", String(amt));
    fd.set("currency", currency.code);
    fd.set("cadence", draftCadence);
    if (draftCadence === "month" && draftDueDay.trim()) {
      fd.set("dueDay", draftDueDay.trim());
    }
    if (editing) fd.set("id", editing);

    startTransition(async () => {
      const result = editing
        ? await updateRecurringBillAction(fd)
        : await createRecurringBillAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      cancelEdit();
      router.refresh();
    });
  };

  const remove = (id: string) => {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const result = await deleteRecurringBillAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (editing === id) cancelEdit();
      router.refresh();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bill planning"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4 md:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[calc(100vh-2rem)] md:max-h-[90vh] overflow-y-auto bg-paper rounded-[22px] shadow-lg p-5 md:p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[20px] font-semibold tracking-tight text-ink">Bill planning</div>
            <div className="text-[13px] text-muted mt-1">
              Recurring bills auto-fill your next matching plan.
            </div>
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

        {/* List */}
        <div className="bg-white border border-border-soft rounded-[16px] shadow-card overflow-hidden">
          {bills.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[14px] font-medium text-ink">No bills yet</p>
              <p className="text-[12.5px] text-muted mt-1.5">
                Add a bill below to have it auto-included in matching plans.
              </p>
            </div>
          ) : (
            bills.map((b, i) => (
              <div
                key={b.id}
                className={cn(
                  "flex items-center justify-between px-4 py-3",
                  i < bills.length - 1 && "border-b border-border-soft",
                )}
              >
                <div className="min-w-0 mr-3">
                  <div className="text-[14.5px] font-medium text-ink truncate">{b.name}</div>
                  <div className="text-[11.5px] font-mono text-muted mt-0.5">
                    {CADENCE_LABEL[b.cadence]} · {formatMoney(b.amount, { currency })}
                    {billDueLabel(b) && <> · {billDueLabel(b)}</>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(b)}
                    className="h-8 px-3 rounded-full bg-paper text-[12px] font-semibold text-ink hover:bg-sage/10 hover:text-sage transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(b.id)}
                    disabled={pending}
                    aria-label={`Delete ${b.name}`}
                    className="w-8 h-8 rounded-full text-pale hover:text-[#8A3F2E] flex items-center justify-center disabled:opacity-40"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        <div className="bg-white border border-border-soft rounded-[16px] shadow-card p-4 md:p-5 mt-3">
          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">
            {editing ? "Edit bill" : "Add a bill"}
          </div>

          <label className="block mt-3">
            <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-faint">Name</span>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Gym membership"
              className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <label className="block">
              <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-faint">Amount</span>
              <div className="mt-1.5 flex items-baseline gap-1.5 h-10 px-3 rounded-[10px] border border-border-soft bg-paper focus-within:border-sage focus-within:ring-[3px] focus-within:ring-sage/10 transition-all">
                <span className="text-[14px] font-mono font-semibold text-ink">{currency.symbol}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(sanitizeAmountInput(e.target.value, currency))}
                  placeholder="0"
                  className="flex-1 min-w-0 bg-transparent text-[14px] font-mono font-semibold text-ink outline-none placeholder:text-pale"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-faint">Cadence</span>
              <select
                value={draftCadence}
                onChange={(e) => {
                  setDraftCadence(e.target.value as BudgetPeriodType);
                  setDraftDueDay("");
                }}
                className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all appearance-none"
              >
                {CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {CADENCE_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {draftCadence === "month" && (
            <label className="block mt-3">
              <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-faint">
                Day of month <span className="text-pale font-normal normal-case tracking-normal">· optional</span>
              </span>
              <input
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                value={draftDueDay}
                onChange={(e) => setDraftDueDay(e.target.value)}
                placeholder="e.g. 15"
                className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] font-mono font-semibold text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
              />
              <p className="text-[11.5px] text-subtle mt-1.5">
                1–31 — the day the bill is charged each month.
              </p>
            </label>
          )}

          {error && (
            <div className="mt-3 text-[13px] text-[#8A3F2E] bg-[#F1DDD5] border border-[#E4C8BD] rounded-[10px] px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            {editing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="h-11 px-4 rounded-[12px] bg-white border border-border-soft text-[13px] font-semibold text-ink hover:border-sage/40 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="flex-1 h-11 rounded-[12px] bg-sage text-white text-[14px] font-semibold shadow-btn hover:bg-sage-deep transition-colors disabled:opacity-60"
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Add bill"}
            </button>
          </div>
        </div>

        <p className="text-[12px] text-subtle mt-3 px-1">
          Bills marked <span className="font-mono font-semibold">{CADENCE_LABEL.fortnight}</span> auto-fill
          when you plan a fortnight, and so on. Adjust amounts per plan as needed.
        </p>
      </div>
    </div>
  );
}
