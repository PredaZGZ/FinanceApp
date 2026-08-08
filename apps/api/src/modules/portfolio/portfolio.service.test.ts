import assert from 'node:assert/strict';
import test from 'node:test';
import { PortfolioService } from './portfolio.service';
import type { StockTrade } from './portfolio.types';

const trade = (overrides: Partial<StockTrade>): StockTrade => ({
    date: new Date('2025-01-01T00:00:00Z'),
    symbol: 'ACME',
    currency: 'EUR',
    quantity: 1,
    price: 10,
    side: 'Buy',
    fees: 0,
    commission: 0,
    ...overrides,
});

test('combines a position when buys and sells use different currencies', () => {
    const service = new PortfolioService();
    const results = service.calculatePortfolioSummary([
        trade({ currency: 'EUR' }),
        trade({ currency: 'USD', price: 20 }),
    ], 'FIFO', 'EUR', [{ date: new Date('2024-12-31T00:00:00Z'), rate: 0.9, currency: 'USD' }]);

    assert.equal(results.length, 1);
    assert.equal(results[0].symbol, 'ACME');
    assert.equal(results[0].remainingShares, 2);
});

test('processes buys before sells when timestamps are equal', () => {
    const service = new PortfolioService();
    const result = service.calculateFIFO([
        trade({ date: new Date('2025-01-02T00:00:00Z'), side: 'Sell' }),
        trade({ date: new Date('2025-01-02T00:00:00Z'), side: 'Buy' }),
    ]);

    assert.equal(result.remainingShares, 0);
});

test('marks EUR totals unavailable when no historical rate exists', () => {
    const service = new PortfolioService();
    const [result] = service.calculatePortfolioSummary([
        trade({ currency: 'USD' }),
    ], 'FIFO', 'EUR', [{ date: new Date('2025-02-01T00:00:00Z'), rate: 0.9, currency: 'USD' }]);

    assert.equal(result.conversionComplete, false);
    assert.equal(result.totalCostBasisEur, undefined);
});

test('rejects sales that exceed owned shares', () => {
    const service = new PortfolioService();
    assert.throws(() => service.calculateFIFO([
        trade({ quantity: 1 }),
        trade({ date: new Date('2025-01-02T00:00:00Z'), side: 'Sell', quantity: 2 }),
    ]), /only 1 available/);
});
