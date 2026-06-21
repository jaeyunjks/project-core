"use client";

import { deleteShiftAction } from "@/server/actions/hoursboard";

export function DeleteShiftButton({ id }: { id: string }) {
  return (
    <form
      action={deleteShiftAction}
      onSubmit={(e) => {
        if (!confirm("Delete this shift?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title="Delete shift"
        className="w-8 h-8 rounded-[9px] border border-border bg-white flex items-center justify-center text-ghost hover:text-[#c0392b] hover:border-[#f5c6c1] transition-colors"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
      </button>
    </form>
  );
}
