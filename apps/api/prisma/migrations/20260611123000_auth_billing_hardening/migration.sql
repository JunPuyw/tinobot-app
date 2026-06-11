ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

CREATE TABLE IF NOT EXISTS "PaymentOrder" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT,
  "amountUSD" DOUBLE PRECISION NOT NULL,
  "amountVND" DOUBLE PRECISION,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "transferContent" TEXT,
  "qrUrl" TEXT,
  "bankId" TEXT,
  "accountNo" TEXT,
  "accountName" TEXT,
  "expiresAt" TIMESTAMP(3),
  "externalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "creditsEarned" DOUBLE PRECISION,
  CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentOrder_transferContent_key" ON "PaymentOrder"("transferContent");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentOrder_externalId_key" ON "PaymentOrder"("externalId");
CREATE INDEX IF NOT EXISTS "PaymentOrder_workspaceId_createdAt_idx" ON "PaymentOrder"("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentOrder_provider_status_idx" ON "PaymentOrder"("provider", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentOrder_userId_fkey'
  ) THEN
    ALTER TABLE "PaymentOrder"
      ADD CONSTRAINT "PaymentOrder_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
