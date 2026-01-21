DO $$ BEGIN CREATE TYPE "Currency" AS ENUM ('EUR', 'USD');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN CREATE TYPE "TradeSide" AS ENUM ('Buy', 'Sell');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

-- Users Table (Must be created first for Foreign Keys)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Trades
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
    "userId" UUID REFERENCES users(id),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stock_trades_pkey" PRIMARY KEY ("id")
);

-- Cash Transfers
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
    "userId" UUID REFERENCES users(id),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cash_transfers_pkey" PRIMARY KEY ("id")
);

-- NetWorth Assets
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
    "userId" UUID REFERENCES users(id),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NetWorth Valuations
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

-- Salary Records
CREATE TABLE IF NOT EXISTS salary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMP WITH TIME ZONE,
    "grossSalary" DECIMAL,
    "netSalary" DECIMAL,
    company TEXT,
    "fileName" TEXT,
    "fileStorageKey" TEXT,
    notes TEXT,
    "userId" UUID REFERENCES users(id),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flexible Breakdown Items
CREATE TABLE IF NOT EXISTS salary_breakdown_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "salaryId" UUID NOT NULL REFERENCES salary_records(id) ON DELETE CASCADE,
    concept TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    type TEXT NOT NULL, -- 'payment' (devengos) or 'deduction' (deducciones)
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Import History Table
CREATE TABLE IF NOT EXISTS import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    filename TEXT NOT NULL,
    status TEXT NOT NULL,
    "recordsProcessed" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "userId" UUID REFERENCES users(id)
);

-- Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS stock_trades_unique_idx ON stock_trades (date, currency, symbol, side, quantity, price);
CREATE UNIQUE INDEX IF NOT EXISTS cash_transfers_unique_idx ON cash_transfers (date, currency, type, value);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_stock_trades_user_id ON stock_trades("userId");
CREATE INDEX IF NOT EXISTS idx_cash_transfers_user_id ON cash_transfers("userId");
CREATE INDEX IF NOT EXISTS idx_networth_assets_user_id ON networth_assets("userId");
CREATE INDEX IF NOT EXISTS idx_networth_assets_category ON networth_assets(category);
CREATE INDEX IF NOT EXISTS idx_networth_assets_is_sold ON networth_assets("isSold");
CREATE INDEX IF NOT EXISTS idx_networth_asset_valuations_asset_id ON networth_asset_valuations("assetId");
CREATE INDEX IF NOT EXISTS idx_networth_asset_valuations_valued_at ON networth_asset_valuations("valuedAt");
CREATE INDEX IF NOT EXISTS idx_salary_records_user_id ON salary_records("userId");
CREATE INDEX IF NOT EXISTS idx_salary_records_date ON salary_records(date);
CREATE INDEX IF NOT EXISTS idx_salary_breakdown_items_salary_id ON salary_breakdown_items("salaryId");
CREATE INDEX IF NOT EXISTS idx_import_history_user_id ON import_history("userId");

-- Salary PDF Passwords
CREATE TABLE IF NOT EXISTS salary_pdf_passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "encryptedPassword" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    label TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_salary_pdf_passwords_user_id ON salary_pdf_passwords("userId");