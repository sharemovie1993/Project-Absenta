import { requestWithFallback } from "./apiUtils";
import type { 
  DashboardOverviewResponse, 
  ChartDataResponse,
  StatistikKelasResponse,
  StatistikGuruResponse,
  KepsekEscalationsResponse
} from "../types/dashboard";
import { toLocalDate, toLocalMonth } from "../utils/attendance/time";

// Dashboard Overview - GET /dashboard/overview
export async function getDashboardOverview(tanggal?: string): Promise<DashboardOverviewResponse> {
  const params = tanggal ? { tanggal } : {};
  return requestWithFallback<DashboardOverviewResponse>('get', '/dashboard/overview', { 
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Grafik Kehadiran Siswa Bulanan - GET /dashboard/grafik/siswa/:bulan
export async function getAttendanceChart(bulan?: string): Promise<ChartDataResponse> {
  const currentMonth = bulan || toLocalMonth(); // YYYY-MM format
  return requestWithFallback<ChartDataResponse>('get', `/dashboard/grafik/siswa/${currentMonth}`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Statistik Kelas Harian - GET /dashboard/statistik/kelas/:tanggal
export async function getDailyClassStats(tanggal?: string): Promise<StatistikKelasResponse> {
  const currentDate = tanggal || toLocalDate(); // YYYY-MM-DD format
  return requestWithFallback<StatistikKelasResponse>('get', `/dashboard/statistik/kelas/${currentDate}`);
}

// Statistik Guru Harian - GET /dashboard/statistik/guru/:tanggal
export async function getDailyTeacherStats(tanggal?: string): Promise<StatistikGuruResponse> {
  const currentDate = tanggal || toLocalDate(); // YYYY-MM-DD format
  return requestWithFallback<StatistikGuruResponse>('get', `/dashboard/statistik/guru/${currentDate}`);
}

// Dashboard Stats - GET /dashboard/stats
export async function getDashboardStats(): Promise<any> {
  return requestWithFallback<any>('get', '/dashboard/stats');
}

// Recent Payments - GET /payments/list
export async function getRecentPayments(limit = 5) {
  const res = await requestWithFallback<{ success: boolean; data: { payments: any[] } }>('get', `/payments/list`, { params: { limit } });
  return res.data.payments;
}

// Payment Chart - GET /dashboard/payment-chart
export async function getPaymentChart() {
  const res = await requestWithFallback<{ success: boolean; data: any }>('get', '/dashboard/payment-chart');
  return res.data;
}

// Recent tenant registrations - GET /dashboard/recent-tenant-registrations
export async function getRecentTenantRegistrations(limit = 10, days = 30) {
  const res = await requestWithFallback<{ success: boolean; data: any[] }>('get', '/dashboard/recent-tenant-registrations', { params: { limit, days } });
  return res.data;
}

// Guru Attendance Status - GET /dashboard/guru/attendance
export async function getGuruAttendanceStatus(): Promise<any> {
  return requestWithFallback<any>('get', '/dashboard/guru/attendance');
}

// Violation Stats - GET /dashboard/kesiswaan/violations
export async function getViolationStats(): Promise<any> {
  return requestWithFallback<any>('get', '/dashboard/kesiswaan/violations');
}

// Supervision Schedule - GET /dashboard/kurikulum/supervision
export async function getSupervisionSchedule(): Promise<any> {
  return requestWithFallback<any>('get', '/dashboard/kurikulum/supervision');
}

export async function getKepsekEscalations(limit: number = 10): Promise<KepsekEscalationsResponse> {
  return requestWithFallback<KepsekEscalationsResponse>('get', '/dashboard/kepsek/escalations', { params: { limit } });
}

// Hubin Stats - GET /dashboard/hubin/stats
export async function getHubinStats(): Promise<any> {
    return requestWithFallback<any>('get', '/dashboard/hubin/stats');
}

// Sarpras Stats - GET /dashboard/sarpras/stats
export async function getSarprasStats(): Promise<any> {
    return requestWithFallback<any>('get', '/dashboard/sarpras/stats');
}

// TU Stats - GET /dashboard/tu/stats
export async function getTUStats(): Promise<any> {
    return requestWithFallback<any>('get', '/dashboard/tu/stats');
}

// Gerbang Stats - GET /dashboard/gerbang/stats
export async function getGerbangDashboardStats(): Promise<any> {
    return requestWithFallback<any>('get', '/dashboard/gerbang/stats');
}

// Petugas Stats - GET /dashboard/petugas/stats
export async function getPetugasDashboardStats(): Promise<any> {
    return requestWithFallback<any>('get', '/dashboard/petugas/stats');
}

// Guru Leaderboard - GET /dashboard/leaderboard-guru
export async function getGuruLeaderboard(limit = 10): Promise<any> {
  return requestWithFallback<any>('get', '/dashboard/leaderboard-guru', { params: { limit } });
}

// Kaprog Stats - GET /dashboard/kaprog/stats
export async function getKaprogStats(): Promise<any> {
  return requestWithFallback<any>('get', '/dashboard/kaprog/stats', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Toolman Stats - GET /dashboard/toolman/stats
export async function getToolmanStats(): Promise<any> {
  return requestWithFallback<any>('get', '/dashboard/toolman/stats', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Kabeng Stats - GET /dashboard/kabeng/stats
export async function getKabengStats(): Promise<any> {
  return requestWithFallback<any>('get', '/dashboard/kabeng/stats', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// BKK Stats - GET /dashboard/bkk/stats
export async function getBkkStats(): Promise<any> {
  return requestWithFallback<any>('get', '/dashboard/bkk/stats', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Kurikulum Global Monitoring - GET /dashboard/kurikulum/monitoring-global
export async function getKbmGlobalMonitoring(tanggal?: string): Promise<any> {
  return requestWithFallback<any>('get', '/dashboard/kurikulum/monitoring-global', {
    params: tanggal ? { tanggal } : {},
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}
