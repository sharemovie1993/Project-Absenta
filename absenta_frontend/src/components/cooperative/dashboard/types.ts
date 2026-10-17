import type { Announcement, CriticalStockItem, Sale, CoopUserInfo } from '@/components/cooperative/types';

export interface MemberInfo {
  id?: string;
  User?: { full_name?: string };
  memberNo?: string;
  status?: string;
  name?: string;
  type?: string;
  joinDate?: string;
}

export interface WajibComplianceData {
  totalActive: number;
  paidCount: number;
  unpaidCount: number;
  compliancePercent: number;
}

export interface OverdueDebtor {
  id: string;
  memberName: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

export interface LoanPortfolioData {
  totalActiveLoans: number;
  totalOutstanding: number;
  currentAmount: number;
  overdue1to30Amount: number;
  overdueOver30Amount: number;
  nplRatio: number;
  topOverdue: OverdueDebtor[];
}

export interface PendingMemberItem {
  id: string;
  name: string;
  identifier: string;
  createdAt: string;
}

export interface PendingMembersData {
  count: number;
  list: PendingMemberItem[];
}

export interface EstimatedShuYtdData {
  year: number;
  totalEstimatedShu: number;
  estimatedStoreProfit: number;
  interestIncome: number;
  totalYearSales: number;
  status: string;
}

export interface CashLiquidityData {
  cashBalance: number;
  bankBalance: number;
  totalCashBank: number;
  idleLiquidity: number;
  loanToDepositRatio: number;
}

export interface CoopManagementStats {
  totalMembers: number;
  activeMembers?: number;
  totalSavings: number;
  simpananPokok?: number;
  simpananWajib?: number;
  simpananSukarela?: number;
  totalLoans: number;
  activeLoansCount?: number;
  dueInstallments: number;
  dueInstallmentsAmount?: number;
  storeSalesToday?: number;
  storeSalesCountToday?: number;
  storeSalesMonth?: number;
  storeSalesCountMonth?: number;
  activePeriod?: { id: string; year: number; totalShu: number; status: string } | null;
  openTickets?: number;
  pendingLoans?: Array<{ id: string; amount: number; duration: number; createdAt: string; memberName: string }>;
  monthlyTrend?: Array<{ name: string; simpanan: number; pinjaman: number; penjualan: number }>;
  recentActivities?: Array<{ id: string; type: 'SAVING' | 'SALE'; title: string; description: string; amount: number; date: string }>;
  
  // 4 Executive Metrics
  wajibCompliance?: WajibComplianceData;
  loanPortfolio?: LoanPortfolioData;
  pendingMembers?: PendingMembersData;
  estimatedShuYtd?: EstimatedShuYtdData;

  // 5 Likuiditas Kas Riil Buku Besar
  cashLiquidity?: CashLiquidityData;
  cashBalance?: number;
  bankBalance?: number;
  totalCashBank?: number;
}

export interface CoopManagementSectionProps {
  stats: CoopManagementStats;
  loadingStats?: boolean;
  chartData?: Array<{ name: string; simpanan: number; pinjaman: number; penjualan?: number }>;
  announcements: Announcement[];
  criticalStock: CriticalStockItem[];
  criticalStockLoading: boolean;
}

export interface CoopMemberSectionProps {
  memberStatus: 'loading' | 'member' | 'non-member';
  memberInfo: MemberInfo | null;
  user: CoopUserInfo | null;
  mySavingsSum: number;
  myShuSum: number;
  announcements: Announcement[];
  salesHistory: Sale[];
  salesLoading: boolean;
  printReceipt: (sale: Sale) => void;
  memberSummary?: MemberDashboardSummary | null;
}

export interface MemberDashboardSummary {
  isMember: boolean;
  memberInfo: MemberInfo | null;
  mySavings: {
    total: number;
    pokok: number;
    wajib: number;
    sukarela: number;
    unpaidWajibThisMonth: boolean;
  };
  myLoans: {
    activeLoan: {
      id: string;
      amount: number;
      interestRate: number;
      duration: number;
      nextInstallment: {
        id: string;
        amount: number;
        dueDate: string;
        isOverdue: boolean;
      } | null;
    } | null;
    pendingLoansCount: number;
  };
  myShuEstimate: {
    estimatedAmount: number;
    periodYear: number;
  };
  recentPurchases: Array<{
    id: string;
    date: string;
    total: number;
    paymentMethod: string;
  }>;
}

export interface QuickActionsData {
  pendingMembers: number;
  pendingLoans: number;
  openTickets: number;
  overdueInstallments: number;
}

