import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { getRecentTenantRegistrations } from '@/api/dashboard.api';
import { getBillingHealthSummary, getFinancialMetrics, getRecentActivities, getRevenueChartData } from '@/api/billing-dashboard.api';
import { getAllTenants } from '@/api/tenants.api';
import { getPaymentHealthCheck } from '@/api/paymentGateway.api';
import { getPaymentGatewayHealth } from '@/api/payments.api';
import OverviewStats from './components/OverviewStats';
import RecentTransactionsTable from './components/RecentTransactionsTable';
import { Loader } from '@/components/ui/Loader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { LogService } from '@/utils/LogService';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: isAuthLoading } = useAuthStore();
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

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  const isSystemSuperadmin = isSystemSuperAdmin(user?.role?.name, user?.tenant_id);

  useEffect(() => {
    async function fetchData() {
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
            (o as any)?.health?.overall,
            (o as any)?.health?.status,
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
          const month = String((row as any)?.month ?? '').trim();
          if (!month) continue;
          revenueByMonth.set(month, Number((row as any)?.paid_revenue ?? (row as any)?.revenue ?? 0));
        }
        setRevenueGrowth(monthKeys(6).map((month) => ({ month, revenue: revenueByMonth.get(month) ?? 0 })));

        const activitiesRaw = recentActivitiesRes.status === 'fulfilled' ? recentActivitiesRes.value.data : [];
        const activities = Array.isArray(activitiesRaw) ? activitiesRaw : [];
        setRecentTransactions(
          activities.map((b: any) => ({
            billing_id: String(b?.id ?? ''),
            tenant_name: String(b?.Subscription?.Tenant?.name ?? '-'),
            plan_name: String(b?.Subscription?.Plan?.name ?? b?.Subscription?.plan?.name ?? '-'),
            amount: Number(b?.amount ?? 0),
            status: String(b?.Invoice?.status ?? b?.status ?? ''),
            paid_at: (b?.Invoice?.paid_at ?? b?.paid_at ?? null) ? String(b?.Invoice?.paid_at ?? b?.paid_at) : null,
          })).filter((r) => r.billing_id)
        );

        const registrationsRaw = registrationsRes.status === 'fulfilled' ? registrationsRes.value : [];
        const registrations = Array.isArray(registrationsRaw) ? registrationsRaw : [];
        const grouped = new Map<string, number>();
        for (const item of registrations) {
          const ts = (item as any)?.timestamp;
          const d = ts ? new Date(ts) : null;
          if (!d || Number.isNaN(d.getTime())) continue;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          grouped.set(key, (grouped.get(key) ?? 0) + 1);
        }
        setTenantGrowth(monthKeys(12).map((month) => ({ month, registrations: grouped.get(month) ?? 0 })));

        const billingHealthData = billingHealthRes.status === 'fulfilled' ? (billingHealthRes.value as any)?.data : null;
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

      } catch (err: any) {
        LogService.error('Error fetching dashboard data', err, 'DashboardPage', { sourceComponent: 'DashboardPage' });
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isSystemSuperadmin]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

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

  const systemBadge = (ok: boolean | null) => {
    if (ok === true) return <Badge variant="success">OK</Badge>;
    if (ok === false) return <Badge variant="error">Down</Badge>;
    return <Badge variant="warning">Unknown</Badge>;
  };

  return (
    <div className="container-enhanced">
      <motion.div 
        className="space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <SectionHeader 
          title="SaaS Control Center" 
          subtitle="Growth, revenue, tenant monitoring & systems"
          icon={<BarChart3 className="w-5 h-5" />}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <OverviewStats stats={kpis} loading={loading} />
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Tenants Growth</h3>
                  {loading ? <Badge variant="warning" className="text-[10px] px-1.5 py-0">Loading</Badge> : <Badge variant="info" className="text-[10px] px-1.5 py-0">12M</Badge>}
                </div>
                <div className="h-[250px]">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader /></div>}>
                    <TenantGrowthChart data={resolvedTenantGrowth} loading={loading} />
                  </Suspense>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Revenue Growth</h3>
                  {loading ? <Badge variant="warning" className="text-[10px] px-1.5 py-0">Loading</Badge> : <Badge variant="info" className="text-[10px] px-1.5 py-0">6M</Badge>}
                </div>
                <div className="h-[250px]">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader /></div>}>
                    <RevenueGrowthChart data={resolvedRevenueGrowth} loading={loading} />
                  </Suspense>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Billing Overview</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Invoices</div>
                  <div className="text-lg font-bold mt-0.5 text-slate-900 dark:text-white">{billingOverview.total_billings.toLocaleString('id-ID')}</div>
                </div>
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Paid</div>
                  <div className="text-lg font-bold mt-0.5 text-slate-900 dark:text-white">{billingOverview.paid_billings.toLocaleString('id-ID')}</div>
                </div>
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-500">Unpaid</div>
                  <div className="text-lg font-bold mt-0.5 text-slate-900 dark:text-white">{billingOverview.pending_billings.toLocaleString('id-ID')}</div>
                </div>
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="text-[10px] font-black uppercase tracking-wider text-red-500">Overdue</div>
                  <div className="text-lg font-bold mt-0.5 text-slate-900 dark:text-white">{billingOverview.overdue_billings.toLocaleString('id-ID')}</div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <RecentTransactionsTable data={recentTransactions} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">System Health</h3>
                {systemHealth.last_checked_iso ? (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Last check: {new Date(systemHealth.last_checked_iso).toLocaleString('id-ID')}
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold">Payment Module</div>
                    {systemBadge(systemHealth.payment_module_ok)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold">Gateway Status</div>
                    {systemHealth.gateway_overall ? (
                      <Badge variant={systemHealth.gateway_overall === 'healthy' ? 'success' : systemHealth.gateway_overall === 'degraded' ? 'warning' : 'error'} className="text-[10px] px-1.5 py-0">
                        {systemHealth.gateway_overall}
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px] px-1.5 py-0">Unknown</Badge>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Webhook & Jobs</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Failed (1h)</span>
                      <span className="font-bold">{systemHealth.webhook_failures_last_1h.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
