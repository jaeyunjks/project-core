"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getCurrentEmployer,
  createShift,
  deleteShift,
  updateEmployer,
  updatePayPeriodDay,
  createNextPayPeriod,
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
  payAwardType: string;
  payRate: number;
  notes: string | null;
}

/** Saves all 14 rows of the worksheet in a single action call */
export async function saveWorksheetAction(
  days: WorksheetDayInput[]
): Promise<void> {
  await Promise.all(
    days.map((d) =>
      updatePayPeriodDay(d.id, {
        workHours: d.workHours,
        payAwardType: d.payAwardType,
        payRate: d.payRate,
        notes: d.notes,
      })
    )
  );
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/hoursboard");
}

/** Creates the next pay period, returns its id (client component calls this then router.push) */
export async function createNextPayPeriodAction(): Promise<{ id: string }> {
  const user = await getCurrentUser();
  const period = await createNextPayPeriod(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/hoursboard");
  return { id: period.id };
}

/** Same but used from a form action — redirects server-side */
export async function createFirstPayPeriodFormAction(): Promise<void> {
  const user = await getCurrentUser();
  const period = await createNextPayPeriod(user.id);
  revalidatePath("/dashboard");
  redirect(`/dashboard/hoursboard?period=${period.id}`);
}

export async function updateEmployerAction(formData: FormData) {
  const employer = await getCurrentEmployer();

  await updateEmployer(employer.id, {
    name: (formData.get("name") as string).trim(),
    hourlyRate: parseFloat(formData.get("hourlyRate") as string),
    payCycle: formData.get("payCycle") as string,
    payPeriodStartDate: formData.get("payPeriodStartDate") as string,
    paydayOffsetDays: parseInt(formData.get("paydayOffsetDays") as string, 10),
    defaultBreakMinutes: parseInt(
      formData.get("defaultBreakMinutes") as string,
      10
    ),
  });

  revalidateAll();
  redirect("/dashboard/hoursboard/settings");
}
