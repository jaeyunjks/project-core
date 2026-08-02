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
} from "@/server/queries/moneyboard";
import { CURRENCIES, DEFAULT_CURRENCY, periodWindow } from "@/domain/moneyboard";
import type { BudgetPeriodType } from "@/domain/moneyboard";

function revalidateMoneyBoard() {
  revalidatePath("/dashboard/moneyboard");
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
  const categoryId = ((formData.get("categoryId") as string) ?? "").trim();
  const note = ((formData.get("note") as string) ?? "").trim();
  const currencyRaw = ((formData.get("currency") as string) ?? "").trim().toUpperCase();
  const currency = CURRENCIES.find((c) => c.code === currencyRaw)?.code ?? DEFAULT_CURRENCY.code;
  return { kind, amount, currency, date, categoryId, note };
}

function validate({
  kind,
  amount,
  date,
  categoryId,
}: ReturnType<typeof parseEntryForm>): string | null {
  if (kind !== "income" && kind !== "expense") return "Entry must be income or expense.";
  if (!Number.isFinite(amount) || amount <= 0) return "Amount must be greater than zero.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Date must be in YYYY-MM-DD format.";
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
      categoryId: fields.categoryId,
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
      categoryId: fields.categoryId,
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

  const win = periodWindow(periodType, anchor);
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
  cadence: "week" | "fortnight" | "month";
} | { error: string } {
  const name = ((formData.get("name") as string) ?? "").trim();
  const amount = parseFloat((formData.get("amount") as string) ?? "");
  const currencyRaw = ((formData.get("currency") as string) ?? "").trim().toUpperCase();
  const currency = CURRENCIES.find((c) => c.code === currencyRaw)?.code ?? DEFAULT_CURRENCY.code;
  const cadenceRaw = ((formData.get("cadence") as string) ?? "").trim();
  if (!name) return { error: "Name is required." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be greater than zero." };
  if (cadenceRaw !== "week" && cadenceRaw !== "fortnight" && cadenceRaw !== "month") {
    return { error: "Cadence must be week, fortnight, or month." };
  }
  return { name, amount, currency, cadence: cadenceRaw };
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
