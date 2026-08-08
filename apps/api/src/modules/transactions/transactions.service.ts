import { Currency } from '../../generated/prisma/enums';
import { prisma } from '../../common/db/prisma';
import type { GetTransactionsQuery } from './transactions.schema';

export class TransactionsService {
    async getTransactions(userId: string, filters: GetTransactionsQuery) {
        const { page, limit, from, to, currency, symbol, type } = filters;
        const where = {
            userId,
            ...(from || to ? {
                date: {
                    ...(from ? { gte: new Date(from) } : {}),
                    ...(to ? { lte: new Date(to) } : {}),
                },
            } : {}),
            ...(currency ? { currency: currency as Currency } : {}),
            ...(symbol ? { symbol } : {}),
            ...(type ? { type } : {}),
        };

        const [transactions, totalCount] = await Promise.all([
            prisma.stockTrade.findMany({
                where,
                orderBy: { date: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            }),
            prisma.stockTrade.count({ where }),
        ]);

        return {
            data: transactions.map(transaction => ({
                ...transaction,
                quantity: Number(transaction.quantity),
                price: Number(transaction.price),
                value: Number(transaction.value),
                fees: Number(transaction.fees),
                commission: Number(transaction.commission),
            })),
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    }

    async getExchangeRates(userId: string) {
        // Exchange rates might be shared or user specific? 
        // Assuming we look at user's own transfer history for inferred rates
        const transfers = await prisma.cashTransfer.findMany({
            where: { userId, conversionRate: { not: null } },
            select: { date: true, conversionRate: true, currency: true },
            orderBy: { date: 'asc' },
        });
        return transfers.map(transfer => ({
            date: transfer.date,
            rate: Number(transfer.conversionRate),
            currency: transfer.currency,
        }));
    }

    async findPendingConversions(userId: string) {
        const transfers = await prisma.cashTransfer.findMany({
            where: {
                userId,
                type: { in: ['Cash top-up', 'Cash withdrawal', 'Deposit', 'Withdrawal'] },
                currency: { not: Currency.EUR },
                conversionRate: null,
                skippedConversion: false,
            },
            select: { id: true, date: true, currency: true, type: true, value: true },
            orderBy: { date: 'desc' },
        });
        return transfers.map(transfer => ({ ...transfer, value: Number(transfer.value) }));
    }

    async updateTransactionConversion(userId: string, id: string, eurCost: number) {
        const tx = await prisma.cashTransfer.findFirst({
            where: { id, userId },
            select: { value: true },
        });
        if (!tx) {
            throw new Error('Transaction not found');
        }

        const rate = eurCost / Math.abs(Number(tx.value));
        await prisma.cashTransfer.update({
            where: { id },
            data: { eurCost, conversionRate: rate },
        });

        return { id, eurCost, conversionRate: rate };
    }
}

export const transactionsService = new TransactionsService();
