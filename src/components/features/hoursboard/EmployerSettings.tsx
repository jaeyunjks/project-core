"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateEmployerAction,
  createEmployerAction,
  deleteEmployerAction,
} from "@/server/actions/hoursboard";
import type { AwardLevelDisplay } from "@/types";
import { AwardLevelManager } from "./AwardLevelManager";

interface EmployerData {
  id: string;
  name: string;
  hourlyRate: number;
  defaultBreakMinutes: number;
  awards: AwardLevelDisplay[];
}

interface Props {
  employers: EmployerData[];
}

function EmployerCard({
  employer,
  canDelete,
}: {
  employer: EmployerData;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  if (editing) {
    return (
      <form
        action={updateEmployerAction}
        className="bg-white border border-sage/30 rounded-[18px] shadow-card overflow-hidden"
      >
        <input type="hidden" name="id" value={employer.id} />
        <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
          <span className="text-[14px] font-semibold text-ink">
            Edit employer
          </span>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-[12px] font-semibold text-subtle hover:text-ink"
          >
            Cancel
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
              Employer name
            </label>
            <input
              type="text"
              name="name"
              defaultValue={employer.name}
              required
              className="w-full h-11 rounded-[11px] border border-border bg-white px-3.5 text-[14px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
                Hourly rate (A$)
              </label>
              <input
                type="number"
                name="hourlyRate"
                defaultValue={employer.hourlyRate}
                step="0.01"
                min="0"
                required
                className="w-full h-11 rounded-[11px] border border-border bg-white px-3.5 text-[14px] font-semibold font-mono text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
                Break (minutes)
              </label>
              <input
                type="number"
                name="defaultBreakMinutes"
                defaultValue={employer.defaultBreakMinutes}
                min="0"
                step="5"
                required
                className="w-full h-11 rounded-[11px] border border-border bg-white px-3.5 text-[14px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            className="h-11 rounded-[11px] bg-sage text-white text-[13px] font-semibold shadow-btn active:opacity-80 transition-opacity"
          >
            Save
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="bg-white border border-border-soft rounded-[18px] shadow-card overflow-hidden">
      {/* Employer header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-[12px] bg-sage text-white flex items-center justify-center shrink-0 text-[15px] font-bold">
            {employer.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-ink truncate">
              {employer.name}
            </div>
            <div className="text-[12px] text-subtle font-mono">
              ${employer.hourlyRate.toFixed(2)}/h
              <span className="text-ghost mx-1.5">·</span>
              {employer.defaultBreakMinutes}min break
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-8 px-3 rounded-[9px] text-[12px] font-semibold text-sage hover:bg-sage/5 transition-colors"
          >
            Edit
          </button>
          {canDelete && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="h-8 px-2 rounded-[9px] text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
              </svg>
            </button>
          )}
          {confirmDelete && (
            <form action={deleteEmployerAction} className="flex items-center gap-1.5">
              <input type="hidden" name="id" value={employer.id} />
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-8 px-2.5 rounded-[9px] text-[11px] font-semibold text-subtle hover:bg-paper"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-8 px-3 rounded-[9px] bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700"
              >
                Delete
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Award levels */}
      <div className="border-t border-border-soft px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost">
            Award Levels
          </span>
          {employer.awards.length > 0 && (
            <span className="text-[10px] font-semibold font-mono text-sage bg-sage/10 px-1.5 py-0.5 rounded-full">
              {employer.awards.length}
            </span>
          )}
        </div>
        <AwardLevelManager initial={employer.awards} employerId={employer.id} />
      </div>
    </div>
  );
}

export function EmployerSettings({ employers }: Props) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost">
          Employers ({employers.length})
        </div>
      </div>

      {employers.map((emp) => (
        <EmployerCard
          key={emp.id}
          employer={emp}
          canDelete={employers.length > 1}
        />
      ))}

      {showAdd ? (
        <form
          action={createEmployerAction}
          className="bg-paper/60 border border-dashed border-sage/30 rounded-[18px] p-5 flex flex-col gap-4"
        >
          <div className="text-[13px] font-semibold text-ink">Add employer</div>
          <div>
            <label className="block text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
              Employer name
            </label>
            <input
              type="text"
              name="name"
              placeholder="e.g. McDonald's, Coles"
              required
              className="w-full h-11 rounded-[11px] border border-border bg-white px-3.5 text-[14px] font-medium text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
                Hourly rate (A$)
              </label>
              <input
                type="number"
                name="hourlyRate"
                placeholder="25.00"
                step="0.01"
                min="0"
                required
                className="w-full h-11 rounded-[11px] border border-border bg-white px-3.5 text-[14px] font-semibold font-mono text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
                Break (minutes)
              </label>
              <input
                type="number"
                name="defaultBreakMinutes"
                defaultValue={30}
                min="0"
                step="5"
                required
                className="w-full h-11 rounded-[11px] border border-border bg-white px-3.5 text-[14px] font-medium text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="h-10 px-4 rounded-[11px] text-[13px] font-semibold text-subtle hover:bg-paper"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-[11px] bg-sage text-white text-[13px] font-semibold shadow-btn hover:bg-sage-deep transition-colors"
            >
              Add employer
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="h-12 rounded-[14px] border border-dashed border-border text-[13px] font-semibold text-sage hover:bg-sage/5 hover:border-sage/40 transition-colors flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 6v12M6 12h12" />
          </svg>
          Add another employer
        </button>
      )}
    </div>
  );
}
