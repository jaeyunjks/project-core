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

test("dashboard recent entries do not present synthetic noon as a known transaction time", async () => {
  const source = await readFile("src/components/features/moneyboard/BudgetOverview.tsx", "utf8");
  assert.match(source, /occurrenceTimeKnown \? e\.time : "Time not recorded"/);
});
