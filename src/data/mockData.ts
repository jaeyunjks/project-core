import type { Module } from "@/types";

/** Static config for the dashboard module launcher — not real data */
export const modules: Module[] = [
  {
    id: "hoursboard",
    name: "HoursBoard",
    description: "Log shifts, track pay periods & total hours.",
    href: "/dashboard/hoursboard",
    status: "active",
    icon: "clock",
  },
  {
    id: "moneyboard",
    name: "MoneyBoard",
    description: "Track income, expenses & net balance.",
    href: "/dashboard/moneyboard",
    status: "active",
    icon: "wallet",
  },
  {
    id: "study",
    name: "Study Planner",
    description: "Plan sessions, track progress.",
    href: "#",
    status: "coming-soon",
    icon: "book",
  },
  {
    id: "goals",
    name: "Goal Tracker",
    description: "Set, track, and hit your goals.",
    href: "#",
    status: "coming-soon",
    icon: "target",
  },
  {
    id: "career",
    name: "Career Tracker",
    description: "Log applications, interviews, outcomes.",
    href: "#",
    status: "coming-soon",
    icon: "briefcase",
  },
];
