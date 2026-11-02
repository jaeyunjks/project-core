"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinancialAccountDisplay, MoneyCategoryDisplay, MoneyEntryDisplay, RecurringBillDisplay, TransactionHistoryPage } from "@/types";
import type { CurrencyOption } from "@/domain/moneyboard";
import { TransactionRow } from "./TransactionRow";
import { EntryModal } from "./EntryModal";
import { deleteMoneyEntryAction } from "@/server/actions/moneyboard";

interface Props {
  history: TransactionHistoryPage;
  categories: MoneyCategoryDisplay[];
  accounts: FinancialAccountDisplay[];
  currency: CurrencyOption;
  bills: RecurringBillDisplay[];
}

export function TransactionHistoryClient({ history, categories, accounts, bills, currency }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<MoneyEntryDisplay | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const pageHref = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `?${params.toString()}`;
  };

  const remove = (entry: MoneyEntryDisplay) => {
    if (!window.confirm(`Delete “${entry.note?.trim() || entry.category.label}”? This cannot be undone.`)) return;
    const form = new FormData();
    form.set("id", entry.id);
    setPendingId(entry.id);
    startTransition(async () => {
      await deleteMoneyEntryAction(form);
      setPendingId(null);
      router.refresh();
    });
  };

  if (history.total === 0) {
    return <div className="bg-white border border-dashed border-border rounded-[16px] p-8 text-center"><div className="text-[15px] font-semibold text-ink">No matching transactions</div><p className="text-[13px] text-muted mt-1">Try widening the dates or clearing a filter.</p></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2 px-1 text-[12px] text-muted">
        <span>{history.total} transaction{history.total === 1 ? "" : "s"}</span>
        {history.totalPages > 1 && <span className="font-mono text-[11px] text-faint">Page {history.page} of {history.totalPages}</span>}
      </div>
      <div className="bg-white border border-border-soft rounded-[16px] shadow-card overflow-hidden">
        {history.entries.map((entry, index) => (
          <TransactionRow
            key={entry.id}
            entry={entry}
            currency={currency}
            onEdit={() => setEditing(entry)}
            onDelete={() => remove(entry)}
            deleting={pendingId === entry.id}
            divider={index < history.entries.length - 1}
          />
        ))}
      </div>
      {history.totalPages > 1 && (
        <nav aria-label="Transaction pages" className="flex items-center justify-between gap-2 mt-3">
          {history.page > 1 ? <Link href={pageHref(history.page - 1)} className="h-9 px-3.5 rounded-[10px] bg-white border border-border-soft flex items-center text-[13px] font-semibold text-ink">‹ Previous</Link> : <span />}
          <span className="font-mono text-[11px] text-faint">{history.page} / {history.totalPages}</span>
          {history.page < history.totalPages ? <Link href={pageHref(history.page + 1)} className="h-9 px-3.5 rounded-[10px] bg-sage text-white flex items-center text-[13px] font-semibold">Next ›</Link> : <span />}
        </nav>
      )}
      <EntryModal open={!!editing} onClose={() => setEditing(null)} categories={categories} accounts={accounts} bills={bills} editEntry={editing} defaultCurrency={currency} />
    </>
  );
}
