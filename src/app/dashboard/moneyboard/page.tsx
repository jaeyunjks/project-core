import Link from "next/link";
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
      {/* Header — board switcher + title */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          {/* Board switcher pill */}
          <div className="inline-flex items-center gap-1 p-1 bg-[#EFE9DC] border border-border-soft rounded-full mb-4">
            <Link
              href="/dashboard/hoursboard"
              className="px-3.5 py-1.5 rounded-full text-[12px] font-medium text-muted hover:text-ink transition-colors"
            >
              HoursBoard
            </Link>
            <span className="px-3.5 py-1.5 rounded-full text-[12px] font-medium bg-ink text-paper">
              MoneyBoard
            </span>
          </div>
          <h1 className="text-[26px] md:text-[32px] font-semibold tracking-tight text-ink leading-none">
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
