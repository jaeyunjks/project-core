"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { HoursBoardImportPreview } from "@/server/queries/moneyboard";
import { formatMoney } from "@/domain/moneyboard";
import { importHoursBoardAction } from "@/server/actions/moneyboard";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  preview: HoursBoardImportPreview | null;
}

export function ImportHoursBoardModal({ open, onClose, preview }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleConfirm() {
    if (!preview) return;
    setError(null);
    const fd = new FormData();
    fd.set("payPeriodId", preview.payPeriodId);
    startTransition(async () => {
      const result = await importHoursBoardAction(fd);
      if (result.ok) {
        onClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 backdrop-blur-sm p-4 pb-20 md:pb-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] max-h-[calc(100dvh-7rem)] md:max-h-[calc(100dvh-3rem)] overflow-y-auto bg-paper rounded-[16px] border border-border-soft shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 py-5 pb-2 flex justify-between items-start">
          <div>
            <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint">
              Import preview
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-ink mt-1">
              From HoursBoard
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-ink"
            aria-label="Close"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p className="px-6 text-[13px] text-muted leading-relaxed pb-4">
          Read-only pull of the estimated gross from your most recent completed pay period.
          No sync.
        </p>

        {preview ? (
          <>
            <div className="mx-6 mb-4 bg-white border border-border-soft rounded-[12px] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-faint">
                  Pay period
                </div>
                {preview.alreadyImported ? (
                  <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-amber bg-[#F4E6D6] px-2 py-0.5 rounded">
                    Already imported
                  </div>
                ) : (
                  <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-sage bg-sage/10 px-2 py-0.5 rounded">
                    Completed
                  </div>
                )}
              </div>
              <div className="text-[17px] font-semibold tracking-tight text-ink">
                {preview.label}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 bg-[#EFE9DC] rounded-[8px] p-3">
                <Stat label="Hours" value={`${preview.totalHours} h`} />
                <Stat label="Days" value={String(preview.workedDays)} />
                <Stat
                  label="Est. gross"
                  value={formatMoney(preview.estimatedGross)}
                  accent="sage"
                />
              </div>
            </div>

            <div className="mx-6 mb-4">
              <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint mb-1.5">
                Logs as
              </div>
              <div className="bg-white border border-border-soft rounded-[10px] px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-sage/10 flex items-center justify-center text-sage">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-ink">
                    Work · {preview.label.split(" 20")[0]}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    Dated {preview.paydayDate} · marked as HoursBoard import
                  </div>
                </div>
                <div className="text-[14px] font-mono font-semibold text-sage">
                  {formatMoney(preview.estimatedGross, { signed: true })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mx-6 mb-4 bg-white border border-dashed border-border rounded-[12px] p-6 text-center">
            <p className="text-[13px] text-muted">
              No completed pay period to import yet.
            </p>
          </div>
        )}

        {error && (
          <div className="mx-6 mb-4 px-3 py-2.5 rounded-[10px] bg-red-50 border border-red-200 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="px-6 py-4 border-t border-border-soft bg-white/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-[10px] text-[13px] font-medium text-muted hover:bg-white transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!preview || preview.alreadyImported || isPending}
            className={cn(
              "h-10 px-5 rounded-[10px] text-[13px] font-semibold transition-colors",
              "bg-sage text-paper hover:bg-sage-deep",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {isPending ? "Importing…" : preview?.alreadyImported ? "Already imported" : "Confirm import"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "sage";
}) {
  return (
    <div>
      <div className="text-[9px] font-semibold font-mono uppercase tracking-[0.16em] text-faint mb-1">
        {label}
      </div>
      <div className={cn("text-[15px] font-semibold font-mono tracking-tight", accent === "sage" ? "text-sage" : "text-ink")}>
        {value}
      </div>
    </div>
  );
}
