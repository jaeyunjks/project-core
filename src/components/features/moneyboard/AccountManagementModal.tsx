"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AccountOverview, FinancialAccountDisplay } from "@/types";
import type { AccountType, CurrencyOption } from "@/domain/moneyboard";
import { currentSydneyDateTime, formatMoney, parseAmountInput, sanitizeAmountInput } from "@/domain/moneyboard";
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

  return (
    <div role="dialog" aria-modal="true" aria-label="Financial accounts" className="fixed inset-0 z-[60] bg-ink/45 p-0 pt-[env(safe-area-inset-top)] sm:p-4 overflow-hidden flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-full sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain bg-paper rounded-t-[22px] sm:rounded-[22px] shadow-lg p-4 sm:p-5 md:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 md:pb-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div><h2 className="text-[21px] font-semibold tracking-tight text-ink">Accounts & transfers</h2><p className="text-[13px] text-muted mt-1">Balances come from openings, transactions, and atomic internal transfers.</p></div>
          <button type="button" onClick={onClose} aria-label="Close accounts" className="w-10 h-10 rounded-full bg-white border border-border-soft text-muted shrink-0">×</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Stat label="All accounts" value={formatMoney(overview.totalRecordedBalance, { currency })} />
          <Stat label="Total savings" value={formatMoney(overview.totalSavings, { currency })} />
          <Stat label="Actual saved" value={formatMoney(overview.actualSavingsContributions, { currency })} />
        </div>

        {overview.unassignedTransactionCount > 0 && <div className="mb-3 px-3 py-2.5 rounded-[11px] bg-sand-tint border border-border-soft text-[12.5px] text-muted">{overview.unassignedTransactionCount} legacy transaction{overview.unassignedTransactionCount === 1 ? " is" : "s are"} unassigned. Edit them from Transaction history to choose an account.</div>}

        <div className="bg-white border border-border-soft rounded-[16px] shadow-card overflow-hidden">
          {overview.accounts.map((account, index) => (
            <div key={account.id} className={cn("px-4 py-3 flex flex-col items-start gap-2 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between min-[390px]:gap-3", index < overview.accounts.length - 1 && "border-b border-border-soft", account.archived && "opacity-55")}>
              <div className="min-w-0"><div className="text-[14px] font-medium text-ink break-words [overflow-wrap:anywhere]">{account.name}</div><div className="text-[11.5px] text-muted mt-0.5">{TYPE_LABEL[account.type]} · {account.transactionCount} transaction{account.transactionCount === 1 ? "" : "s"}{account.archived ? " · Archived" : ""}</div></div>
              <div className="w-full min-[390px]:w-auto flex flex-wrap items-center gap-2"><span className="mr-auto min-[390px]:mr-0 text-[14px] font-mono font-semibold text-ink break-all">{formatMoney(account.currentBalance, { currency })}</span>{!account.archived && <button type="button" onClick={() => beginEdit(account)} className="h-10 px-3 rounded-[10px] bg-paper text-[12px] font-semibold">Edit</button>}{!account.archived && <button type="button" onClick={() => archive(account)} className="h-10 px-2 text-[12px] font-semibold text-[#8A3F2E]">Archive</button>}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <section className="bg-white border border-border-soft rounded-[16px] shadow-card p-4">
            <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">{editing ? "Edit account" : "New account"}</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" className="mt-3 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] text-ink outline-none focus:border-sage" />
            <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-2 mt-2">
              <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className="h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] text-ink">{Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <input value={opening} onChange={(e) => setOpening(e.target.value)} inputMode="decimal" placeholder="Opening balance" className="h-10 px-3 rounded-[10px] border border-border-soft bg-paper font-mono text-[14px] text-ink" />
            </div>
            <p className="text-[11px] text-subtle mt-2">Opening balance is the starting point before linked MoneyBoard activity.</p>
            <div className="flex gap-2 mt-3">{editing && <button type="button" onClick={resetEditor} className="h-10 px-3 rounded-[10px] border border-border-soft text-[13px]">Cancel</button>}<button type="button" disabled={pending} onClick={saveAccount} className="flex-1 h-10 rounded-[10px] bg-sage text-white text-[13px] font-semibold disabled:opacity-50">{editing ? "Save account" : "Add account"}</button></div>
          </section>

          <section className="bg-white border border-border-soft rounded-[16px] shadow-card p-4">
            <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">Internal transfer</div>
            <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-2 mt-3">
              <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="h-10 px-2 rounded-[10px] border border-border-soft bg-paper text-[13px]"><option value="">From</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
              <select value={toId} onChange={(e) => setToId(e.target.value)} className="h-10 px-2 rounded-[10px] border border-border-soft bg-paper text-[13px]"><option value="">To</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
            </div>
            <input value={transferAmount} onChange={(e) => setTransferAmount(sanitizeAmountInput(e.target.value, currency))} inputMode="decimal" placeholder={`${currency.symbol}0.00`} className="mt-2 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper font-mono text-[14px]" />
            <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-2 mt-2"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 min-w-0 px-2 rounded-[10px] border border-border-soft bg-paper font-mono text-[12px]" /><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 min-w-0 px-2 rounded-[10px] border border-border-soft bg-paper font-mono text-[12px]" /></div>
            <input value={transferNote} onChange={(e) => setTransferNote(e.target.value)} placeholder="Optional note" className="mt-2 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[13px]" />
            <button type="button" disabled={pending || activeAccounts.length < 2} onClick={transfer} className="mt-3 w-full h-10 rounded-[10px] bg-ink text-white text-[13px] font-semibold disabled:opacity-40">Record transfer</button>
          </section>
        </div>

        {error && <div className="mt-3 px-3 py-2 rounded-[10px] bg-[#F1DDD5] text-[#8A3F2E] text-[13px]">{error}</div>}

        {overview.recentTransfers.length > 0 && <section className="mt-4"><div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint mb-2">Recent transfers</div>{overview.recentTransfers.map((transfer) => <div key={transfer.id} className="flex flex-col gap-1 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between py-2 border-b border-border-soft text-[12.5px]"><span className="text-muted break-words [overflow-wrap:anywhere]">{transfer.fromAccountName} → {transfer.toAccountName} · {transfer.date} {transfer.time}</span><span className="font-mono font-semibold text-ink shrink-0">{formatMoney(transfer.amount, { currency })}</span></div>)}</section>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 bg-white border border-border-soft rounded-[13px] p-3"><div className="text-[9px] font-mono uppercase tracking-wider text-faint break-words">{label}</div><div className="text-[14px] font-mono font-semibold text-ink mt-1 break-all">{value}</div></div>;
}
