// Dashboard Types based on DASHBOARD_MODULE_API.md

// Chart Data Structure (defined first to avoid forward reference issues)
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

// Dashboard Overview Stats
export interface DashboardOverviewStats {
  tanggal: string;
  total_siswa: number;
  total_guru: number;
  siswa_hadir: number;
  siswa_izin: number;
  siswa_sakit: number;
  siswa_alpa: number;
  guru_hadir: number;
  guru_tidak_hadir: number;
  persentase_siswa: number;
  persentase_guru: number;
  total_sesi_aktif?: number;
}

// Dashboard Overview Response Types
export interface DashboardOverviewResponse {
  success: boolean;
  message: string;
  data: DashboardOverviewStats;
}

export interface ChartDataResponse {
  success: boolean;
  message: string;
  data: ChartData;
}

// Statistics Response Types
export interface StatistikKelasResponse {
  success: boolean;
  message: string;
  data: StatistikKelasHarian;
}

export interface StatistikGuruResponse {
  success: boolean;
  message: string;
  data: StatistikGuruHarian;
}

// Daily Class Statistics
export interface StatistikKelasHarian {
  tanggal: string;
  totalKelas: number;
  kelasAktif: number;
  siswaHadir: number;
  totalSiswa: number;
  persentaseKehadiran: number;
}

// Monthly Class Statistics
export interface StatistikKelasBulanan {
  bulan: string;
  tahun: number;
  totalKelas: number;
  rataRataKehadiran: number;
  kelasAktif: number;
}

// Daily Teacher Statistics
export interface StatistikGuruHarian {
  tanggal: string;
  totalGuru: number;
  guruHadir: number;
  guruSakit: number;
  guruIzin: number;
  guruAlpa: number;
  persentaseKehadiran: number;
}

// Component Props
export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  color?: 'blue' | 'indigo' | 'emerald' | 'orange' | 'purple' | 'rose';
}

// Payment and Billing Types for Dashboard
export interface PaymentStats {
  users: number;
  billings: number;
  payments: number;
  revenue: number;
  paymentTrend: { date: string; total: number }[];
}

export interface PaymentStatsResponse {
  success: boolean;
  message: string;
  data: PaymentStats;
}

export interface BillingData {
  total_billings: number;
  active_billings: number;
  pending_payments: number;
  total_revenue: number;
}

export interface BillingDataResponse {
  success: boolean;
  message: string;
  data: BillingData;
}

export interface Transaction {
  id: string;
  billing_id: string;
  amount: number;
  status: string;
  paid_at: string;
}

export type EscalationPriority = 'High' | 'Medium' | 'Low';

export interface KepsekEscalationItem {
  id: string;
  title: string;
  source: string;
  status: string;
  created_at: string;
  priority: EscalationPriority;
  points?: number;
}

export interface KepsekEscalationsResponse {
  success: boolean;
  message: string;
  data: KepsekEscalationItem[];
}
