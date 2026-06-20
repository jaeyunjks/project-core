import Link from "next/link";
import { ShiftCard } from "@/components/features/hoursboard/ShiftCard";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { getDemoUser, getHoursBoardSummary } from "@/lib/hoursboard";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "HoursBoard — Project Core" };

export default async function HoursBoardPage() {
  const user = await getDemoUser();
  const summary = await getHoursBoardSummary(user.id);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] md:min-h-screen">
      <div className="flex-1 px-5 py-4 max-w-2xl md:max-w-none md:px-8 md:py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between h-11 mb-2">
          <Link
            href="/dashboard"
            className="w-[38px] h-[38px] rounded-[11px] border border-border bg-white flex items-center justify-center text-sage"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <span className="text-[17px] font-semibold text-ink">HoursBoard</span>
          <Link
            href="/dashboard/hoursboard/settings"
            className="w-[38px] h-[38px] rounded-[11px] border border-border bg-white flex items-center justify-center text-sage"
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8h9M18 8h1M5 16h2M11 16h8" />
              <circle cx="16" cy="8" r="2" />
              <circle cx="9" cy="16" r="2" />
            </svg>
          </Link>
        </div>

        {/* Period label */}
        <div className="flex items-center justify-center gap-3.5 mb-3.5">
          <span className="text-[14px] font-semibold text-muted">
            Pay period · {summary.periodLabel}
          </span>
        </div>

        {/* Hero stat card */}
        <div className="bg-white border border-[#e7e1d5] rounded-[18px] p-5 shadow-[0_2px_12px_rgba(41,38,33,0.05)] mb-4">
          <div className="text-[11px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-2">
            Total this period
          </div>
          <div className="flex items-end gap-2.5 mb-4">
            <span className="text-[46px] font-semibold font-mono tracking-tight leading-[0.9] text-ink">
              {summary.totalHours % 1 === 0
                ? summary.totalHours.toFixed(0)
                : summary.totalHours.toFixed(1)}
            </span>
            <span className="text-[18px] font-medium text-subtle pb-1.5">hrs</span>
          </div>

          <div className="grid grid-cols-2 rounded-[12px] overflow-hidden border border-border-soft divide-x divide-y divide-border-soft">
            <StatCard
              label="Est. gross"
              value={formatCurrency(summary.totalGross)}
              valueClassName="text-sage"
            />
            <StatCard label="Shifts" value={String(summary.totalShifts)} />
            <StatCard
              label="Rate"
              value={`${formatCurrency(summary.hourlyRate)}/h`}
            />
            <StatCard
              label="Next payday"
              value={
                summary.nextPaydayDaysAway > 0
                  ? `${summary.nextPayday} · ${summary.nextPaydayDaysAway}d`
                  : summary.nextPayday
              }
              valueClassName="text-[15px] text-amber"
            />
          </div>
        </div>

        {/* Recent shifts */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost">
            Recent shifts
          </span>
          <Link
            href="/dashboard/hoursboard/shifts"
            className="text-[12px] font-semibold text-sage"
          >
            View all
          </Link>
        </div>

        {summary.recentShifts.length === 0 ? (
          <div className="bg-white border border-dashed border-border rounded-[16px] p-6 text-center">
            <div className="w-11 h-11 rounded-[13px] bg-sage-tint flex items-center justify-center mx-auto mb-3 text-sage">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" />
              </svg>
            </div>
            <div className="text-[15px] font-semibold text-ink mb-1">No shifts yet</div>
            <div className="text-[13px] leading-relaxed text-subtle mb-4">
              Add your first shift and your pay period builds itself.
            </div>
            <Link href="/dashboard/hoursboard/add">
              <Button size="sm">Add Shift</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {summary.recentShifts.map((shift) => (
              <ShiftCard key={shift.id} shift={shift} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-16 md:bottom-0 border-t border-border-soft bg-white px-5 py-3 flex gap-3.5">
        <Link href="/dashboard/hoursboard/add" className="flex-1">
          <Button className="w-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 6v12M6 12h12" />
            </svg>
            Add Shift
          </Button>
        </Link>
      </div>
    </div>
  );
}
