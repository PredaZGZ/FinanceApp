-- A fund can have several movement descriptions. Use its ISIN as the stable
-- identity while keeping the human-readable fund name separate.
UPDATE "stock_trades"
SET "symbol" = "isin"
WHERE "source" = 'myinvestor_movements'
  AND "assetType" = 'Fund'
  AND "isin" IS NOT NULL;
