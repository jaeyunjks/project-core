"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FinancialAccountDisplay, MoneyCategoryDisplay, RecurringBillDisplay } from "@/types";
import type { CurrencyOption } from "@/domain/moneyboard";
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
  accounts?: FinancialAccountDisplay[];
  categories?: MoneyCategoryDisplay[];
}

type BillCadence = "week" | "fortnight" | "month" | "year";

const CADENCE_LABEL: Record<BillCadence, string> = {
  week: "Weekly",
  fortnight: "Fortnightly",
  month: "Monthly",
  year: "Yearly",
};

const CADENCES: BillCadence[] = ["week", "fortnight", "month", "year"];

const DAY_SUFFIX = ["th", "st", "nd", "rd"];
function ordinalDay(n: number): string {
  const v = n % 100;
  return n + (DAY_SUFFIX[(v - 20) % 10] || DAY_SUFFIX[v] || DAY_SUFFIX[0]);
}

function billDueLabel(bill: RecurringBillDisplay): string | null {
  if (bill.cadence === "month" && bill.dueDay) return `Due ${ordinalDay(bill.dueDay)}`;
  return null;
}

export function BillPlanningModal({ open, onClose, bills, currency, accounts = [], categories = [] }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftCadence, setDraftCadence] = useState<BillCadence>("fortnight");
  const [draftDueDay, setDraftDueDay] = useState("");
  const [draftNextDate, setDraftNextDate] = useState("");
  const [draftAccountId, setDraftAccountId] = useState("");
  const [draftCategoryId, setDraftCategoryId] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftActive, setDraftActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setEditing(null);
    setDraftName("");
    setDraftAmount("");
    setDraftCadence("fortnight");
    setDraftDueDay("");
    setDraftNextDate("");
    setDraftAccountId("");
    setDraftCategoryId("");
    setDraftDescription("");
    setDraftActive(true);
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
    setDraftNextDate(bill.nextPaymentDate ?? "");
    setDraftAccountId(bill.accountId ?? "");
    setDraftCategoryId(bill.categoryId ?? "");
    setDraftDescription(bill.description ?? "");
    setDraftActive(bill.active);
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraftName("");
    setDraftAmount("");
    setDraftCadence("fortnight");
    setDraftDueDay("");
    setDraftNextDate("");
    setDraftAccountId("");
    setDraftCategoryId("");
    setDraftDescription("");
    setDraftActive(true);
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
    fd.set("nextPaymentDate", draftNextDate);
    fd.set("accountId", draftAccountId);
    fd.set("categoryId", draftCategoryId);
    fd.set("description", draftDescription);
    fd.set("active", String(draftActive));
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
    const bill = bills.find((item) => item.id === id);
    if (!window.confirm(`Delete ${bill?.name ?? "this bill"}? Existing transactions will be preserved.`)) return;
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
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/45 p-0 pt-[env(safe-area-inset-top)] sm:p-4 md:p-6 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-full sm:max-h-[calc(100dvh-2rem)] md:max-h-[90vh] overflow-y-auto overscroll-contain bg-paper rounded-t-[22px] sm:rounded-[22px] shadow-lg p-4 sm:p-5 md:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 md:pb-6"
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
            className="w-10 h-10 rounded-full bg-white border border-border-soft flex items-center justify-center text-muted hover:text-ink shrink-0"
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
                  "flex items-start justify-between gap-3 px-4 py-3",
                  i < bills.length - 1 && "border-b border-border-soft",
                )}
              >
                <div className="min-w-0 mr-1 sm:mr-3">
                  <div className="text-[14.5px] font-medium text-ink break-words [overflow-wrap:anywhere]">{b.name}</div>
                  <div className="text-[11.5px] font-mono text-muted mt-0.5 break-words [overflow-wrap:anywhere]">
                    {CADENCE_LABEL[b.cadence]} · {formatMoney(b.amount, { currency })}
                    {billDueLabel(b) && <> · {billDueLabel(b)}</>}
                  </div>
                  <div className="text-[11px] text-subtle mt-0.5">
                    {b.accountName ?? "No payment account"}{b.categoryName ? ` · ${b.categoryName}` : ""}{!b.active ? " · Inactive" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(b)}
                    className="h-10 px-3 rounded-full bg-paper text-[12px] font-semibold text-ink hover:bg-sage/10 hover:text-sage transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(b.id)}
                    disabled={pending}
                    aria-label={`Delete ${b.name}`}
                    className="w-10 h-10 rounded-full text-pale hover:text-[#8A3F2E] flex items-center justify-center disabled:opacity-40"
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

          <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-3 mt-3">
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
                  setDraftCadence(e.target.value as BillCadence);
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <label className="block">
              <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-faint">Next payment <span className="font-normal normal-case tracking-normal">· optional</span></span>
              <input type="date" value={draftNextDate} onChange={(e) => setDraftNextDate(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] font-mono text-ink outline-none focus:border-sage" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-faint">Payment account</span>
              <select value={draftAccountId} onChange={(e) => setDraftAccountId(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] text-ink outline-none focus:border-sage">
                <option value="">Not assigned</option>
                {accounts.filter((a) => !a.archived && a.currency === currency.code).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
          </div>

          <label className="block mt-3">
            <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-faint">Budget category</span>
            <select value={draftCategoryId} onChange={(e) => setDraftCategoryId(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] text-ink outline-none focus:border-sage">
              <option value="">Not assigned</option>
              {categories.filter((c) => c.kind === "expense").map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </label>

          <label className="block mt-3">
            <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.12em] text-faint">Description <span className="font-normal normal-case tracking-normal">· optional</span></span>
            <input type="text" value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] text-ink outline-none focus:border-sage" />
          </label>

          <label className="flex items-center gap-2 mt-3 text-[13px] text-ink">
            <input type="checkbox" checked={draftActive} onChange={(e) => setDraftActive(e.target.checked)} className="accent-sage" />
            Active bill
          </label>

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
          when you plan a fortnight, and so on. A payment date is optional; planning coverage does not create a transaction.
        </p>
      </div>
    </div>
  );
}
