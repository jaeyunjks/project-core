import {
  getCurrentUser,
  getCategories,
  getBudgetSummary,
  getRecurringBills,
} from "@/server/queries/moneyboard";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/domain/moneyboard";
import type { BudgetPeriodType } from "@/domain/moneyboard";
import { BudgetOverview } from "@/components/features/moneyboard/BudgetOverview";
import { BackButton } from "@/components/ui/BackButton";

export const metadata = { title: "MoneyBoard — Coreboard" };

interface Props {
  searchParams: Promise<{ view?: string; date?: string; end?: string; currency?: string }>;
}

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

function resolvePeriodType(raw: string | undefined): BudgetPeriodType {
  if (raw === "week" || raw === "fortnight" || raw === "month") return raw;
  return "fortnight";
}

export default async function MoneyBoardPage({ searchParams }: Props) {
  const { view, date, end, currency: currencyParam } = await searchParams;
  const user = await getCurrentUser();

  const currency =
    (currencyParam && CURRENCIES.find((c) => c.code === currencyParam.toUpperCase())) ||
    DEFAULT_CURRENCY;

  const periodType = resolvePeriodType(view);
  const anchor = date && VALID_DATE.test(date) ? date : undefined;
  const endOverride = end && VALID_DATE.test(end) ? end : undefined;

  const [categories, budget, bills] = await Promise.all([
    getCategories(user.id),
    getBudgetSummary(user.id, periodType, anchor, currency.code, endOverride),
    getRecurringBills(user.id, currency.code),
  ]);

  return (
    <div className="px-5 py-4 max-w-2xl mx-auto md:max-w-6xl md:px-8 md:py-8">
      <div className="flex items-center gap-3 mb-7">
        <BackButton fallback="/dashboard" ariaLabel="Back to dashboard" />
        <div>
          <h1 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-ink leading-none">
            MoneyBoard
          </h1>
          <p className="text-[12px] md:text-[13px] text-muted mt-1.5">
            Plan your spending
          </p>
        </div>
      </div>

      <BudgetOverview
        budget={budget}
        categories={categories}
        currency={currency}
        anchor={anchor}
        bills={bills}
      />
    </div>
  );
}
