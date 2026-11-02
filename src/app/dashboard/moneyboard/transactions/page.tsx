import Link from "next/link";
import { getCurrentUser, getCategories, getAccountOverview, getRecurringBills, getTransactionHistory } from "@/server/queries/moneyboard";
import { CURRENCIES, DEFAULT_CURRENCY, derivePeriodEnd, formatEntryDate, todayDateStr } from "@/domain/moneyboard";
import { TransactionFilters } from "@/components/features/moneyboard/TransactionFilters";
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
      <div className="flex items-center gap-3 mb-4 md:mb-6 min-w-0">
        <Link href={backHref} className="w-10 h-10 shrink-0 rounded-full bg-white border border-border-soft flex items-center justify-center text-muted hover:text-ink" aria-label="Back to MoneyBoard">←</Link>
        <div className="min-w-0">
          <h1 className="text-[20px] md:text-[26px] font-semibold tracking-tight text-ink truncate">Transaction history</h1>
          <p className="text-[12.5px] text-muted mt-0.5 truncate">
            <time dateTime={start}>{formatEntryDate(start, currency.locale, end)}</time> – <time dateTime={end}>{formatEntryDate(end, currency.locale, "0000")}</time> · income &amp; expenses
          </p>
        </div>
      </div>

      <TransactionFilters
        values={{ q: one(params.q), kind, category: one(params.category), account: one(params.account), start, end, sort }}
        currency={currency.code}
        view={one(params.view) ?? "fortnight"}
        categories={categories.map((category) => ({ value: category.id, label: `${category.label} · ${category.kind}` }))}
        accounts={accountOverview.accounts.map((account) => ({ value: account.id, label: `${account.name}${account.archived ? " (archived)" : ""}` }))}
      />

      <TransactionHistoryClient history={history} categories={categories} accounts={accountOverview.accounts} bills={bills} currency={currency} />
    </div>
  );
}
