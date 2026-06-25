import {
  getCurrentUser,
  getCategories,
  getMonthlyMoneyData,
  getMonthNavOptions,
  getLifetimeMoneyStats,
  previewHoursBoardImport,
} from "@/server/queries/moneyboard";
import { currentMonthKey } from "@/domain/moneyboard";
import { MoneyBoardOverview } from "@/components/features/moneyboard/MoneyBoardOverview";
import { BackButton } from "@/components/ui/BackButton";

export const metadata = { title: "MoneyBoard — Project Core" };

interface Props {
  searchParams: Promise<{ month?: string }>;
}

const VALID_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function MoneyBoardPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const user = await getCurrentUser();

  const monthKey = month && VALID_MONTH.test(month) ? month : currentMonthKey();

  const [categories, summary, navOptions, lifetime, hbPreview] = await Promise.all([
    getCategories(user.id),
    getMonthlyMoneyData(user.id, monthKey),
    getMonthNavOptions(user.id),
    getLifetimeMoneyStats(user.id),
    previewHoursBoardImport(user.id),
  ]);

  return (
    <div className="px-5 py-4 max-w-2xl mx-auto md:max-w-6xl md:px-8 md:py-8">
      {/* Header — back button + title */}
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
      />
    </div>
  );
}
