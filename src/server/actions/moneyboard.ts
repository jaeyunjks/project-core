"use server";

import { revalidatePath } from "next/cache";
import {
  getCurrentUser,
  createMoneyEntry,
  updateMoneyEntry,
  deleteMoneyEntry,
  duplicateMoneyEntry,
  importHoursBoardPeriod,
  saveBudgetPlan,
  createRecurringBill,
  updateRecurringBill,
  deleteRecurringBill,
  createFinancialAccount,
  updateFinancialAccount,
  setFinancialAccountArchived,
  createAccountTransfer,
  createSavingsGoal,
  deleteSavingsGoal,
} from "@/server/queries/moneyboard";
import { CURRENCIES, DEFAULT_CURRENCY, resolvePeriodWindow, localDateTimeToUtc } from "@/domain/moneyboard";
import type { AccountType, BudgetPeriodType } from "@/domain/moneyboard";

function revalidateMoneyBoard() {
  revalidatePath("/dashboard/moneyboard");
  revalidatePath("/dashboard/moneyboard/transactions");
  revalidatePath("/dashboard");
}

// ── Shapes ───────────────────────────────────────────────────────────────────

export type EntryResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function parseEntryForm(formData: FormData) {
  const kind = (formData.get("kind") as string) ?? "";
  const amount = parseFloat((formData.get("amount") as string) ?? "");
  const date = ((formData.get("date") as string) ?? "").trim();
  const time = ((formData.get("time") as string) ?? "").trim();
  const occurrenceTimeKnown = formData.get("occurrenceTimeKnown") !== "false";
  const categoryId = ((formData.get("categoryId") as string) ?? "").trim();
  const accountId = ((formData.get("accountId") as string) ?? "").trim() || null;
  const recurringBillId = ((formData.get("recurringBillId") as string) ?? "").trim() || null;
  const note = ((formData.get("note") as string) ?? "").trim();
  const currencyRaw = ((formData.get("currency") as string) ?? "").trim().toUpperCase();
  const currency = CURRENCIES.find((c) => c.code === currencyRaw)?.code ?? DEFAULT_CURRENCY.code;
  return { kind, amount, currency, date, time, occurrenceTimeKnown, categoryId, accountId, recurringBillId, note };
}

function validate({
  kind,
  amount,
  date,
  time,
  categoryId,
}: ReturnType<typeof parseEntryForm>): string | null {
  if (kind !== "income" && kind !== "expense") return "Entry must be income or expense.";
  if (!Number.isFinite(amount) || amount <= 0) return "Amount must be greater than zero.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Date must be in YYYY-MM-DD format.";
  if (!/^\d{2}:\d{2}$/.test(time)) return "Time must be in HH:mm format.";
  try {
    localDateTimeToUtc(date, time);
  } catch (error) {
    return error instanceof Error ? error.message : "Date and time are invalid.";
  }
  if (!categoryId) return "Pick a category.";
  return null;
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createMoneyEntryAction(
  _prev: EntryResult | null,
  formData: FormData
): Promise<EntryResult> {
  const user = await getCurrentUser();
  const fields = parseEntryForm(formData);
  const err = validate(fields);
  if (err) return { ok: false, error: err };

  try {
    const entry = await createMoneyEntry(user.id, {
      kind: fields.kind as "income" | "expense",
      amount: fields.amount,
      currency: fields.currency,
      date: fields.date,
      time: fields.time,
      occurrenceTimeKnown: fields.occurrenceTimeKnown,
      categoryId: fields.categoryId,
      accountId: fields.accountId,
      recurringBillId: fields.recurringBillId,
      note: fields.note || null,
    });
    revalidateMoneyBoard();
    return { ok: true, id: entry.id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create entry." };
  }
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateMoneyEntryAction(
  _prev: EntryResult | null,
  formData: FormData
): Promise<EntryResult> {
  const user = await getCurrentUser();
  const id = ((formData.get("id") as string) ?? "").trim();
  if (!id) return { ok: false, error: "Entry id required." };

  const fields = parseEntryForm(formData);
  const err = validate(fields);
  if (err) return { ok: false, error: err };

  try {
    const entry = await updateMoneyEntry(id, user.id, {
      kind: fields.kind as "income" | "expense",
      amount: fields.amount,
      currency: fields.currency,
      date: fields.date,
      time: fields.time,
      occurrenceTimeKnown: fields.occurrenceTimeKnown,
      categoryId: fields.categoryId,
      accountId: fields.accountId,
      recurringBillId: fields.recurringBillId,
      note: fields.note || null,
    });
    revalidateMoneyBoard();
    return { ok: true, id: entry.id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update entry." };
  }
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteMoneyEntryAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const id = (formData.get("id") as string)?.trim();
  if (!id) throw new Error("Entry id required.");
  await deleteMoneyEntry(id, user.id);
  revalidateMoneyBoard();
}

// ── Duplicate ────────────────────────────────────────────────────────────────

export async function duplicateMoneyEntryAction(
  formData: FormData
): Promise<EntryResult> {
  const user = await getCurrentUser();
  const id = (formData.get("id") as string)?.trim();
  if (!id) return { ok: false, error: "Entry id required." };
  try {
    const entry = await duplicateMoneyEntry(id, user.id);
    revalidateMoneyBoard();
    return { ok: true, id: entry.id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not duplicate." };
  }
}

// ── HoursBoard import ────────────────────────────────────────────────────────

// ── Budget plan ──────────────────────────────────────────────────────────────

export type SaveBudgetResult = { ok: true } | { ok: false; error: string };

export async function saveBudgetPlanAction(formData: FormData): Promise<SaveBudgetResult> {
  const user = await getCurrentUser();

  const periodTypeRaw = ((formData.get("periodType") as string) ?? "").trim();
  if (periodTypeRaw !== "week" && periodTypeRaw !== "fortnight" && periodTypeRaw !== "month") {
    return { ok: false, error: "Invalid period type." };
  }
  const periodType = periodTypeRaw as BudgetPeriodType;

  const anchor = ((formData.get("anchor") as string) ?? "").trim() || undefined;
  const currencyRaw = ((formData.get("currency") as string) ?? "").trim().toUpperCase();
  const currency = CURRENCIES.find((c) => c.code === currencyRaw)?.code ?? DEFAULT_CURRENCY.code;

  const moneyIn = parseFloat((formData.get("moneyIn") as string) ?? "0");
  const protectValue = parseFloat((formData.get("protectValue") as string) ?? "0");
  const itemsRaw = ((formData.get("committedItems") as string) ?? "").trim();

  let committedItems: { name: string; amount: number; recur: string }[] = [];
  if (itemsRaw) {
    try {
      const parsed = JSON.parse(itemsRaw);
      if (Array.isArray(parsed)) {
        committedItems = parsed
          .filter((it) => it && typeof it === "object")
          .map((it) => ({
            name: String(it.name ?? ""),
            amount: Number(it.amount ?? 0),
            recur: String(it.recur ?? "Monthly"),
          }));
      }
    } catch {
      return { ok: false, error: "Committed items malformed." };
    }
  }

  const win = resolvePeriodWindow(periodType, anchor);
  try {
    await saveBudgetPlan(user.id, {
      periodType,
      startDate: win.startDate,
      endDate: win.endDate,
      currency,
      moneyIn: Number.isFinite(moneyIn) ? moneyIn : 0,
      protectValue: Number.isFinite(protectValue) ? protectValue : 0,
      committedItems,
    });
    revalidateMoneyBoard();
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save plan." };
  }
}

// ── Recurring bills ─────────────────────────────────────────────────────────

export type BillResult = { ok: true } | { ok: false; error: string };

function parseBillForm(formData: FormData): {
  name: string;
  amount: number;
  currency: string;
  cadence: "week" | "fortnight" | "month" | "year";
  dueDay: number | null;
  nextPaymentDate: string | null;
  accountId: string | null;
  categoryId: string | null;
  description: string | null;
  active: boolean;
} | { error: string } {
  const name = ((formData.get("name") as string) ?? "").trim();
  const amount = parseFloat((formData.get("amount") as string) ?? "");
  const currencyRaw = ((formData.get("currency") as string) ?? "").trim().toUpperCase();
  const currency = CURRENCIES.find((c) => c.code === currencyRaw)?.code ?? DEFAULT_CURRENCY.code;
  const cadenceRaw = ((formData.get("cadence") as string) ?? "").trim();
  if (!name) return { error: "Name is required." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be greater than zero." };
  if (cadenceRaw !== "week" && cadenceRaw !== "fortnight" && cadenceRaw !== "month" && cadenceRaw !== "year") {
    return { error: "Cadence must be weekly, fortnightly, monthly, or yearly." };
  }

  let dueDay: number | null = null;
  if (cadenceRaw === "month") {
    const raw = ((formData.get("dueDay") as string) ?? "").trim();
    if (raw) {
      const d = parseInt(raw, 10);
      if (!Number.isFinite(d) || d < 1 || d > 31) {
        return { error: "Day of month must be between 1 and 31." };
      }
      dueDay = d;
    }
  }

  const nextPaymentDate = ((formData.get("nextPaymentDate") as string) ?? "").trim() || null;
  if (nextPaymentDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextPaymentDate)) return { error: "Next payment date is invalid." };
  return {
    name,
    amount,
    currency,
    cadence: cadenceRaw,
    dueDay,
    nextPaymentDate,
    accountId: ((formData.get("accountId") as string) ?? "").trim() || null,
    categoryId: ((formData.get("categoryId") as string) ?? "").trim() || null,
    description: ((formData.get("description") as string) ?? "").trim() || null,
    active: formData.get("active") !== "false",
  };
}

export async function createRecurringBillAction(formData: FormData): Promise<BillResult> {
  const user = await getCurrentUser();
  const parsed = parseBillForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  try {
    await createRecurringBill(user.id, parsed);
    revalidateMoneyBoard();
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not add bill." };
  }
}

export async function updateRecurringBillAction(formData: FormData): Promise<BillResult> {
  const user = await getCurrentUser();
  const id = ((formData.get("id") as string) ?? "").trim();
  if (!id) return { ok: false, error: "Bill id required." };
  const parsed = parseBillForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  try {
    await updateRecurringBill(id, user.id, parsed);
    revalidateMoneyBoard();
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update bill." };
  }
}

export async function deleteRecurringBillAction(formData: FormData): Promise<BillResult> {
  const user = await getCurrentUser();
  const id = ((formData.get("id") as string) ?? "").trim();
  if (!id) return { ok: false, error: "Bill id required." };
  try {
    await deleteRecurringBill(id, user.id);
    revalidateMoneyBoard();
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete bill." };
  }
}

export async function importHoursBoardAction(formData: FormData): Promise<EntryResult> {
  const user = await getCurrentUser();
  const payPeriodId = (formData.get("payPeriodId") as string)?.trim();
  if (!payPeriodId) return { ok: false, error: "Pay period id required." };
  try {
    const entry = await importHoursBoardPeriod(user.id, payPeriodId);
    revalidateMoneyBoard();
    return { ok: true, id: entry.id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not import." };
  }
}

// ── Accounts and transfers ─────────────────────────────────────────────────

export type AccountResult = { ok: true; id?: string } | { ok: false; error: string };

function parseAccountForm(formData: FormData):
  | { error: string }
  | { name: string; type: AccountType; currency: string; openingBalance: number; color: null } {
  const name = ((formData.get("name") as string) ?? "").trim();
  const type = ((formData.get("type") as string) ?? "").trim() as AccountType;
  const currencyRaw = ((formData.get("currency") as string) ?? "").trim().toUpperCase();
  const currency = CURRENCIES.find((item) => item.code === currencyRaw)?.code ?? DEFAULT_CURRENCY.code;
  const openingBalance = Number(formData.get("openingBalance") ?? 0);
  if (!name) return { error: "Account name is required." } as const;
  if (!["everyday", "bills", "savings", "other"].includes(type)) return { error: "Account type is invalid." } as const;
  if (!Number.isFinite(openingBalance)) return { error: "Opening balance is invalid." } as const;
  return { name, type, currency, openingBalance, color: null };
}

export async function createFinancialAccountAction(formData: FormData): Promise<AccountResult> {
  const user = await getCurrentUser();
  const parsed = parseAccountForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  try {
    const id = await createFinancialAccount(user.id, parsed);
    revalidateMoneyBoard();
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not create account." };
  }
}

export async function updateFinancialAccountAction(formData: FormData): Promise<AccountResult> {
  const user = await getCurrentUser();
  const id = ((formData.get("id") as string) ?? "").trim();
  const parsed = parseAccountForm(formData);
  if (!id) return { ok: false, error: "Account id is required." };
  if ("error" in parsed) return { ok: false, error: parsed.error };
  try {
    await updateFinancialAccount(id, user.id, parsed);
    revalidateMoneyBoard();
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update account." };
  }
}

export async function archiveFinancialAccountAction(formData: FormData): Promise<AccountResult> {
  const user = await getCurrentUser();
  const id = ((formData.get("id") as string) ?? "").trim();
  if (!id) return { ok: false, error: "Account id is required." };
  try {
    await setFinancialAccountArchived(id, user.id, formData.get("archived") !== "false");
    revalidateMoneyBoard();
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not archive account." };
  }
}

export async function createAccountTransferAction(formData: FormData): Promise<AccountResult> {
  const user = await getCurrentUser();
  const fromAccountId = ((formData.get("fromAccountId") as string) ?? "").trim();
  const toAccountId = ((formData.get("toAccountId") as string) ?? "").trim();
  const amount = Number(formData.get("amount"));
  const date = ((formData.get("date") as string) ?? "").trim();
  const time = ((formData.get("time") as string) ?? "").trim();
  if (!fromAccountId || !toAccountId) return { ok: false, error: "Choose both accounts." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Amount must be greater than zero." };
  try {
    const id = await createAccountTransfer(user.id, {
      fromAccountId,
      toAccountId,
      amount,
      date,
      time,
      note: ((formData.get("note") as string) ?? "").trim() || null,
    });
    revalidateMoneyBoard();
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not record transfer." };
  }
}

// ── Savings goals ──────────────────────────────────────────────────────────

export async function createSavingsGoalAction(formData: FormData): Promise<AccountResult> {
  const user = await getCurrentUser();
  const name = ((formData.get("name") as string) ?? "").trim();
  const targetAmount = Number(formData.get("targetAmount"));
  const targetDate = ((formData.get("targetDate") as string) ?? "").trim();
  const currency = ((formData.get("currency") as string) ?? DEFAULT_CURRENCY.code).toUpperCase();
  const accountId = ((formData.get("accountId") as string) ?? "").trim() || null;
  if (!name) return { ok: false, error: "Goal name is required." };
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return { ok: false, error: "Target must be greater than zero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return { ok: false, error: "Target date is invalid." };
  try {
    const id = await createSavingsGoal(user.id, { name, targetAmount, targetDate, currency, accountId });
    revalidateMoneyBoard();
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not create goal." };
  }
}

export async function deleteSavingsGoalAction(formData: FormData): Promise<AccountResult> {
  const user = await getCurrentUser();
  const id = ((formData.get("id") as string) ?? "").trim();
  if (!id) return { ok: false, error: "Goal id is required." };
  try {
    await deleteSavingsGoal(id, user.id);
    revalidateMoneyBoard();
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not delete goal." };
  }
}
