import yahooFinanceImport from 'yahoo-finance2';

// Force instantiation due to environment mismatch
const yahooFinance = new (yahooFinanceImport as any)();

interface PriceCache {
    [symbol: string]: {
        price: number;
        currency: string;
        timestamp: number;
    }
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export class PriceService {
    private cache: PriceCache = {};

    private readonly SYMBOL_MAP: Record<string, string> = {
        // Mapped based on user's specific funds (ISIN Verified)
        'EMERGING MARKETS STOCK EUR ACC': '0P00012I6A.F', // Vanguard Emerging Markets Stock Index Fund EUR Acc (IE0031786696)
        'MSCI WORLD INDEX P ACC EUR': 'IE00BYX5NX33.SG',  // Fidelity MSCI World Index Fund P-Acc-EUR (IE00BYX5NX33)
    };

    async getPrices(symbols: string[]): Promise<Record<string, { price: number, currency: string }>> {
        const results: Record<string, { price: number, currency: string }> = {};
        const symbolsToFetch: string[] = [];
        const requestMap: Record<string, string> = {}; // Mapped Ticker -> Original Symbol
        const now = Date.now();

        // Check cache & Prepare fetch list
        for (const symbol of symbols) {
            const ticker = this.SYMBOL_MAP[symbol] || symbol;

            const cached = this.cache[ticker]; // Cache by Ticker to avoid dupe fetching
            if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
                results[symbol] = { price: cached.price, currency: cached.currency };
            } else {
                // If not in cache, add to fetch list
                if (!symbolsToFetch.includes(ticker)) {
                    symbolsToFetch.push(ticker);
                }
                // Track who requested this ticker (so we can map back to 'symbol')
                // Note: Multiple symbols might map to same ticker.
                // We need a reverse lookup.
                requestMap[ticker] = symbol; // Simple 1:1 assumption for now, or last wins. 
                // Better: iterate symbolsToFetch later? 
                // Actually, logic below iterates `quotes`. We need to know which Original Symbol implies this Quote.
                // If we have 'Fund A' -> 'IWDA.AS' and 'Fund B' -> 'IWDA.AS'.
                // Quote comes for 'IWDA.AS'. We need to populate results['Fund A'] AND results['Fund B'].
            }
        }

        // Re-loop to handle the cache hit case correctly?
        // Above loop handles cache hits.
        // `symbolsToFetch` now has Tickers (e.g. 'IWDA.AS').

        if (symbolsToFetch.length === 0) {
            return results;
        }

        // Fetch from Yahoo
        try {
            // yahoo-finance2 'quote' can accept an array but it's often safer to do individual or small batches if they vary widely
            // However, 'quote' supports array.
            // @ts-ignore - type definitions might be mismatched for instantiated client
            const quotes = await yahooFinance.quote(symbolsToFetch, { fields: ['symbol', 'regularMarketPrice', 'currency'] });

            // Should return array if multiple symbols, but check
            const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

            for (const quote of quotesArray) {
                if (quote.regularMarketPrice !== undefined && quote.currency) {
                    const data = {
                        price: quote.regularMarketPrice,
                        currency: quote.currency
                    };

                    // Update cache for the TICKER
                    this.cache[quote.symbol] = {
                        ...data,
                        timestamp: now
                    };

                    // Map back to ALL original symbols that requested this ticker
                    for (const originalSymbol of symbols) {
                        const targetTicker = this.SYMBOL_MAP[originalSymbol] || originalSymbol;
                        if (targetTicker === quote.symbol) {
                            results[originalSymbol] = data;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching prices from Yahoo:', error);
            // Return partial results
        }

        return results;
    }

    async search(query: string) {
        try {
            // @ts-ignore
            const results = await yahooFinance.search(query);
            return results.quotes.map((q: any) => ({
                symbol: q.symbol,
                shortname: q.shortname || q.longname,
                exchange: q.exchange,
                score: q.score
            }));
        } catch (error) {
            console.error('Error searching Yahoo:', error);
            return [];
        }
    }
}

export const priceService = new PriceService();
