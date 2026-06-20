import Link from "next/link";
import { FeatureCard } from "@/components/features/FeatureCard";
import { modules } from "@/data/mockData";
import { getDemoUser, getDashboardHoursPreview } from "@/lib/hoursboard";
import { formatCurrency, getGreeting, formatDayline } from "@/lib/utils";

export const metadata = { title: "Dashboard — Project Core" };

export default async function DashboardPage() {
  const user = await getDemoUser();
  const preview = await getDashboardHoursPreview(user.id);

  const activeModule = modules.find((m) => m.status === "active")!;
  const comingModules = modules.filter((m) => m.status === "coming-soon");

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="px-5 py-5 max-w-2xl md:max-w-none md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[13px] text-faint">{formatDayline()}</div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            {getGreeting()}, {user.name}
          </h1>
        </div>
        <div className="w-[42px] h-[42px] rounded-[13px] bg-sage text-white flex items-center justify-center text-[15px] font-semibold">
          {initials}
        </div>
      </div>

      {/* HoursBoard pay period preview */}
      <Link href={preview ? `/dashboard/hoursboard?period=${preview.periodId}` : "/dashboard/hoursboard"}>
        <div className="bg-white border border-[#e7e1d5] rounded-[18px] p-4 shadow-[0_2px_12px_rgba(41,38,33,0.05)] mb-6 hover:shadow-[0_4px_18px_rgba(41,38,33,0.08)] transition-shadow">
          {preview ? (
            <>
              <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-1">
                Pay period · {preview.periodLabel}
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-[40px] font-semibold font-mono tracking-tight leading-none text-ink">
                  {preview.totalHours % 1 === 0
                    ? preview.totalHours.toFixed(0)
                    : preview.totalHours.toFixed(1)}
                </span>
                <span className="text-[17px] font-medium text-subtle pb-1">hrs</span>
              </div>
              <div className="flex gap-4 text-[13px]">
                <span className="font-semibold font-mono text-sage">
                  {formatCurrency(preview.estimatedGross)}
                </span>
                <span className="text-ghost">{preview.workedDays} days worked</span>
                <span className="text-amber font-medium">
                  Payday {preview.nextPayday}
                  {preview.nextPaydayDaysAway > 0 && ` · ${preview.nextPaydayDaysAway}d`}
                </span>
              </div>
            </>
          ) : (
            <div className="py-2 text-center">
              <div className="text-[13px] font-semibold text-ink mb-0.5">Start tracking hours</div>
              <div className="text-[12px] text-subtle">Open HoursBoard to create your first pay period.</div>
            </div>
          )}
        </div>
      </Link>

      {/* Your apps */}
      <div className="text-[11px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-3.5">
        Your apps
      </div>

      <FeatureCard module={activeModule} featured />

      <div className="text-[11px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mt-5 mb-3">
        Coming soon
      </div>

      <div className="grid grid-cols-3 gap-2.5 md:grid-cols-5">
        {comingModules.map((m) => (
          <FeatureCard key={m.id} module={m} />
        ))}
      </div>
    </div>
  );
}
