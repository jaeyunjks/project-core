-- MoneyBoard financial expansion. Additive and legacy-safe: existing entries
-- keep their identity and receive a noon Australia/Sydney occurrence instant.
-- The separate precision flag prevents that synthetic noon from being shown as
-- a known transaction time.

BEGIN;

ALTER TABLE "MoneyEntry" ADD COLUMN "occurredAt" TIMESTAMPTZ(3);
ALTER TABLE "MoneyEntry" ADD COLUMN "occurrenceTimeKnown" BOOLEAN NOT NULL DEFAULT false;
UPDATE "MoneyEntry"
SET "occurredAt" = (("date"::date + TIME '12:00') AT TIME ZONE 'Australia/Sydney')
WHERE "occurredAt" IS NULL;
ALTER TABLE "MoneyEntry" ALTER COLUMN "occurredAt" SET NOT NULL;
ALTER TABLE "MoneyEntry" ALTER COLUMN "occurrenceTimeKnown" SET DEFAULT true;

CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'everyday',
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "openingBalance" DECIMAL(19,2) NOT NULL DEFAULT 0,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountTransfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DECIMAL(19,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountTransfer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AccountTransfer_distinct_accounts" CHECK ("fromAccountId" <> "toAccountId"),
    CONSTRAINT "AccountTransfer_positive_amount" CHECK ("amount" > 0)
);

CREATE TABLE "SavingsGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(19,2) NOT NULL,
    "targetDate" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "accountId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavingsGoal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SavingsGoal_positive_target" CHECK ("targetAmount" > 0)
);

ALTER TABLE "MoneyEntry" ADD COLUMN "accountId" TEXT;
ALTER TABLE "MoneyEntry" ADD COLUMN "recurringBillId" TEXT;
ALTER TABLE "RecurringBill" ADD COLUMN "nextPaymentDate" TEXT;
ALTER TABLE "RecurringBill" ADD COLUMN "accountId" TEXT;
ALTER TABLE "RecurringBill" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "RecurringBill" ADD COLUMN "description" TEXT;
ALTER TABLE "RecurringBill" ADD COLUMN "paidThroughDate" TEXT;

CREATE UNIQUE INDEX "FinancialAccount_userId_name_currency_key" ON "FinancialAccount"("userId", "name", "currency");
CREATE INDEX "FinancialAccount_userId_archivedAt_idx" ON "FinancialAccount"("userId", "archivedAt");
CREATE INDEX "AccountTransfer_userId_occurredAt_idx" ON "AccountTransfer"("userId", "occurredAt");
CREATE INDEX "AccountTransfer_fromAccountId_idx" ON "AccountTransfer"("fromAccountId");
CREATE INDEX "AccountTransfer_toAccountId_idx" ON "AccountTransfer"("toAccountId");
CREATE INDEX "SavingsGoal_userId_active_idx" ON "SavingsGoal"("userId", "active");
CREATE INDEX "SavingsGoal_accountId_idx" ON "SavingsGoal"("accountId");
CREATE INDEX "MoneyEntry_userId_occurredAt_idx" ON "MoneyEntry"("userId", "occurredAt");
CREATE INDEX "MoneyEntry_accountId_idx" ON "MoneyEntry"("accountId");
CREATE INDEX "MoneyEntry_recurringBillId_idx" ON "MoneyEntry"("recurringBillId");
CREATE INDEX "RecurringBill_accountId_idx" ON "RecurringBill"("accountId");
CREATE INDEX "RecurringBill_categoryId_idx" ON "RecurringBill"("categoryId");

ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountTransfer" ADD CONSTRAINT "AccountTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_recurringBillId_fkey" FOREIGN KEY ("recurringBillId") REFERENCES "RecurringBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MoneyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
