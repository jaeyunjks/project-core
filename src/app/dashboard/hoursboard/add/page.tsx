import Link from "next/link";
import { getCurrentEmployer } from "@/server/queries/hoursboard";
import { todayStr } from "@/lib/utils";
import { addShiftAction } from "@/server/actions/hoursboard";

export const metadata = { title: "Add Shift — Coreboard" };

const breakOptions = [0, 15, 30, 45, 60];

export default async function AddShiftPage() {
  const employer = await getCurrentEmployer();
  const today = todayStr();

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
        <span className="text-[17px] font-semibold text-ink">Add Shift</span>
        <div className="w-[38px]" />
      </div>

      <form action={addShiftAction} className="flex flex-col gap-5">
        {/* Date */}
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Date
          </label>
          <input
            type="date"
            name="shiftDate"
            defaultValue={today}
            required
            className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[15px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
          />
        </div>

        {/* Start / End */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
              Start
            </label>
            <input
              type="time"
              name="startTime"
              defaultValue="09:00"
              required
              className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[16px] font-semibold font-mono text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all text-center"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
              End
            </label>
            <input
              type="time"
              name="endTime"
              defaultValue="17:00"
              required
              className="w-full h-[52px] rounded-[13px] border border-border bg-white px-4 text-[16px] font-semibold font-mono text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all text-center"
            />
          </div>
        </div>

        {/* Break — segmented control */}
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Break
          </label>
          <div className="flex gap-2">
            {breakOptions.map((mins) => (
              <label key={mins} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="breakMinutes"
                  value={mins}
                  defaultChecked={mins === employer.defaultBreakMinutes}
                  className="sr-only peer"
                />
                <div className="h-11 rounded-[11px] border border-border bg-white flex items-center justify-center text-[13px] font-semibold text-ghost transition-colors peer-checked:border-sage peer-checked:bg-sage-tint peer-checked:text-sage">
                  {mins === 0 ? "None" : `${mins}m`}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
            Notes <span className="text-pale normal-case font-normal">(optional)</span>
          </label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Morning shift — café floor"
            className="w-full rounded-[13px] border border-border bg-white px-4 py-3 text-[14px] text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all resize-none"
          />
        </div>

        {/* Rate reminder */}
        <div className="text-[12px] text-ghost bg-[#faf7f1] border border-border-soft rounded-[12px] px-4 py-3">
          Hourly rate: <span className="font-semibold font-mono text-sage">A${employer.hourlyRate.toFixed(2)}</span>
          {" · "}{employer.name}
          {" · "}<Link href="/dashboard/hoursboard/settings" className="text-sage underline underline-offset-2">Edit</Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="h-[52px] rounded-[13px] bg-sage text-white text-[15px] font-semibold shadow-[0_4px_12px_rgba(62,91,77,0.22)] active:opacity-80 transition-opacity"
        >
          Save Shift
        </button>
      </form>
    </div>
  );
}
