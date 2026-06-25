import {
  getCurrentUser,
  getCurrentEmployer,
  getLatestPayPeriod,
} from "@/server/queries/hoursboard";
import {
  getMonthlyMoneyData,
  getLifetimeMoneyStats,
  previewHoursBoardImport,
} from "@/server/queries/moneyboard";
import { currentMonthKey, shiftMonth, formatMoney } from "@/domain/moneyboard";
import type { DashboardNotification } from "@/components/dashboard/NotificationsMenu";
import type { DateContext } from "@/components/dashboard/DateMenu";
import { modules } from "@/data/mockData";
import { TopBar } from "@/components/dashboard/TopBar";
import { HeroPanel } from "@/components/dashboard/HeroPanel";
import { StatCard, ProgressBar, CircularProgress } from "@/components/dashboard/StatCard";
import { AppCard, BarChartVisual, SparklineVisual } from "@/components/dashboard/AppCard";
import { ComingSoonCard } from "@/components/dashboard/ComingSoonCard";
import { InsightCard } from "@/components/dashboard/InsightCard";
import {
  getGreeting,
  formatHours,
  parseLocalDate,
  daysBetween,
  todayStr,
} from "@/lib/utils";

export const metadata = { title: "Dashboard — Coreboard" };

const I = {
  apps: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  clock: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  wallet: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <circle cx="16" cy="13.5" r="1.6" />
    </svg>
  ),
  spark: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  ),
  clockLg: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  walletLg: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <circle cx="16" cy="13.5" r="1.6" />
    </svg>
  ),
  book: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="16" rx="2.5" />
      <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
    </svg>
  ),
  target: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  ),
  briefcase: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="13" rx="2.5" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  ),
};

const COMING_SOON = [
  {
    id: "study",
    title: "Study",
    description: "Organize your courses, notes & learning goals.",
    icon: I.book,
  },
  {
    id: "goal",
    title: "Goal",
    description: "Set goals, track progress & build consistency.",
    icon: I.target,
  },
  {
    id: "career",
    title: "Career",
    description: "Plan your career path & track opportunities.",
    icon: I.briefcase,
  },
];

function formatLongDate(d: Date): string {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function offsetForLatest(
  period: { startDate: string },
  today: Date
): number {
  return daysBetween(parseLocalDate(period.startDate), today);
}

function periodRangeShort(start: string, end: string): string {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${e.getDate()} ${months[s.getMonth()]}`;
  }
  return `${s.getDate()} ${months[s.getMonth()]} – ${e.getDate()} ${months[e.getMonth()]}`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const monthKey = currentMonthKey();
  const prevMonthKey = shiftMonth(monthKey, -1);

  const [employer, latestPeriod, monthData, prevMonthData, lifetime, hbImport] =
    await Promise.all([
      getCurrentEmployer(),
      getLatestPayPeriod(user.id),
      getMonthlyMoneyData(user.id, monthKey),
      getMonthlyMoneyData(user.id, prevMonthKey),
      getLifetimeMoneyStats(user.id),
      previewHoursBoardImport(user.id),
    ]);

  // ── Derived stats ─────────────────────────────────────────────────────────

  const activeApps = modules.filter((m) => m.status === "active").length;
  const totalApps = modules.length;

  // Current period — range + days remaining + progress
  const today = parseLocalDate(todayStr());
  let periodRange = "—";
  let periodSub = "No active period";
  let periodProgress = 0;
  let periodHoursLabel = "0 h";
  let hoursThisWeek = 0;
  let hoursLastWeek = 0;

  if (latestPeriod) {
    periodRange = periodRangeShort(latestPeriod.startDate, latestPeriod.endDate);
    const start = parseLocalDate(latestPeriod.startDate);
    const end = parseLocalDate(latestPeriod.endDate);
    const total = daysBetween(start, end) + 1;
    const offset = daysBetween(start, today);
    if (offset < 0) {
      periodSub = `Starts in ${-offset} days`;
      periodProgress = 0;
    } else if (offset >= total) {
      periodSub = "Period ended";
      periodProgress = 100;
    } else {
      const remaining = total - offset - 1;
      periodSub =
        remaining <= 0
          ? "Last day"
          : `${remaining} day${remaining === 1 ? "" : "s"} remaining`;
      periodProgress = Math.round(((offset + 1) / total) * 100);
    }
    periodHoursLabel = formatHours(latestPeriod.summary.totalHours);

    // Hours this week vs last week (within the period)
    const dayMs = 86_400_000;
    const sevenAgo = new Date(today.getTime() - 7 * dayMs);
    const fourteenAgo = new Date(today.getTime() - 14 * dayMs);
    for (const d of latestPeriod.days) {
      const dt = parseLocalDate(d.date);
      if (dt > today) continue;
      if (dt > sevenAgo) hoursThisWeek += d.workHours;
      else if (dt > fourteenAgo) hoursLastWeek += d.workHours;
    }
  }

  // Net balance — current month + trend
  const netNow = monthData.net;
  const netPrev = prevMonthData.net;
  const netDelta = netNow - netPrev;
  let netTrend: "up" | "down" | null = null;
  let netTrendLabel = "—";
  if (netPrev === 0 && netNow === 0) {
    netTrendLabel = "No data yet";
  } else if (netPrev === 0) {
    netTrendLabel = "First month of data";
  } else {
    const pct = Math.abs(netDelta / Math.max(Math.abs(netPrev), 1)) * 100;
    netTrend = netDelta >= 0 ? "up" : "down";
    netTrendLabel = `${pct.toFixed(1)}% vs last month`;
  }

  // Productivity score — composite signal
  // 60% weight: how filled the current period is (worked days / total days so far)
  // 40% weight: money-entry cadence (entries this month / target of one per 2 days)
  let productivity = 0;
  if (latestPeriod) {
    const total = daysBetween(parseLocalDate(latestPeriod.startDate), parseLocalDate(latestPeriod.endDate)) + 1;
    const elapsedSoFar = Math.min(
      total,
      Math.max(0, daysBetween(parseLocalDate(latestPeriod.startDate), today) + 1)
    );
    if (elapsedSoFar > 0) {
      const fillRate = Math.min(1, latestPeriod.summary.workedDays / elapsedSoFar);
      productivity += fillRate * 60;
    }
  }
  const moneyEntryTarget = 15; // ~1 per 2 days for a 30-day month
  productivity += Math.min(1, monthData.totalCount / moneyEntryTarget) * 40;
  productivity = Math.round(productivity);

  const productivityLabel =
    productivity >= 75
      ? "Strong momentum"
      : productivity >= 50
        ? "Good progress"
        : productivity >= 25
          ? "Getting started"
          : "Start tracking";

  // Insight — only show when there's a meaningful delta
  const hoursDelta = hoursThisWeek - hoursLastWeek;
  const insight =
    hoursThisWeek > 0 && Math.abs(hoursDelta) >= 0.5
      ? {
          text:
            hoursDelta > 0
              ? `You logged ${hoursDelta.toFixed(1)} more hours this week.`
              : `You logged ${Math.abs(hoursDelta).toFixed(1)} fewer hours this week.`,
          subtext:
            hoursDelta > 0 ? "Keep up the momentum!" : "Worth a glance at the worksheet.",
        }
      : null;

  // Mini-chart values for AppCards (last few periods' hours / month nets)
  const hoursSpark = latestPeriod
    ? latestPeriod.days.map((d) => d.workHours).filter((_, i, a) => i >= a.length - 7)
    : [];
  const moneySpark = [
    prevMonthData.net,
    Math.round((prevMonthData.net + monthData.net) / 2),
    monthData.net,
  ];

  // ── Date context for the TopBar date pill ──────────────────────────────────
  const now = new Date();
  const daysInThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dateContext: DateContext = {
    longLabel: formatLongDate(now),
    greeting: getGreeting(),
    period: latestPeriod
      ? (() => {
          const start = parseLocalDate(latestPeriod.startDate);
          const end = parseLocalDate(latestPeriod.endDate);
          const total = daysBetween(start, end) + 1;
          const offset = daysBetween(start, today);
          const dayOf = Math.max(1, Math.min(total, offset + 1));
          const remaining = Math.max(0, total - dayOf);
          return {
            label: periodRangeShort(latestPeriod.startDate, latestPeriod.endDate),
            dayOf,
            totalDays: total,
            remainingDays: remaining,
          };
        })()
      : null,
    monthDay: now.getDate(),
    daysLeftInMonth: daysInThisMonth - now.getDate(),
  };

  // ── Notifications — derived from real signals ──────────────────────────────
  const notifications: DashboardNotification[] = [];

  if (latestPeriod) {
    const start = parseLocalDate(latestPeriod.startDate);
    const end = parseLocalDate(latestPeriod.endDate);
    const total = daysBetween(start, end) + 1;
    const offset = daysBetween(start, today);
    if (offset >= 0 && offset < total) {
      const remaining = total - offset - 1;
      if (remaining <= 3 && remaining > 0) {
        notifications.push({
          id: "period-ending",
          kind: "warn",
          title: "Pay period ending soon",
          body: `${remaining} day${remaining === 1 ? "" : "s"} left in ${periodRangeShort(latestPeriod.startDate, latestPeriod.endDate)}.`,
          href: `/dashboard/hoursboard?period=${latestPeriod.id}`,
          cta: "Open worksheet",
        });
      }
    }
  }

  if (hbImport && !hbImport.alreadyImported && hbImport.estimatedGross > 0) {
    notifications.push({
      id: "hb-import",
      kind: "info",
      title: "Ready to import from HoursBoard",
      body: `${hbImport.label} · ${formatMoney(hbImport.estimatedGross)} estimated gross.`,
      href: "/dashboard/moneyboard",
      cta: "Import to MoneyBoard",
    });
  }

  if (netPrev !== 0 && netNow !== 0) {
    const pct = ((netNow - netPrev) / Math.abs(netPrev)) * 100;
    if (Math.abs(pct) >= 15) {
      const dir = pct > 0 ? "up" : "down";
      notifications.push({
        id: "net-shift",
        kind: pct > 0 ? "success" : "warn",
        title: `Net balance ${dir} ${Math.abs(pct).toFixed(0)}% this month`,
        body: `${formatMoney(netPrev, { signed: true })} → ${formatMoney(netNow, { signed: true })}`,
        href: "/dashboard/moneyboard",
        cta: "Open MoneyBoard",
      });
    }
  }

  if (latestPeriod && latestPeriod.summary.workedDays === 0 && offsetForLatest(latestPeriod, today) >= 2) {
    notifications.push({
      id: "no-hours",
      kind: "warn",
      title: "No hours logged yet",
      body: `You haven't entered any hours for ${periodRangeShort(latestPeriod.startDate, latestPeriod.endDate)}.`,
      href: `/dashboard/hoursboard?period=${latestPeriod.id}`,
      cta: "Log hours",
    });
  }

  return (
    <div className="px-5 py-5 md:px-10 md:py-8 max-w-[1280px] mx-auto">
      <TopBar dateContext={dateContext} notifications={notifications} />

      <HeroPanel
        name={user.name.split(" ")[0]}
        greeting={getGreeting()}
        dateLabel={formatLongDate(new Date())}
      />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-7 md:mb-8">
        <StatCard
          label="Active apps"
          value={String(activeApps)}
          subtext={`Out of ${totalApps}`}
          icon={I.apps}
        />
        <StatCard
          label="Current pay period"
          value={periodRange}
          subtext={periodSub}
          icon={I.clock}
          visual={latestPeriod ? <ProgressBar percent={periodProgress} /> : undefined}
        />
        <StatCard
          label="Net balance"
          value={formatMoney(netNow, { signed: netNow !== 0 })}
          subtext={netTrendLabel}
          trend={netTrend}
          icon={I.wallet}
          tint={netNow >= 0 ? "sage" : "neutral"}
        />
        <StatCard
          label="Productivity score"
          value={String(productivity)}
          subtext={productivityLabel}
          icon={I.spark}
          visual={
            <div className="flex items-center justify-between">
              <CircularProgress percent={productivity} />
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-faint">
                /100
              </span>
            </div>
          }
        />
      </div>

      {/* ── Featured app cards ── */}
      <div className="flex items-baseline justify-between mb-3.5">
        <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-ghost">
          Your apps
        </div>
        <div className="text-[12px] text-faint">
          {activeApps} active
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 md:gap-4 mb-8">
        <AppCard
          title="HoursBoard"
          description="Log shifts, track pay periods & total hours."
          href="/dashboard/hoursboard"
          icon={I.clockLg}
          meta={[
            { label: "This pay period", value: periodHoursLabel },
            { label: "Hourly rate", value: formatMoney(employer.hourlyRate) },
          ]}
          visual={hoursSpark.length >= 2 ? <BarChartVisual values={hoursSpark.length ? hoursSpark : [1]} /> : undefined}
        />
        <AppCard
          title="MoneyBoard"
          description="Track income, expenses & net balance."
          href="/dashboard/moneyboard"
          icon={I.walletLg}
          meta={[
            { label: "Net balance", value: formatMoney(netNow) },
            { label: "Across all time", value: formatMoney(lifetime.net) },
          ]}
          visual={moneySpark.some((v) => v !== 0) ? <SparklineVisual values={moneySpark} /> : undefined}
        />
      </div>

      {/* ── Coming soon ── */}
      <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-ghost mb-3">
        Coming soon
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {COMING_SOON.map((m) => (
          <ComingSoonCard
            key={m.id}
            title={m.title}
            description={m.description}
            icon={m.icon}
          />
        ))}
      </div>

      {/* ── Insight (only when there's real signal) ── */}
      {insight && (
        <InsightCard
          title="Daily insight"
          text={insight.text}
          subtext={insight.subtext}
        />
      )}
    </div>
  );
}
