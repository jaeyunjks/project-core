import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const historicalColumns = {
  AwardLevel: ["id", "userId", "employerId", "code", "description", "baseRate", "createdAt", "updatedAt"],
  BudgetPeriod: ["id", "userId", "periodType", "startDate", "endDate", "currency", "moneyIn", "protectValue", "createdAt", "updatedAt"],
  CommittedItem: ["id", "budgetPeriodId", "name", "amount", "recur", "sortOrder", "createdAt", "updatedAt"],
  Employer: ["id", "userId", "name", "hourlyRate", "defaultBreakMinutes", "createdAt", "updatedAt"],
  Goal: ["id", "userId", "title", "emoji", "type", "status", "targetValue", "currentValue", "unit", "autoSource", "autoCurrency", "deadline", "createdAt", "updatedAt", "completedAt"],
  GoalMilestone: ["id", "goalId", "userId", "title", "done", "sortOrder", "createdAt", "updatedAt"],
  MoneyCategory: ["id", "userId", "key", "label", "kind", "color", "icon", "sortOrder", "createdAt", "updatedAt"],
  MoneyEntry: ["id", "userId", "kind", "amount", "currency", "date", "categoryId", "note", "source", "payPeriodId", "createdAt", "updatedAt"],
  PayPeriod: ["id", "userId", "employerId", "name", "startDate", "endDate", "status", "createdAt", "updatedAt"],
  PayPeriodDay: ["id", "payPeriodId", "date", "workHours", "dayType", "awardLevelId", "payRate", "notes", "createdAt", "updatedAt"],
  RecurringBill: ["id", "userId", "name", "amount", "currency", "cadence", "dueDay", "active", "sortOrder", "createdAt", "updatedAt"],
  Session: ["id", "token", "userId", "expiresAt", "createdAt"],
  Shift: ["id", "userId", "employerId", "shiftDate", "startTime", "endTime", "breakMinutes", "totalHours", "estimatedPay", "notes", "createdAt", "updatedAt"],
  User: ["id", "name", "email", "passwordHash", "createdAt", "updatedAt"],
} as const;

type HistoricalTable = keyof typeof historicalColumns;

export interface RecoveryManifest {
  generatedAt: string;
  historical: Record<HistoricalTable, { count: number; idHash: string; rowHash: string }>;
  schema: { tables: string[]; columns: Record<string, string[]> };
  financialTotals: Array<{ currency: string; kind: string; count: number; amount: string }>;
  workTotals: { payPeriodDays: number; workHours: string; estimatedPay: string };
  orphanCounts: Record<string, number>;
}

function quote(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(normalize(value))).digest("hex");
}

export async function captureRecoveryManifest(url: string): Promise<RecoveryManifest> {
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const historical = {} as RecoveryManifest["historical"];
    for (const [table, columns] of Object.entries(historicalColumns) as Array<[HistoricalTable, readonly string[]]>) {
      const selection = columns.map(quote).join(", ");
      const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT ${selection} FROM ${quote(table)} ORDER BY "id"`,
      );
      historical[table] = {
        count: rows.length,
        idHash: hash(rows.map((row) => row.id)),
        rowHash: hash(rows),
      };
    }

    const tableRows = await db.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    );
    const columnRows = await db.$queryRawUnsafe<Array<{ table_name: string; column_name: string }>>(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`,
    );
    const schemaColumns: Record<string, string[]> = {};
    for (const row of columnRows) (schemaColumns[row.table_name] ??= []).push(row.column_name);

    const financialTotalsRaw = await db.$queryRawUnsafe<Array<{ currency: string; kind: string; count: bigint; amount: string }>>(
      `SELECT "currency", "kind", COUNT(*) AS count, COALESCE(SUM("amount"), 0)::text AS amount FROM "MoneyEntry" GROUP BY "currency", "kind" ORDER BY "currency", "kind"`,
    );
    const [workTotals] = await db.$queryRawUnsafe<Array<{ payPeriodDays: bigint; workHours: string; estimatedPay: string }>>(
      `SELECT COUNT(*) AS "payPeriodDays", COALESCE(SUM("workHours"), 0)::text AS "workHours", COALESCE(SUM("workHours" * "payRate"), 0)::text AS "estimatedPay" FROM "PayPeriodDay"`,
    );
    const orphanRows = await db.$queryRawUnsafe<Array<{ relation: string; count: bigint }>>(`
      SELECT 'MoneyEntry.userId' AS relation, COUNT(*) AS count FROM "MoneyEntry" c LEFT JOIN "User" p ON p.id = c."userId" WHERE p.id IS NULL
      UNION ALL SELECT 'MoneyEntry.categoryId', COUNT(*) FROM "MoneyEntry" c LEFT JOIN "MoneyCategory" p ON p.id = c."categoryId" WHERE p.id IS NULL
      UNION ALL SELECT 'MoneyEntry.payPeriodId', COUNT(*) FROM "MoneyEntry" c LEFT JOIN "PayPeriod" p ON p.id = c."payPeriodId" WHERE c."payPeriodId" IS NOT NULL AND p.id IS NULL
      UNION ALL SELECT 'BudgetPeriod.userId', COUNT(*) FROM "BudgetPeriod" c LEFT JOIN "User" p ON p.id = c."userId" WHERE p.id IS NULL
      UNION ALL SELECT 'RecurringBill.userId', COUNT(*) FROM "RecurringBill" c LEFT JOIN "User" p ON p.id = c."userId" WHERE p.id IS NULL
      UNION ALL SELECT 'PayPeriod.employerId', COUNT(*) FROM "PayPeriod" c LEFT JOIN "Employer" p ON p.id = c."employerId" WHERE p.id IS NULL
      UNION ALL SELECT 'PayPeriodDay.payPeriodId', COUNT(*) FROM "PayPeriodDay" c LEFT JOIN "PayPeriod" p ON p.id = c."payPeriodId" WHERE p.id IS NULL
      UNION ALL SELECT 'Shift.employerId', COUNT(*) FROM "Shift" c LEFT JOIN "Employer" p ON p.id = c."employerId" WHERE p.id IS NULL
      ORDER BY relation
    `);

    return {
      generatedAt: new Date().toISOString(),
      historical,
      schema: { tables: tableRows.map((row) => row.table_name), columns: schemaColumns },
      financialTotals: financialTotalsRaw.map((row) => ({ ...row, count: Number(row.count) })),
      workTotals: { payPeriodDays: Number(workTotals.payPeriodDays), workHours: workTotals.workHours, estimatedPay: workTotals.estimatedPay },
      orphanCounts: Object.fromEntries(orphanRows.map((row) => [row.relation, Number(row.count)])),
    };
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const outIndex = process.argv.indexOf("--out");
  const outputPath = outIndex >= 0 ? process.argv[outIndex + 1] : undefined;
  const url = process.env.RECOVERY_DATABASE_URL;
  if (!url) throw new Error("RECOVERY_DATABASE_URL is required.");
  if (!outputPath) throw new Error("Pass --out with a manifest path outside the repository.");
  const manifest = await captureRecoveryManifest(url);
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  console.log(`Wrote a redacted recovery manifest for ${Object.keys(manifest.historical).length} historical tables.`);
}

if (process.argv[1]?.endsWith("moneyboard-recovery-manifest.ts")) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
