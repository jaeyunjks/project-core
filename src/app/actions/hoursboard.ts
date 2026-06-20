"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getDemoUser,
  getDemoEmployer,
  createShift,
  deleteShift,
  updateEmployer,
} from "@/lib/hoursboard";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/hoursboard");
  revalidatePath("/dashboard/hoursboard/shifts");
}

export async function addShiftAction(formData: FormData) {
  const user = await getDemoUser();
  const employer = await getDemoEmployer();

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

export async function updateEmployerAction(formData: FormData) {
  const employer = await getDemoEmployer();

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
