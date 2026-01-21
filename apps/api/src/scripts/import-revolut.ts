import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RevolutStatement, CurrencyData, StockTrade, CashTransfer, PortfolioItem, AccountSummary } from '../common/types/revolut.js';
import { revolutService } from '../modules/import/revolut.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_PATH = path.resolve(__dirname, '../../tmp/statement_revolut.pdf');
const OUTPUT_PATH = path.resolve(__dirname, '../../tmp/revolut_data.json');

async function main() {
    try {
        console.log(`Reading PDF from: ${PDF_PATH}`);

        if (!fs.existsSync(PDF_PATH)) {
            console.error('Error: PDF file not found at path:', PDF_PATH);
            process.exit(1);
        }

        const dataBuffer = fs.readFileSync(PDF_PATH);

        console.log('Extracting structured data...');

        // Use the centralized service to parse the PDF
        const statement = await revolutService.parseStatement(dataBuffer);

        const {
            currencies,
            accountNumber,
            generatedDate,
            period
        } = statement;

        // Try to preserve existing conversion rates
        try {
            if (fs.existsSync(OUTPUT_PATH)) {
                const existingData: RevolutStatement = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
                const existingUsd = existingData.currencies.find(c => c.currency === 'USD');
                const newUsd = currencies.find(c => c.currency === 'USD');

                if (existingUsd && newUsd && newUsd.cashTransfers) {
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
                    newUsd.cashTransfers.forEach(t => {
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

        // Save to JSON
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(statement, null, 2));

        console.log('\nData extracted successfully!');
        console.log(`Output saved to: ${OUTPUT_PATH}`);

        // Summary stats
        const eur = currencies.find(c => c.currency === 'EUR');
        const usd = currencies.find(c => c.currency === 'USD');

        console.log('\nSummary:');
        if (eur) {
            console.log(`- EUR Stock Trades: ${eur.stockTrades?.length || 0}`);
            console.log(`- EUR Cash Transfers: ${eur.cashTransfers?.length || 0}`);
            console.log(`- EUR Portfolio items: ${eur.portfolio?.length || 0}`);
        }
        if (usd) {
            console.log(`- USD Stock Trades: ${usd.stockTrades?.length || 0}`);
            console.log(`- USD Cash Transfers: ${usd.cashTransfers?.length || 0}`);
            console.log(`- USD Portfolio items: ${usd.portfolio?.length || 0}`);
        }

    } catch (error) {
        console.error('Error parsing PDF:', error);
    }
}

main();

