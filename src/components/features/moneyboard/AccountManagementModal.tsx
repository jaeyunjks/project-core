"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AccountOverview, FinancialAccountDisplay } from "@/types";
import type { AccountType, CurrencyOption } from "@/domain/moneyboard";
import { currentSydneyDateTime, formatEntryDate, formatMoney, parseAmountInput, sanitizeAmountInput } from "@/domain/moneyboard";
import { ArchiveIcon, PencilIcon, RowIconButton } from "./RowIcons";
import { cn } from "@/lib/utils";
import { archiveFinancialAccountAction, createAccountTransferAction, createFinancialAccountAction, updateFinancialAccountAction } from "@/server/actions/moneyboard";

interface Props {
  open: boolean;
  onClose: () => void;
  overview: AccountOverview;
  currency: CurrencyOption;
}

const TYPE_LABEL: Record<AccountType, string> = { everyday: "Everyday", bills: "Bills", savings: "Savings", other: "Other" };

export function AccountManagementModal({ open, onClose, overview, currency }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FinancialAccountDisplay | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("everyday");
  const [opening, setOpening] = useState("0");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const now = currentSydneyDateTime();
  const [date, setDate] = useState(now.date);
  const [time, setTime] = useState(now.time);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFromId(overview.accounts[0]?.id ?? "");
    setToId(overview.accounts[1]?.id ?? "");
  }, [open, overview.accounts]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const activeAccounts = overview.accounts.filter((account) => !account.archived);

  const resetEditor = () => { setEditing(null); setName(""); setType("everyday"); setOpening("0"); };
  const beginEdit = (account: FinancialAccountDisplay) => {
    setEditing(account); setName(account.name); setType(account.type); setOpening(String(account.openingBalance)); setError(null);
  };
  const saveAccount = () => {
    const openingBalance = Number(opening);
    if (!name.trim()) return setError("Account name is required.");
    if (!Number.isFinite(openingBalance)) return setError("Opening balance is invalid.");
    const form = new FormData();
    if (editing) form.set("id", editing.id);
    form.set("name", name.trim()); form.set("type", type); form.set("openingBalance", String(openingBalance)); form.set("currency", currency.code);
    startTransition(async () => {
      const result = editing ? await updateFinancialAccountAction(form) : await createFinancialAccountAction(form);
      if (!result.ok) return setError(result.error);
      resetEditor(); router.refresh();
    });
  };
  const archive = (account: FinancialAccountDisplay) => {
    if (!window.confirm(`Archive ${account.name}? Its history and balance will be preserved.`)) return;
    const form = new FormData(); form.set("id", account.id); form.set("archived", "true");
    startTransition(async () => { const result = await archiveFinancialAccountAction(form); if (!result.ok) setError(result.error); else router.refresh(); });
  };
  const transfer = () => {
    const amount = parseAmountInput(transferAmount, currency);
    if (!fromId || !toId) return setError("Choose both transfer accounts.");
    if (!(amount > 0)) return setError("Transfer amount must be greater than zero.");
    const form = new FormData();
    form.set("fromAccountId", fromId); form.set("toAccountId", toId); form.set("amount", String(amount)); form.set("date", date); form.set("time", time); form.set("note", transferNote);
    startTransition(async () => {
      const result = await createAccountTransferAction(form);
      if (!result.ok) return setError(result.error);
      setTransferAmount(""); setTransferNote(""); router.refresh();
    });
  };

  const sameAccount = !!fromId && fromId === toId;

  return (
    <div role="dialog" aria-modal="true" aria-label="Financial accounts" className="fixed inset-0 z-[60] bg-ink/45 p-0 pt-[env(safe-area-inset-top)] sm:p-4 overflow-hidden flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-full sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain scroll-pb-24 bg-paper rounded-t-[22px] sm:rounded-[22px] shadow-lg px-4 sm:px-5 md:px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 md:pb-6" onClick={(event) => event.stopPropagation()}>
        {/* Sticky so Close stays reachable however far the sheet is scrolled. */}
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6 pt-4 sm:pt-5 md:pt-6 pb-3 bg-paper flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[19px] font-semibold tracking-tight text-ink">Accounts & transfers</h2>
            <p className="text-[12px] text-muted mt-0.5 truncate">Openings + transactions + internal transfers</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close accounts" className="w-10 h-10 rounded-full bg-white border border-border-soft text-muted text-[18px] shrink-0">×</button>
        </div>

        <div className="grid grid-cols-3 bg-white border border-border-soft rounded-[14px] shadow-card divide-x divide-border-soft">
          <Stat label="All accounts" value={formatMoney(overview.totalRecordedBalance, { currency })} />
          <Stat label="Savings" value={formatMoney(overview.totalSavings, { currency })} />
          <Stat label="Actual saved" value={formatMoney(overview.actualSavingsContributions, { currency })} />
        </div>

        <div className="flex items-center justify-between mt-4 mb-2 px-1">
          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">Accounts</div>
          <span className="text-[11px] font-mono text-faint">{activeAccounts.length} active</span>
        </div>
        <div className="bg-white border border-border-soft rounded-[16px] shadow-card overflow-hidden">
          {overview.accounts.map((account, index) => (
            <div key={account.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 px-3.5 py-2", index < overview.accounts.length - 1 && "border-b border-border-soft", account.archived && "opacity-55")}>
              <div className="truncate text-[14px] font-medium text-ink" title={account.name}>{account.name}</div>
              <span className="whitespace-nowrap text-right text-[14px] font-mono font-semibold tabular-nums text-ink">{formatMoney(account.currentBalance, { currency })}</span>
              <div className="truncate text-[11.5px] font-mono text-muted">{TYPE_LABEL[account.type]} · {account.transactionCount} txn{account.transactionCount === 1 ? "" : "s"}{account.archived ? " · Archived" : ""}</div>
              <div className="flex items-center justify-end gap-1 min-h-8">
                {!account.archived && (
                  <>
                    <RowIconButton label={`Edit ${account.name}`} hint="Edit" onClick={() => beginEdit(account)}><PencilIcon /></RowIconButton>
                    <RowIconButton label={`Archive ${account.name}`} hint="Archive" tone="danger" onClick={() => archive(account)} disabled={pending}><ArchiveIcon /></RowIconButton>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {overview.unassignedTransactionCount > 0 && (
          <p className="flex items-start gap-1.5 mt-2 px-1 text-[11.5px] leading-snug text-subtle">
            <svg className="shrink-0 mt-px" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v.01M12 11v5" /></svg>
            <span>{overview.unassignedTransactionCount} legacy transaction{overview.unassignedTransactionCount === 1 ? " is" : "s are"} unassigned. Edit them from Transaction history to choose an account.</span>
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <section aria-labelledby="account-form-title" className="bg-white border border-border-soft rounded-[16px] shadow-card p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div id="account-form-title" className="truncate text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">{editing ? `Edit ${editing.name}` : "New account"}</div>
              {editing && <button type="button" onClick={resetEditor} className="shrink-0 -my-2 h-8 px-2 text-[12px] font-semibold text-muted hover:text-ink">Cancel</button>}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)] items-end gap-2 mt-2">
              <label className={fieldLabel}>Name
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Everyday" autoComplete="off" className={fieldControl} />
              </label>
              <label className={fieldLabel}>Type
                <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className={fieldControl}>{Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              </label>
              <label className={fieldLabel} title="Starting point before linked MoneyBoard activity">Opening balance
                <input value={opening} onChange={(e) => setOpening(e.target.value)} inputMode="decimal" aria-describedby="opening-hint" className={cn(fieldControl, "font-mono")} />
                <span id="opening-hint" className="sr-only">Starting point before linked MoneyBoard activity.</span>
              </label>
              <button type="button" disabled={pending} onClick={saveAccount} className="h-10 rounded-[10px] bg-sage text-white text-[13px] font-semibold disabled:opacity-50">{editing ? "Save" : "Add account"}</button>
            </div>
          </section>

          <section aria-labelledby="transfer-form-title" className="bg-white border border-border-soft rounded-[16px] shadow-card p-3.5">
            <div id="transfer-form-title" className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">Internal transfer</div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-1.5 mt-2">
              <label className={fieldLabel}>From
                <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={fieldControl}><option value="">Choose</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
              </label>
              <span aria-hidden className="h-10 flex items-center text-faint">→</span>
              <label className={fieldLabel}>To
                <select value={toId} onChange={(e) => setToId(e.target.value)} className={fieldControl}><option value="">Choose</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
              </label>
            </div>
            {sameAccount && <p role="status" className="text-[11.5px] text-[#8A3F2E] mt-1.5">Choose two different accounts.</p>}
            <label className={cn(fieldLabel, "block mt-2")}>Amount
              <input value={transferAmount} onChange={(e) => setTransferAmount(sanitizeAmountInput(e.target.value, currency))} inputMode="decimal" placeholder={`${currency.symbol}0.00`} className={cn(fieldControl, "h-11 font-mono text-[18px] font-semibold")} />
            </label>
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 mt-2">
              <label className={fieldLabel}>Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(fieldControl, dateControl)} />
              </label>
              <label className={fieldLabel}>Time
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={cn(fieldControl, dateControl)} />
              </label>
            </div>
            <div className="grid grid-cols-1 min-[360px]:grid-cols-[minmax(0,1fr)_auto] items-end gap-2 mt-2">
              <label className={fieldLabel}>Note <span className="normal-case tracking-normal font-normal">· optional</span>
                <input value={transferNote} onChange={(e) => setTransferNote(e.target.value)} className={fieldControl} />
              </label>
              <button type="button" disabled={pending || activeAccounts.length < 2 || sameAccount} onClick={transfer} className="h-10 px-4 rounded-[10px] bg-ink text-white text-[13px] font-semibold disabled:opacity-40">Record transfer</button>
            </div>
          </section>
        </div>

        {error && <div role="alert" className="mt-3 px-3 py-2 rounded-[10px] bg-[#F1DDD5] text-[#8A3F2E] text-[13px]">{error}</div>}

        {overview.recentTransfers.length > 0 && (
          <section className="mt-4">
            <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint mb-2 px-1">Recent transfers</div>
            <div className="bg-white border border-border-soft rounded-[16px] shadow-card overflow-hidden">
              {overview.recentTransfers.map((transfer, index) => (
                <div key={transfer.id} className={cn("flex items-center gap-2.5 px-3.5 py-2.5", index < overview.recentTransfers.length - 1 && "border-b border-border-soft")}>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[13.5px] font-medium text-ink">{transfer.fromAccountName} → {transfer.toAccountName}</div>
                    <div className="truncate text-[11.5px] font-mono text-muted">{formatEntryDate(transfer.date, currency.locale)} {transfer.time}</div>
                  </div>
                  <span className="whitespace-nowrap text-[14px] font-mono font-semibold tabular-nums text-ink">{formatMoney(transfer.amount, { currency })}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const fieldLabel = "min-w-0 text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-faint";
// Mobile inputs are forced to 16px (globals.css, prevents iOS focus zoom), which
// is too wide for date + time side by side below 360px — those stack.
const dateControl = "px-2 [&::-webkit-calendar-picker-indicator]:ml-0.5 [&::-webkit-calendar-picker-indicator]:p-0";
const fieldControl = "mt-1 w-full min-w-0 h-10 px-2.5 rounded-[10px] border border-border-soft bg-paper text-[14px] normal-case tracking-normal font-sans font-normal text-ink outline-none focus:border-sage";

function Stat({ label, value }: { label: string; value: string }) {
  // A long figure may wrap, but only after the currency symbol ("A$ / 987,483.77").
  const digit = value.search(/\d/);
  return <div className="min-w-0 px-2 py-2 sm:px-2.5"><div className="truncate text-[9px] font-semibold font-mono uppercase tracking-[0.1em] text-faint">{label}</div><div className="text-[13px] font-mono font-semibold tabular-nums text-ink mt-0.5 [overflow-wrap:break-word]">{digit > 0 ? <>{value.slice(0, digit)}<wbr />{value.slice(digit)}</> : value}</div></div>;
}
