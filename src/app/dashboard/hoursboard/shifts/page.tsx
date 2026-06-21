import Link from "next/link";
import { ShiftCard } from "@/components/features/hoursboard/ShiftCard";
import { getCurrentUser, getAllShifts } from "@/server/queries/hoursboard";
import { formatCurrency } from "@/lib/utils";
import { DeleteShiftButton } from "@/components/features/hoursboard/DeleteShiftButton";

export const metadata = { title: "Shift History — Project Core" };

export default async function ShiftHistoryPage() {
  const user = await getCurrentUser();
  const shifts = await getAllShifts(user.id);

  const totalHours = shifts.reduce((s, sh) => s + sh.totalHours, 0);
  const totalPay = shifts.reduce((s, sh) => s + sh.estimatedPay, 0);

  return (
    <div className="px-5 py-4 max-w-2xl mx-auto md:px-8 md:py-8">
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
        <span className="text-[17px] font-semibold text-ink">All Shifts</span>
        <Link href="/dashboard/hoursboard/add">
          <div className="w-[38px] h-[38px] rounded-[11px] border border-border bg-white flex items-center justify-center text-sage">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 6v12M6 12h12" />
            </svg>
          </div>
        </Link>
      </div>

      {shifts.length === 0 ? (
        <div className="bg-white border border-dashed border-border rounded-[16px] p-8 text-center mt-8">
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
            <button className="h-10 px-4 rounded-[13px] bg-sage text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(62,91,77,0.22)]">
              Add Shift
            </button>
          </Link>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="bg-white border border-border-soft rounded-[14px] p-4 mb-5 flex gap-6">
            <div>
              <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost mb-0.5">
                Total shifts
              </div>
              <div className="text-[20px] font-semibold font-mono text-ink">
                {shifts.length}
              </div>
            </div>
            <div className="w-px bg-border-soft" />
            <div>
              <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost mb-0.5">
                Total hours
              </div>
              <div className="text-[20px] font-semibold font-mono text-ink">
                {totalHours % 1 === 0 ? totalHours.toFixed(0) : totalHours.toFixed(1)} h
              </div>
            </div>
            <div className="w-px bg-border-soft" />
            <div>
              <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost mb-0.5">
                Total earned
              </div>
              <div className="text-[20px] font-semibold font-mono text-sage">
                {formatCurrency(totalPay)}
              </div>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left">
                  <th className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost pb-3 font-normal">Date</th>
                  <th className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost pb-3 font-normal">Times</th>
                  <th className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost pb-3 font-normal">Break</th>
                  <th className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost pb-3 font-normal text-right">Hours</th>
                  <th className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost pb-3 font-normal text-right">Pay</th>
                  <th className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost pb-3 font-normal">Notes</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {shifts.map((shift) => (
                  <tr key={shift.id} className="group">
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-ink">{shift.dayLabel} {shift.dayNumber}</span>
                      <span className="text-ghost text-[12px] ml-1">{shift.shiftDate.slice(0, 7)}</span>
                    </td>
                    <td className="py-3 pr-4 font-medium text-ink">
                      {shift.startTime}–{shift.endTime}
                    </td>
                    <td className="py-3 pr-4 text-ghost">
                      {shift.breakMinutes > 0 ? `${shift.breakMinutes}m` : "—"}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold font-mono text-ink">
                      {shift.totalHours % 1 === 0 ? shift.totalHours.toFixed(0) : shift.totalHours.toFixed(1)} h
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold font-mono text-sage">
                      {formatCurrency(shift.estimatedPay)}
                    </td>
                    <td className="py-3 pr-4 text-subtle text-[13px] max-w-[160px] truncate">
                      {shift.notes ?? "—"}
                    </td>
                    <td className="py-3">
                      <DeleteShiftButton id={shift.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden flex flex-col gap-2.5">
            {shifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                actions={<DeleteShiftButton id={shift.id} />}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
