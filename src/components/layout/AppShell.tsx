"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";

// ── Mobile bottom-nav config ────────────────────────────────────────────────

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5 12 3l9 6.5" /><path d="M5 9V20h14V9" />
  </svg>
);
const ClockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" />
  </svg>
);
const WalletIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2.5" /><circle cx="16" cy="13.5" r="1.6" />
  </svg>
);
const LogoutIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 17l5-5-5-5M20 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
  </svg>
);

const TargetIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" />
  </svg>
);

const mobileNav = [
  { href: "/dashboard", label: "Home", icon: <HomeIcon /> },
  { href: "/dashboard/hoursboard", label: "Hours", icon: <ClockIcon /> },
  { href: "/dashboard/moneyboard", label: "Money", icon: <WalletIcon /> },
  { href: "/dashboard/goals", label: "Goals", icon: <TargetIcon /> },
];

// ── Shell ────────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: ReactNode;
  user: { name: string; email: string };
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <Sidebar user={user} />

      {/* Page content */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 border-t border-border-soft bg-white/95 backdrop-blur-sm flex items-center justify-around px-3 z-50">
        {mobileNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-colors",
                active ? "text-sage" : "text-pale"
              )}
            >
              {item.icon}
              <span className={cn("text-[10px]", active ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            className="flex flex-col items-center gap-0.5 text-pale hover:text-sage transition-colors"
          >
            <LogoutIcon />
            <span className="text-[10px] font-medium">Sign out</span>
          </button>
        </form>
      </nav>
    </div>
  );
}
