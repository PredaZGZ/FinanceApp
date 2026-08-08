-- Use one ticker for the same stock across Getquin and broker imports while
-- keeping the ISIN as a separate identity field.
UPDATE "stock_trades" SET "symbol" = 'AAPL', "name" = 'Apple', "isin" = 'US0378331005', "assetType" = 'Stock' WHERE "isin" = 'US0378331005' OR "symbol" = 'AAPL';
UPDATE "stock_trades" SET "symbol" = 'ADBE', "name" = 'Adobe', "isin" = 'US00724F1012', "assetType" = 'Stock' WHERE "isin" = 'US00724F1012' OR "symbol" = 'ADBE';
UPDATE "stock_trades" SET "symbol" = 'BABA', "name" = 'Alibaba ADR', "isin" = 'US01609W1027', "assetType" = 'Stock' WHERE "isin" = 'US01609W1027' OR "symbol" = 'BABA';
UPDATE "stock_trades" SET "symbol" = 'COP', "name" = 'ConocoPhillips', "isin" = 'US20825C1045', "assetType" = 'Stock' WHERE "isin" = 'US20825C1045' OR "symbol" = 'COP';
UPDATE "stock_trades" SET "symbol" = 'CVX', "name" = 'Chevron', "isin" = 'US1667641005', "assetType" = 'Stock' WHERE "isin" = 'US1667641005' OR "symbol" = 'CVX';
UPDATE "stock_trades" SET "symbol" = 'DUO', "name" = 'Duolingo', "isin" = 'US26603R1068', "assetType" = 'Stock' WHERE "isin" = 'US26603R1068' OR "symbol" IN ('DUO', 'DUOL');
UPDATE "stock_trades" SET "symbol" = 'INTC', "name" = 'Intel', "isin" = 'US4581401001', "assetType" = 'Stock' WHERE "isin" = 'US4581401001' OR "symbol" = 'INTC';
UPDATE "stock_trades" SET "symbol" = 'NFLX', "name" = 'Netflix', "isin" = 'US64110L1061', "assetType" = 'Stock' WHERE "isin" = 'US64110L1061' OR "symbol" = 'NFLX';
UPDATE "stock_trades" SET "symbol" = 'NVDA', "name" = 'Nvidia', "isin" = 'US67066G1040', "assetType" = 'Stock' WHERE "isin" = 'US67066G1040' OR "symbol" = 'NVDA';
UPDATE "stock_trades" SET "symbol" = 'OXY', "name" = 'Occidental', "isin" = 'US6745991058', "assetType" = 'Stock' WHERE "isin" = 'US6745991058' OR "symbol" = 'OXY';
UPDATE "stock_trades" SET "symbol" = 'SLB', "name" = 'SLB Limited', "isin" = 'AN8068571086', "assetType" = 'Stock' WHERE "isin" = 'AN8068571086' OR "symbol" = 'SLB';
UPDATE "stock_trades" SET "symbol" = 'SMR', "name" = 'Nuscale Power', "assetType" = 'Stock' WHERE "symbol" = 'SMR';
UPDATE "stock_trades" SET "symbol" = 'TSLA', "name" = 'Tesla', "isin" = 'US88160R1014', "assetType" = 'Stock' WHERE "isin" = 'US88160R1014' OR "symbol" = 'TSLA';
UPDATE "stock_trades" SET "symbol" = 'VLO', "name" = 'Valero Energy', "isin" = 'US91913Y1001', "assetType" = 'Stock' WHERE "isin" = 'US91913Y1001' OR "symbol" = 'VLO';
UPDATE "stock_trades" SET "symbol" = 'XOM', "name" = 'Exxon Mobil', "isin" = 'US30231G1022', "assetType" = 'Stock' WHERE "isin" = 'US30231G1022' OR "symbol" = 'XOM';
UPDATE "stock_trades" SET "symbol" = 'CCL', "name" = 'Carnival', "isin" = 'GB0031215220', "assetType" = 'Stock' WHERE "isin" = 'GB0031215220' OR "symbol" = 'CCL';
UPDATE "stock_trades" SET "symbol" = 'MEL', "name" = 'Melia Hotels', "isin" = 'ES0176252718', "assetType" = 'Stock' WHERE "isin" = 'ES0176252718' OR "symbol" = 'MEL';
UPDATE "stock_trades" SET "symbol" = 'MU', "name" = 'Micron Tech', "isin" = 'US5951121038', "assetType" = 'Stock' WHERE "isin" = 'US5951121038' OR "symbol" = 'MU';
UPDATE "stock_trades" SET "symbol" = 'MRVL', "name" = 'Marvell Tech', "isin" = 'US5738741041', "assetType" = 'Stock' WHERE "isin" = 'US5738741041' OR "symbol" = 'MRVL';
UPDATE "stock_trades" SET "symbol" = 'MSFT', "name" = 'Microsoft', "isin" = 'US5949181045', "assetType" = 'Stock' WHERE "isin" = 'US5949181045' OR "symbol" = 'MSFT';
