-- Both Microsoft operations in the Getquin import are USD trades.
UPDATE "stock_trades"
SET
  "currency" = 'USD',
  "eurCost" = NULL,
  "eurValue" = NULL,
  "conversionRate" = NULL
WHERE "source" IN ('getquin_feed', 'getquin_live_dom')
  AND "isin" = 'US5949181045';
