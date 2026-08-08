-- Rebuild MyInvestor rows from the supplied CSV pair after fixing decimal and
-- order matching. These are EUR-native operations; no FX conversion is set.
DELETE FROM "stock_trades"
WHERE "source" = 'myinvestor_movements';

DELETE FROM "cash_transfers"
WHERE "source" = 'myinvestor_movements';
