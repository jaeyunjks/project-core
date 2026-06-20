"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ── Icons ─────────────────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 11.5 12 5l8 6.5" /><path d="M6 10.5V19h12v-8.5" />
  </svg>
);
const ClockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" />
  </svg>
);
const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="9" r="3.2" /><path d="M5.5 19c1-3.2 3.5-4.6 6.5-4.6s5.5 1.4 6.5 4.6" />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 6v12M6 12h12" />
  </svg>
);
const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);
const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

// ── Nav config ────────────────────────────────────────────────────────────────

const primaryNav = [
  { href: "/dashboard", label: "Home", icon: <HomeIcon /> },
  { href: "/dashboard/hoursboard", label: "Hours", icon: <ClockIcon /> },
  { href: "/profile", label: "You", icon: <UserIcon /> },
];

const hoursboardSubnav = [
  { href: "/dashboard/hoursboard/add", label: "Add Shift", icon: <PlusIcon /> },
  { href: "/dashboard/hoursboard/shifts", label: "History", icon: <ListIcon /> },
  { href: "/dashboard/hoursboard/settings", label: "Settings", icon: <SettingsIcon /> },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const isPrimary = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const inHoursBoard = pathname.startsWith("/dashboard/hoursboard");

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row">
      {/* Desktop left rail */}
      <nav className="hidden md:flex flex-col gap-1 w-[200px] shrink-0 border-r border-border-soft bg-surface px-3 py-6 sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-2.5 px-3 mb-8">
          <div className="w-8 h-8 rounded-[9px] bg-sage flex items-center justify-center shadow-[0_3px_8px_rgba(62,91,77,0.22)]">
            <div className="w-3 h-3 border-[2px] border-white rounded-[3px]" />
          </div>
          <span className="font-semibold text-[15px] text-ink tracking-tight">
            Project Core
          </span>
        </div>

        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-[14px] font-medium transition-colors",
              isPrimary(item.href)
                ? "bg-sage-tint text-sage"
                : "text-subtle hover:bg-paper hover:text-ink"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {/* HoursBoard sub-nav — visible when in /dashboard/hoursboard/* */}
        {inHoursBoard && (
          <div className="mt-1 ml-3 pl-3 border-l border-border-soft flex flex-col gap-0.5">
            {hoursboardSubnav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-2 rounded-[9px] text-[13px] font-medium transition-colors",
                  pathname === item.href
                    ? "bg-sage-tint text-sage"
                    : "text-subtle hover:bg-paper hover:text-ink"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Page content */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav — 3 primary tabs only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 border-t border-border-soft bg-white flex items-center justify-around px-3 z-50">
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              isPrimary(item.href) ? "text-sage" : "text-pale"
            )}
          >
            {item.icon}
            <span
              className={cn(
                "text-[10px]",
                isPrimary(item.href) ? "font-semibold" : "font-medium"
              )}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
