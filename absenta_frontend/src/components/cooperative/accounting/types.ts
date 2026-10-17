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

export interface CoopDepositItem {
    id: string;
    voucherNumber: string;
    date: string;
    amount: number;
    accountCode: string;
    accountName: string;
    receivedVia: 'CASH' | 'BANK_TRANSFER';
    payer: string | null;
    description: string;
    receiptImageUrl?: string | null;
    journalId?: string | null;
    createdAt?: string;
}

export interface CoopDepositFormData {
    date: string;
    amount: number;
    accountCode: string;
    accountName?: string;
    receivedVia: 'CASH' | 'BANK_TRANSFER';
    payer?: string;
    description: string;
    receiptImageUrl?: string;
}

export interface CoopTransferItem {
    id: string;
    voucherNumber: string;
    date: string;
    amount: number;
    fromAccountCode: '1010' | '1011';
    toAccountCode: '1010' | '1011';
    description: string;
    journalId?: string | null;
    createdAt?: string;
}

export interface CoopTransferFormData {
    date: string;
    amount: number;
    fromAccountCode: '1010' | '1011';
    toAccountCode: '1010' | '1011';
    description: string;
}

// ─── BAGAN AKUN DINAMIS & BERJENJANG (HIERARCHICAL COA) ─────────────────────

export type AccountCategoryType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface AccountNode {
    id: string;
    code: string;
    name: string;
    type: AccountCategoryType;
    isHeader: boolean;
    parentId: string | null;
    isSystem: boolean;
    isActive: boolean;
    balance: number;
    level: number;
    children?: AccountNode[];
    journalCount?: number;
}

export interface AccountTreeResponse {
    tree: AccountNode[];
    flat: AccountNode[];
    summary: {
        totalAccounts: number;
        totalHeaders: number;
        totalPostingAccounts: number;
    };
}

export interface CreateAccountPayload {
    code: string;
    name: string;
    type: AccountCategoryType;
    isHeader?: boolean;
    parentId?: string | null;
}

export interface UpdateAccountPayload {
    code?: string;
    name?: string;
    isHeader?: boolean;
    parentId?: string | null;
    isActive?: boolean;
}

