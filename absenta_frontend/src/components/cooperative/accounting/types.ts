export interface JournalItem {
    id: string;
    type: 'DEBIT' | 'CREDIT';
    amount: string;
    account: {
        code: string;
        name: string;
    };
}

export interface JournalEntry {
    id: string;
    date: string;
    description: string;
    reference: string;
    items: JournalItem[];
}

export interface BalanceSheetItem {
    code: string;
    name: string;
    type: string;
    balance: number;
}

export interface PayrollItem {
    no: number;
    memberNo: string;
    name: string;
    savings: Record<string, number>;
    loan: {
        installmentNo: number | null;
        pokok: number;
        jasa: number;
    };
    total: number;
}
