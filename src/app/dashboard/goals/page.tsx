import {
  getCurrentUser,
  getGoals,
  getGoalTrackerSummary,
  refreshAutoGoals,
} from "@/server/queries/goaltracker";
import { GoalTrackerOverview } from "@/components/features/goaltracker/GoalTrackerOverview";
import { BackButton } from "@/components/ui/BackButton";

export const metadata = { title: "Goal Tracker — Coreboard" };

interface Props {
  searchParams: Promise<{ filter?: string }>;
}

export default async function GoalTrackerPage({ searchParams }: Props) {
  const { filter: filterParam } = await searchParams;
  const user = await getCurrentUser();

  const filter: "active" | "completed" | "archived" =
    filterParam === "completed" || filterParam === "archived"
      ? filterParam
      : "active";

  // Refresh auto-linked goals on page load
  await refreshAutoGoals(user.id);

  const [goals, summary] = await Promise.all([
    getGoals(user.id, filter),
    getGoalTrackerSummary(user.id),
  ]);

  return (
    <div className="px-4 sm:px-5 py-4 max-w-2xl mx-auto md:max-w-6xl md:px-8 md:py-8">
      <div className="flex items-center gap-3 mb-5 md:mb-7">
        <BackButton fallback="/dashboard" ariaLabel="Back to dashboard" />
        <div className="min-w-0">
          <h1 className="text-[20px] md:text-[26px] font-semibold tracking-tight text-ink leading-none">
            Goal Tracker
          </h1>
          <p className="text-[12px] md:text-[13px] text-muted mt-1.5">
            Set, track, and hit your goals
          </p>
        </div>
      </div>

      <GoalTrackerOverview
        goals={goals}
        summary={summary}
        filter={filter}
      />
    </div>
  );
}
