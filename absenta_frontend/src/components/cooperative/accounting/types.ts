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
    category?: string;
    debit?: number;
    credit?: number;
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

// ─── TIPE LAPORAN KEUANGAN STANDAR AKUNTANSI (ACCURATE / SAK ETAP) ────────────

export interface FinancialAccountLine {
    id: string;
    code: string;
    name: string;
    type: string;
    balance: number;
}

export interface IncomeStatementData {
    revenue: FinancialAccountLine[];
    expense: FinancialAccountLine[];
    summary: {
        totalRevenue: number;
        totalExpense: number;
        netIncome: number;
    };
}

export interface BalanceSheetReportData {
    assets: FinancialAccountLine[];
    liabilities: FinancialAccountLine[];
    equity: FinancialAccountLine[];
    summary: {
        totalAssets: number;
        totalLiabilities: number;
        totalEquity: number;
        totalLiabilitiesAndEquity: number;
        currentYearEarnings: number;
        isBalanced: boolean;
        balanceCheck: number;
    };
}

export interface CoopExpenseItem {
    id: string;
    voucherNumber: string;
    date: string;
    amount: number;
    categoryCode: string;
    categoryName: string;
    paymentMethod: 'CASH' | 'BANK_TRANSFER';
    payee: string | null;
    description: string;
    receiptImageUrl?: string | null;
    journalId?: string | null;
    createdAt?: string;
}

export interface CoopExpenseFormData {
    date: string;
    amount: number;
    categoryCode: string;
    categoryName?: string;
    paymentMethod: 'CASH' | 'BANK_TRANSFER';
    payee?: string;
    description: string;
    receiptImageUrl?: string;
}
