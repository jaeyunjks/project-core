"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getCurrentEmployer,
  createShift,
  deleteShift,
  updateEmployer,
  createEmployer,
  deleteEmployer,
  updatePayPeriodDay,
  createCustomPayPeriod,
  updatePayPeriod,
  deletePayPeriod,
  createAwardLevel,
  updateAwardLevel,
  deleteAwardLevel,
} from "@/server/queries/hoursboard";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/hoursboard");
  revalidatePath("/dashboard/hoursboard/shifts");
}

export async function addShiftAction(formData: FormData) {
  const user = await getCurrentUser();
  const employer = await getCurrentEmployer();

  const shiftDate = formData.get("shiftDate") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const breakMinutes = parseInt(formData.get("breakMinutes") as string, 10) || 0;
  const notes = (formData.get("notes") as string).trim() || undefined;

  if (!shiftDate || !startTime || !endTime) {
    throw new Error("Date, start time, and end time are required.");
  }

  await createShift({
    userId: user.id,
    employerId: employer.id,
    shiftDate,
    startTime,
    endTime,
    breakMinutes,
    hourlyRate: employer.hourlyRate,
    notes,
  });

  revalidateAll();
  redirect("/dashboard/hoursboard");
}

export async function deleteShiftAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("Shift ID required.");
  await deleteShift(id);
  revalidateAll();
}

export interface WorksheetDayInput {
  id: string;
  workHours: number;
  dayType: string;
  awardLevelId: string | null;
  payRate: number;
  notes: string | null;
}

/** Saves all rows of the worksheet in a single action call */
export async function saveWorksheetAction(
  days: WorksheetDayInput[]
): Promise<void> {
  await Promise.all(
    days.map((d) =>
      updatePayPeriodDay(d.id, {
        workHours: d.workHours,
        dayType: d.dayType,
        awardLevelId: d.awardLevelId,
        payRate: d.payRate,
        notes: d.notes,
      })
    )
  );
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/hoursboard");
}

export type CreatePayPeriodResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Creates a pay period with the supplied name and date range.
 * Validates 7–14 day duration in the query layer.
 */
export async function createPayPeriodAction(
  _prev: CreatePayPeriodResult | null,
  formData: FormData
): Promise<CreatePayPeriodResult> {
  const user = await getCurrentUser();

  const name = ((formData.get("name") as string) ?? "").trim();
  const startDate = ((formData.get("startDate") as string) ?? "").trim();
  const endDate = ((formData.get("endDate") as string) ?? "").trim();

  if (!startDate || !endDate) {
    return { ok: false, error: "Start and end dates are required." };
  }
  if (endDate < startDate) {
    return { ok: false, error: "End date must be on or after start date." };
  }

  const employerId = ((formData.get("employerId") as string) ?? "").trim() || undefined;

  try {
    const period = await createCustomPayPeriod(
      user.id,
      { name: name || null, startDate, endDate },
      employerId
    );
    revalidatePath("/dashboard/hoursboard");
    return { ok: true, id: period.id };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create pay period.",
    };
  }
}

export type UpdatePayPeriodResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Edit an existing pay period (name and/or dates). */
export async function updatePayPeriodAction(
  _prev: UpdatePayPeriodResult | null,
  formData: FormData
): Promise<UpdatePayPeriodResult> {
  const user = await getCurrentUser();

  const id = ((formData.get("id") as string) ?? "").trim();
  const name = ((formData.get("name") as string) ?? "").trim();
  const startDate = ((formData.get("startDate") as string) ?? "").trim();
  const endDate = ((formData.get("endDate") as string) ?? "").trim();

  if (!id) return { ok: false, error: "Pay period id is required." };
  if (!startDate || !endDate) {
    return { ok: false, error: "Start and end dates are required." };
  }
  if (endDate < startDate) {
    return { ok: false, error: "End date must be on or after start date." };
  }

  try {
    const period = await updatePayPeriod(id, user.id, {
      name: name || null,
      startDate,
      endDate,
    });
    revalidatePath("/dashboard/hoursboard");
    revalidatePath(`/dashboard/hoursboard?period=${id}`);
    return { ok: true, id: period.id };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update pay period.",
    };
  }
}

/** Delete a pay period — irreversible. Redirects back to the overview. */
export async function deletePayPeriodAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const id = (formData.get("id") as string)?.trim();
  if (!id) throw new Error("Pay period id is required.");

  await deletePayPeriod(id, user.id);
  revalidatePath("/dashboard/hoursboard");
  redirect("/dashboard/hoursboard");
}

export async function updateEmployerAction(formData: FormData) {
  const id = (formData.get("id") as string).trim();

  await updateEmployer(id, {
    name: (formData.get("name") as string).trim(),
    hourlyRate: parseFloat(formData.get("hourlyRate") as string),
    defaultBreakMinutes: parseInt(
      formData.get("defaultBreakMinutes") as string,
      10
    ),
  });

  revalidateAll();
  redirect("/dashboard/hoursboard/settings");
}

export async function createEmployerAction(formData: FormData) {
  const user = await getCurrentUser();
  await createEmployer(user.id, {
    name: (formData.get("name") as string).trim() || "New Job",
    hourlyRate: parseFloat(formData.get("hourlyRate") as string) || 0,
    defaultBreakMinutes: parseInt(formData.get("defaultBreakMinutes") as string, 10) || 30,
  });
  revalidateAll();
  redirect("/dashboard/hoursboard/settings");
}

export async function deleteEmployerAction(formData: FormData) {
  const id = (formData.get("id") as string).trim();
  await deleteEmployer(id);
  revalidateAll();
  redirect("/dashboard/hoursboard/settings");
}

// ── AwardLevel actions ────────────────────────────────────────────────────────

export type AwardLevelResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function parseAwardForm(formData: FormData) {
  const code = ((formData.get("code") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const baseRateStr = ((formData.get("baseRate") as string) ?? "").trim();
  const baseRate = parseFloat(baseRateStr);
  return { code, description, baseRate };
}

export async function createAwardLevelAction(
  _prev: AwardLevelResult | null,
  formData: FormData
): Promise<AwardLevelResult> {
  const user = await getCurrentUser();
  const employer = await getCurrentEmployer();
  const { code, description, baseRate } = parseAwardForm(formData);

  if (!code) return { ok: false, error: "Award code is required." };
  if (!Number.isFinite(baseRate) || baseRate < 0) {
    return { ok: false, error: "Base rate must be a non-negative number." };
  }

  try {
    const created = await createAwardLevel(user.id, employer.id, {
      code,
      description: description || null,
      baseRate,
    });
    revalidatePath("/dashboard/hoursboard/settings");
    revalidatePath("/dashboard/hoursboard");
    return { ok: true, id: created.id };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create award level.",
    };
  }
}

export async function updateAwardLevelAction(
  _prev: AwardLevelResult | null,
  formData: FormData
): Promise<AwardLevelResult> {
  const user = await getCurrentUser();
  const id = ((formData.get("id") as string) ?? "").trim();
  if (!id) return { ok: false, error: "Award id is required." };

  const { code, description, baseRate } = parseAwardForm(formData);
  if (!code) return { ok: false, error: "Award code is required." };
  if (!Number.isFinite(baseRate) || baseRate < 0) {
    return { ok: false, error: "Base rate must be a non-negative number." };
  }

  try {
    const updated = await updateAwardLevel(id, user.id, {
      code,
      description: description || null,
      baseRate,
    });
    revalidatePath("/dashboard/hoursboard/settings");
    revalidatePath("/dashboard/hoursboard");
    return { ok: true, id: updated.id };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update award level.",
    };
  }
}

export async function deleteAwardLevelAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const id = (formData.get("id") as string)?.trim();
  if (!id) throw new Error("Award id is required.");
  await deleteAwardLevel(id, user.id);
  revalidatePath("/dashboard/hoursboard/settings");
  revalidatePath("/dashboard/hoursboard");
}
