export interface RevolutStatement {
    generatedDate: string;
    accountHolder: AccountHolder;
    period: {
        start: string;
        end: string;
    };
    accountNumber: string;
    currencies: CurrencyData[];
}

export interface AccountHolder {
    name: string;
    address: string[];
    country: string;
}

export interface CurrencyData {
    currency: 'EUR' | 'USD';
    accountSummary: AccountSummary;
    portfolio: PortfolioItem[];
    stockTrades: StockTrade[];
    cashTransfers: CashTransfer[];
}

export interface AccountSummary {
    starting: {
        stocksValue: number;
        cashValue: number;
        total: number;
    };
    ending: {
        stocksValue: number;
        cashValue: number;
        total: number;
    };
}

export interface PortfolioItem {
    symbol: string;
    company: string;
    isin: string;
    quantity: number;
    price: number;
    value: number;
    portfolioPercentage: number;
}

export interface StockTrade {
    date: string;
    currency: 'EUR' | 'USD';
    symbol: string;
    type: 'Trade - Market' | 'Trade - Limit';
    quantity: number;
    price: number;
    side: 'Buy' | 'Sell';
    value: number;
    fees: number;
    commission: number;
}

export interface CashTransfer {
    date: string;
    currency: 'EUR' | 'USD';
    type: 'Cash top-up' | 'Cash withdrawal' | 'Dividend' | 'Custody Fee';
    value: number;
    fees: number;
    commission: number;
    eurCost?: number;           // How much EUR it cost (for USD deposits)
    conversionRate?: number;    // EUR/USD conversion rate
    skippedConversion?: boolean; // If true, this transaction is not a currency conversion
}
