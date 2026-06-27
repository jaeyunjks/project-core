import Link from "next/link";
import {
  getCurrentUser,
  getCurrentEmployer,
  getAllEmployers,
  getPayPeriods,
  getPayPeriodById,
  getAwardLevels,
} from "@/server/queries/hoursboard";
import { PayPeriodWorksheet } from "@/components/features/hoursboard/PayPeriodWorksheet";
import { HoursBoardOverview } from "@/components/features/hoursboard/HoursBoardOverview";
import { BackButton } from "@/components/ui/BackButton";
import { PayPeriodActions } from "@/components/features/hoursboard/PayPeriodActions";
import { ExportPdfButton } from "@/components/features/hoursboard/ExportPdfButton";
import { EmployerSelector } from "@/components/features/hoursboard/EmployerSelector";

export const metadata = { title: "HoursBoard — Coreboard" };

interface Props {
  searchParams: Promise<{ period?: string; employer?: string }>;
}

export default async function HoursBoardPage({ searchParams }: Props) {
  const { period: periodId, employer: employerParam } = await searchParams;

  const user = await getCurrentUser();
  const allEmployers = await getAllEmployers(user.id);

  const selectedEmployer = employerParam
    ? allEmployers.find((e) => e.id === employerParam) ?? allEmployers[0]
    : allEmployers[0];

  const employer = selectedEmployer ?? (await getCurrentEmployer());
  const allPeriods = await getPayPeriods(user.id, employer.id);
  const awards = await getAwardLevels(user.id, employer.id);

  // Worksheet view — when a specific period is requested
  if (periodId) {
    const period = await getPayPeriodById(periodId);
    const sortedAsc = allPeriods;
    const currentIndex = period
      ? sortedAsc.findIndex((p) => p.id === period.id)
      : -1;
    const prevPeriod = currentIndex > 0 ? sortedAsc[currentIndex - 1] : null;
    const nextPeriod =
      currentIndex < sortedAsc.length - 1 ? sortedAsc[currentIndex + 1] : null;
    const isLatest = !nextPeriod;

    return (
      <div className="px-5 py-4 max-w-4xl mx-auto md:px-8 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between h-11 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/dashboard/hoursboard${employer.id !== allEmployers[0]?.id ? `?employer=${employer.id}` : ""}`}
              className="w-[34px] h-[34px] shrink-0 rounded-[10px] border border-border bg-white flex items-center justify-center text-ink hover:border-sage/40 transition-colors"
              aria-label="Back to overview"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-[18px] font-semibold text-ink leading-tight truncate">
                {period?.displayName ?? "Pay period"}
              </h1>
              {period?.name && (
                <p className="text-[12px] text-subtle mt-0.5">{period.label}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {period && <ExportPdfButton period={period} employerName={employer.name} />}
            {period && <PayPeriodActions period={period} />}
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
        </div>

        {period === null ? (
          <div className="bg-white border border-dashed border-border rounded-[16px] p-10 text-center mt-8">
            <p className="text-[14px] text-subtle">That pay period no longer exists.</p>
          </div>
        ) : (
          <>
            {/* Prev/next nav */}
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
              <div className="flex-1 text-center text-[13px] text-subtle">
                {currentIndex + 1} of {sortedAsc.length}
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

            <PayPeriodWorksheet
              period={period}
              employerBaseRate={employer.hourlyRate}
              awards={awards}
              isLatest={isLatest}
            />
          </>
        )}
      </div>
    );
  }

  // Overview view — when no ?period= is set
  const periodsNewestFirst = [...allPeriods].reverse();
  const latest = periodsNewestFirst[0] ?? null;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const activePeriod =
    periodsNewestFirst.find(
      (p) => p.startDate <= todayStr && todayStr <= p.endDate
    ) ?? latest;

  return (
    <div className="px-5 py-4 max-w-2xl mx-auto md:max-w-6xl md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <BackButton fallback="/dashboard" ariaLabel="Back to dashboard" />
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-ink leading-none md:text-[26px]">HoursBoard</h1>
            <p className="text-[12px] text-subtle mt-1.5 md:text-[13px]">Track hours across pay periods</p>
          </div>
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

      {/* Employer selector — only shows when >1 employer */}
      {allEmployers.length > 1 && (
        <EmployerSelector
          employers={allEmployers.map((e) => ({ id: e.id, name: e.name }))}
          selectedId={employer.id}
        />
      )}

      <HoursBoardOverview
        periods={periodsNewestFirst}
        latest={latest}
        activePeriodId={activePeriod?.id ?? null}
        employerId={employer.id}
        awards={awards}
        employerBaseRate={employer.hourlyRate}
      />
    </div>
  );
}
