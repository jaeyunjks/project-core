import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBudgetPosition,
  calculateRecurringBillCoverage,
  calculateRecordedBalance,
  calculateFlexibleBalance,
  calculateBillAccountRequirements,
  calculateSavingsForecast,
  calculateSavingsGoal,
  customPeriodWindow,
  localDateTimeToUtc,
  occurrenceLocalParts,
  occurrenceFallsInWindow,
  shiftPeriodAnchor,
  sumMoney,
  billOccurrencesInPeriod,
} from "../moneyboard";

test("historical transaction keeps its actual Sydney date and time", () => {
  const occurredAt = localDateTimeToUtc("2026-10-28", "21:35");
  assert.deepEqual(occurrenceLocalParts(occurredAt), { date: "2026-10-28", time: "21:35" });
  assert.equal(occurredAt.toISOString(), "2026-10-28T10:35:00.000Z");
});

test("daylight-saving gap is rejected instead of silently changing the time", () => {
  assert.throws(() => localDateTimeToUtc("2026-10-04", "02:30"), /daylight saving/);
});

test("editing an expense amount recalculates its account balance", () => {
  const before = calculateRecordedBalance({ openingBalance: 1000, income: [], expenses: [25], transfersIn: [], transfersOut: [] });
  const after = calculateRecordedBalance({ openingBalance: 1000, income: [], expenses: [75], transfersIn: [], transfersOut: [] });
  assert.equal(before, 975);
  assert.equal(after, 925);
});

test("reassigning a transaction changes both accounts but preserves consolidated wealth", () => {
  const aBefore = calculateRecordedBalance({ openingBalance: 500, income: [], expenses: [50], transfersIn: [], transfersOut: [] });
  const bBefore = calculateRecordedBalance({ openingBalance: 300, income: [], expenses: [], transfersIn: [], transfersOut: [] });
  const aAfter = calculateRecordedBalance({ openingBalance: 500, income: [], expenses: [], transfersIn: [], transfersOut: [] });
  const bAfter = calculateRecordedBalance({ openingBalance: 300, income: [], expenses: [50], transfersIn: [], transfersOut: [] });
  assert.equal(sumMoney([aBefore, bBefore]), sumMoney([aAfter, bAfter]));
});

test("multiple savings accounts consolidate exactly", () => {
  assert.equal(sumMoney([500, 1000]), 1500);
  assert.equal(sumMoney([0.1, 0.2]), 0.3);
});

test("an internal transfer changes individual balances but not combined wealth", () => {
  const main = calculateRecordedBalance({ openingBalance: 1000, income: [], expenses: [], transfersIn: [], transfersOut: [100] });
  const savings = calculateRecordedBalance({ openingBalance: 500, income: [], expenses: [], transfersIn: [100], transfersOut: [] });
  assert.deepEqual({ main, savings, combined: sumMoney([main, savings]) }, { main: 900, savings: 600, combined: 1500 });
});

test("planned savings does not alter recorded account balances", () => {
  const recorded = calculateRecordedBalance({ openingBalance: 1000, income: [], expenses: [], transfersIn: [], transfersOut: [] });
  const plannedSavings = 500;
  assert.equal(recorded, 1000);
  assert.equal(plannedSavings, 500);
});

test("overspending keeps a negative remaining amount and exact percentage", () => {
  assert.deepEqual(calculateBudgetPosition(50, 75), {
    budgeted: 50,
    spent: 75,
    remaining: -25,
    overBudget: true,
    overspentAmount: 25,
    percentUsed: 150,
  });
});

test("forecast responds to completed financial changes without counting transfers as wealth", () => {
  const forecast = calculateSavingsForecast({
    periodNetCashFlow: [300, 400, 500, 400],
    periodSavingsContributions: [200, 300, 250, 300],
    currentTotalBalance: 3000,
    currentSavingsBalance: 1500,
    futureFortnights: 5,
  });
  assert.equal(forecast.netPerFortnight.baseline, 400);
  assert.equal(forecast.projectedTotal.baseline, 5000);
  assert.equal(forecast.projectedSavings, 2875);
});

test("goal progress and deadline contribution are derived from recorded savings", () => {
  const goal = calculateSavingsGoal({ currentAmount: 3000, targetAmount: 10000, targetDate: "2026-12-31", today: "2026-10-29", contributionPerFortnight: 1000 });
  assert.equal(goal.remaining, 7000);
  assert.equal(goal.progressPercent, 30);
  assert.equal(goal.requiredPerFortnight, 1400);
  assert.equal(goal.forecastAtDeadline, 8000);
  assert.equal(goal.onTrack, false);
});

test("custom fortnight boundaries remain independent while navigating", () => {
  const window = customPeriodWindow("fortnight", "2026-07-22", "2026-08-04");
  assert.equal(window.startDate, "2026-07-22");
  assert.equal(window.endDate, "2026-08-04");
  assert.equal(shiftPeriodAnchor("fortnight", window.startDate, 1), "2026-08-05");
  assert.equal(shiftPeriodAnchor("month", "2026-07-01", 1), "2026-08-01");
});

test("moving an occurrence updates both affected fortnight memberships", () => {
  const before = localDateTimeToUtc("2026-07-30", "09:00");
  const after = localDateTimeToUtc("2026-08-06", "09:00");
  assert.equal(occurrenceFallsInWindow(before, "2026-07-22", "2026-08-04"), true);
  assert.equal(occurrenceFallsInWindow(after, "2026-07-22", "2026-08-04"), false);
  assert.equal(occurrenceFallsInWindow(after, "2026-08-05", "2026-08-18"), true);
});

test("complete history membership follows occurrence time rather than created time", () => {
  const occurredYesterday = localDateTimeToUtc("2026-10-28", "21:35");
  assert.equal(occurrenceFallsInWindow(occurredYesterday, "2026-10-16", "2026-10-29"), true);
  assert.equal(occurrenceFallsInWindow(occurredYesterday, "2026-10-29", "2026-11-11"), false);
});

test("bill allocations group by payment account without inflating the total", () => {
  const rows = calculateBillAccountRequirements({
    accounts: [{ id: "main", available: 470 }, { id: "secondary", available: 10 }],
    bills: [{ accountId: "main", amount: 470 }, { accountId: "secondary", amount: 30 }],
  });
  assert.equal(sumMoney(rows.map((row) => row.required)), 500);
  assert.deepEqual(rows, [
    { accountId: "main", required: 470, shortfall: 0 },
    { accountId: "secondary", required: 30, shortfall: 20 },
  ]);
});

test("a matching bill expense is not deducted twice from the flexible pool", () => {
  const position = calculateBudgetPosition(30, 30);
  const result = calculateFlexibleBalance({ plannedSpendable: 100, unplannedSpent: 0, categoryPositions: [position] });
  assert.deepEqual(result, { leftToSpend: 100, categoryOverspend: 0 });
});

test("a date-less fortnightly bill occurs once in every fortnight plan", () => {
  assert.equal(billOccurrencesInPeriod("fortnight", "fortnight"), 1);
  assert.equal(shiftPeriodAnchor("fortnight", "2026-07-22", 1), "2026-08-05");
  assert.equal(billOccurrencesInPeriod("fortnight", "fortnight"), 1);
});

test("automatic bill coverage is planning-only when no expense exists", () => {
  assert.deepEqual(
    calculateRecurringBillCoverage({ committedAmount: 45.9, actualPaidAmount: 0, automaticallyCovered: true }),
    { actualPaid: 0, planningCoverage: 45.9, coveredAmount: 45.9, covered: true },
  );
});

test("a real bill expense replaces virtual coverage instead of being counted twice", () => {
  assert.deepEqual(
    calculateRecurringBillCoverage({ committedAmount: 45.9, actualPaidAmount: 45.9, automaticallyCovered: true }),
    { actualPaid: 45.9, planningCoverage: 0, coveredAmount: 45.9, covered: true },
  );
  assert.deepEqual(
    calculateRecurringBillCoverage({ committedAmount: 45.9, actualPaidAmount: 20, automaticallyCovered: true }),
    { actualPaid: 20, planningCoverage: 25.9, coveredAmount: 45.9, covered: true },
  );
});

test("category overspending reduces the overall flexible balance", () => {
  const position = calculateBudgetPosition(50, 75);
  const result = calculateFlexibleBalance({ plannedSpendable: 100, unplannedSpent: 10, categoryPositions: [position] });
  assert.deepEqual(result, { leftToSpend: 65, categoryOverspend: 25 });
});
