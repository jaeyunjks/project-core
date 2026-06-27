import {
  getCurrentUser,
  getAllEmployers,
  getAwardLevels,
} from "@/server/queries/hoursboard";
import { BackButton } from "@/components/ui/BackButton";
import { EmployerSettings } from "@/components/features/hoursboard/EmployerSettings";

export const metadata = { title: "HoursBoard Settings — Coreboard" };

export default async function HoursBoardSettingsPage() {
  const user = await getCurrentUser();
  const employers = await getAllEmployers(user.id);

  const employersWithAwards = await Promise.all(
    employers.map(async (emp) => ({
      id: emp.id,
      name: emp.name,
      hourlyRate: emp.hourlyRate,
      defaultBreakMinutes: emp.defaultBreakMinutes,
      awards: await getAwardLevels(user.id, emp.id),
    }))
  );

  return (
    <div className="px-5 py-4 max-w-lg mx-auto md:px-8 md:py-8 pb-28">
      <div className="flex items-center justify-between h-11 mb-6">
        <BackButton fallback="/dashboard/hoursboard" />
        <span className="text-[17px] font-semibold text-ink">Settings</span>
        <div className="w-[38px]" />
      </div>

      <EmployerSettings employers={employersWithAwards} />
    </div>
  );
}
