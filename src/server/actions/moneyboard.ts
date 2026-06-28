"use server";

import { revalidatePath } from "next/cache";
import {
  getCurrentUser,
  createMoneyEntry,
  updateMoneyEntry,
  deleteMoneyEntry,
  duplicateMoneyEntry,
  importHoursBoardPeriod,
} from "@/server/queries/moneyboard";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/domain/moneyboard";

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
