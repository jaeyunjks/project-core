import Link from "next/link";
import { ShiftCard } from "@/components/features/hoursboard/ShiftCard";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { currentPayPeriod } from "@/data/mockData";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "HoursBoard — Project Core" };

const recentShifts = currentPayPeriod.shifts.slice(0, 3);

export default function HoursBoardPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] md:min-h-screen">
      <div className="flex-1 px-5 py-4 max-w-2xl md:max-w-none md:px-8 md:py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between h-11 mb-2">
          <Link
            href="/dashboard"
            className="w-[38px] h-[38px] rounded-[11px] border border-border bg-white flex items-center justify-center text-sage"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <span className="text-[17px] font-semibold text-ink">HoursBoard</span>
          <div className="w-[38px] h-[38px] rounded-[11px] border border-border bg-white flex items-center justify-center text-sage">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 8h9M18 8h1M5 16h2M11 16h8" />
              <circle cx="16" cy="8" r="2" />
              <circle cx="9" cy="16" r="2" />
            </svg>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center justify-center gap-3.5 mb-3.5">
          <span className="text-[13px] font-semibold text-pale cursor-pointer">‹</span>
          <span className="text-[14px] font-semibold text-muted">
            Pay period · {currentPayPeriod.label}
          </span>
          <span className="text-[13px] font-semibold text-pale cursor-pointer">›</span>
        </div>

        {/* Hero stat card */}
        <div className="bg-white border border-[#e7e1d5] rounded-[18px] p-5 shadow-[0_2px_12px_rgba(41,38,33,0.05)] mb-4">
          <div className="text-[11px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-2">
            Total this period
          </div>
          <div className="flex items-end gap-2.5 mb-4">
            <span className="text-[46px] font-semibold font-mono tracking-tight leading-[0.9] text-ink">
              {currentPayPeriod.totalHours}
            </span>
            <span className="text-[18px] font-medium text-subtle pb-1.5">hrs</span>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 rounded-[12px] overflow-hidden border border-border-soft divide-x divide-y divide-border-soft">
            <StatCard
              label="Est. gross"
              value={formatCurrency(currentPayPeriod.totalGross)}
              valueClassName="text-sage"
            />
            <StatCard
              label="Shifts"
              value={String(currentPayPeriod.totalShifts)}
            />
            <StatCard
              label="Rate"
              value={formatCurrency(currentPayPeriod.hourlyRate) + "/h"}
            />
            <StatCard
              label="Next payday"
              value={`${currentPayPeriod.nextPayday} · ${currentPayPeriod.nextPaydayDaysAway}d`}
              valueClassName="text-[15px] text-amber"
            />
          </div>
        </div>

        {/* Recent shifts */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost">
            Recent shifts
          </span>
          <span className="text-[12px] font-semibold text-sage cursor-pointer">
            View all
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {recentShifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} />
          ))}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-16 md:bottom-0 border-t border-border-soft bg-white px-5 py-3 flex gap-3.5">
        <Button className="flex-1">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 6v12M6 12h12" />
          </svg>
          Add Shift
        </Button>
      </div>
    </div>
  );
}
