-- The broker statements supplied by the user are the authoritative history.
-- Remove the derived Getquin copies before importing those exact statements.
DELETE FROM "stock_trades"
WHERE "source" IN ('getquin_feed', 'getquin_live_dom');

DELETE FROM "cash_transfers"
WHERE "source" IN ('getquin_feed', 'getquin_live_dom');
