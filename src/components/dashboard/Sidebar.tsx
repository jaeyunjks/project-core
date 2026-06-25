"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";

// ── Icons (consistent stroke style across the sidebar) ──────────────────────

const I = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5" /><path d="M5 9V20h14V9" />
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" />
    </svg>
  ),
  wallet: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <circle cx="16" cy="13.5" r="1.6" />
    </svg>
  ),
  insights: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18V8M9 18V4M15 18v-7M21 18V12" />
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M9 14h6M9 17h4" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  help: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17l5-5-5-5M20 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </svg>
  ),
};

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof I;
  soon?: boolean;
}

const primary: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/dashboard/hoursboard", label: "HoursBoard", icon: "clock" },
  { href: "/dashboard/moneyboard", label: "MoneyBoard", icon: "wallet" },
];

const secondary: NavItem[] = [
  { href: "#", label: "Insights", icon: "insights", soon: true },
  { href: "#", label: "Calendar", icon: "calendar", soon: true },
  { href: "#", label: "Reports", icon: "reports", soon: true },
];

const tertiary: NavItem[] = [
  { href: "/dashboard/hoursboard/settings", label: "Settings", icon: "settings" },
  { href: "#", label: "Help & Support", icon: "help", soon: true },
];

interface User {
  name: string;
  email: string;
}

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : href !== "#" && pathname.startsWith(href);

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="hidden md:flex flex-col w-[232px] shrink-0 border-r border-border-soft bg-[#FAF7F0]/70 backdrop-blur-sm h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 pt-5 pb-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-[10px] overflow-hidden shadow-[0_4px_10px_rgba(62,91,77,0.18)] group-hover:scale-[1.04] transition-transform">
            <Image
              src="/coreboard.png"
              alt="Coreboard"
              width={72}
              height={72}
              priority
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              Coreboard
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-ghost mt-0.5">
              v0.1
            </span>
          </div>
        </Link>
      </div>

      {/* Nav — scrollable region between brand + footer */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-5">
        <NavGroup label="Workspace" items={primary} isActive={isActive} />
        <NavGroup label="Analytics" items={secondary} isActive={isActive} />
        <NavGroup label="Account" items={tertiary} isActive={isActive} />

        {/* Subtle upgrade panel */}
        <div className="mt-2 mx-1 rounded-[12px] border border-border-soft bg-gradient-to-br from-sage/[0.08] to-transparent p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-sage" />
            <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.14em] text-sage">
              Coreboard Pro
            </span>
          </div>
          <p className="text-[11.5px] text-muted leading-snug mb-2.5">
            Unlock insights, exports & more apps as they ship.
          </p>
          <button
            type="button"
            className="text-[11px] font-semibold text-sage hover:text-sage-deep"
          >
            Learn more →
          </button>
        </div>
      </nav>

      {/* User card + logout */}
      <div className="border-t border-border-soft p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-[10px]">
          <div className="w-9 h-9 rounded-[10px] bg-sage text-paper flex items-center justify-center text-[13px] font-semibold shadow-[0_3px_8px_rgba(62,91,77,0.22)] shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-ink truncate leading-tight">
              {user.name}
            </div>
            <div className="text-[11px] text-faint truncate leading-tight mt-0.5">
              {user.email}
            </div>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[12.5px] font-medium text-subtle hover:bg-paper hover:text-ink transition-colors"
          >
            {I.logout}
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  items,
  isActive,
}: {
  label: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
}) {
  return (
    <div>
      <div className="px-3 mb-1.5 text-[9.5px] font-semibold font-mono uppercase tracking-[0.16em] text-ghost">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(item.href);
          const inner = (
            <span
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[13px] font-medium transition-colors",
                active
                  ? "bg-sage/10 text-sage-deep"
                  : item.soon
                    ? "text-faint cursor-default"
                    : "text-subtle hover:bg-paper hover:text-ink"
              )}
            >
              <span className={cn("flex items-center justify-center w-5 h-5", active && "text-sage")}>
                {I[item.icon]}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="text-[9px] font-semibold font-mono uppercase tracking-wider text-ghost border border-border-soft rounded px-1 py-px">
                  Soon
                </span>
              )}
              {active && <span className="w-1 h-1 rounded-full bg-sage" />}
            </span>
          );
          return item.soon ? (
            <div key={item.label}>{inner}</div>
          ) : (
            <Link key={item.label} href={item.href}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
