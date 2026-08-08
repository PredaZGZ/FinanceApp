export type ProjectEntryType = 'INCOME' | 'EXPENSE';

export interface ProjectSummary {
    id: string;
    name: string;
    description: string | null;
    income: number;
    expense: number;
    balance: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectEntry {
    id: string;
    type: ProjectEntryType;
    amount: number;
    description: string;
    category: string | null;
    date: string;
    createdAt: string;
}

export interface ProjectDetail extends ProjectSummary {
    entries: ProjectEntry[];
}
