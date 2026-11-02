"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FinancialAccountDisplay, SavingsForecastDisplay, SavingsGoalDisplay } from "@/types";
import type { CurrencyOption } from "@/domain/moneyboard";
import { currentSydneyDateTime, formatMoney, fortnightsUntil, parseAmountInput, sanitizeAmountInput, sumMoney } from "@/domain/moneyboard";
import { createSavingsGoalAction, deleteSavingsGoalAction } from "@/server/actions/moneyboard";

interface Props {
  open: boolean;
  onClose: () => void;
  forecast: SavingsForecastDisplay;
  goals: SavingsGoalDisplay[];
  accounts: FinancialAccountDisplay[];
  currency: CurrencyOption;
}

export function FinancialInsightsModal({ open, onClose, forecast, goals, accounts, currency }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(forecast.targetDate);
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDate, setGoalDate] = useState(forecast.targetDate);
  const [goalAccount, setGoalAccount] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const projection = useMemo(() => {
    const periods = fortnightsUntil(currentSydneyDateTime().date, targetDate);
    const project = (rate: number) => sumMoney([forecast.currentTotalBalance, rate * periods]);
    return {
      periods,
      conservative: project(forecast.netPerFortnight.conservative),
      baseline: project(forecast.netPerFortnight.baseline),
      optimistic: project(forecast.netPerFortnight.optimistic),
      savings: sumMoney([forecast.currentSavingsBalance, forecast.savingsPerFortnight * periods]),
    };
  }, [forecast, targetDate]);

  if (!open) return null;

  const addGoal = () => {
    const amount = parseAmountInput(goalAmount, currency);
    if (!goalName.trim()) return setError("Goal name is required.");
    if (!(amount > 0)) return setError("Goal amount must be greater than zero.");
    const form = new FormData();
    form.set("name", goalName.trim()); form.set("targetAmount", String(amount)); form.set("targetDate", goalDate); form.set("currency", currency.code); form.set("accountId", goalAccount);
    startTransition(async () => {
      const result = await createSavingsGoalAction(form);
      if (!result.ok) return setError(result.error);
      setGoalName(""); setGoalAmount(""); setGoalAccount(""); router.refresh();
    });
  };
  const removeGoal = (goal: SavingsGoalDisplay) => {
    if (!window.confirm(`Delete savings goal “${goal.name}”?`)) return;
    const form = new FormData(); form.set("id", goal.id);
    startTransition(async () => { const result = await deleteSavingsGoalAction(form); if (!result.ok) setError(result.error); else router.refresh(); });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Savings forecast and goals" className="fixed inset-0 z-[60] bg-ink/45 p-0 pt-[env(safe-area-inset-top)] sm:p-4 overflow-hidden flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-full sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain bg-paper rounded-t-[22px] sm:rounded-[22px] shadow-lg p-4 sm:p-5 md:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 md:pb-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div><h2 className="text-[21px] font-semibold tracking-tight text-ink">Forecast & savings goals</h2><p className="text-[13px] text-muted mt-1">Transparent estimates from completed recent fortnights—not guarantees.</p></div>
          <button type="button" onClick={onClose} aria-label="Close insights" className="w-10 h-10 rounded-full bg-white border border-border-soft text-muted shrink-0">×</button>
        </div>

        <section className="bg-white border border-border-soft rounded-[16px] shadow-card p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div><div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">Savings forecast</div><div className="text-[28px] font-mono font-semibold text-sage mt-1">{formatMoney(projection.savings, { currency })}</div><p className="text-[12px] text-muted">Projected savings-account balance</p></div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-faint">Project to<input type="date" value={targetDate} min={currentSydneyDateTime().date} onChange={(e) => setTargetDate(e.target.value)} className="block mt-1.5 h-10 px-3 rounded-[10px] bg-paper border border-border-soft text-[13px] font-mono normal-case tracking-normal text-ink" /></label>
          </div>

          <svg viewBox="0 0 360 90" className="w-full h-24 mt-4" role="img" aria-label="Conservative, baseline, and optimistic balance projection">
            <line x1="12" y1="78" x2="348" y2="78" stroke="currentColor" className="text-border" />
            <line x1="12" y1="50" x2="348" y2="70" stroke="#8F8772" strokeWidth="2" />
            <line x1="12" y1="50" x2="348" y2="42" stroke="#3E5B4D" strokeWidth="3" />
            <line x1="12" y1="50" x2="348" y2="15" stroke="#B2966A" strokeWidth="2" />
            <circle cx="12" cy="50" r="4" fill="#3E5B4D" /><circle cx="348" cy="42" r="4" fill="#3E5B4D" />
          </svg>
          <div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-2">
            <ForecastStat label="Conservative" value={projection.conservative} currency={currency} />
            <ForecastStat label="Baseline" value={projection.baseline} currency={currency} strong />
            <ForecastStat label="Optimistic" value={projection.optimistic} currency={currency} />
          </div>
          <div className="mt-3 px-3 py-2.5 rounded-[10px] bg-paper text-[12px] text-muted">
            Based on {forecast.periodsOfHistory} completed fortnight{forecast.periodsOfHistory === 1 ? "" : "s"}. Baseline external net cash flow is {formatMoney(forecast.netPerFortnight.baseline, { signed: true, currency })}/fortnight; completed transfers into savings average {formatMoney(forecast.savingsPerFortnight, { currency })}/fortnight.
            {forecast.confidence === "insufficient" && <span className="block text-[#8A3F2E] mt-1">Insufficient history: treat this as an early estimate.</span>}
          </div>
        </section>

        <section className="mt-4">
          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint mb-2">Savings goals</div>
          {goals.length === 0 ? (
            <div className="bg-white border border-dashed border-border rounded-[14px] p-6 text-center text-[13px] text-muted">No savings goals yet.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {goals.map((goal) => (
                <div key={goal.id} className="min-w-0 bg-white border border-border-soft rounded-[14px] shadow-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-ink break-words [overflow-wrap:anywhere]">{goal.name}</div>
                      <div className="text-[11.5px] text-muted mt-0.5 break-words">{goal.accountName ?? "Combined savings"} · due {goal.targetDate}</div>
                    </div>
                    <button type="button" onClick={() => removeGoal(goal)} className="min-h-10 px-2 text-[11px] font-semibold text-[#8A3F2E] shrink-0">Delete</button>
                  </div>
                  <div role="progressbar" aria-label={`${goal.name} savings progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={goal.progressPercent} className="h-2 rounded-full bg-paper overflow-hidden mt-3">
                    <div className="h-full bg-sage rounded-full" style={{ width: `${goal.progressPercent}%` }} />
                  </div>
                  <div className="flex flex-col gap-1 min-[390px]:flex-row min-[390px]:justify-between mt-2 text-[11.5px]">
                    <span className="font-mono text-ink break-words">{formatMoney(goal.currentAmount, { currency })} / {formatMoney(goal.targetAmount, { currency })}</span>
                    <span className={goal.onTrack ? "font-semibold text-sage" : "font-semibold text-[#8A3F2E]"}>{goal.onTrack ? "On track" : "Behind forecast"}</span>
                  </div>
                  <div className="text-[11px] text-subtle mt-1 break-words [overflow-wrap:anywhere]">{formatMoney(goal.remaining, { currency })} remaining · needs {formatMoney(goal.requiredPerFortnight, { currency })}/fortnight{goal.estimatedCompletionDate ? ` · estimate ${goal.estimatedCompletionDate}` : ""}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-border-soft rounded-[16px] shadow-card p-4 mt-4">
          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.16em] text-faint">Create goal</div>
          <div className="grid sm:grid-cols-2 gap-2 mt-3"><input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Goal name" className="h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[13px]" /><input value={goalAmount} onChange={(e) => setGoalAmount(sanitizeAmountInput(e.target.value, currency))} inputMode="decimal" placeholder="Target amount" className="h-10 px-3 rounded-[10px] border border-border-soft bg-paper font-mono text-[13px]" /><input type="date" value={goalDate} min={currentSydneyDateTime().date} onChange={(e) => setGoalDate(e.target.value)} className="h-10 px-3 rounded-[10px] border border-border-soft bg-paper font-mono text-[12px]" /><select value={goalAccount} onChange={(e) => setGoalAccount(e.target.value)} className="h-10 px-3 rounded-[10px] border border-border-soft bg-paper text-[13px]"><option value="">Combined savings</option>{accounts.filter((account) => account.type === "savings" && !account.archived).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
          <button type="button" disabled={pending} onClick={addGoal} className="mt-3 w-full h-10 rounded-[10px] bg-sage text-white text-[13px] font-semibold disabled:opacity-50">Add savings goal</button>
        </section>
        {error && <div className="mt-3 px-3 py-2 rounded-[10px] bg-[#F1DDD5] text-[#8A3F2E] text-[13px]">{error}</div>}
      </div>
    </div>
  );
}

function ForecastStat({ label, value, currency, strong }: { label: string; value: number; currency: CurrencyOption; strong?: boolean }) {
  return <div className="min-w-0 rounded-[10px] bg-paper p-2.5"><div className="text-[9px] font-mono uppercase tracking-wider text-faint break-words">{label}</div><div className={`text-[12px] md:text-[14px] font-mono mt-1 break-all ${strong ? "font-semibold text-sage" : "font-medium text-ink"}`}>{formatMoney(value, { currency })}</div></div>;
}
