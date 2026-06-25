"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import type { PayPeriodDisplay } from "@/types";
import { NewPayPeriodModal } from "./NewPayPeriodModal";
import { deletePayPeriodAction } from "@/server/actions/hoursboard";

interface Props {
  period: PayPeriodDisplay;
}

export function PayPeriodActions({ period }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  function handleDelete() {
    const fd = new FormData();
    fd.set("id", period.id);
    startTransition(async () => {
      await deletePayPeriodAction(fd);
    });
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Pay period actions"
          className="w-[38px] h-[38px] rounded-[11px] border border-border bg-white flex items-center justify-center text-subtle hover:text-ink transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-border-soft rounded-[12px] shadow-[0_8px_24px_rgba(41,38,33,0.12)] overflow-hidden z-30">
            <button
              onClick={() => {
                setMenuOpen(false);
                setEditOpen(true);
              }}
              className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-ink hover:bg-paper flex items-center gap-2.5"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                setConfirmDelete(true);
              }}
              className="w-full px-3.5 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 border-t border-border-soft"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <NewPayPeriodModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editPeriod={period}
      />

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4 pb-20 md:pb-4"
          onClick={() => !isPending && setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-[400px] max-h-[calc(100dvh-6rem)] overflow-y-auto bg-white rounded-[18px] border border-border-soft shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-[13px] bg-red-50 flex items-center justify-center mb-3 text-red-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
              </svg>
            </div>
            <h3 className="text-[16px] font-semibold text-ink mb-1.5">
              Delete this pay period?
            </h3>
            <p className="text-[13px] text-subtle leading-relaxed mb-5">
              <span className="font-medium text-ink">{period.displayName}</span> and all {period.days.length} day entries will be permanently removed. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className="h-10 px-4 rounded-[11px] text-[13px] font-semibold text-subtle hover:bg-paper transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="h-10 px-5 rounded-[11px] bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
