-- Getquin exports do not include a trustworthy EUR conversion rate.
-- Leave these values empty so the user can enter the applied conversion later.
UPDATE "stock_trades"
SET
  "conversionRate" = NULL,
  "eurCost" = NULL,
  "eurValue" = NULL
WHERE "source" IN ('getquin_feed', 'getquin_live_dom');
