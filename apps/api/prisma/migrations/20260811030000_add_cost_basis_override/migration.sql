-- Add the optional cost-basis override used by non-taxable internal transfers.
-- The migration is intentionally data-free so it is safe to publish in the
-- open-source repository.
ALTER TABLE "stock_trades"
  ADD COLUMN IF NOT EXISTS "costBasisOverride" DOUBLE PRECISION;
