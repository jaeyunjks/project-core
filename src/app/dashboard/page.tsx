import Link from "next/link";
import { FeatureCard } from "@/components/features/FeatureCard";
import { modules, currentPayPeriod } from "@/data/mockData";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Dashboard — Project Core" };

export default function DashboardPage() {
  const activeModule = modules.find((m) => m.status === "active")!;
  const comingModules = modules.filter((m) => m.status === "coming-soon");

  return (
    <div className="px-5 py-5 max-w-2xl md:max-w-none md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[13px] text-faint">Friday · 20 June</div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            Good evening, Alex
          </h1>
        </div>
        <div className="w-[42px] h-[42px] rounded-[13px] bg-sage text-white flex items-center justify-center text-[15px] font-semibold">
          AM
        </div>
      </div>

      {/* Pay period preview */}
      <Link href="/dashboard/hoursboard">
        <div className="bg-white border border-[#e7e1d5] rounded-[18px] p-4 shadow-[0_2px_12px_rgba(41,38,33,0.05)] mb-6 hover:shadow-[0_4px_18px_rgba(41,38,33,0.08)] transition-shadow">
          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-1">
            Current pay period · {currentPayPeriod.label}
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-[40px] font-semibold font-mono tracking-tight leading-none text-ink">
              {currentPayPeriod.totalHours}
            </span>
            <span className="text-[17px] font-medium text-subtle pb-1">hrs</span>
          </div>
          <div className="flex gap-4 text-[13px]">
            <span className="font-semibold font-mono text-sage">
              {formatCurrency(currentPayPeriod.totalGross)}
            </span>
            <span className="text-ghost">{currentPayPeriod.totalShifts} shifts</span>
            <span className="text-amber font-medium">
              Payday {currentPayPeriod.nextPayday}
            </span>
          </div>
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
