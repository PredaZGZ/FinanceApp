
CREATE DATABASE IF NOT EXISTS "finance-app";

-- CreateEnum (with IF NOT EXISTS check)
DO $$ BEGIN
    CREATE TYPE "Currency" AS ENUM ('EUR', 'USD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (with IF NOT EXISTS check)
DO $$ BEGIN
    CREATE TYPE "TradeSide" AS ENUM ('Buy', 'Sell');
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
