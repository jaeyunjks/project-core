import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Inline calculations so seed has no local import dependencies
function calcHours(start: string, end: string, breakMins: number): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const worked =
    (endMins > startMins ? endMins - startMins : endMins + 1440 - startMins) -
    breakMins;
  return Math.round((Math.max(0, worked) / 60) * 100) / 100;
}

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log("✓ Seed data already present — skipping.");
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: "Alex",
      email: "alex@demo.local",
    },
  });

  const employer = await prisma.employer.create({
    data: {
      userId: user.id,
      name: "The Café",
      hourlyRate: 13.0,
      payCycle: "fortnightly",
      payPeriodStartDate: "2026-06-16",
      paydayOffsetDays: 4,
      defaultBreakMinutes: 30,
    },
  });

  const shiftData = [
    { date: "2026-06-18", start: "09:00", end: "17:30", break: 30 },
    { date: "2026-06-17", start: "16:00", end: "22:00", break: 0 },
    { date: "2026-06-16", start: "08:30", end: "16:00", break: 30 },
    { date: "2026-06-14", start: "10:00", end: "17:00", break: 30 },
    { date: "2026-06-13", start: "09:00", end: "18:00", break: 45 },
    { date: "2026-06-12", start: "12:00", end: "21:00", break: 30 },
    { date: "2026-06-11", start: "09:00", end: "17:00", break: 30 },
    { date: "2026-06-10", start: "08:00", end: "15:00", break: 30 },
    { date: "2026-06-09", start: "16:00", end: "20:15", break: 0 },
  ];

  for (const s of shiftData) {
    const totalHours = calcHours(s.start, s.end, s.break);
    await prisma.shift.create({
      data: {
        userId: user.id,
        employerId: employer.id,
        shiftDate: s.date,
        startTime: s.start,
        endTime: s.end,
        breakMinutes: s.break,
        totalHours,
        estimatedPay: Math.round(totalHours * employer.hourlyRate * 100) / 100,
      },
    });
  }

  console.log(
    `✓ Seeded: user "${user.name}", employer "${employer.name}", ${shiftData.length} shifts.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
