import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as _scrypt } from "crypto";
import { promisify } from "util";

const prisma = new PrismaClient();
const scrypt = promisify(_scrypt) as (
  pw: string | Buffer,
  salt: string | Buffer,
  keylen: number
) => Promise<Buffer>;

async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(plain, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

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

function dow(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

function awardType(dateStr: string): string {
  const day = dow(dateStr);
  if (day === 6) return "saturday";
  if (day === 0) return "sunday";
  return "weekday";
}

const MULTIPLIERS: Record<string, number> = {
  weekday: 1.0,
  saturday: 1.25,
  sunday: 1.5,
};

function payRate(dateStr: string, base: number): number {
  const type = awardType(dateStr);
  return Math.round(base * (MULTIPLIERS[type] ?? 1.0) * 100) / 100;
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
      passwordHash: await hashPassword("demo1234"),
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

  // Legacy shifts
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

  // Pay period: Jun 16–29 (partially filled)
  const base = employer.hourlyRate;

  // Days with actual hours worked (Mon–Fri only, realistic café hours)
  const filledDays: Record<string, number> = {
    "2026-06-16": 7.5,  // Mon
    "2026-06-17": 6.0,  // Tue
    "2026-06-18": 8.0,  // Wed
    "2026-06-19": 7.5,  // Thu
    "2026-06-20": 7.0,  // Fri (today)
    // Jun 21 Sat — off
    // Jun 22 Sun — off
    "2026-06-23": 7.5,  // Mon
    "2026-06-24": 6.5,  // Tue
    // rest blank (future)
  };

  const period = await prisma.payPeriod.create({
    data: {
      userId: user.id,
      startDate: "2026-06-16",
      endDate: "2026-06-29",
      status: "active",
    },
  });

  // Generate all 14 days
  const start = new Date(2026, 5, 16); // Jun 16 2026
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${day}`;
    const type = awardType(dateStr);
    const rate = payRate(dateStr, base);
    const hours = filledDays[dateStr] ?? 0;

    await prisma.payPeriodDay.create({
      data: {
        payPeriodId: period.id,
        date: dateStr,
        workHours: hours,
        payAwardType: type,
        payRate: rate,
        notes: null,
      },
    });
  }

  console.log(
    `✓ Seeded: user "${user.name}" (${user.email} / demo1234), ` +
    `employer "${employer.name}", ${shiftData.length} legacy shifts, ` +
    `1 pay period (Jun 16–29) with 14 days.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
