import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Moneyboard does not render account-funding shortfall warnings", async () => {
  const files = await Promise.all([
    readFile("src/components/features/moneyboard/BudgetOverview.tsx", "utf8"),
    readFile("src/components/features/moneyboard/BillPlanningModal.tsx", "utf8"),
  ]);
  const source = files.join("\n");
  assert.doesNotMatch(source, /funding shortfall/i);
  assert.doesNotMatch(source, /Current period funding/i);
  assert.doesNotMatch(source, /fund a short account/i);
});

test("transaction rows do not present synthetic noon as a known transaction time", async () => {
  const source = await readFile("src/components/features/moneyboard/TransactionRow.tsx", "utf8");
  assert.match(source, /occurrenceTimeKnown \? entry\.time : "Time not recorded"/);
  assert.match(source, /occurrenceTimeKnown \? ` \$\{entry\.time\}` : ""/);
});

test("recent entries and transaction history share the compact transaction row", async () => {
  const [overview, history] = await Promise.all([
    readFile("src/components/features/moneyboard/BudgetOverview.tsx", "utf8"),
    readFile("src/components/features/moneyboard/TransactionHistoryClient.tsx", "utf8"),
  ]);
  assert.match(overview, /<TransactionRow/);
  assert.match(history, /<TransactionRow/);
});

test("collapsed history filters stay mounted so their values still submit", async () => {
  const source = await readFile("src/components/features/moneyboard/TransactionFilters.tsx", "utf8");
  assert.doesNotMatch(source, /\{open && /);
});
