-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'USD');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('Buy', 'Sell');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_trades" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currency" "Currency" NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Trade - Market',
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "side" "TradeSide" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "fees" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transfers" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currency" "Currency" NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "fees" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "eurCost" DOUBLE PRECISION,
    "conversionRate" DOUBLE PRECISION,
    "skippedConversion" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "networth_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "soldAt" TIMESTAMPTZ(6),
    "originalCost" DECIMAL NOT NULL,
    "originalCurrency" TEXT,
    "notes" TEXT,
    "userId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "networth_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "networth_asset_valuations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assetId" UUID NOT NULL,
    "valuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" DECIMAL NOT NULL,
    "currency" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "networth_asset_valuations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" TIMESTAMPTZ(6),
    "grossSalary" DECIMAL,
    "netSalary" DECIMAL,
    "company" TEXT,
    "fileName" TEXT,
    "fileStorageKey" TEXT,
    "notes" TEXT,
    "userId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_breakdown_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salaryId" UUID NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_breakdown_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,

    CONSTRAINT "import_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_pdf_passwords" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_pdf_passwords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "stock_trades_userId_idx" ON "stock_trades"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_trades_userId_date_currency_symbol_side_quantity_pric_key" ON "stock_trades"("userId", "date", "currency", "symbol", "side", "quantity", "price");

-- CreateIndex
CREATE INDEX "cash_transfers_userId_idx" ON "cash_transfers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_transfers_userId_date_currency_type_value_key" ON "cash_transfers"("userId", "date", "currency", "type", "value");

-- CreateIndex
CREATE INDEX "networth_assets_userId_idx" ON "networth_assets"("userId");

-- CreateIndex
CREATE INDEX "networth_assets_category_idx" ON "networth_assets"("category");

-- CreateIndex
CREATE INDEX "networth_assets_isSold_idx" ON "networth_assets"("isSold");

-- CreateIndex
CREATE INDEX "networth_asset_valuations_assetId_idx" ON "networth_asset_valuations"("assetId");

-- CreateIndex
CREATE INDEX "networth_asset_valuations_valuedAt_idx" ON "networth_asset_valuations"("valuedAt");

-- CreateIndex
CREATE INDEX "salary_records_userId_idx" ON "salary_records"("userId");

-- CreateIndex
CREATE INDEX "salary_records_date_idx" ON "salary_records"("date");

-- CreateIndex
CREATE INDEX "salary_breakdown_items_salaryId_idx" ON "salary_breakdown_items"("salaryId");

-- CreateIndex
CREATE INDEX "import_history_userId_idx" ON "import_history"("userId");

-- CreateIndex
CREATE INDEX "salary_pdf_passwords_userId_idx" ON "salary_pdf_passwords"("userId");

-- AddForeignKey
ALTER TABLE "stock_trades" ADD CONSTRAINT "stock_trades_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transfers" ADD CONSTRAINT "cash_transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networth_assets" ADD CONSTRAINT "networth_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networth_asset_valuations" ADD CONSTRAINT "networth_asset_valuations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "networth_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_breakdown_items" ADD CONSTRAINT "salary_breakdown_items_salaryId_fkey" FOREIGN KEY ("salaryId") REFERENCES "salary_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_history" ADD CONSTRAINT "import_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_pdf_passwords" ADD CONSTRAINT "salary_pdf_passwords_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
