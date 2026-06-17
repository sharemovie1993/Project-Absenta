export interface Loan {
  id: string;
  amount: string;
  interestRate: string;
  duration: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  createdAt: string;
  memberId: string;
  member: {
    id: string;
    name: string;
    memberNo: string;
  };
  installments: Array<{
    id: string;
    amount: string;
    status: 'PAID' | 'UNPAID';
    dueDate?: string;
  }>;
}

export interface Member {
  id: string;
  name: string;
  memberNo: string;
}

export interface StudentMetrics {
  card1Title: string;
  card1Val: string;
  card1Sub: string;
  card2Title: string;
  card2Val: string;
  card2Sub: string;
  card3Title: string;
  card3Val: string;
  card3Sub: string;
  isOverdue: boolean;
  isApproaching: boolean;
  hasApprovedLoans: boolean;
  hasActiveLoan: boolean;
  hasPendingLoan: boolean;
}

export interface OperatorMetrics {
  card1Title: string;
  card1Val: string;
  card2Title: string;
  card2Val: string;
  card3Title: string;
  card3Val: string;
}

export interface Installment {
  id: string;
  amount: string;
  dueDate: string;
  paidDate: string | null;
  status: 'PAID' | 'UNPAID';
}

export interface LoanDetailData {
  id: string;
  memberId: string;
  amount: string;
  interestRate: string;
  duration: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  createdAt: string;
  member: {
    name: string;
    memberNo: string;
    userId: string;
    totalSavings?: number;
    savingsBreakdown?: Array<{
      categoryName: string;
      code: string;
      amount: number;
      color?: string;
    }>;
    loanHistory?: Array<{
      id: string;
      amount: number;
      status: string;
      createdAt: string;
    }>;
  };
  installments: Installment[];
}

export interface CooperativeSettings {
  cooperative_name: string;
  cooperative_legal_no?: string;
  cooperative_address?: string;
  cooperative_phone?: string;
  cooperative_email?: string;
  cooperative_website?: string;
  cooperative_logo_url?: string;
  signatures?: {
    bendahara?: string;
    ketua?: string;
    kepsek?: string;
  };
}
