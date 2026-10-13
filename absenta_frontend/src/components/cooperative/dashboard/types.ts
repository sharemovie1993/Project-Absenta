import type { Announcement, CriticalStockItem, Sale, CoopUserInfo } from '@/components/cooperative/types';

export interface MemberInfo {
  User?: { full_name?: string };
  memberNo?: string;
  status?: string;
  name?: string;
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
}
