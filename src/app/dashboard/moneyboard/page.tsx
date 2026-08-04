import { cookies } from "next/headers";
import {
  getCurrentUser,
  getCategories,
  getBudgetSummary,
  getRecurringBills,
} from "@/server/queries/moneyboard";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  projectAnchorToToday,
  todayDateStr,
} from "@/domain/moneyboard";
import type { BudgetPeriodType } from "@/domain/moneyboard";
import { BudgetOverview } from "@/components/features/moneyboard/BudgetOverview";
import { BackButton } from "@/components/ui/BackButton";

export const metadata = { title: "MoneyBoard — Coreboard" };

interface Props {
  searchParams: Promise<{
    view?: string;
    wk?: string; // week start anchor
    fn?: string; // fortnight start anchor
    mo?: string; // month anchor
    end?: string;
    currency?: string;
  }>;
}

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

function resolvePeriodType(raw: string | undefined): BudgetPeriodType {
  if (raw === "week" || raw === "fortnight" || raw === "month") return raw;
  return "fortnight";
}

export default async function MoneyBoardPage({ searchParams }: Props) {
  const { view, wk, fn, mo, end, currency: currencyParam } = await searchParams;
  const user = await getCurrentUser();

  const currency =
    (currencyParam && CURRENCIES.find((c) => c.code === currencyParam.toUpperCase())) ||
    DEFAULT_CURRENCY;

  const periodType = resolvePeriodType(view);
  const paramKey = periodType === "week" ? "wk" : periodType === "fortnight" ? "fn" : "mo";
  // Each cadence has its own start anchor, so navigating (or customising) one
  // never clobbers another's custom start — a fortnight starting 22 Jul survives
  // a trip through the monthly view and its month-by-month navigation.
  const rawAnchor = periodType === "week" ? wk : periodType === "fortnight" ? fn : mo;
  let anchor = rawAnchor && VALID_DATE.test(rawAnchor) ? rawAnchor : undefined;

  // No URL anchor (fresh visit / after the login redirect drops the query
  // string) → fall back to the persisted cookie so a custom start survives
  // refresh, tab close, and re-login. Project it onto today's window so the
  // saved cycle stays current instead of showing a stale past period.
  if (!anchor) {
    const cookieStore = await cookies();
    const saved = cookieStore.get(`mb_${paramKey}`)?.value;
    if (saved && VALID_DATE.test(saved)) {
      anchor = projectAnchorToToday(periodType, saved, todayDateStr());
    }
  }

  const endOverride = end && VALID_DATE.test(end) ? end : undefined;

  // Load the budget first — it lazily materializes plan categories — so the
  // category list picks them up on the same render.
  const budget = await getBudgetSummary(user.id, periodType, anchor, currency.code, endOverride);
  const [categories, bills] = await Promise.all([
    getCategories(user.id),
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
        bills={bills}
      />
    </div>
  );
}
