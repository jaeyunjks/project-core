import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Compact icon action for list rows: 36×32 visually, 44px tall tap area. */
export function RowIconButton({
  label,
  hint,
  onClick,
  disabled,
  busy,
  tone = "default",
  children,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={label}
      title={hint ?? label}
      className={cn(
        "relative w-9 h-8 shrink-0 rounded-[9px] flex items-center justify-center disabled:opacity-40 after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
        tone === "danger" ? "text-[#8A3F2E] hover:bg-[#8A3F2E]/8" : "text-muted hover:bg-paper hover:text-sage",
      )}
    >
      {busy ? <RowSpinner /> : children}
    </button>
  );
}

function RowSpinner() {
  return (
    <svg className="animate-spin text-sage" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function ArchiveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="3.5" width="19" height="5" rx="1" />
      <path d="M4.5 8.5v10a2 2 0 002 2h11a2 2 0 002-2v-10" />
      <path d="M10 12.5h4" />
    </svg>
  );
}
