import React, { lazy, Suspense, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { Table } from '../../components/ui';
import { BILLING_PAGE_CONFIG } from '../../components/billing/billingLayoutConfig';
import { Button, Loader, EnhancedAlert, SearchableSelect, Input } from '../../components/ui';
import { getAllPlans, getPublicPlans, formatCurrency as formatCurrencyPlan } from '../../api/plans.api';
import {
  getAllSubscriptions,
  getSubscriptionsByTenant,
  getActiveSubscription,
  updateSubscription,
  getSubscriptionHistory,
  deleteSubscription,
} from '../../api/subscription.api';
import type { FilteredSubscriptionItem } from '../../api/subscription.api';
import type { Plan } from '../../types/billing';
import type { SubscriptionHistoryItem } from '../../types/subscription';
import { generateBillingForSubscription, getBillingsBySubscription } from '../../api/billing.api';
import { getPaymentHistory } from '../../api/payments.api';
import { Badge } from '../../components/ui/Badge';
import { Eye, Pause, RefreshCcw, Edit, Plus, HelpCircle, History as HistoryIcon, Search } from 'lucide-react';
import useConfirm from '../../hooks/useConfirm';
import { getAllTenants, type Tenant } from '../../api/tenants.api';
import useAuth from '../../hooks/useAuth';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { mapSubscriptionToUI, type SubscriptionUIState } from '../../utils/subscriptionMapper';
import { useDebounce } from '../../hooks/useDebounce';
import type { Billing } from '../../types/billing';
import { SubscriptionTenantView } from '../../components/billing/SubscriptionTenantView';

// ─── Lazy-loaded Modals (Code Splitting) ─────────────────────────────────────
const SubscriptionEditModal = lazy(() =>
  import('../../components/billing/SubscriptionEditModal').then(m => ({ default: m.SubscriptionEditModal }))
);
const SubscriptionCreateModal = lazy(() =>
  import('../../components/billing/SubscriptionCreateModal').then(m => ({ default: m.SubscriptionCreateModal }))
);
const SubscriptionHistoryModal = lazy(() =>
  import('../../components/billing/SubscriptionHistoryModal').then(m => ({ default: m.SubscriptionHistoryModal }))
);

// ─── Types ────────────────────────────────────────────────────────────────────
type SubscriptionRow = FilteredSubscriptionItem & {
  has_payment_success?: boolean;
  uiState: SubscriptionUIState;
};

type AuditItem = SubscriptionHistoryItem & {
  old_plan_name?: string | null;
  new_plan_name?: string | null;
  changed_by_name?: string | null;
  changed_by_email?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(s?: string | null) {
  if (!s) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(s));
  } catch { return s || '-'; }
}

function extractErrorMsg(e: unknown, fallback: string): string {
  return typeof e === 'object' && e !== null && 'message' in e
    ? String((e as { message?: unknown }).message) : fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageConfig = BILLING_PAGE_CONFIG.subscriptions;

  const [items, setItems] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [serverTotalItems, setServerTotalItems] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planOptions, setPlanOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planId, setPlanId] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [tenantFilterId, setTenantFilterId] = useState('ALL');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SubscriptionRow | null>(null);
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editAutoRenew, setEditAutoRenew] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [planDetails, setPlanDetails] = useState<Record<string, Plan>>({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<AuditItem[]>([]);
  const [historySubscriptionId, setHistorySubscriptionId] = useState('');

  const { isSuperAdmin, user, getCurrentTenantId, isLoading, can } = useAuth();
  const confirm = useConfirm();

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader size="lg" /></div>;
  }

  const isSA = isSuperAdmin();
  const canManageSubscriptions = useMemo(() => can('billing.subscriptions.update'), [can]);

  const loadPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      const res = isSA
        ? await getAllPlans({ page: 1, limit: 200 }, { skipTenantHeader: true })
        : await getPublicPlans();
      const dataRes = (res as { data?: unknown }).data;
      const payload = Array.isArray(dataRes) ? dataRes
        : Array.isArray((dataRes as { plans?: unknown[] } | undefined)?.plans)
          ? (dataRes as { plans?: unknown[] }).plans ?? []
          : (dataRes as unknown[] | undefined) ?? [];
      setPlanOptions((payload as unknown[])?.map((p) => {
        const plan = p as Partial<Plan> & { plan_id?: string; _id?: string };
        return { id: plan.id ?? plan.plan_id ?? plan._id ?? '', name: String(plan.name ?? '') };
      }));
      const map: Record<string, Plan> = {};
      for (const p of payload as unknown[]) {
        const plan = p as Partial<Plan> & { plan_id?: string; _id?: string };
        const id = (plan.id ?? plan.plan_id ?? plan._id ?? '') as string;
        map[id] = plan as Plan;
      }
      setPlanDetails(map);
    } catch { setPlanOptions([]); }
    finally { setPlansLoading(false); }
  }, [isSA]);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let list: FilteredSubscriptionItem[] = [];
      if (isSA) {
        const res = await getAllSubscriptions({ include_inactive: true, page: currentPage, limit: itemsPerPage });
        const subs = (res?.data?.subscriptions || (res as unknown as { data?: FilteredSubscriptionItem[] }).data || []) as FilteredSubscriptionItem[];
        list = subs;
        const pag = res?.data?.pagination as unknown as Record<string, number> | undefined;
        if (pag) {
          setServerTotalItems(pag['totalItems'] ?? pag['total_count'] ?? subs.length);
          setServerTotalPages(pag['totalPages'] ?? pag['total_pages'] ?? 1);
        } else {
          setServerTotalItems(subs.length);
          setServerTotalPages(1);
        }
      } else {
        const tenantId = user?.tenant_id || getCurrentTenantId();
        if (!tenantId) throw new Error('Tenant tidak tersedia untuk pengguna ini');
        try {
          const res = await getSubscriptionsByTenant(tenantId, true);
          list = (res?.data?.subscriptions || (res as unknown as { data?: FilteredSubscriptionItem[] }).data || []) as FilteredSubscriptionItem[];
          if (!list?.length) {
            try { const r = await getActiveSubscription(); const a = r?.data as FilteredSubscriptionItem | null; list = a ? [a] : []; } catch {}
          }
        } catch (err: unknown) {
          const has403 = typeof err === 'object' && err !== null && 'response' in err &&
            ((err as { response?: { status?: number } }).response?.status === 403);
          if (has403 || /status code 403/i.test(extractErrorMsg(err, ''))) {
            const r = await getActiveSubscription(); list = [(r?.data as FilteredSubscriptionItem | null)].filter(Boolean) as FilteredSubscriptionItem[];
          } else { throw err; }
        }
      }
      const enriched = await Promise.all((list || [])?.map(async (sub) => {
        try {
          const billRes = await getBillingsBySubscription(sub.id);
          const billings = (billRes?.data ?? []) as Billing[];
          const latest = billings[0];
          const inv = latest?.Invoice;
          let lastInvoiceStatus: 'PAID' | 'UNPAID' | 'OVERDUE' | 'DRAFT' | null = null;
          if (inv) {
            const s = String(inv.status || '').toUpperCase();
            const due = inv.due_date ? new Date(inv.due_date) : null;
            if (s === 'PAID') lastInvoiceStatus = 'PAID';
            else if (s === 'DRAFT') lastInvoiceStatus = (due && due.getTime() < Date.now()) ? 'OVERDUE' : 'DRAFT';
            else lastInvoiceStatus = (due && due.getTime() < Date.now()) ? 'OVERDUE' : 'UNPAID';
          }
          let hasPaymentSuccess = false;
          if (latest?.id) {
            try {
              const hist = await getPaymentHistory(String(latest.id), 1, 10, undefined, { tenant_id: sub.tenant_id, skipTenantHeader: isSA });
              const payments = Array.isArray((hist as { data?: unknown[] }).data) ? ((hist as { data?: unknown[] }).data ?? []) : [];
              hasPaymentSuccess = payments?.some(p => ['SUCCESS', 'PAID', 'COMPLETED'].includes(String((p as { status?: unknown }).status || '').toUpperCase()));
              if (hasPaymentSuccess) lastInvoiceStatus = 'PAID';
            } catch {}
          }
          const nextBD = sub?.next_billing_date ?? inv?.due_date ?? (sub?.auto_renew && sub?.end_date ? sub.end_date : null);
          const uiState = mapSubscriptionToUI({ ...sub, next_billing_date: nextBD }, lastInvoiceStatus || undefined, hasPaymentSuccess);
          return { ...sub, payment_method: sub?.payment_method || latest?.payment_method || null, renewal_count: typeof sub?.renewal_count === 'number' ? sub.renewal_count : (billings?.length || 0), last_invoice_status: lastInvoiceStatus, next_billing_date: nextBD || null, has_payment_success: hasPaymentSuccess, uiState } as SubscriptionRow;
        } catch {
          return { ...sub, uiState: mapSubscriptionToUI(sub) } as SubscriptionRow;
        }
      }));
      setItems(enriched);
      if (!isSA) { setServerTotalItems(enriched.length); setServerTotalPages(Math.max(1, Math.ceil(enriched.length / itemsPerPage))); }
    } catch (e) { setError(extractErrorMsg(e, 'Gagal memuat data subscription')); }
    finally { setLoading(false); }
  }, [isSA, user?.tenant_id, currentPage, itemsPerPage]);

  useEffect(() => {
    const p = new URLSearchParams(String(location.search || ''));
    const s = p.get('status'); const sr = p.get('search'); const pl = p.get('plan_id');
    const fr = p.get('date_from'); const to = p.get('date_to');
    if (s) setStatusFilter(s.toUpperCase());
    if (sr !== null) setSearchTerm(sr);
    if (pl) setPlanId(pl);
    if (fr !== null) setDateFrom(fr);
    if (to !== null) setDateTo(to);
  }, [location.search]);

  useEffect(() => {
    loadPlans();
    loadSubscriptions();
    if (!isSA) return;
    (async () => {
      try {
        setTenantsLoading(true);
        const res = await getAllTenants({ page: 1, limit: 200 });
        setTenantOptions(((res?.data || []) as Tenant[])?.map(t => ({ id: t.id, name: t.name })));
      } catch { setTenantOptions([]); }
      finally { setTenantsLoading(false); }
    })();
  }, [isSA, user?.tenant_id]);

  const initialLoad = useRef(true);
  useEffect(() => {
    if (!isSA) return;
    if (initialLoad.current) { initialLoad.current = false; return; }
    loadSubscriptions();
  }, [isSA, currentPage, itemsPerPage, loadSubscriptions]);

  const onViewBilling = useCallback((_item?: FilteredSubscriptionItem) => navigate('/billing/billings'), [navigate]);

  const onViewHistory = useCallback(async (subscriptionId: string) => {
    setShowHistoryModal(true); setHistoryLoading(true); setHistoryError(null);
    setHistorySubscriptionId(String(subscriptionId));
    try {
      const res = await getSubscriptionHistory(String(subscriptionId));
      setHistoryItems(Array.isArray((res as { data?: AuditItem[] }).data) ? (res as { data: AuditItem[] }).data : []);
    } catch (e) { setHistoryError(extractErrorMsg(e, 'Gagal memuat riwayat')); }
    finally { setHistoryLoading(false); }
  }, []);

  const onDelete = useCallback(async (item: FilteredSubscriptionItem) => {
    const ok = await confirm({ title: 'Konfirmasi Hapus Subscription', description: 'Tindakan ini permanen.', confirmText: 'Hapus', cancelText: 'Batal', style: 'danger' });
    if (!ok) return;
    try { const r = await deleteSubscription(String(item.id)); setSuccess(r?.message || 'Berhasil dihapus'); await loadSubscriptions(); }
    catch (e) { setError(extractErrorMsg(e, 'Gagal menghapus subscription')); }
  }, [confirm, loadSubscriptions]);

  const onPause = useCallback(async (item: FilteredSubscriptionItem) => {
    const ok = await confirm({ title: 'Tangguhkan Subscription', description: 'Subscription akan SUSPENDED.', confirmText: 'Tangguhkan', cancelText: 'Batal', style: 'warning' });
    if (!ok) return;
    try { await updateSubscription(item.id as string, { status: 'SUSPENDED' }); setSuccess('Subscription ditangguhkan'); await loadSubscriptions(); }
    catch (e) { setError(extractErrorMsg(e, 'Gagal menangguhkan subscription')); }
  }, [confirm, loadSubscriptions]);

  const onRenewManual = useCallback(async (item: FilteredSubscriptionItem) => {
    const ok = await confirm({ title: 'Perpanjang Manual', description: 'Sistem akan membuat billing baru.', confirmText: 'Lanjutkan', cancelText: 'Batal', style: 'warning' });
    if (!ok) return;
    try { await generateBillingForSubscription({ subscription_id: item.id as string }); setSuccess('Billing berhasil dibuat'); await loadSubscriptions(); }
    catch (e) { setError(extractErrorMsg(e, 'Gagal membuat billing')); }
  }, [confirm, loadSubscriptions]);

  const onEdit = useCallback((item: SubscriptionRow) => {
    setSelectedItem(item); setEditStatus(item?.status || 'ACTIVE'); setEditAutoRenew(!!item?.auto_renew); setShowEditModal(true);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!selectedItem?.id) return;
    try {
      setEditLoading(true);
      await updateSubscription(selectedItem.id as string, { auto_renew: editAutoRenew });
      setSuccess('Subscription berhasil diperbarui'); setShowEditModal(false); setSelectedItem(null);
      await loadSubscriptions();
    } catch (e) { setError(extractErrorMsg(e, 'Gagal memperbarui subscription')); }
    finally { setEditLoading(false); }
  }, [editAutoRenew, selectedItem?.id, loadSubscriptions]);

  const handleSort = useCallback((key: string) => {
    setSortBy(prev => { if (prev === key) { setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); return key; } setSortOrder('asc'); return key; });
  }, []);

  const columns = useMemo(() => ([
    {
      key: 'tenant', label: 'Tenant', sortable: true,
      render: (_: unknown, row: SubscriptionRow) => (
        <div>
          <button type="button" onClick={() => { if (isSA && row.tenant_id) navigate(`/tenants/${row.tenant_id}`); }}
            className={`${isSA && row.tenant_id ? 'text-blue-600 hover:underline dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'} font-medium text-left`}>
            {row?.tenant?.name || row?.tenant_name || '-'}
          </button>
          <div className="text-xs text-muted-foreground">{row?.tenant?.domain || row?.tenant_email || ''}</div>
        </div>
      ),
    },
    {
      key: 'plan', label: 'Plan', sortable: true,
      render: (_: unknown, row: SubscriptionRow) => (
        <div><div className="font-medium">{row?.plan?.name || row?.plan_name || '-'}</div>
          <div className="text-xs text-muted-foreground">{row?.plan?.billing_cycle || row?.Plan?.billing_cycle || 'MONTHLY'}</div></div>
      ),
    },
    {
      key: 'periode', label: 'Periode', sortable: true,
      render: (_: unknown, row: SubscriptionRow) => (
        <span className="whitespace-nowrap">{fmtDate(row.start_date)}{row.end_date ? ` s/d ${fmtDate(row.end_date)}` : ''}</span>
      ),
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (_: unknown, row: SubscriptionRow) => {
        const s = String(row.status || '').toUpperCase();
        if (s === 'ACTIVE') return <Badge variant="success">Aktif</Badge>;
        if (s === 'TRIAL') return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Trial</Badge>;
        if (s === 'PENDING_PAYMENT') return <Badge variant="warning">Menunggu Pembayaran</Badge>;
        if (s === 'SUSPENDED') return <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100">Ditangguhkan</Badge>;
        if (s === 'CANCELLED') return <Badge className="bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-200">Dibatalkan</Badge>;
        if (s === 'EXPIRED') return <Badge variant="destructive">Kedaluwarsa</Badge>;
        return <Badge variant="default">Tidak Diketahui</Badge>;
      },
    },
    {
      key: 'next_billing_date', label: 'Next Billing', sortable: true,
      render: (_: unknown, row: SubscriptionRow) => (
        <span className="whitespace-nowrap font-medium">{row.uiState?.displayNextBilling || '-'}</span>
      ),
    },
    {
      key: 'amount', label: 'Amount', sortable: true,
      render: (_: unknown, row: SubscriptionRow) => {
        const price = row.plan?.price_monthly ?? row.Plan?.price_monthly ?? 0;
        const currency = row.plan?.currency ?? row.Plan?.currency ?? 'IDR';
        return <span className="whitespace-nowrap">{formatCurrencyPlan(price, currency)} / bulan</span>;
      },
    },
    {
      key: 'actions', label: 'Aksi', className: 'w-[220px]',
      render: (_: unknown, row: SubscriptionRow) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onViewBilling(row)}><Eye className="w-4 h-4 mr-1" />Lihat Billing</Button>
          <Button size="sm" variant="outline" onClick={() => onViewHistory(String(row.id))}><HistoryIcon className="w-4 h-4 mr-1" />Riwayat</Button>
          {canManageSubscriptions && (
            <Button size="sm" variant="outline" onClick={() => onEdit(row)}><Edit className="w-4 h-4 mr-1" />Edit</Button>
          )}
        </div>
      ),
    },
  ]), [onViewBilling, onViewHistory, onEdit, isSA, navigate, canManageSubscriptions]);

  const filteredItems = useMemo(() => {
    const toD = (s?: string) => s ? new Date(s) : undefined;
    const fd = toD(dateFrom); const ud = toD(dateTo);
    let result = items?.filter(row => {
      const tn = (row?.tenant?.name || row?.tenant_name || '').toLowerCase();
      const pn = (row?.plan?.name || row?.plan_name || '').toLowerCase();
      const q = debouncedSearch.toLowerCase();
      return (!q || tn.includes(q) || pn.includes(q))
        && (!statusFilter || statusFilter === 'ALL' || row.status === statusFilter)
        && (!planId || planId === 'ALL' || row.plan_id === planId || row?.plan?.id === planId)
        && (!tenantFilterId || tenantFilterId === 'ALL' || row.tenant_id === tenantFilterId)
        && (!fd || (row.start_date && new Date(row.start_date) >= fd))
        && (!ud || (row.end_date && new Date(row.end_date) <= ud));
    });
    if (sortBy) {
      result = [...result].sort((a, b) => {
        if (sortBy === 'amount') {
          const diff = (a.plan?.price_monthly ?? 0) - (b.plan?.price_monthly ?? 0);
          return sortOrder === 'asc' ? diff : -diff;
        }
        const getVal = (r: SubscriptionRow) =>
          sortBy === 'tenant' ? (r?.tenant?.name || r?.tenant_name || '') :
          sortBy === 'plan' ? (r?.plan?.name || r?.plan_name || '') :
          sortBy === 'status' ? (r.status || '') :
          sortBy === 'periode' ? (r.start_date || '') :
          sortBy === 'next_billing_date' ? (r.next_billing_date || '') : '';
        const cmp = getVal(a).localeCompare(getVal(b), 'id', { sensitivity: 'base' });
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [items, debouncedSearch, statusFilter, planId, tenantFilterId, dateFrom, dateTo, sortBy, sortOrder]);

  const summary = useMemo(() => ({
    activeCount: items?.filter(r => r.status === 'ACTIVE').length,
    trialCount: items?.filter(r => r.status === 'TRIAL').length,
    estimatedMrr: items?.reduce((acc, r) => acc + (r.plan?.price_monthly ?? r.Plan?.price_monthly ?? 0), 0),
  }), [items]);

  const paginatedItems = useMemo(() => {
    if (isSA) return filteredItems;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems?.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage, isSA]);

  const active = useMemo(() =>
    items?.find(s => s.uiState?.effectiveStatus === 'ACTIVE') ||
    items?.find(s => s.uiState?.effectiveStatus === 'TRIAL') ||
    items?.find(s => s.uiState?.effectiveStatus === 'PENDING_PAYMENT') ||
    null, [items]);

  const toggleActiveAutoRenew = useCallback(async (next: boolean) => {
    if (!active?.id) return;
    try { setLoading(true); await updateSubscription(active.id as string, { auto_renew: next }); setSuccess('Auto renew diperbarui'); await loadSubscriptions(); }
    catch (e) { setError(extractErrorMsg(e, 'Gagal memperbarui auto renew')); }
    finally { setLoading(false); }
  }, [active?.id, loadSubscriptions]);

  const saHeaderStats = useMemo(() => [
    { title: 'Total Langganan', value: items.length, icon: <HistoryIcon size={14} />, gradient: 'from-slate-600 to-slate-800' },
    { title: 'Langganan Aktif', value: summary.activeCount, icon: <Pause size={14} className="rotate-90 text-emerald-500" />, gradient: 'from-green-500 to-emerald-600' },
    { title: 'Masa Trial', value: summary.trialCount, icon: <HelpCircle size={14} className="text-blue-500" />, gradient: 'from-blue-500 to-cyan-600' },
    { title: 'Estimasi MRR', value: formatCurrencyPlan(summary.estimatedMrr, 'IDR'), icon: <RefreshCcw size={14} className="text-indigo-500" />, gradient: 'from-indigo-500 to-purple-600' },
  ], [items, summary]);

  const instruction = useMemo(() => ({
    title: 'Panduan Manajemen Langganan',
    description: 'Pantau dan kelola seluruh langganan aktif, masa trial, dan auto-renew untuk semua tenant platform Absenta.',
    items: [
      { text: 'Gunakan filter Status untuk menyaring langganan berdasarkan kondisi saat ini (Aktif, Trial, Kedaluwarsa, dll).' },
      { text: 'Tombol "Riwayat" di tiap baris menampilkan jejak perubahan status dan paket untuk satu subscription.' },
      { text: 'Edit subscription hanya mengizinkan perubahan toggle Auto Renew; perubahan status mengikuti alur sistem.' },
      { text: 'Kolom Next Billing menunjukkan estimasi tanggal penagihan berikutnya berdasarkan data billing terbaru.' }
    ],
  }), []);

  const tableToolbarRight = useMemo(() => canManageSubscriptions ? (
    <Button onClick={() => setShowCreateModal(true)} className="flex items-center text-xs h-9 uppercase tracking-widest font-black" variant="primary">
      <Plus className="w-4 h-4 mr-2" />Buat Langganan
    </Button>
  ) : null, [canManageSubscriptions]);

  if (!isSA) {
    return (
      <SubscriptionTenantView
        pageTitle={pageConfig.title}
        pageSubtitle={pageConfig.subtitle}
        loading={loading}
        error={error}
        success={success}
        onDismissError={() => setError(null)}
        onDismissSuccess={() => setSuccess(null)}
        activeSubscription={active}
        onToggleAutoRenew={toggleActiveAutoRenew}
      />
    );
  }

  return (
    <SuperAdminPageLayout
      hardeningModuleKey="superadmin_subscriptions"
      title="Langganan Tenant"
      description="Manajemen lisensi paket aktif, masa trial, dan konfigurasi auto-renew langganan tenant Absenta."
      breadcrumbs={[{ label: 'Billing Platform', path: '/menu/billing-console' }, { label: 'Langganan Tenant' }]}
      stats={saHeaderStats}
      isLoadingStats={loading}
      instruction={instruction}
    >
      {error && <EnhancedAlert variant="destructive" title="Error" description={error} dismissible onDismiss={() => setError(null)} className="mb-4" />}
      {success && <EnhancedAlert variant="success" title="Success" description={success} dismissible onDismiss={() => setSuccess(null)} className="mb-4" />}

      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/60 dark:bg-amber-900/30 dark:text-amber-100">
        Perubahan di halaman ini berdampak langsung ke akses layanan dan penagihan semua tenant. Pastikan setiap update sudah disepakati dengan pemilik sekolah.
      </div>

      <Card className="overflow-hidden">
        <Table
          data={paginatedItems}
          columns={columns}
          loading={loading}
          emptyMessage={filteredItems.length === 0 && !loading ? 'Tidak ada langganan yang cocok dengan filter pencarian' : undefined}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          pagination={{
            currentPage, totalPages: serverTotalPages, totalItems: serverTotalItems, itemsPerPage,
            onPageChange: (page) => setCurrentPage(page),
            onLimitChange: (limit) => { setItemsPerPage(limit); setCurrentPage(1); },
          }}
          toolbarRight={tableToolbarRight}
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="w-64">
                <Input type="text" value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder={pageConfig.searchPlaceholder || 'Cari tenant...'}
                  leftIcon={<Search className="text-gray-400 h-4 w-4" />}
                  aria-label="Cari subscription berdasarkan tenant atau plan"
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200/80 dark:border-slate-800" />
              </div>
              <div className="w-48">
                <SearchableSelect value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
                  options={[{ value: 'ALL', label: 'Semua Status' }, ...((pageConfig.statusOptions || [])?.map(o => ({ value: o.value, label: o.label })))]}
                  placeholder="Semua Status" searchPlaceholder="Cari status..."
                  triggerClassName="bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800" />
              </div>
              <div className="relative w-64">
                <SearchableSelect value={tenantFilterId} onValueChange={(v) => { setTenantFilterId(v); setCurrentPage(1); }}
                  options={[{ value: 'ALL', label: 'Semua Tenant' }, ...tenantOptions?.map(t => ({ value: t.id, label: t.name }))]}
                  placeholder={tenantsLoading ? 'Memuat tenant...' : 'Semua Tenant'} searchPlaceholder="Cari tenant..."
                  triggerClassName="bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800" />
              </div>
              <div className="relative w-48">
                <SearchableSelect value={planId} onValueChange={(v) => { setPlanId(v); setCurrentPage(1); }}
                  options={[{ value: 'ALL', label: 'Semua Plan' }, ...planOptions?.map(p => ({ value: p.id, label: p.name }))]}
                  placeholder="Semua Plan" searchPlaceholder="Cari plan..."
                  triggerClassName="bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Periode:</span>
                <div className="w-36">
                  <Input type="date" value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                    aria-label="Filter tanggal mulai"
                    className="bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 py-1" />
                </div>
                <span className="text-xs text-gray-500 font-medium">-</span>
                <div className="w-36">
                  <Input type="date" value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                    aria-label="Filter tanggal berakhir"
                    className="bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 py-1" />
                </div>
              </div>
            </div>
          }
        />
      </Card>

      <Suspense fallback={<div className="flex justify-center py-4"><Loader size="sm" /></div>}>
        {showEditModal && (
          <SubscriptionEditModal isOpen={showEditModal} onClose={() => setShowEditModal(false)}
            editStatus={editStatus} editAutoRenew={editAutoRenew} onAutoRenewChange={setEditAutoRenew}
            onSave={handleEditSave} loading={editLoading} />
        )}
        {showCreateModal && (
          <SubscriptionCreateModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}
            isSA={isSA} userId={user?.id} userTenantId={user?.tenant_id || getCurrentTenantId() || undefined}
            planOptions={planOptions} planDetails={planDetails} tenantOptions={tenantOptions}
            plansLoading={plansLoading} tenantsLoading={tenantsLoading}
            getCurrentTenantId={getCurrentTenantId} isSuperAdmin={isSuperAdmin}
            loadSubscriptions={loadSubscriptions}
            onSuccess={(msg) => setSuccess(msg)} onError={(msg) => setError(msg)} />
        )}
        {showHistoryModal && (
          <SubscriptionHistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}
            subscriptionId={historySubscriptionId} historyItems={historyItems}
            historyLoading={historyLoading} historyError={historyError}
            onDismissError={() => setHistoryError(null)} />
        )}
      </Suspense>
    </SuperAdminPageLayout>
  );
}
