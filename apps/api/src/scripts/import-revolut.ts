import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import type { RevolutStatement, CurrencyData, StockTrade, CashTransfer, PortfolioItem, AccountSummary } from '../types/revolut.js';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse-fork');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_PATH = path.resolve(__dirname, '../../tmp/statement_revolut.pdf');
const OUTPUT_PATH = path.resolve(__dirname, '../../tmp/revolut_data.json');

function parseAccountInfo(text: string) {
    const generatedMatch = text.match(/Generated on the (\d{2} \w{3} \d{4})/);
    const nameMatch = text.match(/Account name(.+?)Account number/s);
    const accountNumberMatch = text.match(/Account number(\d+)/);
    const periodMatch = text.match(/Period(\d{2} \w{3} \d{4}) - (\d{2} \w{3} \d{4})/);

    return {
        generatedDate: generatedMatch ? generatedMatch[1] : '',
        accountNumber: accountNumberMatch ? accountNumberMatch[1] : '',
        period: periodMatch ? {
            start: periodMatch[1],
            end: periodMatch[2]
        } : { start: '', end: '' }
    };
}

function parseAccountSummary(text: string, currency: 'EUR' | 'USD'): AccountSummary {
    const pattern = new RegExp(`${currency} Account summary[\\s\\S]*?Starting\\s*Ending[\\s\\S]*?Stocks value[^\\d]*([\\d,.]+)[^\\d]*([\\d,.]+)[\\s\\S]*?Cash value[^\\d]*([\\d,.]+)[^\\d]*([\\d,.]+)[\\s\\S]*?Total[^\\d]*([\\d,.]+)[^\\d]*([\\d,.]+)`);
    const match = text.match(pattern);

    if (!match) {
        return {
            starting: { stocksValue: 0, cashValue: 0, total: 0 },
            ending: { stocksValue: 0, cashValue: 0, total: 0 }
        };
    }

    const parseValue = (val: string) => parseFloat(val.replace(/,/g, ''));

    return {
        starting: {
            stocksValue: parseValue(match[1]),
            cashValue: parseValue(match[3]),
            total: parseValue(match[5])
        },
        ending: {
            stocksValue: parseValue(match[2]),
            cashValue: parseValue(match[4]),
            total: parseValue(match[6])
        }
    };
}

function parsePortfolio(text: string, currency: 'EUR' | 'USD'): PortfolioItem[] {
    const portfolio: PortfolioItem[] = [];

    // Clean the text by removing extra spaces and newlines
    const cleanText = text.replace(/\s+/g, ' ');

    // Find portfolio section
    const pattern = new RegExp(`${currency} Portfolio breakdown.*?SymbolCompanyISINQuantityPriceValue% of Portfolio(.*?)(?:${currency} Transactions|Get help)`, 'i');
    const match = cleanText.match(pattern);

    if (!match) return portfolio;

    const content = match[1];

    // Find all ISINs first (they are the most reliable anchor)
    const isinPattern = /((?:US|IE|LU)[A-Z0-9]{10})/g;
    const isins = [...content.matchAll(isinPattern)];

    for (const isinMatch of isins) {
        const isin = isinMatch[1];
        const isinIndex = isinMatch.index!;

        // Get text before ISIN (contains Symbol and Company)
        let beforeIsin = content.substring(Math.max(0, isinIndex - 150), isinIndex).trim();

        // Remove any previous percentage markers to clean the text
        // This removes data from previous portfolio items
        const percentMatch = beforeIsin.lastIndexOf('%');
        if (percentMatch !== -1) {
            beforeIsin = beforeIsin.substring(percentMatch + 1).trim();
        }

        // The pattern is: SYMBOL Company ISIN
        // Symbol is uppercase letters (2-5 chars), immediately followed by company name starting with uppercase
        // Match: sequence of 2-5 uppercase letters followed by text ending at ISIN
        const symbolCompanyMatch = beforeIsin.match(/([A-Z]{2,5})([A-Z][a-z].*?)$/);

        if (!symbolCompanyMatch) {
            continue;
        }

        const symbol = symbolCompanyMatch[1];
        const company = symbolCompanyMatch[2].trim();

        // Get text after ISIN for quantity, price, value, percentage
        const afterIsin = content.substring(isinIndex + isin.length, Math.min(content.length, isinIndex + 200));

        // Pattern: Quantity Price(€/$) Value(€/$) Percentage%
        const dataMatch = afterIsin.match(/([\d.]+)\s*(?:US\$|€)([\d,.]+)\s*(?:US\$|€)([\d,.]+)\s*([\d.]+)%/);

        if (dataMatch) {
            portfolio.push({
                symbol,
                company,
                isin,
                quantity: parseFloat(dataMatch[1]),
                price: parseFloat(dataMatch[2].replace(/,/g, '')),
                value: parseFloat(dataMatch[3].replace(/,/g, '')),
                portfolioPercentage: parseFloat(dataMatch[4])
            });
        }
    }

    return portfolio;
}

function parseTransactions(text: string, currency: 'EUR' | 'USD'): { stockTrades: StockTrade[], cashTransfers: CashTransfer[] } {
    const stockTrades: StockTrade[] = [];
    const cashTransfers: CashTransfer[] = [];

    // Clean the text
    const cleanText = text.replace(/\s+/g, ' ');

    // Find transactions section
    const pattern = new RegExp(`${currency} Transactions.*?DateSymbolTypeQuantityPriceSideValueFeesCommission(.*?)(?:Get help|This statement|Account Statement)`, 'i');
    const match = cleanText.match(pattern);

    if (!match) return { stockTrades, cashTransfers };

    const content = match[1];

    // Pattern for date: DD MMM YYYY HH:MM:SS GMT
    const datePattern = /(\d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT)/g;
    const dateMatches = [...content.matchAll(datePattern)];

    for (let i = 0; i < dateMatches.length; i++) {
        const match = dateMatches[i];
        const date = match[1];
        const dateIndex = match.index!;

        // Find end of this transaction (start of next date or end of content)
        const nextMatch = dateMatches[i + 1];
        const nextDateIndex = nextMatch ? nextMatch.index! : content.length;

        const transactionText = content.substring(dateIndex + date.length, nextDateIndex).trim();

        // Cash top-up
        if (transactionText.includes('Cash top-up')) {
            const valueMatch = transactionText.match(/Cash top-up\s*(?:€|US\$)([\d,.]+)/);
            if (valueMatch) {
                cashTransfers.push({
                    date,
                    currency,
                    type: 'Cash top-up',
                    value: parseFloat(valueMatch[1].replace(/,/g, '')),
                    fees: 0,
                    commission: 0
                });
            }
        }
        // Cash withdrawal
        else if (transactionText.includes('Cash withdrawal')) {
            const valueMatch = transactionText.match(/Cash withdrawal\s*-?\s*(?:€|US\$)([\d,.]+)/);
            if (valueMatch) {
                cashTransfers.push({
                    date,
                    currency,
                    type: 'Cash withdrawal',
                    value: -parseFloat(valueMatch[1].replace(/,/g, '')),
                    fees: 0,
                    commission: 0
                });
            }
        }
        // Trade
        else if (transactionText.includes('Trade - Market')) {
            // Pattern: SYMBOL Trade - Market Quantity Price Buy/Sell Value Fees Commission
            const tradeMatch = transactionText.match(/([A-Z]{3,5})\s*Trade - Market\s*([\d.]+)\s*(?:€|US\$)([\d,.]+)\s*(Buy|Sell)\s*(?:€|US\$)([\d,.]+)\s*(?:€|US\$)([\d,.]+)\s*(?:€|US\$)([\d,.]+)/);

            if (tradeMatch) {
                const side = tradeMatch[4] === 'Sell' ? 'Sell' : 'Buy';
                stockTrades.push({
                    date,
                    currency,
                    symbol: tradeMatch[1],
                    type: 'Trade - Market',
                    quantity: parseFloat(tradeMatch[2]),
                    price: parseFloat(tradeMatch[3].replace(/,/g, '')),
                    side,
                    value: parseFloat(tradeMatch[5].replace(/,/g, '')) * (side === 'Sell' ? 1 : 1),
                    fees: parseFloat(tradeMatch[6].replace(/,/g, '')),
                    commission: parseFloat(tradeMatch[7].replace(/,/g, ''))
                });
            }
        }
    }

    return { stockTrades, cashTransfers };
}

async function main() {
    try {
        console.log(`Reading PDF from: ${PDF_PATH}`);

        if (!fs.existsSync(PDF_PATH)) {
            console.error('Error: PDF file not found at path:', PDF_PATH);
            process.exit(1);
        }

        const dataBuffer = fs.readFileSync(PDF_PATH);
        const data = await pdf(dataBuffer);

        console.log('Extracting structured data...');

        const accountInfo = parseAccountInfo(data.text);

        const currencies: CurrencyData[] = [];

        // Parse EUR data
        const eurSummary = parseAccountSummary(data.text, 'EUR');
        const eurPortfolio = parsePortfolio(data.text, 'EUR');
        const { stockTrades: eurStockTrades, cashTransfers: eurCashTransfers } = parseTransactions(data.text, 'EUR');

        currencies.push({
            currency: 'EUR',
            accountSummary: eurSummary,
            portfolio: eurPortfolio,
            stockTrades: eurStockTrades,
            cashTransfers: eurCashTransfers
        });

        // Parse USD data
        const usdSummary = parseAccountSummary(data.text, 'USD');
        const usdPortfolio = parsePortfolio(data.text, 'USD');
        const { stockTrades: usdStockTrades, cashTransfers: usdCashTransfers } = parseTransactions(data.text, 'USD');

        // Try to preserve existing conversion rates
        try {
            if (fs.existsSync(OUTPUT_PATH)) {
                const existingData: RevolutStatement = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
                const existingUsd = existingData.currencies.find(c => c.currency === 'USD');

                if (existingUsd) {
                    // Create a map of date+value -> conversion data
                    const conversionMap = new Map<string, { eurCost?: number, conversionRate?: number, skippedConversion?: boolean }>();

                    existingUsd.cashTransfers.forEach(t => {
                        if ((t.conversionRate && t.eurCost) || t.skippedConversion) {
                            const key = `${t.date}-${t.value}`;
                            conversionMap.set(key, {
                                eurCost: t.eurCost,
                                conversionRate: t.conversionRate,
                                skippedConversion: t.skippedConversion
                            });
                        }
                    });

                    // Apply to new data
                    usdCashTransfers.forEach(t => {
                        const key = `${t.date}-${t.value}`;
                        const saved = conversionMap.get(key);
                        if (saved) {
                            if (saved.skippedConversion) {
                                t.skippedConversion = true;
                            } else {
                                t.eurCost = saved.eurCost;
                                t.conversionRate = saved.conversionRate;
                            }
                        }
                    });

                    console.log(`Preserved ${conversionMap.size} conversion rates/flags`);
                }
            }
        } catch (e) {
            console.warn('Could not preserve existing data:', e);
        }

        currencies.push({
            currency: 'USD',
            accountSummary: usdSummary,
            portfolio: usdPortfolio,
            stockTrades: usdStockTrades,
            cashTransfers: usdCashTransfers
        });

        const statement: Partial<RevolutStatement> = {
            generatedDate: accountInfo.generatedDate,
            period: accountInfo.period,
            accountNumber: accountInfo.accountNumber,
            currencies
        };

        // Save to JSON
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(statement, null, 2));

        console.log('\nData extracted successfully!');
        console.log(`Output saved to: ${OUTPUT_PATH}`);
        console.log('\nSummary:');
        console.log(`- EUR Stock Trades: ${eurStockTrades.length}`);
        console.log(`- EUR Cash Transfers: ${eurCashTransfers.length}`);
        console.log(`- EUR Portfolio items: ${eurPortfolio.length}`);
        console.log(`- USD Stock Trades: ${usdStockTrades.length}`);
        console.log(`- USD Cash Transfers: ${usdCashTransfers.length}`);
        console.log(`- USD Portfolio items: ${usdPortfolio.length}`);

    } catch (error) {
        console.error('Error parsing PDF:', error);
    }
}

main();
