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

        // Filter only top-ups without conversion rate and not skipped
        const topUps = usdData.cashTransfers.filter(
            t => t.type === 'Cash top-up' && !t.conversionRate && !t.skippedConversion
        );

        if (topUps.length === 0) {
            console.log('Todos los top-ups ya tienen tasa de conversión o han sido omitidos');
            rl.close();
            return;
        }

        console.log(`Encontrados ${topUps.length} top-ups sin tasa de conversión\n`);

        // Process each top-up
        for (const topUp of topUps) {
            console.log('─────────────────────────────────────────');
            console.log(`Fecha: ${topUp.date}`);
            console.log(`Valor USD: $${topUp.value.toFixed(2)}`);
            console.log('');

            const answer = await question('¿Cuántos EUR te costó este depósito? (Escribe "no" si no es conversión, "skip" para saltar): ');

            if (answer.toLowerCase() === 'skip') {
                console.log('Saltado temporalmente\n');
                continue;
            }

            if (answer.toLowerCase() === 'no') {
                topUp.skippedConversion = true;
                console.log('Marcado como NO conversión\n');
                continue;
            }

            const eurCost = parseFloat(parseFloat(answer).toFixed(2));

            if (isNaN(eurCost) || eurCost <= 0) {
                console.log('Valor inválido, omitiendo...\n');
                continue;
            }

            // Calculate conversion rate (EUR/USD)
            // Round to 4 decimals for precision, while keeping it clean
            const conversionRate = parseFloat((eurCost / topUp.value).toFixed(4));

            topUp.eurCost = eurCost;
            topUp.conversionRate = conversionRate;

            console.log(`Guardado: €${eurCost.toFixed(2)} → $${topUp.value.toFixed(2)}`);
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
