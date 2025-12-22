import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import type { RevolutStatement } from '../common/types/revolut.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.resolve(__dirname, '../../tmp/revolut_data.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function main() {
    try {
        // Read the JSON file
        const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
        const data: RevolutStatement = JSON.parse(rawData);

        console.log('🔍 Buscando cash top-ups en USD...\n');

        // Find USD currency data
        const usdData = data.currencies?.find(c => c.currency === 'USD');

        if (!usdData) {
            console.log('No se encontró cuenta USD');
            rl.close();
            return;
        }

        // Filter top-ups and withdrawals without conversion rate and not skipped
        const transfers = usdData.cashTransfers.filter(
            t => (t.type === 'Cash top-up' || t.type === 'Cash withdrawal') && !t.conversionRate && !t.skippedConversion
        );

        if (transfers.length === 0) {
            console.log('Todos los top-ups/withdrawals ya tienen tasa de conversión o han sido omitidos');
            rl.close();
            return;
        }

        console.log(`Encontrados ${transfers.length} movimientos sin tasa de conversión\n`);

        // Process each transfer
        for (const transfer of transfers) {
            console.log('─────────────────────────────────────────');
            console.log(`Fecha: ${transfer.date}`);
            console.log(`Tipo: ${transfer.type}`);
            console.log(`Valor USD: $${transfer.value.toFixed(2)}`);
            console.log('');

            const promptText = transfer.type === 'Cash top-up'
                ? '¿Cuántos EUR te costó este depósito? (Escribe "no" si no es conversión, "skip" para saltar): '
                : '¿Cuántos EUR recibiste por este retiro? (Escribe "no" si no es conversión, "skip" para saltar): ';

            const answer = await question(promptText);

            if (answer.toLowerCase() === 'skip') {
                console.log('Saltado temporalmente\n');
                continue;
            }

            if (answer.toLowerCase() === 'no') {
                transfer.skippedConversion = true;
                console.log('Marcado como NO conversión\n');
                continue;
            }

            const eurValue = parseFloat(parseFloat(answer).toFixed(2));

            if (isNaN(eurValue) || eurValue <= 0) {
                console.log('Valor inválido, omitiendo...\n');
                continue;
            }

            // Calculate conversion rate (EUR/USD)
            // For top-up (positive USD): Rate = EUR / USD
            // For withdrawal (negative USD): Rate = EUR / |USD|
            const conversionRate = parseFloat((eurValue / Math.abs(transfer.value)).toFixed(4));

            transfer.eurCost = eurValue; // Or eurReceived, using same field for simplicity
            transfer.conversionRate = conversionRate;

            console.log(`Guardado: €${eurValue.toFixed(2)} ↔ $${Math.abs(transfer.value).toFixed(2)}`);
            console.log(`Tasa de conversión: ${conversionRate.toFixed(4)} EUR/USD\n`);
        }

        // Save updated data
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

        console.log('─────────────────────────────────────────');
        console.log('Datos guardados exitosamente!');
        console.log(`Archivo: ${DATA_PATH}`);

        rl.close();

    } catch (error) {
        console.error('Error:', error);
        rl.close();
    }
}

main();
