import type { RevolutStatement, CurrencyData, StockTrade, CashTransfer, PortfolioItem, AccountSummary } from '../../common/types/revolut.js';
import { Currency as PrismaCurrency, TradeSide } from '../../generated/prisma/enums';
import { prisma } from '../../common/db/prisma';
import { randomUUID } from 'node:crypto';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { standardFontDataUrl } from '../../common/utils/pdf';

export class RevolutService {
    private async getTextFromPdf(buffer: Buffer): Promise<string> {
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
            standardFontDataUrl,
        });

        const doc = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    }

    async parseStatement(buffer: Buffer): Promise<RevolutStatement> {
        let text = '';
        try {
            text = await this.getTextFromPdf(buffer);
        } catch (error: any) {
            console.error('PDF Parse Error:', error);
            throw new Error(`Failed to parse PDF: ${error.message}`);
        }


        const accountInfo = this.parseAccountInfo(text);
        const currencies: CurrencyData[] = [];

        // Parse EUR data
        const eurSummary = this.parseAccountSummary(text, 'EUR');
        const eurPortfolio = this.parsePortfolio(text, 'EUR');
        const { stockTrades: eurStockTrades, cashTransfers: eurCashTransfers } = this.parseTransactions(text, 'EUR');

        currencies.push({
            currency: 'EUR',
            accountSummary: eurSummary,
            portfolio: eurPortfolio,
            stockTrades: eurStockTrades,
            cashTransfers: eurCashTransfers
        });

        // Parse USD data
        const usdSummary = this.parseAccountSummary(text, 'USD');
        const usdPortfolio = this.parsePortfolio(text, 'USD');
        const { stockTrades: usdStockTrades, cashTransfers: usdCashTransfers } = this.parseTransactions(text, 'USD');

        currencies.push({
            currency: 'USD',
            accountSummary: usdSummary,
            portfolio: usdPortfolio,
            stockTrades: usdStockTrades,
            cashTransfers: usdCashTransfers
        });

        return {
            generatedDate: accountInfo.generatedDate,
            period: accountInfo.period,
            accountNumber: accountInfo.accountNumber,
            accountHolder: { name: '', address: [], country: '' }, // Placeholder as it wasn't in the original script
            currencies
        };
    }

    async saveToDb(userId: string, data: RevolutStatement): Promise<number> {
        return prisma.$transaction(async (tx) => {
            let insertedCount = 0;

            for (const currencyData of data.currencies) {
                // Stock Trades
                if (currencyData.stockTrades) {
                    for (const trade of currencyData.stockTrades) {
                        const conversionRate = this.findConversionRate(trade.date, trade.currency, currencyData.cashTransfers);
                        const result = await tx.stockTrade.createMany({
                            data: {
                                id: randomUUID(),
                                date: new Date(trade.date),
                                currency: trade.currency as PrismaCurrency,
                                symbol: trade.symbol,
                                type: trade.type,
                                quantity: trade.quantity,
                                price: trade.price,
                                side: trade.side as TradeSide,
                                value: trade.value,
                                eurCost: conversionRate === null ? null : trade.value * conversionRate,
                                eurValue: conversionRate === null ? null : trade.value * conversionRate,
                                conversionRate,
                                fees: trade.fees,
                                commission: trade.commission,
                                source: 'revolut_statement',
                                userId,
                                updatedAt: new Date(),
                            },
                            skipDuplicates: true,
                        });
                        insertedCount += result.count;
                    }
                }

                // Cash Transfers
                if (currencyData.cashTransfers) {
                    for (const transfer of currencyData.cashTransfers) {
                        const result = await tx.cashTransfer.createMany({
                            data: {
                                id: randomUUID(),
                                date: new Date(transfer.date),
                                currency: transfer.currency as PrismaCurrency,
                                type: transfer.type,
                                value: transfer.value,
                                fees: transfer.fees,
                                commission: transfer.commission,
                                eurCost: transfer.eurCost || null,
                                conversionRate: transfer.conversionRate || null,
                                skippedConversion: transfer.skippedConversion || false,
                                source: 'revolut_statement',
                                userId,
                                updatedAt: new Date(),
                            },
                            skipDuplicates: true,
                        });
                        insertedCount += result.count;
                    }
                }
            }
            return insertedCount;

        });
    }

    private findConversionRate(
        tradeDate: string,
        currency: 'EUR' | 'USD',
        cashTransfers: CashTransfer[] = [],
    ): number | null {
        if (currency === 'EUR') return 1;

        const timestamp = new Date(tradeDate).getTime();
        const candidates = cashTransfers
            .filter((transfer) => transfer.conversionRate && transfer.conversionRate > 0)
            .map((transfer) => ({
                rate: transfer.conversionRate as number,
                distance: Math.abs(new Date(transfer.date).getTime() - timestamp),
            }))
            .sort((left, right) => left.distance - right.distance);

        return candidates[0]?.rate ?? null;
    }

    private parseAccountInfo(text: string) {
        const generatedMatch = text.match(/Generated on the (\d{2} \w{3} \d{4})/);
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

    private parseAccountSummary(text: string, currency: 'EUR' | 'USD'): AccountSummary {
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

    private parsePortfolio(text: string, currency: 'EUR' | 'USD'): PortfolioItem[] {
        const portfolio: PortfolioItem[] = [];
        const cleanText = text.replace(/\s+/g, ' ');
        const pattern = new RegExp(`${currency} Portfolio breakdown.*?Symbol.*?Company.*?ISIN.*?Quantity.*?Price.*?Value.*?% of Portfolio(.*?)(?:${currency} Transactions|Get help)`, 'i');
        const match = cleanText.match(pattern);

        if (!match) return portfolio;

        const content = match[1];
        const isinPattern = /((?:US|IE|LU)[A-Z0-9]{10})/g;
        const isins = [...content.matchAll(isinPattern)];

        for (const isinMatch of isins) {
            const isin = isinMatch[1];
            const isinIndex = isinMatch.index!;
            let beforeIsin = content.substring(Math.max(0, isinIndex - 150), isinIndex).trim();
            const percentMatch = beforeIsin.lastIndexOf('%');
            if (percentMatch !== -1) {
                beforeIsin = beforeIsin.substring(percentMatch + 1).trim();
            }

            const symbolCompanyMatch = beforeIsin.match(/([A-Z]{2,5})([A-Z][a-z].*?)$/);

            if (!symbolCompanyMatch) continue;

            const symbol = symbolCompanyMatch[1];
            const company = symbolCompanyMatch[2].trim();
            const afterIsin = content.substring(isinIndex + isin.length, Math.min(content.length, isinIndex + 200));
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

    private parseTransactions(text: string, currency: 'EUR' | 'USD'): { stockTrades: StockTrade[], cashTransfers: CashTransfer[] } {
        const stockTrades: StockTrade[] = [];
        const cashTransfers: CashTransfer[] = [];
        const cleanText = text.replace(/\s+/g, ' ');
        // Capture until the next "Account summary" (start of next currency block) or End of String.
        // We use [\s\S]*? to capture across newlines (though we cleaned them, just in case).
        // We look for "Account summary" as a delimiter because that's how sections start.
        const pattern = new RegExp(`${currency} Transactions.*?Date.*?Symbol.*?Type.*?Quantity.*?Price.*?Side.*?Value.*?Fees.*?Commission([\\s\\S]*?)(?:(?:EUR|USD) Account summary|$)`, 'i');
        const match = cleanText.match(pattern);

        if (!match) return { stockTrades, cashTransfers };

        const content = match[1];
        const datePattern = /(\d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT)/g;
        const dateMatches = [...content.matchAll(datePattern)];

        for (let i = 0; i < dateMatches.length; i++) {
            const match = dateMatches[i];
            const date = match[1];
            const dateIndex = match.index!;
            const nextMatch = dateMatches[i + 1];
            const nextDateIndex = nextMatch ? nextMatch.index! : content.length;
            const transactionText = content.substring(dateIndex + date.length, nextDateIndex).trim();

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
            } else if (transactionText.includes('Cash withdrawal')) {
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
            } else if (transactionText.includes('Trade - Market') || transactionText.includes('Trade - Limit')) {
                // Regex to capture Symbol (potentially merged), Type (Market/Limit), Quantity, Price, Side, Value, Fees, Commission
                const tradeMatch = transactionText.match(/([A-Z0-9]{3,5})\s*(Trade - (?:Market|Limit))\s*([\d.]+)\s*(?:€|US\$)([\d,.]+)\s*(Buy|Sell)\s*(?:€|US\$)([\d,.]+)\s*(?:€|US\$)([\d,.]+)\s*(?:€|US\$)([\d,.]+)/);

                if (tradeMatch) {
                    const side = tradeMatch[5] === 'Sell' ? 'Sell' : 'Buy';
                    stockTrades.push({
                        date,
                        currency,
                        symbol: tradeMatch[1],
                        type: tradeMatch[2] as 'Trade - Market' | 'Trade - Limit', // 'Trade - Market' or 'Trade - Limit'
                        quantity: parseFloat(tradeMatch[3]),
                        price: parseFloat(tradeMatch[4].replace(/,/g, '')),
                        side,
                        value: parseFloat(tradeMatch[6].replace(/,/g, '')) * (side === 'Sell' ? 1 : 1),
                        fees: parseFloat(tradeMatch[7].replace(/,/g, '')),
                        commission: parseFloat(tradeMatch[8].replace(/,/g, ''))
                    });
                } else {
                    console.warn(`[RevolutService] Failed to parse Trade line: "${transactionText}"`);
                }
            } else if (transactionText.includes('Dividend')) {
                // Regex for Dividend: SymbolDividendValueTax?Comm?
                // Example: AAPLDividendUS$0.05US$0US$0
                const dividendMatch = transactionText.match(/([A-Z0-9]{3,5})Dividend\s*(?:€|US\$)([\d,.]+)\s*(?:€|US\$)([\d,.]+)\s*(?:€|US\$)([\d,.]+)/);

                if (dividendMatch) {
                    cashTransfers.push({
                        date,
                        currency,
                        type: 'Dividend',
                        value: parseFloat(dividendMatch[2].replace(/,/g, '')),
                        fees: parseFloat(dividendMatch[3].replace(/,/g, '')), // Assuming 2nd value is tax/fee
                        commission: parseFloat(dividendMatch[4].replace(/,/g, '')) // Assuming 3rd value is comm
                    });
                    // Also link to symbol? cash_transfers doesn't have symbol. 
                    // User asked to categorize as Dividend.
                } else {
                    console.warn(`[RevolutService] Failed to parse Dividend line: "${transactionText}"`);
                }
            } else if (transactionText.includes('Custody fee')) {
                // Regex for Custody fee: Custody fee-US$0.01US$0US$0
                const feeMatch = transactionText.match(/Custody fee\s*-?\s*(?:€|US\$)([\d,.]+)\s*(?:€|US\$)([\d,.]+)\s*(?:€|US\$)([\d,.]+)/);

                if (feeMatch) {
                    cashTransfers.push({
                        date,
                        currency,
                        type: 'Custody Fee',
                        value: -parseFloat(feeMatch[1].replace(/,/g, '')), // Fee is negative
                        fees: 0,
                        commission: 0
                    });
                } else {
                    console.warn(`[RevolutService] Failed to parse Custody fee line: "${transactionText}"`);
                }
            } else {
                // Log other potential transaction types
                if (transactionText.length > 20) { // Ignore short noise
                    // console.log(`[RevolutService] Skipped line: "${transactionText}"`);
                }
            }
        }

        return { stockTrades, cashTransfers };
    }
}

export const revolutService = new RevolutService();
