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
  employerId?: string;
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

const DAY_LABELS: { key: keyof typeof DAY_TYPE_MULTIPLIERS; label: string; short: string }[] = [
  { key: "weekday", label: "Weekday", short: "Wkday" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
  { key: "public_holiday", label: "Public Holiday", short: "PH" },
];

function RateGrid({ baseRate }: { baseRate: number }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 mt-2.5">
      {DAY_LABELS.map(({ key, short }) => {
        const rate = baseRate * DAY_TYPE_MULTIPLIERS[key];
        const mult = DAY_TYPE_MULTIPLIERS[key];
        return (
          <div
            key={key}
            className="bg-paper rounded-[8px] px-2 py-2 text-center"
          >
            <div className="text-[8px] font-semibold font-mono uppercase tracking-wider text-ghost">
              {short}
            </div>
            <div className="text-[13px] font-semibold font-mono text-ink mt-0.5 tabular-nums">
              {formatCurrency(Math.round(rate * 100) / 100)}
            </div>
            {mult !== 1 && (
              <div className="text-[9px] font-mono text-sage mt-0.5">
                {mult}×
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AwardLevelManager({ initial, employerId }: Props) {
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
    <div className="flex flex-col gap-2.5">
      {initial.length === 0 && !showForm && (
        <div className="px-4 py-4 rounded-[12px] border border-dashed border-border text-center">
          <p className="text-[12px] text-subtle leading-relaxed">
            No award levels yet. Add one to track different pay rates.
          </p>
        </div>
      )}

      {initial.map((a) => {
        if (editingId === a.id) return null;
        return (
          <div
            key={a.id}
            className="bg-white border border-border-soft rounded-[14px] p-3.5 shadow-[0_1px_3px_rgba(41,38,33,0.04)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-full bg-sage text-white text-[12px] font-bold font-mono tracking-tight">
                  {a.code}
                </span>
                <div>
                  <div className="text-[16px] font-semibold font-mono text-sage tabular-nums">
                    {formatCurrency(a.baseRate)}<span className="text-[11px] text-ghost font-normal">/h</span>
                  </div>
                  {a.description && (
                    <div className="text-[11px] text-subtle mt-0.5 leading-snug">{a.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(a)}
                  className="h-7 px-2 rounded-[7px] text-[11px] font-semibold text-sage hover:bg-sage/5 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  disabled={isPending}
                  className="h-7 px-2 rounded-[7px] text-[11px] font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </div>
            <RateGrid baseRate={a.baseRate} />
          </div>
        );
      })}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-paper/60 border border-sage/20 rounded-[14px] p-4 flex flex-col gap-3"
        >
          <div className="text-[12px] font-semibold text-ink">
            {editingId ? "Edit award level" : "New award level"}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[9px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1">
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
              <label className="block text-[9px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1">
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
          </div>
          <div>
            <label className="block text-[9px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Pharmacy Assistant Grade 5"
              maxLength={100}
              className="w-full h-10 px-3 rounded-[10px] border border-border bg-white text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage placeholder:text-ghost/60"
            />
          </div>

          {isValid(form) && <RateGrid baseRate={parseFloat(form.baseRate)} />}

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
                  ? "bg-sage text-white shadow-btn hover:bg-sage/90"
                  : "bg-sage/20 text-sage/60 cursor-not-allowed"
              )}
            >
              {isPending ? "Saving…" : editingId ? "Save" : "Add"}
            </button>
          </div>
        </form>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={openAdd}
          className="h-9 rounded-[10px] border border-dashed border-border text-[12px] font-semibold text-sage hover:bg-sage/5 hover:border-sage/40 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 6v12M6 12h12" />
          </svg>
          Add award level
        </button>
      )}
    </div>
  );
}
