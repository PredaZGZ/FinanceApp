-- Getquin combines assets from different brokers. Fund ISINs are MyInvestor
-- positions and are always denominated in EUR; other assets keep the currency
-- recorded by Getquin.
UPDATE "stock_trades"
SET
  "assetType" = 'Fund',
  "currency" = 'EUR'
WHERE "source" IN ('getquin_feed', 'getquin_live_dom')
  AND "isin" IN (
    'IE000ZYRH0Q7',
    'IE0031786696',
    'IE00B42W4L06',
    'IE00BFMXXD54',
    'IE00BYX5NX33',
    'LU0625737910'
  );

-- Native EUR trades need no FX conversion. USD trades retain their original
-- USD price/value and must be entered manually in EUR later.
UPDATE "stock_trades"
SET
  "eurCost" = CASE WHEN "currency" = 'EUR' THEN "value" ELSE NULL END,
  "eurValue" = CASE WHEN "currency" = 'EUR' THEN "value" ELSE NULL END,
  "conversionRate" = NULL
WHERE "source" IN ('getquin_feed', 'getquin_live_dom');
