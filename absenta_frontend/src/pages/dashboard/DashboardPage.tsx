import React, { useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRecentTenantRegistrations } from '@/api/dashboard.api';
import { getBillingHealthSummary, getFinancialMetrics, getRecentActivities, getRevenueChartData } from '@/api/billing-dashboard.api';
import { getAllTenants } from '@/api/tenants.api';
import { getPaymentHealthCheck } from '@/api/paymentGateway.api';
import { getPaymentGatewayHealth } from '@/api/payments.api';
import RecentTransactionsTable, { type RecentTransactionRow } from './components/RecentTransactionsTable';
import { Loader, Badge, Card, SectionCard } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { Globe, Activity, TrendingUp, CreditCard } from 'lucide-react';
import { SuperAdminPageLayout } from '@/components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { formatDate, formatCurrency } from '@/utils/layoutUtils';

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

interface SystemHealthState {
  payment_module_ok: boolean | null;
  gateway_overall: string | null;
  webhook_failures_last_1h: number;
  reconciliation_fix_count_last_1h: number;
  last_checked_iso: string | null;
}

function DashboardContent() {
  const { user } = useAuthStore();
  const isSystemSuperadmin = useMemo(() => isSystemSuperAdmin(user?.role?.name, user?.tenant_id), [user]);

  // React Query Fetching (Pilar 31)
  const { data: dashboardData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['saas-control-center-data'],
    queryFn: async () => {
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
        finRes,
        healthRes,
        recentTenantsRes,
        revChartRes,
        recentActsRes,
        gwHealthRes,
        gwCoreRes
      ] = await Promise.allSettled([
        getAllTenants({ limit: 1 }),
        getFinancialMetrics(),
        getBillingHealthSummary(),
        getRecentTenantRegistrations(12),
        getRevenueChartData(6),
        getRecentActivities(8),
        getPaymentGatewayHealth(),
        getPaymentHealthCheck()
      ]);

      let tenantsTotal = 0;
      if (tenantsRes.status === 'fulfilled') {
        const payload = tenantsRes.value?.data as { total?: number; pagination?: { total?: number } } | unknown[];
        if (Array.isArray(payload)) {
          tenantsTotal = payload.length;
        } else if (payload && typeof payload === 'object') {
          tenantsTotal = Number(payload.total ?? payload.pagination?.total ?? 0);
        }
      }

      let finData: { mrr?: number; total_revenue?: number; active_subscriptions?: number } = {};
      if (finRes.status === 'fulfilled') {
        finData = (finRes.value?.data || {}) as typeof finData;
      }

      let billOverview: BillingOverview = { total_billings: 0, paid_billings: 0, pending_billings: 0, overdue_billings: 0 };
      if (healthRes.status === 'fulfilled') {
        const h = (healthRes.value?.data || {}) as Record<string, unknown>;
        billOverview = {
          total_billings: Number(h.total_invoices ?? h.total_billings ?? 0),
          paid_billings: Number(h.paid_invoices ?? h.paid_billings ?? 0),
          pending_billings: Number(h.pending_invoices ?? h.pending_billings ?? 0),
          overdue_billings: Number(h.overdue_invoices ?? h.overdue_billings ?? 0)
        };
      }

      let tenantGrowthList: TenantGrowthPoint[] = [];
      if (recentTenantsRes.status === 'fulfilled') {
        tenantGrowthList = (recentTenantsRes.value?.data || []) as TenantGrowthPoint[];
      }

      let revenueGrowthList: RevenueGrowthPoint[] = [];
      if (revChartRes.status === 'fulfilled') {
        revenueGrowthList = (revChartRes.value?.data || []) as RevenueGrowthPoint[];
      }

      let transactionsList: RecentTransactionRow[] = [];
      if (recentActsRes.status === 'fulfilled') {
        const acts = (recentActsRes.value?.data || []) as Array<Record<string, unknown>>;
        transactionsList = acts?.map((item) => ({
          billing_id: String(item.billing_id || item.invoice_number || item.id || '-'),
          tenant_name: String(item.tenant_name || item.Tenant?.name || '-'),
          plan_name: String(item.plan_name || item.Plan?.name || '-'),
          amount: Number(item.amount || item.total_amount || 0),
          status: String(item.status || 'PENDING'),
          paid_at: item.paid_at ? String(item.paid_at) : null
        }));
      }

      let paymentOk: boolean | null = null;
      if (gwCoreRes.status === 'fulfilled') {
        paymentOk = toOkFlag(gwCoreRes.value);
      }

      let gatewayOverall: string | null = null;
      if (gwHealthRes.status === 'fulfilled') {
        gatewayOverall = toGatewayOverall(gwHealthRes.value);
      }

      return {
        kpis: {
          tenants: tenantsTotal,
          active_subscriptions: Number(finData.active_subscriptions || 0),
          monthly_revenue: Number(finData.mrr || 0),
          total_revenue: Number(finData.total_revenue || 0)
        },
        billingOverview: billOverview,
        tenantGrowth: tenantGrowthList,
        revenueGrowth: revenueGrowthList,
        recentTransactions: transactionsList,
        systemHealth: {
          payment_module_ok: paymentOk,
          gateway_overall: gatewayOverall,
          webhook_failures_last_1h: 0,
          reconciliation_fix_count_last_1h: 0,
          last_checked_iso: new Date().toISOString()
        }
      };
    },
    enabled: isSystemSuperadmin,
    staleTime: 2 * 60 * 1000,
  });

  const kpis: SuperadminKpis = useMemo(() => dashboardData?.kpis || {
    tenants: 0,
    active_subscriptions: 0,
    monthly_revenue: 0,
    total_revenue: 0
  }, [dashboardData]);

  const billingOverview: BillingOverview = useMemo(() => dashboardData?.billingOverview || {
    total_billings: 0,
    paid_billings: 0,
    pending_billings: 0,
    overdue_billings: 0
  }, [dashboardData]);

  const recentTransactions: RecentTransactionRow[] = useMemo(() => dashboardData?.recentTransactions || [], [dashboardData]);
  const systemHealth: SystemHealthState = useMemo(() => dashboardData?.systemHealth || {
    payment_module_ok: null,
    gateway_overall: null,
    webhook_failures_last_1h: 0,
    reconciliation_fix_count_last_1h: 0,
    last_checked_iso: null
  }, [dashboardData]);

  const resolvedTenantGrowth = useMemo(() => dashboardData?.tenantGrowth || [], [dashboardData]);
  const resolvedRevenueGrowth = useMemo(() => dashboardData?.revenueGrowth || [], [dashboardData]);

  const statsList = useMemo(() => [
    { title: 'Total Tenant', value: kpis.tenants, icon: <Globe size={14} />, gradient: 'from-blue-600 to-indigo-600' },
    { title: 'Langganan Aktif', value: kpis.active_subscriptions, icon: <Activity size={14} />, gradient: 'from-emerald-500 to-teal-600' },
    { title: 'MRR', value: formatCurrency(kpis.monthly_revenue), icon: <TrendingUp size={14} />, gradient: 'from-amber-500 to-orange-600' },
    { title: 'Total Pendapatan', value: formatCurrency(kpis.total_revenue), icon: <CreditCard size={14} />, gradient: 'from-violet-600 to-purple-600' }
  ], [kpis]);

  const systemBadge = useCallback((ok: boolean | null) => {
    if (ok === true) return <Badge variant="success">OK</Badge>;
    if (ok === false) return <Badge variant="destructive">Down</Badge>;
    return <Badge variant="secondary">Unknown</Badge>;
  }, []);

  if (!isSystemSuperadmin) {
    return (
      <div className="p-8 text-center text-xs text-rose-500 font-bold">
        Dashboard ini hanya dapat diakses oleh SUPERADMIN sistem.
      </div>
    );
  }

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        title="SaaS Control Center"
        description="Dashboard utama monitoring pertumbuhan, pendapatan, dan kesehatan sistem platform Absenta."
        stats={statsList}
        isLoadingStats={loading && kpis.tenants === 0}
        hardeningModuleKey="superadmin_dashboard"
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
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Tenants Growth</h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">Tren pendaftaran 12 bulan terakhir</p>
                  </div>
                  {loading ? <Loader size="sm" /> : <Badge variant="info" className="text-[10px] font-bold">12M TREND</Badge>}
                </div>
                <div className="h-[280px]">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader /></div>}>
                    <TenantGrowthChart data={resolvedTenantGrowth} loading={loading} />
                  </Suspense>
                </div>
              </Card>

              <Card className="border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Revenue Growth</h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">Pendapatan bersih 6 bulan terakhir</p>
                  </div>
                  {loading ? <Loader size="sm" /> : <Badge variant="info" className="text-[10px] font-bold">6M REVENUE</Badge>}
                </div>
                <div className="h-[280px]">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader /></div>}>
                    <RevenueGrowthChart data={resolvedRevenueGrowth} loading={loading} />
                  </Suspense>
                </div>
              </Card>
            </div>

            {/* Billing Overview Stats */}
            <Card className="border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Billing Overview</h3>
                <p className="text-[10px] text-slate-400 font-bold">Ringkasan status seluruh faktur penagihan tenant</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnalyticsCard
                  title="Total Invoices"
                  value={String(billingOverview.total_billings)}
                  color="indigo"
                  isLoading={loading}
                />
                <AnalyticsCard
                  title="Paid Invoices"
                  value={String(billingOverview.paid_billings)}
                  color="emerald"
                  isLoading={loading}
                />
                <AnalyticsCard
                  title="Pending Invoices"
                  value={String(billingOverview.pending_billings)}
                  color="amber"
                  isLoading={loading}
                />
                <AnalyticsCard
                  title="Overdue Invoices"
                  value={String(billingOverview.overdue_billings)}
                  color="rose"
                  isLoading={loading}
                />
              </div>
            </Card>

            {/* Recent Transactions Table */}
            <RecentTransactionsTable data={recentTransactions} />

            {/* System Health */}
            <Card className="border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">System Health & Gateway</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">Monitoring integritas modul pembayaran platform</p>
                </div>
                {systemHealth.last_checked_iso && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                    REFRESH: {formatDate(systemHealth.last_checked_iso, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-5 bg-white dark:bg-slate-950 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Module</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">API Core Status</div>
                  </div>
                  {systemBadge(systemHealth.payment_module_ok)}
                </div>

                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-5 bg-white dark:bg-slate-950 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gateway Status</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">Tripay / Payment Hub</div>
                  </div>
                  {systemHealth.gateway_overall ? (
                    <Badge variant={systemHealth.gateway_overall === 'healthy' ? 'success' : systemHealth.gateway_overall === 'degraded' ? 'warning' : 'destructive'} className="text-[10px] font-bold px-2 py-0.5">
                      {systemHealth.gateway_overall.toUpperCase()}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5">UNKNOWN</Badge>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-5 bg-white dark:bg-slate-950">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Webhooks (Last 1h)</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Gagal / Error</span>
                    <span className={`text-sm font-bold ${systemHealth.webhook_failures_last_1h > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {systemHealth.webhook_failures_last_1h}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </SectionCard>
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
}

export const DashboardPage: React.FC = React.memo(() => {
  const { isLoading: isAuthLoading } = useAuthStore();

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return <DashboardContent />;
});

export default DashboardPage;
