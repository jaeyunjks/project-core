export interface Shift {
  id: string;
  date: string;
  dayLabel: string;
  dayNumber: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  hoursWorked: number;
  grossPay: number;
  notes?: string;
}

export interface PayPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  totalGross: number;
  totalShifts: number;
  hourlyRate: number;
  nextPayday: string;
  nextPaydayDaysAway: number;
  shifts: Shift[];
}

export interface Module {
  id: string;
  name: string;
  description: string;
  href: string;
  status: "active" | "coming-soon";
  icon: "clock" | "wallet" | "book" | "target" | "briefcase";
}
