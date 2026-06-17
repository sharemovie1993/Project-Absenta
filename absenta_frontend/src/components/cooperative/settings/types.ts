export interface CooperativeSettings {
  cooperative_name: string;
  cooperative_legal_no: string;
  cooperative_address: string;
  cooperative_phone: string;
  cooperative_email: string;
  cooperative_website: string;
  cooperative_logo_url: string;
  cooperative_default_interest_rate?: string;
}

export interface SavingCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
  order: number;
  isActive: boolean;
  isMandatory: boolean;
  isWithdrawable: boolean;
  withdrawRule?: string; // 'ANYTIME'|'RESIGN_ONLY'|'YEAR_END'|'HOLIDAY'
  defaultAmount?: number | null;
  isIncludedInShu: boolean;
  accountCode: string;
}
