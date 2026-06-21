import { FeatureCard } from "@/components/features/FeatureCard";
import { modules } from "@/data/mockData";
import { getCurrentUser } from "@/server/queries/hoursboard";
import { getGreeting, formatDayline } from "@/lib/utils";

export const metadata = { title: "Dashboard — Project Core" };

export default async function DashboardPage() {
  const user = await getCurrentUser();

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
      <div className="flex items-center justify-between mb-8">
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
