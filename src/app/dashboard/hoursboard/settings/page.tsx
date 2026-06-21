import Link from "next/link";
import {
  getCurrentEmployer,
  getCurrentUser,
  getAwardLevels,
} from "@/server/queries/hoursboard";
import { updateEmployerAction } from "@/server/actions/hoursboard";
import { AwardLevelManager } from "@/components/features/hoursboard/AwardLevelManager";

export const metadata = { title: "HoursBoard Settings — Project Core" };

const payCycleOptions = [
  { value: "weekly", label: "Weekly (7 days)" },
  { value: "fortnightly", label: "Fortnightly (14 days)" },
  { value: "monthly", label: "Monthly" },
];

export default async function HoursBoardSettingsPage() {
  const user = await getCurrentUser();
  const employer = await getCurrentEmployer();
  const awards = await getAwardLevels(user.id, employer.id);

  return (
    <div className="px-5 py-4 max-w-lg mx-auto md:px-8 md:py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between h-11 mb-6">
        <Link
          href="/dashboard/hoursboard"
          className="w-[38px] h-[38px] rounded-[11px] border border-border bg-white flex items-center justify-center text-sage"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <span className="text-[17px] font-semibold text-ink">Settings</span>
        <div className="w-[38px]" />
      </div>

      <div className="text-[11px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-4">
        Employer
      </div>

      <form action={updateEmployerAction} className="flex flex-col gap-5">
        {/* Employer name */}
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Employer name
          </label>
          <input
            type="text"
            name="name"
            defaultValue={employer.name}
            required
            className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
          />
        </div>

        {/* Hourly rate */}
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Default hourly rate (A$)
          </label>
          <p className="text-[12px] text-subtle mb-1.5 leading-relaxed">
            Used when a day has no award level selected.
          </p>
          <input
            type="number"
            name="hourlyRate"
            defaultValue={employer.hourlyRate}
            step="0.01"
            min="0"
            required
            className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-semibold font-mono text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
          />
        </div>

        {/* Pay cycle */}
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Pay cycle
          </label>
          <select
            name="payCycle"
            defaultValue={employer.payCycle}
            className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all appearance-none"
          >
            {payCycleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pay period start date */}
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Pay period start date
          </label>
          <p className="text-[12px] text-subtle mb-1.5 leading-relaxed">
            The date a pay period started — used to calculate all future periods.
          </p>
          <input
            type="date"
            name="payPeriodStartDate"
            defaultValue={employer.payPeriodStartDate}
            required
            className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
          />
        </div>

        {/* Payday offset */}
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Payday offset (days after period end)
          </label>
          <input
            type="number"
            name="paydayOffsetDays"
            defaultValue={employer.paydayOffsetDays}
            min="0"
            max="31"
            required
            className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
          />
        </div>

        {/* Default break */}
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Default break (minutes)
          </label>
          <input
            type="number"
            name="defaultBreakMinutes"
            defaultValue={employer.defaultBreakMinutes}
            min="0"
            step="5"
            required
            className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
          />
        </div>

        <button
          type="submit"
          className="h-[52px] rounded-[13px] bg-sage text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(62,91,77,0.22)] active:opacity-80 transition-opacity mt-2"
        >
          Save Settings
        </button>
      </form>

      {/* Award Levels */}
      <div className="mt-10">
        <div className="text-[11px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-1.5">
          Award Levels
        </div>
        <p className="text-[12px] text-subtle leading-relaxed mb-4">
          Define each classification level you work under (e.g. P3, P5). Each has its own base
          rate; penalty rates apply on top (Sat 1.25×, Sun 1.5×, Public Hol. 2.5×).
        </p>
        <AwardLevelManager initial={awards} />
      </div>
    </div>
  );
}
