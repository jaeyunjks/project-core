import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import {
  computeProgress,
  isOverdue,
  todayDateStr,
} from "@/domain/goaltracker";
import type { GoalDisplay, GoalMilestoneDisplay, GoalTrackerSummary } from "@/types";

// ── Mappers ──────────────────────────────────────────────────────────────────

type GoalWithMilestones = Prisma.GoalGetPayload<{ include: { milestones: true } }>;

function toMilestoneDisplay(m: GoalWithMilestones["milestones"][number]): GoalMilestoneDisplay {
  return {
    id: m.id,
    title: m.title,
    done: m.done,
    sortOrder: m.sortOrder,
  };
}

function toGoalDisplay(g: GoalWithMilestones): GoalDisplay {
  const milestones = g.milestones
    .map(toMilestoneDisplay)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const milestonesDone = milestones.filter((m) => m.done).length;

  return {
    id: g.id,
    title: g.title,
    emoji: g.emoji,
    type: g.type as "numeric" | "checklist",
    status: g.status as "active" | "completed" | "archived",
    targetValue: g.targetValue,
    currentValue: g.currentValue,
    unit: g.unit,
    autoSource: g.autoSource,
    autoCurrency: g.autoCurrency,
    deadline: g.deadline,
    createdAt: g.createdAt.toISOString(),
    completedAt: g.completedAt?.toISOString() ?? null,
    milestones,
    progress: computeProgress(
      g.type as "numeric" | "checklist",
      g.currentValue,
      g.targetValue,
      milestonesDone,
      milestones.length
    ),
  };
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  return requireUser();
}

export async function getGoals(
  userId: string,
  status: "active" | "completed" | "archived" | "all" = "active"
): Promise<GoalDisplay[]> {
  const where: Prisma.GoalWhereInput = { userId };
  if (status !== "all") where.status = status;

  const goals = await db.goal.findMany({
    where,
    include: { milestones: true },
    orderBy: [{ createdAt: "desc" }],
  });

  return goals.map(toGoalDisplay);
}

export async function getGoalById(userId: string, goalId: string): Promise<GoalDisplay | null> {
  const goal = await db.goal.findUnique({
    where: { id: goalId },
    include: { milestones: true },
  });
  if (!goal || goal.userId !== userId) return null;
  return toGoalDisplay(goal);
}

export async function getGoalTrackerSummary(userId: string): Promise<GoalTrackerSummary> {
  const goals = await db.goal.findMany({
    where: { userId },
    select: { status: true, deadline: true },
  });

  let active = 0;
  let completed = 0;
  let overdue = 0;

  for (const g of goals) {
    if (g.status === "completed") completed++;
    else if (g.status === "active") {
      active++;
      if (isOverdue(g.deadline)) overdue++;
    }
  }

  return { active, completed, overdue };
}

// ── Auto-source: compute current value from HoursBoard/MoneyBoard ────────

export async function computeAutoValue(
  userId: string,
  autoSource: string,
  autoCurrency: string | null
): Promise<number> {
  if (autoSource === "none") return 0;

  if (autoSource === "hoursboard-hours") {
    const days = await db.payPeriodDay.findMany({
      where: { payPeriod: { userId } },
      select: { workHours: true },
    });
    return Math.round(days.reduce((s, d) => s + d.workHours, 0) * 100) / 100;
  }

  if (autoSource.startsWith("moneyboard-")) {
    const currencyFilter = autoCurrency ? { currency: autoCurrency } : {};
    const entries = await db.moneyEntry.findMany({
      where: { userId, ...currencyFilter },
      select: { kind: true, amount: true },
    });

    let income = 0;
    let expenses = 0;
    for (const e of entries) {
      if (e.kind === "income") income += e.amount;
      else expenses += e.amount;
    }

    if (autoSource === "moneyboard-income") return Math.round(income * 100) / 100;
    if (autoSource === "moneyboard-expense") return Math.round(expenses * 100) / 100;
    if (autoSource === "moneyboard-net") return Math.round((income - expenses) * 100) / 100;
  }

  return 0;
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface GoalInput {
  title: string;
  emoji: string;
  type: "numeric" | "checklist";
  targetValue: number | null;
  unit: string | null;
  autoSource: string;
  autoCurrency: string | null;
  deadline: string | null;
  milestones: string[];  // titles for checklist goals
}

export async function createGoal(userId: string, input: GoalInput): Promise<GoalDisplay> {
  let currentValue = 0;
  if (input.autoSource !== "none") {
    currentValue = await computeAutoValue(userId, input.autoSource, input.autoCurrency);
  }

  const goal = await db.goal.create({
    data: {
      userId,
      title: input.title,
      emoji: input.emoji,
      type: input.type,
      targetValue: input.type === "numeric" ? input.targetValue : null,
      currentValue,
      unit: input.type === "numeric" ? input.unit : null,
      autoSource: input.autoSource,
      autoCurrency: input.autoCurrency,
      deadline: input.deadline || null,
      milestones: input.type === "checklist" ? {
        create: input.milestones.map((title, i) => ({
          userId,
          title,
          sortOrder: i,
        })),
      } : undefined,
    },
    include: { milestones: true },
  });
  return toGoalDisplay(goal);
}

export async function updateGoal(
  id: string,
  userId: string,
  input: Partial<GoalInput> & { currentValue?: number; status?: string }
): Promise<GoalDisplay> {
  const existing = await db.goal.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Goal not found.");

  const data: Prisma.GoalUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.emoji !== undefined) data.emoji = input.emoji;
  if (input.targetValue !== undefined) data.targetValue = input.targetValue;
  if (input.unit !== undefined) data.unit = input.unit;
  if (input.deadline !== undefined) data.deadline = input.deadline || null;
  if (input.currentValue !== undefined) data.currentValue = input.currentValue;
  if (input.autoSource !== undefined) data.autoSource = input.autoSource;
  if (input.autoCurrency !== undefined) data.autoCurrency = input.autoCurrency;
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === "completed") data.completedAt = new Date();
    else data.completedAt = null;
  }

  const goal = await db.goal.update({
    where: { id },
    data,
    include: { milestones: true },
  });
  return toGoalDisplay(goal);
}

export async function deleteGoal(id: string, userId: string): Promise<void> {
  const existing = await db.goal.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Goal not found.");
  await db.goal.delete({ where: { id } });
}

export async function toggleMilestone(
  milestoneId: string,
  userId: string
): Promise<GoalDisplay> {
  const ms = await db.goalMilestone.findUnique({
    where: { id: milestoneId },
    include: { goal: true },
  });
  if (!ms || ms.userId !== userId) throw new Error("Milestone not found.");

  await db.goalMilestone.update({
    where: { id: milestoneId },
    data: { done: !ms.done },
  });

  // Auto-complete if all milestones done
  const allMs = await db.goalMilestone.findMany({
    where: { goalId: ms.goalId },
  });
  const allDone = allMs.every((m) => m.id === milestoneId ? !ms.done : m.done);

  if (allDone && ms.goal.status === "active") {
    await db.goal.update({
      where: { id: ms.goalId },
      data: { status: "completed", completedAt: new Date() },
    });
  } else if (!allDone && ms.goal.status === "completed") {
    await db.goal.update({
      where: { id: ms.goalId },
      data: { status: "active", completedAt: null },
    });
  }

  const goal = await db.goal.findUnique({
    where: { id: ms.goalId },
    include: { milestones: true },
  });
  return toGoalDisplay(goal!);
}

export async function addMilestone(
  goalId: string,
  userId: string,
  title: string
): Promise<GoalDisplay> {
  const goal = await db.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) throw new Error("Goal not found.");

  const count = await db.goalMilestone.count({ where: { goalId } });
  await db.goalMilestone.create({
    data: { goalId, userId, title, sortOrder: count },
  });

  // Un-complete if was completed
  if (goal.status === "completed") {
    await db.goal.update({
      where: { id: goalId },
      data: { status: "active", completedAt: null },
    });
  }

  const updated = await db.goal.findUnique({
    where: { id: goalId },
    include: { milestones: true },
  });
  return toGoalDisplay(updated!);
}

export async function deleteMilestone(
  milestoneId: string,
  userId: string
): Promise<GoalDisplay> {
  const ms = await db.goalMilestone.findUnique({ where: { id: milestoneId } });
  if (!ms || ms.userId !== userId) throw new Error("Milestone not found.");
  await db.goalMilestone.delete({ where: { id: milestoneId } });

  const goal = await db.goal.findUnique({
    where: { id: ms.goalId },
    include: { milestones: true },
  });
  return toGoalDisplay(goal!);
}

// Refresh auto-source values for all active auto-linked goals
export async function refreshAutoGoals(userId: string): Promise<void> {
  const goals = await db.goal.findMany({
    where: { userId, status: "active", autoSource: { not: "none" } },
  });

  for (const g of goals) {
    const value = await computeAutoValue(userId, g.autoSource, g.autoCurrency);
    const data: Prisma.GoalUpdateInput = { currentValue: value };

    // Auto-complete numeric goals when target reached
    if (g.type === "numeric" && g.targetValue && value >= g.targetValue) {
      data.status = "completed";
      data.completedAt = new Date();
    }

    await db.goal.update({ where: { id: g.id }, data });
  }
}
