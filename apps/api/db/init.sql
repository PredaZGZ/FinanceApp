-- CreateEnum (with IF NOT EXISTS check)
DO $$ BEGIN CREATE TYPE "Currency" AS ENUM ('EUR', 'USD');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- CreateEnum (with IF NOT EXISTS check)
DO $$ BEGIN CREATE TYPE "TradeSide" AS ENUM ('Buy', 'Sell');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- CreateTable
CREATE TABLE IF NOT EXISTS "stock_trades" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stock_trades_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE IF NOT EXISTS "cash_transfers" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cash_transfers_pkey" PRIMARY KEY ("id")
);
-- Add unique indexes to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS stock_trades_unique_idx ON stock_trades (date, currency, symbol, side, quantity, price);
CREATE UNIQUE INDEX IF NOT EXISTS cash_transfers_unique_idx ON cash_transfers (date, currency, type, value);
-- NetWorth Tables
CREATE TABLE IF NOT EXISTS networth_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    "isSold" BOOLEAN DEFAULT FALSE,
    "soldAt" TIMESTAMP WITH TIME ZONE,
    "originalCost" DECIMAL NOT NULL,
    "originalCurrency" TEXT,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS networth_asset_valuations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "assetId" UUID NOT NULL REFERENCES networth_assets(id) ON DELETE CASCADE,
    "valuedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    value DECIMAL NOT NULL,
    currency TEXT,
    source TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_networth_assets_category ON networth_assets(category);
CREATE INDEX IF NOT EXISTS idx_networth_assets_is_sold ON networth_assets("isSold");
CREATE INDEX IF NOT EXISTS idx_networth_asset_valuations_asset_id ON networth_asset_valuations("assetId");
CREATE INDEX IF NOT EXISTS idx_networth_asset_valuations_valued_at ON networth_asset_valuations("valuedAt");