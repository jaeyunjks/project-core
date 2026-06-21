import Link from "next/link";
import {
  getCurrentUser,
  getCurrentEmployer,
  getPayPeriods,
  getPayPeriodById,
  getLatestPayPeriod,
} from "@/server/queries/hoursboard";
import { PayPeriodWorksheet } from "@/components/features/hoursboard/PayPeriodWorksheet";
import { createFirstPayPeriodFormAction } from "@/server/actions/hoursboard";

export const metadata = { title: "HoursBoard — Project Core" };

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function HoursBoardPage({ searchParams }: Props) {
  const { period: periodId } = await searchParams;

  const user = await getCurrentUser();
  const employer = await getCurrentEmployer();
  const allPeriods = await getPayPeriods(user.id);

  const period = periodId
    ? await getPayPeriodById(periodId)
    : await getLatestPayPeriod(user.id);

  const currentIndex = period
    ? allPeriods.findIndex((p) => p.id === period.id)
    : -1;

  const prevPeriod = currentIndex > 0 ? allPeriods[currentIndex - 1] : null;
  const nextPeriod =
    currentIndex < allPeriods.length - 1 ? allPeriods[currentIndex + 1] : null;
  const isLatest = !nextPeriod;

  return (
    <div className="px-5 py-4 max-w-4xl md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between h-11 mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-ink leading-tight">HoursBoard</h1>
          <p className="text-[12px] text-subtle mt-0.5">Pay-period worksheet</p>
        </div>
        <Link
          href="/dashboard/hoursboard/settings"
          className="w-[38px] h-[38px] rounded-[11px] border border-border bg-white flex items-center justify-center text-subtle hover:text-ink transition-colors"
          aria-label="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </div>

      {period === null ? (
        /* Empty state */
        <div className="bg-white border border-dashed border-border rounded-[16px] p-10 text-center mt-8">
          <div className="w-12 h-12 rounded-[14px] bg-sage/10 flex items-center justify-center mx-auto mb-4 text-sage">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-ink mb-1.5">No pay periods yet</p>
          <p className="text-[13px] text-subtle leading-relaxed mb-5">
            Start your first pay period to begin tracking hours and earnings.
          </p>
          <form action={createFirstPayPeriodFormAction}>
            <button
              type="submit"
              className="h-10 px-5 rounded-[13px] bg-sage text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(62,91,77,0.22)]"
            >
              Start Pay Period
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Period navigation */}
          <div className="flex items-center gap-3 mb-5">
            <Link
              href={prevPeriod ? `/dashboard/hoursboard?period=${prevPeriod.id}` : "#"}
              aria-disabled={!prevPeriod}
              className={`w-[34px] h-[34px] rounded-[10px] border border-border bg-white flex items-center justify-center text-ink transition-opacity ${!prevPeriod ? "opacity-30 pointer-events-none" : "hover:border-sage/40"}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </Link>

            <div className="flex-1 text-center">
              <span className="text-[15px] font-semibold text-ink">{period.label}</span>
              {allPeriods.length > 1 && (
                <span className="text-[11px] text-ghost ml-2">
                  {currentIndex + 1} / {allPeriods.length}
                </span>
              )}
            </div>

            <Link
              href={nextPeriod ? `/dashboard/hoursboard?period=${nextPeriod.id}` : "#"}
              aria-disabled={!nextPeriod}
              className={`w-[34px] h-[34px] rounded-[10px] border border-border bg-white flex items-center justify-center text-ink transition-opacity ${!nextPeriod ? "opacity-30 pointer-events-none" : "hover:border-sage/40"}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          {/* Worksheet */}
          <PayPeriodWorksheet
            period={period}
            baseRate={employer.hourlyRate}
            prevPeriodId={prevPeriod?.id ?? null}
            nextPeriodId={nextPeriod?.id ?? null}
            isLatest={isLatest}
          />
        </>
      )}
    </div>
  );
}
