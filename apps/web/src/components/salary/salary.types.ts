export interface BreakdownItem {
    id?: string;
    concept: string;
    amount: number;
    type: 'payment' | 'deduction';
}

export interface SalaryRecord {
    id: string;
    date: string;
    grossSalary: number | null;
    netSalary: number | null;
    company: string | null;
    fileName: string | null;
    fileUrl?: string; // Optional URL if returned
    notes: string | null;
    breakdown?: BreakdownItem[];
}

export interface CreateSalaryInput {
    date: string;
    grossSalary?: number;
    netSalary?: number;
    company?: string;
    notes?: string;
    breakdown: Omit<BreakdownItem, 'id'>[];
    file?: File;
}

export interface Meta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface SalaryListResponse {
    data: SalaryRecord[];
    meta: Meta;
}
