"use server";

import { revalidatePath } from "next/cache";
import {
  getCurrentUser,
  createGoal,
  updateGoal,
  deleteGoal,
  toggleMilestone,
  addMilestone,
  deleteMilestone,
  refreshAutoGoals,
} from "@/server/queries/goaltracker";

function revalidate() {
  revalidatePath("/dashboard/goals");
  revalidatePath("/dashboard");
}

export type GoalResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// ── Create ───────────────────────────────────────────────────────────────────

export async function createGoalAction(
  _prev: GoalResult | null,
  formData: FormData
): Promise<GoalResult> {
  const user = await getCurrentUser();
  const title = (formData.get("title") as string)?.trim();
  const emoji = (formData.get("emoji") as string) || "🎯";
  const type = (formData.get("type") as string) || "numeric";
  const targetValue = parseFloat(formData.get("targetValue") as string);
  const unit = (formData.get("unit") as string)?.trim() || null;
  const autoSource = (formData.get("autoSource") as string) || "none";
  const autoCurrency = (formData.get("autoCurrency") as string)?.trim() || null;
  const deadline = (formData.get("deadline") as string)?.trim() || null;
  const milestonesRaw = (formData.get("milestones") as string) || "[]";

  if (!title) return { ok: false, error: "Title is required." };
  if (type !== "numeric" && type !== "checklist") return { ok: false, error: "Invalid goal type." };
  if (type === "numeric" && (!Number.isFinite(targetValue) || targetValue <= 0)) {
    return { ok: false, error: "Target value must be a positive number." };
  }

  let milestones: string[] = [];
  try {
    milestones = JSON.parse(milestonesRaw);
  } catch { /* ignore */ }

  if (type === "checklist" && milestones.length === 0) {
    return { ok: false, error: "Add at least one milestone." };
  }

  try {
    const goal = await createGoal(user.id, {
      title,
      emoji,
      type: type as "numeric" | "checklist",
      targetValue: type === "numeric" ? targetValue : null,
      unit,
      autoSource,
      autoCurrency,
      deadline,
      milestones,
    });
    revalidate();
    return { ok: true, id: goal.id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create goal." };
  }
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateGoalAction(
  _prev: GoalResult | null,
  formData: FormData
): Promise<GoalResult> {
  const user = await getCurrentUser();
  const id = (formData.get("id") as string)?.trim();
  if (!id) return { ok: false, error: "Goal id required." };

  const title = (formData.get("title") as string)?.trim();
  const emoji = (formData.get("emoji") as string) || undefined;
  const targetValue = formData.has("targetValue")
    ? parseFloat(formData.get("targetValue") as string)
    : undefined;
  const unit = formData.has("unit") ? (formData.get("unit") as string)?.trim() || null : undefined;
  const deadline = formData.has("deadline")
    ? (formData.get("deadline") as string)?.trim() || null
    : undefined;
  const currentValue = formData.has("currentValue")
    ? parseFloat(formData.get("currentValue") as string)
    : undefined;
  const status = (formData.get("status") as string) || undefined;

  try {
    const goal = await updateGoal(id, user.id, {
      title,
      emoji,
      targetValue,
      unit,
      deadline,
      currentValue,
      status,
    });
    revalidate();
    return { ok: true, id: goal.id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update goal." };
  }
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteGoalAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const id = (formData.get("id") as string)?.trim();
  if (!id) throw new Error("Goal id required.");
  await deleteGoal(id, user.id);
  revalidate();
}

// ── Milestones ──────────────────────────────────────────────────────────────

export async function toggleMilestoneAction(formData: FormData): Promise<GoalResult> {
  const user = await getCurrentUser();
  const milestoneId = (formData.get("milestoneId") as string)?.trim();
  if (!milestoneId) return { ok: false, error: "Milestone id required." };

  try {
    const goal = await toggleMilestone(milestoneId, user.id);
    revalidate();
    return { ok: true, id: goal.id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not toggle milestone." };
  }
}

export async function addMilestoneAction(formData: FormData): Promise<GoalResult> {
  const user = await getCurrentUser();
  const goalId = (formData.get("goalId") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  if (!goalId || !title) return { ok: false, error: "Goal id and title required." };

  try {
    const goal = await addMilestone(goalId, user.id, title);
    revalidate();
    return { ok: true, id: goal.id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not add milestone." };
  }
}

export async function deleteMilestoneAction(formData: FormData): Promise<GoalResult> {
  const user = await getCurrentUser();
  const milestoneId = (formData.get("milestoneId") as string)?.trim();
  if (!milestoneId) return { ok: false, error: "Milestone id required." };

  try {
    const goal = await deleteMilestone(milestoneId, user.id);
    revalidate();
    return { ok: true, id: goal.id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete milestone." };
  }
}

// ── Refresh auto-linked goals ───────────────────────────────────────────────

export async function refreshAutoGoalsAction(): Promise<GoalResult> {
  const user = await getCurrentUser();
  try {
    await refreshAutoGoals(user.id);
    revalidate();
    return { ok: true, id: "" };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not refresh goals." };
  }
}
