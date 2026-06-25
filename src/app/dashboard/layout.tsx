import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/server/queries/hoursboard";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <AppShell user={{ name: user.name, email: user.email }}>
      {children}
    </AppShell>
  );
}
