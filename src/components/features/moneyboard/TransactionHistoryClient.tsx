"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { FinancialAccountDisplay, MoneyCategoryDisplay, MoneyEntryDisplay, RecurringBillDisplay, TransactionHistoryPage } from "@/types";
import type { CurrencyOption } from "@/domain/moneyboard";
import { formatMoney } from "@/domain/moneyboard";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./CategoryIcon";
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
    return <div className="bg-white border border-dashed border-border rounded-[16px] p-10 text-center"><div className="text-[16px] font-semibold text-ink">No matching transactions</div><p className="text-[13px] text-muted mt-1.5">Try widening the dates or clearing a filter.</p></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[12px] text-muted">{history.total} transaction{history.total === 1 ? "" : "s"}</span>
        <span className="text-[11px] font-mono text-faint">Page {history.page} of {history.totalPages}</span>
      </div>
      <div className="bg-white border border-border-soft rounded-[16px] shadow-card overflow-hidden">
        {history.entries.map((entry, index) => (
          <div key={entry.id} className={cn("p-4 md:px-5 flex items-start gap-3", index < history.entries.length - 1 && "border-b border-border-soft")}>
            <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center shrink-0"><CategoryIcon icon={entry.category.icon} size={17} color={entry.category.color} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-1 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between min-[390px]:gap-3">
                <div className="min-w-0">
                  <div className="text-[14.5px] font-medium leading-snug text-ink break-words [overflow-wrap:anywhere]">{entry.note?.trim() || entry.category.label}</div>
                  <div className="text-[11.5px] text-muted mt-1 font-mono leading-relaxed break-words [overflow-wrap:anywhere]">{entry.date} · {entry.occurrenceTimeKnown ? entry.time : "Time not recorded"} · {entry.category.label}</div>
                  <div className="text-[11.5px] text-subtle mt-0.5 break-words">{entry.account?.name ?? "Unassigned legacy entry"}</div>
                </div>
                <div className={cn("text-[15px] font-mono font-semibold shrink-0", entry.kind === "income" ? "text-sage" : "text-ink")}>
                  {entry.kind === "income" ? "+" : "−"}{formatMoney(entry.amount, { currency })}
                </div>
              </div>
              <div className="flex gap-2 mt-2.5">
                <button type="button" onClick={() => setEditing(entry)} className="h-10 px-3 rounded-[10px] bg-paper text-[12px] font-semibold text-ink hover:text-sage">Edit</button>
                <button type="button" disabled={pendingId === entry.id} onClick={() => remove(entry)} className="h-10 px-3 rounded-[10px] text-[12px] font-semibold text-[#8A3F2E] hover:bg-[#8A3F2E]/8 disabled:opacity-40">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {history.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          {history.page > 1 ? <Link href={pageHref(history.page - 1)} className="h-10 px-4 rounded-[11px] bg-white border border-border-soft flex items-center text-[13px] font-semibold text-ink">Previous</Link> : <span />}
          {history.page < history.totalPages && <Link href={pageHref(history.page + 1)} className="h-10 px-4 rounded-[11px] bg-sage text-white flex items-center text-[13px] font-semibold">Next</Link>}
        </div>
      )}
      <EntryModal open={!!editing} onClose={() => setEditing(null)} categories={categories} accounts={accounts} bills={bills} editEntry={editing} defaultCurrency={currency} />
    </>
  );
}
