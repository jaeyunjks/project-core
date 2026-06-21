"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AwardLevelDisplay } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { DAY_TYPE_MULTIPLIERS } from "@/domain/hoursboard";
import {
  createAwardLevelAction,
  updateAwardLevelAction,
  deleteAwardLevelAction,
} from "@/server/actions/hoursboard";

interface Props {
  initial: AwardLevelDisplay[];
}

interface FormState {
  code: string;
  description: string;
  baseRate: string;
}

const EMPTY: FormState = { code: "", description: "", baseRate: "" };

function isValid(s: FormState): boolean {
  const rate = parseFloat(s.baseRate);
  return s.code.trim().length > 0 && Number.isFinite(rate) && rate >= 0;
}

export function AwardLevelManager({ initial }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openAdd() {
    setEditingId(null);
    setAdding(true);
    setForm(EMPTY);
    setError(null);
  }

  function openEdit(a: AwardLevelDisplay) {
    setAdding(false);
    setEditingId(a.id);
    setForm({
      code: a.code,
      description: a.description ?? "",
      baseRate: String(a.baseRate),
    });
    setError(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid(form)) {
      setError("Code and a non-negative base rate are required.");
      return;
    }
    setError(null);

    const fd = new FormData();
    fd.set("code", form.code);
    fd.set("description", form.description);
    fd.set("baseRate", form.baseRate);
    if (editingId) fd.set("id", editingId);

    startTransition(async () => {
      const result = editingId
        ? await updateAwardLevelAction(null, fd)
        : await createAwardLevelAction(null, fd);
      if (result.ok) {
        cancel();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this award level? Days using it will fall back to the employer rate.")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deleteAwardLevelAction(fd);
      router.refresh();
    });
  }

  const showForm = adding || editingId !== null;

  return (
    <div className="flex flex-col gap-3">
      {/* List */}
      {initial.length === 0 && !showForm && (
        <div className="px-4 py-5 rounded-[14px] border border-dashed border-border text-center">
          <p className="text-[13px] text-subtle leading-relaxed">
            No award levels yet. Add one to track different pay rates per classification (e.g. P3, P5).
          </p>
        </div>
      )}

      {initial.map((a) => {
        const isEditing = editingId === a.id;
        if (isEditing) return null; // hidden while editing inline
        return (
          <div
            key={a.id}
            className="bg-white border border-border-soft rounded-[14px] px-4 py-3 flex items-center gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-semibold text-ink font-mono">{a.code}</span>
                <span className="text-[12px] text-sage font-semibold font-mono">
                  {formatCurrency(a.baseRate)}/h
                </span>
              </div>
              {a.description && (
                <div className="text-[12px] text-subtle truncate mt-0.5">{a.description}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => openEdit(a)}
              className="text-[12px] font-semibold text-sage hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(a.id)}
              disabled={isPending}
              className="text-[12px] font-semibold text-red-600 hover:underline disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        );
      })}

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-paper/60 border border-border-soft rounded-[14px] p-4 flex flex-col gap-3"
        >
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1">
                Code
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="P5"
                maxLength={16}
                required
                className="w-full h-10 px-3 rounded-[10px] border border-border bg-white text-[14px] font-mono text-ink focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1">
                Base Rate (A$/h)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={form.baseRate}
                onChange={(e) => setForm((f) => ({ ...f, baseRate: e.target.value }))}
                placeholder="28.50"
                step="0.01"
                min="0"
                required
                className="w-full h-10 px-3 rounded-[10px] border border-border bg-white text-[14px] font-mono text-ink focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
              />
            </div>
            <div className="col-span-3 sm:col-span-1">
              <label className="block text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
                maxLength={100}
                className="w-full h-10 px-3 rounded-[10px] border border-border bg-white text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage placeholder:text-ghost/60"
              />
            </div>
          </div>

          {/* Rate preview */}
          {isValid(form) && (
            <div className="grid grid-cols-4 gap-1.5 text-[11px]">
              {(["weekday", "saturday", "sunday", "public_holiday"] as const).map((dt) => {
                const rate = parseFloat(form.baseRate) * DAY_TYPE_MULTIPLIERS[dt];
                return (
                  <div
                    key={dt}
                    className="bg-white border border-border-soft rounded-[8px] px-2 py-1.5 text-center"
                  >
                    <div className="text-ghost capitalize text-[9px] font-semibold uppercase tracking-wider">
                      {dt.replace("_", " ")}
                    </div>
                    <div className="font-mono font-semibold text-ink mt-0.5">
                      {formatCurrency(Math.round(rate * 100) / 100)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="px-3 py-2 rounded-[8px] bg-red-50 border border-red-200 text-[12px] text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={isPending}
              className="h-9 px-3 rounded-[10px] text-[12px] font-semibold text-subtle hover:bg-paper disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid(form) || isPending}
              className={cn(
                "h-9 px-4 rounded-[10px] text-[12px] font-semibold transition-colors",
                isValid(form)
                  ? "bg-sage text-white shadow-[0_3px_10px_rgba(62,91,77,0.22)] hover:bg-sage/90"
                  : "bg-sage/20 text-sage/60 cursor-not-allowed"
              )}
            >
              {isPending ? "Saving…" : editingId ? "Save changes" : "Add award level"}
            </button>
          </div>
        </form>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={openAdd}
          className="h-10 rounded-[12px] border border-dashed border-border text-[13px] font-semibold text-sage hover:bg-sage/5 hover:border-sage/40 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 6v12M6 12h12" />
          </svg>
          Add award level
        </button>
      )}
    </div>
  );
}
