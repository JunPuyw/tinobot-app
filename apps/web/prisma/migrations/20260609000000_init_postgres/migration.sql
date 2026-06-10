CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "persona" TEXT,
  "googleId" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "isBanned" BOOLEAN NOT NULL DEFAULT false,
  "credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_daily_usage" (
  "id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "log_date" TEXT NOT NULL,
  "tokens_used" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_daily_usage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GatewaySetting" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "platformMarkupPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vndUsdRate" DOUBLE PRECISION NOT NULL DEFAULT 25000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GatewaySetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "pricingMode" TEXT NOT NULL,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "baseCredits" DOUBLE PRECISION NOT NULL,
  "markupPercent" DOUBLE PRECISION NOT NULL,
  "chargedCredits" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingPackage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceUSD" DOUBLE PRECISION NOT NULL,
  "credits" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PricingPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderConnection" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "name" TEXT,
  "apiKey" TEXT,
  "authType" TEXT NOT NULL DEFAULT 'apikey',
  "priority" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "testStatus" TEXT NOT NULL DEFAULT 'unknown',
  "lastError" TEXT,
  "lastErrorAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "proxyPoolId" TEXT,
  CONSTRAINT "ProviderConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModelCombo" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "models" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "ModelCombo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderNode" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "type" TEXT NOT NULL,
  "apiType" TEXT,
  "baseUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RouterLog" (
  "id" TEXT NOT NULL,
  "requestedModel" TEXT NOT NULL,
  "usedModel" TEXT,
  "success" BOOLEAN NOT NULL,
  "rotated" BOOLEAN NOT NULL DEFAULT false,
  "totalAttempts" INTEGER NOT NULL,
  "attempts" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RouterLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "client_daily_usage_client_id_log_date_key" ON "client_daily_usage"("client_id", "log_date");
CREATE INDEX "PlatformUsage_userId_createdAt_idx" ON "PlatformUsage"("userId", "createdAt");
CREATE INDEX "PricingPackage_isActive_sortOrder_idx" ON "PricingPackage"("isActive", "sortOrder");
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");
CREATE UNIQUE INDEX "ModelCombo_userId_name_key" ON "ModelCombo"("userId", "name");

ALTER TABLE "PlatformUsage"
  ADD CONSTRAINT "PlatformUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProviderConnection"
  ADD CONSTRAINT "ProviderConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ModelCombo"
  ADD CONSTRAINT "ModelCombo_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
