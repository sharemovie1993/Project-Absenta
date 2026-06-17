// TransactionType tetap sama — DEPOSIT/WITHDRAWAL/INTEREST/ADMIN_FEE
export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'ADMIN_FEE';

// SavingCategory — menggantikan SavingType enum yang lama
export interface SavingCategory {
  id: string;
  code: string;        // 'POKOK', 'WAJIB', 'SUKARELA', 'SHR', atau custom
  name: string;        // "Simpanan Hari Raya", dll
  description?: string;
  color?: string;      // hex color untuk badge
  order: number;
  isActive: boolean;
  isMandatory: boolean;
  isWithdrawable: boolean;
  withdrawRule?: string; // 'ANYTIME' | 'RESIGN_ONLY' | 'YEAR_END' | 'HOLIDAY'
  defaultAmount?: number | null;
  isIncludedInShu: boolean;
  accountCode: string;
}

export interface Member {
  id: string;
  name: string;
  memberNo: string;
  type: string;
  siswaId?: string;
  guruId?: string;
  userId?: string;
}

export interface Saving {
  id: string;
  categoryId: string;
  category: SavingCategory;
  amount: string;
  memberId: string;
  member: {
    name: string;
    memberNo: string;
    userId?: string;
    siswaId?: string;
    guruId?: string;
  };
  type?: string;
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  amount: string;
  type: TransactionType;
  date: string;
  description: string | null;
  savingId: string;
  categoryCode?: string;
  categoryName?: string;
  categoryColor?: string;
  savingType?: string;
}

export interface ConfirmTxData {
  savingId: string;
  savingType: string;   // Nama kategori untuk display (bisa categoryName)
  memberName: string;
  memberNo: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  description: string;
}

// Tipe lama untuk backward compat di PDF/export (savingType masih dipakai sebagai display string)
export type SavingType = string; // sebelumnya: 'POKOK' | 'WAJIB' | 'SUKARELA' | 'LAINNYA'
