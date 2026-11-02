import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { PrismaClient } from "@prisma/client";
import { captureRecoveryManifest, type RecoveryManifest } from "../../../scripts/moneyboard-recovery-manifest";

const originalUrl = process.env.DATABASE_URL;
const testUrl = process.env.TEST_DATABASE_URL;
const baselinePath = process.env.RECOVERY_BASELINE_MANIFEST;

if (process.env.MONEYBOARD_ISOLATED_DATABASE !== "CONFIRMED") {
  throw new Error("Set MONEYBOARD_ISOLATED_DATABASE=CONFIRMED after checking the exact isolated target branch.");
}
if (!originalUrl || !testUrl || !baselinePath) {
  throw new Error("DATABASE_URL, TEST_DATABASE_URL, and RECOVERY_BASELINE_MANIFEST are required.");
}

function identity(raw: string) {
  const url = new URL(raw);
  return `${url.protocol}//${url.hostname}:${url.port || "default"}${url.pathname}`;
}

if (identity(originalUrl) === identity(testUrl)) {
  throw new Error("Refusing DB tests because TEST_DATABASE_URL resolves to the configured original database target.");
}

process.env.DATABASE_URL = testUrl;
const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
after(async () => db.$disconnect());

test("preserves every historical row and value from the baseline manifest", async () => {
  const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as RecoveryManifest;
  const candidate = await captureRecoveryManifest(testUrl);
  for (const [table, expected] of Object.entries(baseline.historical)) {
    assert.deepEqual(candidate.historical[table as keyof RecoveryManifest["historical"]], expected, table);
  }
  assert.deepEqual(candidate.financialTotals, baseline.financialTotals);
  assert.deepEqual(candidate.workTotals, baseline.workTotals);
  assert.deepEqual(candidate.orphanCounts, baseline.orphanCounts);
  assert.equal(candidate.historical.MoneyEntry.count, baseline.historical.MoneyEntry.count);
  assert.equal(candidate.historical.RecurringBill.count, 9);
  assert.equal(candidate.historical.BudgetPeriod.count, 9);
  assert.equal(candidate.historical.User.count, 3);
});

test("has the expanded schema and preserves unknown time precision for all 86 legacy transactions", async () => {
  const requiredTables = ["FinancialAccount", "AccountTransfer", "SavingsGoal"];
  const tables = await db.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name`,
    requiredTables,
  );
  assert.deepEqual(tables.map((row) => row.table_name), [...requiredTables].sort());
  const unknown = await db.moneyEntry.count({ where: { occurrenceTimeKnown: false } });
  assert.equal(unknown, 86);
  const assignedLegacy = await db.moneyEntry.count({
    where: { occurrenceTimeKnown: false, accountId: { not: null } },
  });
  assert.equal(assignedLegacy, 0, "the migration must not silently assign legacy entries to accounts");
});

test("dashboard, fortnight history, and unassigned history queries execute without P2022", async () => {
  const first = await db.moneyEntry.findFirst({ orderBy: { occurredAt: "asc" } });
  assert.ok(first);
  const monthKey = first.date.slice(0, 7);
  const queries = await import("@/server/queries/moneyboard");
  const month = await queries.getMonthlyMoneyData(first.userId, monthKey, first.currency);
  assert.ok(month.totalCount > 0);
  const fortnight = await queries.getBudgetSummary(first.userId, "fortnight", first.date, first.currency);
  assert.equal(fortnight.periodType, "fortnight");
  const history = await queries.getTransactionHistory(first.userId, {
    start: "1900-01-01",
    end: "2999-12-31",
    currency: first.currency,
    accountId: "unassigned",
    pageSize: 100,
  });
  assert.ok(history.entries.some((entry) => entry.id === first.id));
  assert.ok(history.entries.every((entry) => entry.account === null));
});

test("transaction create and edit preserve explicit account-less compatibility", async () => {
  const user = await db.user.findFirst({ orderBy: { id: "asc" } });
  assert.ok(user);
  const category = await db.moneyCategory.findFirst({ where: { userId: user.id, kind: "expense" } });
  assert.ok(category);
  const queries = await import("@/server/queries/moneyboard");
  const marker = `recovery-test-${Date.now()}`;
  let id: string | undefined;
  try {
    const created = await queries.createMoneyEntry(user.id, {
      kind: "expense", amount: 1.23, currency: "AUD", date: "2026-10-31", time: "09:17",
      occurrenceTimeKnown: true, categoryId: category.id, accountId: null, note: marker,
    });
    id = created.id;
    const updated = await queries.updateMoneyEntry(created.id, user.id, {
      kind: "expense", amount: 2.34, currency: "AUD", date: "2026-10-31", time: "10:18",
      occurrenceTimeKnown: true, categoryId: category.id, accountId: null, note: `${marker}-edited`,
    });
    assert.equal(updated.amount, 2.34);
    assert.equal(updated.time, "10:18");
    assert.equal(updated.account, null);
  } finally {
    if (id) await queries.deleteMoneyEntry(id, user.id);
  }
});

test("accounts, transfers, and savings goals work without changing consolidated wealth", async () => {
  const user = await db.user.findFirst({ orderBy: { id: "asc" } });
  assert.ok(user);
  const queries = await import("@/server/queries/moneyboard");
  const marker = `recovery-finance-${Date.now()}`;
  const accountIds: string[] = [];
  let transferId: string | undefined;
  let goalId: string | undefined;
  try {
    const everydayId = await queries.createFinancialAccount(user.id, {
      name: `${marker}-everyday`, type: "everyday", currency: "AUD", openingBalance: 100,
    });
    accountIds.push(everydayId);
    const savingsId = await queries.createFinancialAccount(user.id, {
      name: `${marker}-savings`, type: "savings", currency: "AUD", openingBalance: 25,
    });
    accountIds.push(savingsId);
    transferId = await queries.createAccountTransfer(user.id, {
      fromAccountId: everydayId, toAccountId: savingsId, amount: 10,
      date: "2026-11-01", time: "09:30", note: marker,
    });
    goalId = await queries.createSavingsGoal(user.id, {
      name: marker, targetAmount: 200, targetDate: "2027-12-31", currency: "AUD", accountId: savingsId,
    });
    const overview = await queries.getAccountOverview(user.id, "AUD");
    assert.equal(overview.accounts.find((account) => account.id === everydayId)?.currentBalance, 90);
    assert.equal(overview.accounts.find((account) => account.id === savingsId)?.currentBalance, 35);
    assert.equal(overview.actualSavingsContributions, 10);
    assert.equal(overview.totalRecordedBalance, 125);
    const goals = await queries.getSavingsGoals(user.id, "AUD", overview);
    assert.ok(goals.some((goal) => goal.id === goalId && goal.currentAmount === 35));
  } finally {
    if (goalId) await db.savingsGoal.deleteMany({ where: { id: goalId } });
    if (transferId) await db.accountTransfer.deleteMany({ where: { id: transferId } });
    if (accountIds.length) await db.financialAccount.deleteMany({ where: { id: { in: accountIds } } });
  }
});

test("date-less fortnightly bills remain covered across custom fortnights without fabricated or duplicate expenses", async () => {
  const seedEntry = await db.moneyEntry.findFirst({ where: { currency: "AUD" }, orderBy: { id: "asc" } });
  assert.ok(seedEntry);
  const queries = await import("@/server/queries/moneyboard");
  const marker = `recovery-fortnightly-bill-${Date.now()}`;
  const initialEntryCount = await db.moneyEntry.count();
  const initialCommittedCount = await db.committedItem.count();
  let categoryId: string | undefined;
  let billId: string | undefined;
  let expenseId: string | undefined;

  try {
    const maxCategory = await db.moneyCategory.aggregate({
      where: { userId: seedEntry.userId, kind: "expense" },
      _max: { sortOrder: true },
    });
    const category = await db.moneyCategory.create({
      data: {
        userId: seedEntry.userId,
        key: marker,
        label: marker,
        kind: "expense",
        color: "#4F6B5E",
        icon: "heart",
        sortOrder: (maxCategory._max.sortOrder ?? -1) + 1,
      },
    });
    categoryId = category.id;
    const maxBill = await db.recurringBill.aggregate({
      where: { userId: seedEntry.userId },
      _max: { sortOrder: true },
    });
    const bill = await db.recurringBill.create({
      data: {
        userId: seedEntry.userId,
        name: marker,
        amount: 45.9,
        currency: "AUD",
        cadence: "fortnight",
        nextPaymentDate: null,
        categoryId,
        active: true,
        sortOrder: (maxBill._max.sortOrder ?? -1) + 1,
      },
    });
    billId = bill.id;

    for (const anchor of ["2026-12-02", "2026-12-16"]) {
      const budget = await queries.getBudgetSummary(seedEntry.userId, "fortnight", anchor, "AUD");
      assert.equal(budget.startDate, anchor);
      assert.equal(budget.endDate, anchor === "2026-12-02" ? "2026-12-15" : "2026-12-29");
      assert.equal(budget.committedItems.filter((item) => item.name === marker).length, 1);
      const row = budget.categoryBudgets.find((item) => item.categoryId === categoryId);
      assert.ok(row);
      assert.equal(row.budgeted, 45.9);
      assert.equal(row.actualSpent, 0);
      assert.equal(row.planningCoverage, 45.9);
      assert.equal(row.spent, 45.9);
      assert.equal(row.paid, true);
    }
    assert.equal(await db.moneyEntry.count(), initialEntryCount, "planning must not fabricate a MoneyEntry");
    assert.equal(await db.committedItem.count(), initialCommittedCount, "virtual bills must not alter saved committed items");

    const expense = await queries.createMoneyEntry(seedEntry.userId, {
      kind: "expense",
      amount: 45.9,
      currency: "AUD",
      date: "2026-12-03",
      time: "09:00",
      occurrenceTimeKnown: true,
      categoryId,
      accountId: null,
      recurringBillId: billId,
      note: marker,
    });
    expenseId = expense.id;
    const withActual = await queries.getBudgetSummary(seedEntry.userId, "fortnight", "2026-12-02", "AUD");
    const covered = withActual.categoryBudgets.find((item) => item.categoryId === categoryId);
    assert.ok(covered);
    assert.equal(covered.actualSpent, 45.9);
    assert.equal(covered.planningCoverage, 0);
    assert.equal(covered.spent, 45.9, "actual and planning coverage must not be doubled");
    assert.equal(withActual.spent, 45.9, "top-level spending must remain actual-only");
  } finally {
    if (expenseId) await db.moneyEntry.deleteMany({ where: { id: expenseId } });
    if (billId) await db.recurringBill.deleteMany({ where: { id: billId } });
    if (categoryId) await db.moneyCategory.deleteMany({ where: { id: categoryId } });
  }

  assert.equal(await db.moneyEntry.count(), initialEntryCount);
  assert.equal(await db.committedItem.count(), initialCommittedCount);
});
