import type { ReactNode } from "react";
import { formatCurrency, formatBreak } from "@/lib/utils";
import type { ShiftDisplay } from "@/types";

interface ShiftCardProps {
  shift: ShiftDisplay;
  /** Optional slot — e.g. a delete form rendered at the trailing edge */
  actions?: ReactNode;
}

export function ShiftCard({ shift, actions }: ShiftCardProps) {
  return (
    <div className="bg-white border border-[#e7e1d5] rounded-[14px] p-3.5 flex items-center gap-3.5">
      <div className="w-11 text-center shrink-0">
        <div className="text-[10px] font-semibold font-mono text-amber uppercase">
          {shift.dayLabel}
        </div>
        <div className="text-[20px] font-semibold font-mono text-ink leading-none">
          {shift.dayNumber}
        </div>
      </div>
      <div className="w-px h-8 bg-border-soft shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-ink">
          {shift.startTime} – {shift.endTime}
        </div>
        <div className="text-[12px] text-ghost">
          {formatBreak(shift.breakMinutes)}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[17px] font-semibold font-mono text-ink">
          {shift.totalHours % 1 === 0
            ? shift.totalHours.toFixed(0)
            : shift.totalHours.toFixed(1)}{" "}
          h
        </div>
        <div className="text-[12px] font-medium font-mono text-sage">
          {formatCurrency(shift.estimatedPay)}
        </div>
      </div>
      {actions && <div className="shrink-0 ml-1">{actions}</div>}
    </div>
  );
}
