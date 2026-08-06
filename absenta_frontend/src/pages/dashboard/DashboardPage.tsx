import { useEffect, useMemo, useState, lazy, Suspense, useCallback } from 'react';
import { getRecentTenantRegistrations } from '@/api/dashboard.api';
import { getBillingHealthSummary, getFinancialMetrics, getRecentActivities, getRevenueChartData } from '@/api/billing-dashboard.api';
import { getAllTenants } from '@/api/tenants.api';
import { getPaymentHealthCheck } from '@/api/paymentGateway.api';
import { getPaymentGatewayHealth } from '@/api/payments.api';
import OverviewStats from './components/OverviewStats';
import RecentTransactionsTable from './components/RecentTransactionsTable';
import { Loader, Badge, Card } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { LogService } from '@/utils/LogService';
import { Globe, Activity, TrendingUp, CreditCard } from 'lucide-react';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

const TenantGrowthChart = lazy(() => import('./components/TenantGrowthChart'));
const RevenueGrowthChart = lazy(() => import('./components/RevenueGrowthChart'));

interface SuperadminKpis {
  tenants: number;
  active_subscriptions: number;
  monthly_revenue: number;
  total_revenue: number;
}

interface BillingOverview {
  total_billings: number;
  paid_billings: number;
  pending_billings: number;
  overdue_billings: number;
}

interface TenantGrowthPoint {
  month: string;
  registrations: number;
}

interface RevenueGrowthPoint {
  month: string;
  revenue: number;
}

interface RecentTransactionRow {
  billing_id: string;
  tenant_name: string;
  plan_name: string;
  amount: number;
  status: string;
  paid_at: string | null;
}

interface SystemHealthState {
  payment_module_ok: boolean | null;
  gateway_overall: string | null;
  webhook_failures_last_1h: number;
  reconciliation_fix_count_last_1h: number;
  last_checked_iso: string | null;
}

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const [kpis, setKpis] = useState<SuperadminKpis>({
    tenants: 0,
    active_subscriptions: 0,
    monthly_revenue: 0,
    total_revenue: 0,
  });
  const [billingOverview, setBillingOverview] = useState<BillingOverview>({
    total_billings: 0,
    paid_billings: 0,
    pending_billings: 0,
    overdue_billings: 0,
  });
  const [tenantGrowth, setTenantGrowth] = useState<TenantGrowthPoint[]>([]);
  const [revenueGrowth, setRevenueGrowth] = useState<RevenueGrowthPoint[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionRow[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthState>({
    payment_module_ok: null,
    gateway_overall: null,
    webhook_failures_last_1h: 0,
    reconciliation_fix_count_last_1h: 0,
    last_checked_iso: null,
  });

  const isSystemSuperadmin = useMemo(() => isSystemSuperAdmin(user?.role?.name, user?.tenant_id), [user]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isSystemSuperadmin) {
        setError('Dashboard ini hanya untuk SUPERADMIN sistem');
        return;
      }

      const monthKeys = (count: number) => {
        const now = new Date();
        const keys: string[] = [];
        for (let i = count - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        return keys;
      };

      const toOkFlag = (raw: unknown): boolean | null => {
        if (typeof raw === 'boolean') return raw;
        if (!raw || typeof raw !== 'object') return null;
        const o = raw as Record<string, unknown>;
        if (typeof o.success === 'boolean') return o.success;
        if (typeof o.ok === 'boolean') return o.ok;
        const status = typeof o.status === 'string' ? o.status : undefined;
        if (status) {
          const s = status.trim().toLowerCase();
          if (s === 'ok' || s === 'healthy' || s === 'up') return true;
          if (s === 'down' || s === 'unhealthy') return false;
        }
        return null;
      };

      const toGatewayOverall = (raw: unknown): string | null => {
        if (!raw || typeof raw !== 'object') return null;
        const o = raw as Record<string, unknown>;
        const data = (o.data && typeof o.data === 'object') ? (o.data as Record<string, unknown>) : undefined;
        const health = (data?.health && typeof data.health === 'object') ? (data.health as Record<string, unknown>) : undefined;
        
        const candidate = [
          health?.overall,
          health?.status,
          data?.overall,
          data?.status,
          o.status,
        ].find((v) => typeof v === 'string') as string | undefined;
        
        const s = String(candidate || '').trim();
        return s ? s.toLowerCase() : null;
      };

      const [
        tenantsRes,
        financialRes,
        revenueChartRes,
        recentActivitiesRes,
        registrationsRes,
        billingHealthRes,
        paymentHealthRes,
        gatewayHealthRes,
      ] = await Promise.allSettled([
        getAllTenants({ page: 1, limit: 1 }, { skipTenantHeader: true }),
        getFinancialMetrics(),
        getRevenueChartData(6),
        getRecentActivities(10),
        getRecentTenantRegistrations(1000, 365),
        getBillingHealthSummary(),
        getPaymentHealthCheck(),
        getPaymentGatewayHealth(),
      ]);

      const totalTenants = tenantsRes.status === 'fulfilled'
        ? (tenantsRes.value.pagination?.totalItems ?? tenantsRes.value.data?.length ?? 0)
        : 0;

      const fm = financialRes.status === 'fulfilled' ? financialRes.value.data : null;
      setKpis({
        tenants: totalTenants,
        active_subscriptions: fm?.active_subscriptions ?? 0,
        monthly_revenue: fm?.monthly_revenue ?? 0,
        total_revenue: fm?.total_revenue ?? 0,
      });

      setBillingOverview({
        total_billings: fm?.total_billings ?? 0,
        paid_billings: fm?.paid_billings ?? 0,
        pending_billings: fm?.pending_billings ?? 0,
        overdue_billings: fm?.overdue_billings ?? 0,
      });

      const rcRaw = revenueChartRes.status === 'fulfilled' ? revenueChartRes.value.data : [];
      const rc = Array.isArray(rcRaw) ? rcRaw : [];
      const revenueByMonth = new Map<string, number>();
      for (const row of rc) {
        const r = row as Record<string, unknown>;
        const month = String(r?.month ?? '').trim();
        if (!month) continue;
        revenueByMonth.set(month, Number(r?.paid_revenue ?? r?.revenue ?? 0));
      }
      setRevenueGrowth(monthKeys(6).map((month) => ({ month, revenue: revenueByMonth.get(month) ?? 0 })));

      const activitiesRaw = recentActivitiesRes.status === 'fulfilled' ? recentActivitiesRes.value.data : [];
      const activities = Array.isArray(activitiesRaw) ? activitiesRaw : [];
      setRecentTransactions(
        (activities ?? [])?.map((b: any) => ({
          billing_id: String(b?.id ?? ''),
          tenant_name: String(b?.Subscription?.Tenant?.name ?? '-'),
          plan_name: String(b?.Subscription?.Plan?.name ?? b?.Subscription?.plan?.name ?? '-'),
          amount: Number(b?.amount ?? 0),
          status: String(b?.Invoice?.status ?? b?.status ?? ''),
          paid_at: (b?.Invoice?.paid_at ?? b?.paid_at ?? null) ? String(b?.Invoice?.paid_at ?? b?.paid_at) : null,
        })).filter((r: any) => r.billing_id)
      );

      const registrationsRaw = registrationsRes.status === 'fulfilled' ? registrationsRes.value : [];
      const registrations = Array.isArray(registrationsRaw) ? registrationsRaw : [];
      const grouped = new Map<string, number>();
      for (const item of registrations) {
        const i = item as { timestamp?: string };
        const ts = i?.timestamp;
        const d = ts ? new Date(String(ts)) : null;
        if (!d || Number.isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        grouped.set(key, (grouped.get(key) ?? 0) + 1);
      }
      setTenantGrowth(monthKeys(12).map((month) => ({ month, registrations: grouped.get(month) ?? 0 })));

      const billingHealthData = billingHealthRes.status === 'fulfilled' ? (billingHealthRes.value as { data?: { webhook_failures_last_1h?: number; reconciliation_fix_count_last_1h?: number } })?.data : null;
      const webhookFailures = Number(billingHealthData?.webhook_failures_last_1h ?? 0);
      const reconciliationFixes = Number(billingHealthData?.reconciliation_fix_count_last_1h ?? 0);

      const paymentOk = paymentHealthRes.status === 'fulfilled' ? toOkFlag(paymentHealthRes.value) : null;
      const gatewayOverall = gatewayHealthRes.status === 'fulfilled' ? toGatewayOverall(gatewayHealthRes.value) : null;

      setSystemHealth({
        payment_module_ok: paymentOk,
        gateway_overall: gatewayOverall,
        webhook_failures_last_1h: webhookFailures,
        reconciliation_fix_count_last_1h: reconciliationFixes,
        last_checked_iso: new Date().toISOString(),
      });

    } catch (err: unknown) {
      LogService.error('Error fetching dashboard data', err, 'DashboardPage');
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [isSystemSuperadmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resolvedTenantGrowth = useMemo(() => {
    if (tenantGrowth.length > 0) return tenantGrowth;
    const now = new Date();
    const months: TenantGrowthPoint[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: key, registrations: 0 });
    }
    return months;
  }, [tenantGrowth]);

  const resolvedRevenueGrowth = useMemo(() => {
    if (revenueGrowth.length > 0) return revenueGrowth;
    const now = new Date();
    const months: RevenueGrowthPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: key, revenue: 0 });
    }
    return months;
  }, [revenueGrowth]);

  const statsList = useMemo(() => [
    {
      title: "Total Tenant",
      value: kpis.tenants,
      icon: <Globe className="h-4 w-4 text-white" />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Sekolah terdaftar"
    },
    {
      title: "Revenue Bulanan",
      value: `Rp ${kpis.monthly_revenue.toLocaleString('id-ID')}`,
      icon: <TrendingUp className="h-4 w-4 text-white" />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Bulan berjalan"
    },
    {
      title: "Langganan Aktif",
      value: kpis.active_subscriptions,
      icon: <Activity className="h-4 w-4 text-white" />,
      gradient: "from-amber-500 to-orange-600",
      subtitle: "Tenant premium"
    },
    {
      title: "Total Revenue",
      value: `Rp ${kpis.total_revenue.toLocaleString('id-ID')}`,
      icon: <CreditCard className="h-4 w-4 text-white" />,
      gradient: "from-indigo-500 to-purple-600",
      subtitle: "Akumulasi platform"
    }
  ], [kpis]);

  const systemBadge = (ok: boolean | null) => {
    if (ok === true) return <Badge variant="success">OK</Badge>;
    if (ok === false) return <Badge variant="destructive">Down</Badge>;
    return <Badge variant="secondary">Unknown</Badge>;
  };

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex gap-4">
          <div className="p-2 bg-red-100 rounded-lg shrink-0">
             <Activity className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-800 uppercase tracking-tight">Terjadi Kesalahan</h3>
            <p className="mt-1 text-xs font-medium text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SuperAdminPageLayout
      title="SaaS Control Center"
      description="Dashboard utama monitoring pertumbuhan, pendapatan, dan kesehatan sistem platform Absenta."
      stats={statsList}
      isLoading={loading && kpis.tenants === 0}
      hardeningModuleKey="dashboardpage"
      instruction={{
        title: 'Panduan Dashboard Utama',
        description: 'Pusat kontrol untuk memantau performa bisnis dan teknis platform secara real-time.',
        items: [
          { text: 'Grafik Tenants Growth menunjukkan tren pendaftaran sekolah baru dalam 12 bulan terakhir.' },
          { text: 'Billing Overview merangkum status penagihan (Invoice) di seluruh tenant.' },
          { text: 'System Health memantau ketersediaan modul pembayaran dan gateway eksternal.' }
        ]
      }}
    >
      <div className="space-y-6 pb-12">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm overflow-hidden group">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Tenants Growth</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">Tren pendaftaran 12 bulan terakhir</p>
                </div>
                {loading ? <Loader size="sm" /> : <Badge variant="info" className="text-[10px] font-black">12M TREND</Badge>}
              </div>
              <div className="h-[280px]">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader /></div>}>
                  <TenantGrowthChart data={resolvedTenantGrowth} loading={loading} />
                </Suspense>
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Revenue Growth</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">Pendapatan bersih 6 bulan terakhir</p>
                </div>
                {loading ? <Loader size="sm" /> : <Badge variant="info" className="text-[10px] font-black">6M REVENUE</Badge>}
              </div>
              <div className="h-[280px]">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader /></div>}>
                  <RevenueGrowthChart data={resolvedRevenueGrowth} loading={loading} />
                </Suspense>
              </div>
            </div>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <div className="p-6">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Billing Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {[
                { label: 'Total Invoices', val: billingOverview.total_billings, gradient: 'from-slate-500 to-slate-700 text-white' },
                { label: 'Paid Invoices', val: billingOverview.paid_billings, gradient: 'from-emerald-500 to-emerald-700 text-white' },
                { label: 'Pending Invoices', val: billingOverview.pending_billings, gradient: 'from-amber-500 to-amber-700 text-white' },
                { label: 'Overdue Invoices', val: billingOverview.overdue_billings, gradient: 'from-rose-500 to-rose-700 text-white' }
              ]?.map((item) => (
                <AnalyticsCard
                  key={item.label}
                  title={item.label}
                  value={item.val.toLocaleString('id-ID')}
                  gradient={item.gradient}
                  isLoading={loading}
                />
              ))}
            </div>
          </div>
        </Card>

        <RecentTransactionsTable data={recentTransactions} />

        <Card className="border-none shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">System Health & Gateway</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">Monitoring integritas modul pembayaran</p>
              </div>
              {systemHealth.last_checked_iso ? (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                  REFRESH: {new Date(systemHealth.last_checked_iso).toLocaleTimeString('id-ID')}
                </span>
              ) : null}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-5 bg-white dark:bg-slate-950 flex items-center justify-between group hover:border-indigo-100 transition-all">
                <div className="space-y-1">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment Module</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">API Core Status</div>
                </div>
                {systemBadge(systemHealth.payment_module_ok)}
              </div>

              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-5 bg-white dark:bg-slate-950 flex items-center justify-between group hover:border-indigo-100 transition-all">
                <div className="space-y-1">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Gateway Status</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Tripay / Payment Hub</div>
                </div>
                {systemHealth.gateway_overall ? (
                  <Badge variant={systemHealth.gateway_overall === 'healthy' ? 'success' : systemHealth.gateway_overall === 'degraded' ? 'warning' : 'destructive'} className="text-[10px] font-black px-2 py-0.5">
                    {systemHealth.gateway_overall.toUpperCase()}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] font-black px-2 py-0.5">UNKNOWN</Badge>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-5 bg-white dark:bg-slate-950 group hover:border-indigo-100 transition-all">
                <div className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Webhooks (Last 1h)</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Gagal / Error</span>
                  <span className={`text-sm font-black ${systemHealth.webhook_failures_last_1h > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {systemHealth.webhook_failures_last_1h.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </SuperAdminPageLayout>
  );
}

export default function DashboardPage() {
  const { isLoading: isAuthLoading } = useAuthStore();

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <DashboardContent />
  );
}
