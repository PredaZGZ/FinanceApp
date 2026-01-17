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

const API_URL = 'http://localhost:4000/salary'; // Adjust if using env vars

export const getSalaries = async (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}?${query}`);
    if (!res.ok) throw new Error('Failed to fetch salaries');
    return res.json();
};

export const getSalaryById = async (id: string) => {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error('Failed to fetch salary details');
    return res.json();
};

export const createSalary = async (data: CreateSalaryInput) => {
    const formData = new FormData();
    formData.append('date', data.date);
    if (data.grossSalary) formData.append('grossSalary', data.grossSalary.toString());
    if (data.netSalary) formData.append('netSalary', data.netSalary.toString());
    if (data.company) formData.append('company', data.company);
    if (data.notes) formData.append('notes', data.notes);

    formData.append('breakdown', JSON.stringify(data.breakdown));

    if (data.file) {
        formData.append('file', data.file);
    }

    const res = await fetch(API_URL, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) throw new Error('Failed to create salary');
    return res.json();
};

export const deleteSalary = async (id: string) => {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete salary');
};
