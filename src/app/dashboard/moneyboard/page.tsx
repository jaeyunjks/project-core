import {
  getCurrentUser,
  getCategories,
  getMonthlyMoneyData,
  getDateRangeMoneyData,
  getMonthNavOptions,
  getLifetimeMoneyStats,
  previewHoursBoardImport,
} from "@/server/queries/moneyboard";
import {
  currentMonthKey,
  weekRange,
  fortnightRange,
  formatDateRange,
  todayDateStr,
  CURRENCIES,
  DEFAULT_CURRENCY,
} from "@/domain/moneyboard";
import type { ViewMode } from "@/domain/moneyboard";
import { MoneyBoardOverview } from "@/components/features/moneyboard/MoneyBoardOverview";
import { BackButton } from "@/components/ui/BackButton";

export const metadata = { title: "MoneyBoard — Coreboard" };

interface Props {
  searchParams: Promise<{ month?: string; view?: string; date?: string; currency?: string }>;
}

const VALID_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function MoneyBoardPage({ searchParams }: Props) {
  const { month, view: viewParam, date: dateParam, currency: currencyParam } = await searchParams;
  const user = await getCurrentUser();

  const currency =
    (currencyParam && CURRENCIES.find((c) => c.code === currencyParam.toUpperCase())) ||
    DEFAULT_CURRENCY;

  const view: ViewMode =
    viewParam === "week" || viewParam === "fortnight" ? viewParam : "month";
  const today = todayDateStr();

  let summary;
  let monthKey: string;

  if (view === "week") {
    const anchor = dateParam && VALID_DATE.test(dateParam) ? dateParam : today;
    const range = weekRange(anchor);
    monthKey = anchor;
    summary = await getDateRangeMoneyData(
      user.id,
      range.start,
      range.end,
      `Week of ${formatDateRange(range.start, range.end)}`,
      formatDateRange(range.start, range.end),
      anchor,
      currency.code
    );
  } else if (view === "fortnight") {
    const anchor = dateParam && VALID_DATE.test(dateParam) ? dateParam : today;
    const range = fortnightRange(anchor);
    monthKey = anchor;
    summary = await getDateRangeMoneyData(
      user.id,
      range.start,
      range.end,
      `Fortnight: ${formatDateRange(range.start, range.end)}`,
      formatDateRange(range.start, range.end),
      anchor,
      currency.code
    );
  } else {
    monthKey = month && VALID_MONTH.test(month) ? month : currentMonthKey();
    summary = await getMonthlyMoneyData(user.id, monthKey, currency.code);
  }

  const [categories, navOptions, lifetime, hbPreview] = await Promise.all([
    getCategories(user.id),
    getMonthNavOptions(user.id, currency.code),
    getLifetimeMoneyStats(user.id, currency.code),
    previewHoursBoardImport(user.id),
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
            Track money in and out
          </p>
        </div>
      </div>

      <MoneyBoardOverview
        summary={summary}
        categories={categories}
        navOptions={navOptions}
        lifetime={lifetime}
        hoursBoardPreview={hbPreview}
        view={view}
        currency={currency}
      />
    </div>
  );
}
