import React, { useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, 
  FileText, 
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Calendar,
  Activity,
  Bell,
  Eye,
  TrendingUp,
  Package,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { 
  Button, 
  Loader, 
  StatusBadge,
  SectionCard
} from '@/components/ui';

// Lazy load heavy components (Pilar 11)
const AnalyticsCard = lazy(() => import('@/components/ui/AnalyticsCard').then(m => ({ default: m.AnalyticsCard })));
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { 
  DashboardFinancialMetrics, 
  DashboardNotification, 
  Billing,
  BillingHealthSummary
} from '@/types/billing';
import {
  getFinancialMetrics,
  getDashboardNotifications,
  getRecentActivities,
  getBillingHealthSummary,
  markNotificationAsRead,
} from '@/api/billing-dashboard.api';
import { formatCurrency, formatNumber, formatDate } from '@/utils/layoutUtils';
import { cn } from '@/lib/utils';

export const BillingDashboardPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // React Query Fetching (Pilar 31)
  const { data: metricsRes, isLoading: loadingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['billing-dashboard-metrics'],
    queryFn: getFinancialMetrics,
    staleTime: 2 * 60 * 1000,
  });

  const { data: notifsRes, isLoading: loadingNotifs, refetch: refetchNotifs } = useQuery({
    queryKey: ['billing-dashboard-notifications'],
    queryFn: getDashboardNotifications,
    staleTime: 2 * 60 * 1000,
  });

  const { data: activitiesRes, isLoading: loadingActivities, refetch: refetchActivities } = useQuery({
    queryKey: ['billing-dashboard-recent-activities'],
    queryFn: () => getRecentActivities(10),
    staleTime: 2 * 60 * 1000,
  });

  const { data: healthRes, isLoading: loadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['billing-dashboard-health-summary'],
    queryFn: getBillingHealthSummary,
    staleTime: 2 * 60 * 1000,
  });

  const metrics: DashboardFinancialMetrics | null = metricsRes?.data ?? null;
  const notifications: DashboardNotification[] = notifsRes?.data ?? [];
  const recentActivities: Billing[] = activitiesRes?.data ?? [];
  const healthSummary: BillingHealthSummary | null = healthRes?.data ?? null;

  const loading = loadingMetrics || loadingNotifs || loadingActivities || loadingHealth;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchMetrics(),
      refetchNotifs(),
      refetchActivities(),
      refetchHealth(),
    ]);
  }, [refetchMetrics, refetchNotifs, refetchActivities, refetchHealth]);

  const handleNotificationClick = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard-notifications'] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [queryClient]);

  const filteredNotifications = useMemo(() => {
    const list = Array.isArray(notifications) ? notifications : [];
    const allowedTypes = new Set(['payment_failed', 'payment_due', 'system_alert']);
    return list.filter((n) => {
      const type = String(n?.type || '').toLowerCase();
      if (allowedTypes.has(type)) return true;
      const title = String(n?.title || '');
      const message = String(n?.message || '');
      const blob = `${title} ${message}`.toLowerCase();
      if (blob.includes('billing') || blob.includes('tagihan') || blob.includes('invoice') || blob.includes('pembayaran') || blob.includes('payment') || blob.includes('subscription')) return true;
      if (blob.includes('extend') || blob.includes('renew') || blob.includes('perpanjang')) return true;
      return false;
    });
  }, [notifications]);

  const filteredActivities = useMemo(() => {
    const list = Array.isArray(recentActivities) ? recentActivities : [];
    return list.filter((a) => {
      const status = String(a?.status || a?.Invoice?.status || '').toUpperCase();
      return status === 'UNPAID' || status === 'OVERDUE';
    });
  }, [recentActivities]);

  const controlPlane = useMemo(() => {
    const criticalCount =
      (healthSummary?.active_without_paid_invoice_count ?? 0) +
      (healthSummary?.paid_not_applied_count ?? 0);

    const degradedCount =
      (healthSummary?.invalid_invoice_period_count ?? 0) +
      (healthSummary?.webhook_failures_last_1h ?? 0) +
      (healthSummary?.reconciliation_fix_count_last_1h ?? 0);

    const statusBadge =
      criticalCount > 0
        ? { text: 'KRITIS', className: 'bg-rose-500 text-white animate-pulse' }
        : degradedCount > 0
        ? { text: 'DEGRADED', className: 'bg-amber-500 text-white' }
        : { text: 'OPTIMAL', className: 'bg-emerald-500 text-white' };

    return {
      statusBadge,
      criticalCount,
      degradedCount
    };
  }, [healthSummary]);

  const breadcrumbs = useMemo(() => [
    { label: 'Billing', path: '/billing' },
    { label: 'Dashboard Keuangan' }
  ], []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Dashboard Penagihan & Keuangan"
        description="Ringkasan eksekutif arus kas, status invoice, kesehatan langganan, dan anomali rekonsiliasi."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="billing_dashboard"
        topSlot={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 font-bold rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>
          </div>
        }
        instruction={{
          title: "Panduan Dashboard Keuangan",
          description: "Pusat pemantauan status keuangan, invoice aktif, dan kesehatan webhook.",
          items: [
            { text: "Pantau metrik pendapatan bulanan dan tagihan yang mendekati jatuh tempo." },
            { text: "Tinjau alarm sistem pada panel notifikasi untuk menindaklanjuti kegagalan pembayaran." },
            { text: "Klik pada tagihan menunggak untuk melihat rincian faktur dan kontak tenant." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            {/* Health Status Banner */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Kesehatan Sistem Billing</h3>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider", controlPlane.statusBadge.className)}>
                      {controlPlane.statusBadge.text}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {controlPlane.criticalCount > 0
                      ? `Ditemukan ${controlPlane.criticalCount} anomali kritis yang memerlukan rekonsiliasi.`
                      : 'Semua alur pembayaran Tripay dan integrasi webhook berjalan normal.'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/billing/tripay-health')}
                className="text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                Cek Kesehatan Tripay
                <ArrowRight size={13} />
              </Button>
            </div>

            {/* Financial Metrics Cards (Pilar 23) */}
            <Suspense fallback={<div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnalyticsCard
                  title="Pendapatan Bulan Ini"
                  value={formatCurrency(metrics?.mrr || metrics?.total_revenue || 0)}
                  icon={DollarSign}
                  trend={{ value: 12.5, isPositive: true }}
                  color="indigo"
                />
                <AnalyticsCard
                  title="Total Tagihan Aktif"
                  value={formatNumber(metrics?.total_invoices || recentActivities.length || 0)}
                  icon={FileText}
                  trend={{ value: 4.2, isPositive: true }}
                  color="blue"
                />
                <AnalyticsCard
                  title="Tenant Berlangganan"
                  value={formatNumber(metrics?.active_subscriptions || 0)}
                  icon={Users}
                  trend={{ value: 8.1, isPositive: true }}
                  color="emerald"
                />
                <AnalyticsCard
                  title="Tagihan Jatuh Tempo"
                  value={formatNumber(metrics?.overdue_invoices || filteredActivities.length || 0)}
                  icon={AlertTriangle}
                  trend={{ value: 0, isPositive: false }}
                  color="rose"
                />
              </div>
            </Suspense>

            {/* Content Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Notification Alerts */}
              <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4 px-6">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <Bell className="text-indigo-500 w-4 h-4" /> Alarm & Peringatan Penagihan
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">Notifikasi otomatis mengenai invoice dan pembayaran.</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {filteredNotifications.length} Peringatan
                  </span>
                </CardHeader>
                <CardContent className="p-6 space-y-3 max-h-[380px] overflow-y-auto flex-1">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader size="md" />
                    </div>
                  ) : filteredNotifications.length > 0 ? (
                    filteredNotifications?.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-start justify-between p-3.5 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 transition-all"
                      >
                        <div className={cn(
                          "p-2 rounded-xl mr-3 shrink-0",
                          notification.type === 'payment_failed'
                            ? 'bg-rose-100/50 dark:bg-rose-950/40 text-rose-600'
                            : notification.type === 'subscription_expiring'
                            ? 'bg-amber-100/50 dark:bg-amber-950/40 text-amber-600'
                            : 'bg-indigo-100/50 dark:bg-indigo-950/40 text-indigo-600'
                        )}>
                          {notification.type === 'payment_failed' ? (
                            <ShieldAlert className="w-4 h-4" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{notification.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{notification.message}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1.5 flex items-center gap-1">
                            <Clock size={10} /> {formatDate(notification.created_at)}
                          </p>
                        </div>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1.5"
                          onClick={() => handleNotificationClick(notification.id)}
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="text-slate-800 dark:text-slate-200 font-bold text-xs">Semua Berjalan Normal</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">Tidak ada anomali atau alarm penagihan aktif saat ini.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activities / Unpaid Invoices */}
              <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4 px-6">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <FileText className="text-indigo-500 w-4 h-4" /> Aktivitas Penagihan Terbaru
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">Daftar invoice menanti pembayaran (Unpaid / Overdue).</p>
                  </div>
                  <Button 
                    size="xs" 
                    variant="outline" 
                    className="rounded-xl text-[11px] font-bold"
                    onClick={() => navigate('/billing/billings?status=UNPAID')}
                  >
                    Lihat Semua
                  </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-3 max-h-[380px] overflow-y-auto flex-1">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader size="md" />
                    </div>
                  ) : filteredActivities.length > 0 ? (
                    filteredActivities?.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3.5 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 transition-all"
                      >
                        <div className="flex items-center min-w-0 mr-4">
                          <div className={cn(
                            "p-2 rounded-xl mr-3 shrink-0",
                            activity.status === 'OVERDUE'
                              ? 'bg-rose-100/50 dark:bg-rose-950/40 text-rose-600'
                              : 'bg-amber-100/50 dark:bg-amber-950/40 text-amber-600'
                          )}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{activity.invoice_number}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {activity.Subscription?.Tenant?.name || 'Unknown Tenant'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">
                              Tempo: {formatDate(activity.billing_date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                            {formatCurrency(activity.amount)}
                          </span>
                          <StatusBadge 
                            status={
                              activity.status === 'PAID' ? 'completed' :
                              activity.status === 'UNPAID' ? 'pending' :
                              activity.status === 'OVERDUE' ? 'cancelled' : 'draft'
                            } 
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-800 dark:text-slate-200 font-bold text-xs">Tidak Ada Tunggakan</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">Semua tenant telah melunasi tagihan tepat waktu.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default BillingDashboardPage;
