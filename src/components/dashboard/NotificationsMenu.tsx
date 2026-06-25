"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type NotificationKind = "info" | "success" | "warn";

export interface DashboardNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  cta?: string;
}

interface Props {
  notifications: DashboardNotification[];
}

const KIND_TINT: Record<NotificationKind, string> = {
  info: "bg-sage/10 text-sage",
  success: "bg-sage/10 text-sage-deep",
  warn: "bg-[#F4E6D6] text-[#A47B3F]",
};

const KIND_ICON: Record<NotificationKind, React.ReactNode> = {
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </svg>
  ),
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  warn: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  ),
};

export function NotificationsMenu({ notifications }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasUnread = notifications.length > 0;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={hasUnread ? `Notifications (${notifications.length} new)` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative w-11 h-11 rounded-[12px] backdrop-blur-sm border flex items-center justify-center text-subtle hover:text-ink transition-colors",
          open
            ? "bg-white border-border text-ink"
            : "bg-white/70 border-border-soft hover:border-border"
        )}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a1.99 1.99 0 0 1-3.4 0" />
        </svg>
        {hasUnread && (
          <span className="absolute top-2.5 right-2.5 min-w-[14px] h-[14px] px-1 rounded-full bg-sage text-paper text-[9px] font-semibold flex items-center justify-center leading-none tabular-nums">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[340px] bg-white border border-border-soft rounded-[14px] shadow-[0_18px_44px_rgba(0,0,0,0.16)] overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 h-11 border-b border-border-soft">
            <span className="text-[12.5px] font-semibold text-ink">Notifications</span>
            {hasUnread && (
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-sage">
                {notifications.length} new
              </span>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center mx-auto mb-3 text-faint">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-[13px] text-ink font-medium">You&apos;re all caught up</p>
                <p className="text-[12px] text-muted mt-1">
                  We&apos;ll surface things here as they come up.
                </p>
              </div>
            ) : (
              <ul className="py-1">
                {notifications.map((n) => {
                  const inner = (
                    <div className="flex items-start gap-3 px-4 py-3 hover:bg-paper transition-colors">
                      <span
                        className={cn(
                          "w-7 h-7 rounded-[8px] shrink-0 flex items-center justify-center",
                          KIND_TINT[n.kind]
                        )}
                      >
                        {KIND_ICON[n.kind]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-ink leading-snug">
                          {n.title}
                        </div>
                        <div className="text-[12px] text-muted leading-snug mt-0.5">
                          {n.body}
                        </div>
                        {n.cta && (
                          <span className="text-[11.5px] font-semibold text-sage mt-1.5 inline-flex items-center gap-1">
                            {n.cta}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id} className="border-b border-border-soft last:border-0">
                      {n.href ? (
                        <Link href={n.href} onClick={() => setOpen(false)}>
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
