-- Bridge the schema changes that were historically applied with `prisma db push`.
-- This migration intentionally precedes the MoneyBoard financial expansion so
-- a fresh PostgreSQL database can replay the complete schema history.

BEGIN;

-- HoursBoard changes made after the initial migration.
ALTER TABLE "Employer" DROP COLUMN "payCycle";
ALTER TABLE "Employer" DROP COLUMN "payPeriodStartDate";
ALTER TABLE "Employer" DROP COLUMN "paydayOffsetDays";

ALTER TABLE "PayPeriod" ADD COLUMN "employerId" TEXT NOT NULL;
CREATE INDEX "PayPeriod_employerId_idx" ON "PayPeriod"("employerId");
ALTER TABLE "PayPeriod" ADD CONSTRAINT "PayPeriod_employerId_fkey"
  FOREIGN KEY ("employerId") REFERENCES "Employer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- MoneyBoard changes made after the initial migration.
ALTER TABLE "MoneyEntry" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'AUD';

CREATE TABLE "BudgetPeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "moneyIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protectValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BudgetPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringBill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "cadence" TEXT NOT NULL,
    "dueDay" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecurringBill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommittedItem" (
    "id" TEXT NOT NULL,
    "budgetPeriodId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recur" TEXT NOT NULL DEFAULT 'Monthly',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommittedItem_pkey" PRIMARY KEY ("id")
);

-- GoalTracker changes made after the initial migration.
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🎯',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "targetValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "autoSource" TEXT NOT NULL DEFAULT 'none',
    "autoCurrency" TEXT,
    "deadline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoalMilestone" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoalMilestone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BudgetPeriod_userId_currency_periodType_startDate_key"
  ON "BudgetPeriod"("userId", "currency", "periodType", "startDate");
CREATE INDEX "BudgetPeriod_userId_periodType_idx" ON "BudgetPeriod"("userId", "periodType");
CREATE INDEX "RecurringBill_userId_cadence_idx" ON "RecurringBill"("userId", "cadence");
CREATE INDEX "CommittedItem_budgetPeriodId_idx" ON "CommittedItem"("budgetPeriodId");
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");
CREATE INDEX "GoalMilestone_goalId_idx" ON "GoalMilestone"("goalId");

ALTER TABLE "BudgetPeriod" ADD CONSTRAINT "BudgetPeriod_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommittedItem" ADD CONSTRAINT "CommittedItem_budgetPeriodId_fkey"
  FOREIGN KEY ("budgetPeriodId") REFERENCES "BudgetPeriod"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalMilestone" ADD CONSTRAINT "GoalMilestone_goalId_fkey"
  FOREIGN KEY ("goalId") REFERENCES "Goal"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalMilestone" ADD CONSTRAINT "GoalMilestone_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
