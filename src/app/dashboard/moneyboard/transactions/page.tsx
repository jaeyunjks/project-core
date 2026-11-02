import Link from "next/link";
import { getCurrentUser, getCategories, getAccountOverview, getRecurringBills, getTransactionHistory } from "@/server/queries/moneyboard";
import { CURRENCIES, DEFAULT_CURRENCY, derivePeriodEnd, todayDateStr } from "@/domain/moneyboard";
import { TransactionHistoryClient } from "@/components/features/moneyboard/TransactionHistoryClient";

export const metadata = { title: "Transaction history — MoneyBoard" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransactionHistoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const currency = CURRENCIES.find((item) => item.code === one(params.currency)?.toUpperCase()) ?? DEFAULT_CURRENCY;
  const start = /^\d{4}-\d{2}-\d{2}$/.test(one(params.start) ?? "") ? one(params.start)! : todayDateStr();
  const end = /^\d{4}-\d{2}-\d{2}$/.test(one(params.end) ?? "") ? one(params.end)! : derivePeriodEnd("fortnight", start);
  const kindRaw = one(params.kind);
  const kind = kindRaw === "income" || kindRaw === "expense" ? kindRaw : undefined;
  const sortRaw = one(params.sort);
  const sort = sortRaw === "oldest" || sortRaw === "amount-high" || sortRaw === "amount-low" ? sortRaw : "newest";
  const page = Math.max(1, Number(one(params.page)) || 1);

  const [history, categories, accountOverview, bills] = await Promise.all([
    getTransactionHistory(user.id, {
      start,
      end,
      currency: currency.code,
      kind,
      categoryId: one(params.category) || undefined,
      accountId: one(params.account) || undefined,
      search: one(params.q)?.trim() || undefined,
      sort,
      page,
      pageSize: 25,
    }),
    getCategories(user.id),
    getAccountOverview(user.id, currency.code, true),
    getRecurringBills(user.id, currency.code),
  ]);

  const backAnchor = one(params.view) === "week" ? "wk" : one(params.view) === "month" ? "mo" : "fn";
  const backHref = `/dashboard/moneyboard?view=${encodeURIComponent(one(params.view) ?? "fortnight")}&${backAnchor}=${start}&currency=${currency.code}`;

  return (
    <div className="px-5 py-5 max-w-6xl mx-auto md:px-8 md:py-8">
      <div className="flex items-start gap-3 mb-6 min-w-0">
        <Link href={backHref} className="w-10 h-10 rounded-full bg-white border border-border-soft flex items-center justify-center text-muted hover:text-ink" aria-label="Back to MoneyBoard">←</Link>
        <div className="min-w-0">
          <h1 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-ink break-words">Transaction history</h1>
          <p className="text-[13px] text-muted mt-1 break-words">Every recorded income and expense from {start} to {end}</p>
        </div>
      </div>

      <form className="bg-white border border-border-soft rounded-[16px] shadow-card p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input type="hidden" name="currency" value={currency.code} />
        <input type="hidden" name="view" value={one(params.view) ?? "fortnight"} />
        <label className="text-[11px] font-mono uppercase tracking-wider text-faint">Search
          <input name="q" defaultValue={one(params.q)} placeholder="Description" className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] normal-case tracking-normal font-sans text-ink outline-none focus:border-sage" />
        </label>
        <label className="text-[11px] font-mono uppercase tracking-wider text-faint">Type
          <select name="kind" defaultValue={kind ?? ""} className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] normal-case tracking-normal font-sans text-ink">
            <option value="">All types</option><option value="income">Income</option><option value="expense">Expenses</option>
          </select>
        </label>
        <label className="text-[11px] font-mono uppercase tracking-wider text-faint">Category
          <select name="category" defaultValue={one(params.category) ?? ""} className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] normal-case tracking-normal font-sans text-ink">
            <option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.label} · {category.kind}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-mono uppercase tracking-wider text-faint">Account
          <select name="account" defaultValue={one(params.account) ?? ""} className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] normal-case tracking-normal font-sans text-ink">
            <option value="">All accounts</option><option value="unassigned">Unassigned legacy entries</option>{accountOverview.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.archived ? " (archived)" : ""}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-mono uppercase tracking-wider text-faint">From
          <input type="date" name="start" defaultValue={start} className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] normal-case tracking-normal text-ink" />
        </label>
        <label className="text-[11px] font-mono uppercase tracking-wider text-faint">To
          <input type="date" name="end" defaultValue={end} min={start} className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] normal-case tracking-normal text-ink" />
        </label>
        <label className="text-[11px] font-mono uppercase tracking-wider text-faint">Sort
          <select name="sort" defaultValue={sort} className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[14px] normal-case tracking-normal font-sans text-ink">
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount-high">Amount high to low</option><option value="amount-low">Amount low to high</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="flex-1 h-10 rounded-[10px] bg-sage text-white text-[13px] font-semibold">Apply filters</button>
          <Link href={`/dashboard/moneyboard/transactions?start=${start}&end=${end}&currency=${currency.code}&view=${one(params.view) ?? "fortnight"}`} className="h-10 px-3 rounded-[10px] border border-border-soft flex items-center text-[13px] font-semibold text-muted">Clear</Link>
        </div>
      </form>

      <TransactionHistoryClient history={history} categories={categories} accounts={accountOverview.accounts} bills={bills} currency={currency} />
    </div>
  );
}
