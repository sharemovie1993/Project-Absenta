import React, { useMemo, useState, useCallback } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, SectionCard, Button, Badge, Table, SearchableSelect } from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentSubscription, getSubscriptionsByTenant } from '@/api/subscription.api';
import { getAllTenants, type Tenant } from '@/api/tenants.api';
import { getTenantUsers } from '@/api/tenant-detail.api';
import { 
  getNotificationLogs, 
  sendTrialWelcomeEmail, 
  sendTrialFeatureEmail, 
  sendTrialCaseStudyEmail, 
  sendTrialUpgradeReminderEmail 
} from '@/api/notifications.api';
import { Mail, Send, CheckCircle2, Clock, ShieldAlert, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Zod Schema Validation Guard (Pilar 25)
const sendEmailSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  tenantName: z.string().min(1, 'Nama tenant wajib ada'),
  type: z.enum(['welcome', 'feature', 'case', 'upgrade']),
});

interface LogItem {
  id?: string;
  subject?: string;
  recipient?: string;
  status?: string;
  created_at?: string;
}

export const TrialEmailSequencePage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [recipient, setRecipient] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  // Pagination & Sorting State for Table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const frontendBase = typeof window !== 'undefined' ? window.location.origin : '';
  const setupLink = `${frontendBase}/dashboard`;
  const ctaUpgrade = `${frontendBase}/billing/subscriptions`;
  const ctaFeature = `${frontendBase}`;
  const ctaCase = `${frontendBase}`;

  // Fetch Current Sub
  const { data: currentSubData, isLoading: loadingSub } = useQuery({
    queryKey: ['current-sub-trial'],
    queryFn: async () => {
      const res = await getCurrentSubscription();
      const sub = res?.data;
      if (sub) {
        setTenantName(sub.Tenant?.name || '');
        const s = sub.start_date ? new Date(sub.start_date) : null;
        const e = sub.end_date ? new Date(sub.end_date) : null;
        setStartDate(s ? new Date(s).toISOString().slice(0, 10) : '');
        setEndDate(e ? new Date(e).toISOString().slice(0, 10) : '');
        if (e) {
          const now = new Date();
          const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const d2 = new Date(e.getFullYear(), e.getMonth(), e.getDate());
          const diff = Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000)));
          setDaysLeft(diff);
        }
      }
      return sub;
    }
  });

  // Fetch Notification Logs
  const { data: logsData, isLoading: loadingLogs } = useQuery({
    queryKey: ['notification-logs-trial'],
    queryFn: async () => {
      const res = await getNotificationLogs({ page: 1, limit: 100, type: 'EMAIL' });
      return (Array.isArray(res?.data?.logs) ? res.data.logs : []) as LogItem[];
    }
  });

  const logs = useMemo(() => logsData || [], [logsData]);

  // Fetch Tenants (Superadmin)
  const isSuperAdmin = !user?.tenant_id || user.tenant_id === 'system';
  const { data: tenantsData } = useQuery({
    queryKey: ['all-tenants-trial'],
    queryFn: async () => {
      const res = await getAllTenants({ limit: 1000 }, { skipTenantHeader: true });
      const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      return raw as Tenant[];
    },
    enabled: isSuperAdmin
  });

  const tenants = useMemo(() => tenantsData || [], [tenantsData]);

  const handleSelectTenant = useCallback(async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const t = (tenants ?? []).find(x => x.id === tenantId);
    setTenantName(t?.name || '');
    try {
      const usersResp = await getTenantUsers(tenantId, { limit: 100, role: 'ADMIN', status: 'ACTIVE' });
      const admins = usersResp?.data?.users || [];
      const email = admins.length > 0 ? admins[0]?.email || '' : '';
      setRecipient(email);

      const subsResp = await getSubscriptionsByTenant(tenantId, true);
      const subs = subsResp?.data?.subscriptions || [];
      const preferred = subs.find((s) => s.status === 'ACTIVE') || subs.find((s) => s.status === 'TRIAL') || subs[0];
      if (preferred) {
        const s = preferred.start_date ? new Date(preferred.start_date) : null;
        const e = preferred.end_date ? new Date(preferred.end_date) : null;
        setStartDate(s ? new Date(s).toISOString().slice(0, 10) : '');
        setEndDate(e ? new Date(e).toISOString().slice(0, 10) : '');
        if (e) {
          const now = new Date();
          const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const d2 = new Date(e.getFullYear(), e.getMonth(), e.getDate());
          const diff = Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000)));
          setDaysLeft(diff);
        } else {
          setDaysLeft(0);
        }
      }
    } catch {
      toast.error('Gagal memuat info tenant');
    }
  }, [tenants]);

  // Send Email Mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (type: 'welcome' | 'feature' | 'case' | 'upgrade') => {
      sendEmailSchema.parse({ email: recipient, tenantName, type });
      if (type === 'welcome') await sendTrialWelcomeEmail({ email: recipient, tenantName, setupLink });
      else if (type === 'feature') await sendTrialFeatureEmail({ email: recipient, tenantName, ctaUrl: ctaFeature });
      else if (type === 'case') await sendTrialCaseStudyEmail({ email: recipient, tenantName, ctaUrl: ctaCase });
      else await sendTrialUpgradeReminderEmail({ email: recipient, tenantName, daysLeft, ctaUrl: ctaUpgrade });
    },
    onSuccess: () => {
      toast.success('Email sequence berhasil dikirim!');
      queryClient.invalidateQueries({ queryKey: ['notification-logs-trial'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim email';
      toast.error(msg);
    }
  });

  const subjectExists = useCallback((subject: string) => {
    return (logs ?? []).some(l => (l.subject || '') === subject);
  }, [logs]);

  const schedule = useMemo(() => {
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    const fmt = (d: Date | null) => d ? d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    return {
      day0: fmt(s),
      day3: s ? fmt(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 3)) : '',
      day10: s ? fmt(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 10)) : '',
      h5: e ? fmt(new Date(e.getFullYear(), e.getMonth(), e.getDate() - 5)) : ''
    };
  }, [startDate, endDate]);

  const tableColumns: Column[] = useMemo(() => [
    {
      key: 'subject',
      label: 'Subjek Email',
      sortable: true,
      render: (value: unknown) => <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{String(value || '-')}</span>
    },
    {
      key: 'recipient',
      label: 'Penerima',
      sortable: true,
      render: (value: unknown) => <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{String(value || '-')}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: unknown) => {
        const val = String(value || 'SENT').toUpperCase();
        return (
          <Badge variant={val === 'SENT' ? 'success' : 'warning'} className="text-[9px] font-bold">
            {val}
          </Badge>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Waktu Pengiriman',
      sortable: true,
      render: (value: unknown) => {
        const val = value ? new Date(String(value)).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        return <span className="text-xs text-slate-500 font-mono">{val}</span>;
      }
    }
  ], []);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return (logs ?? []).slice(start, start + itemsPerPage);
  }, [logs, currentPage, itemsPerPage]);

  const breadcrumbs = useMemo(() => [
    { label: 'Notifikasi', path: '/notifications' },
    { label: 'Email Sequence Trial' }
  ], []);

  const tenantOptions = useMemo(() => [
    { value: '', label: '-- Pilih Tenant --' },
    ...(tenants ?? [])?.map(t => ({ value: t.id, label: t.name }))
  ], [tenants]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Email Sequence Trial Onboarding"
        description="Pantau alur otomasi pengiriman email edukasi fitur dan pengingat konversi upgrade untuk sekolah masa trial."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="trial_email_sequence"
        instruction={{
          title: 'Panduan Trial Email Sequence',
          description: 'Modul ini mengatur siklus komunikasi email otomatis bagi sekolah yang sedang dalam periode uji coba gratis (Trial).',
          items: [
            { text: 'Pilih tenant sekolah untuk memeriksa status sisa hari trial dan email administrator.' },
            { text: 'Gunakan tombol kirim manual jika ingin mempercepat follow-up pesan edukasi/studi kasus.' },
            { text: 'Semua riwayat email yang terkirim tersimpan di log pengiriman bawah halaman.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Info Trial */}
              <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Clock className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Informasi Masa Trial</h3>
                </div>

                <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-400">Tenant Sekolah</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{tenantName || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-400">Mulai Trial</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{schedule.day0 || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-400">Akhir Masa Trial</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {endDate ? new Date(endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-400">Sisa Hari</span>
                    <Badge variant={daysLeft <= 3 ? 'destructive' : 'secondary'} className="font-bold font-mono">
                      {daysLeft} Hari Lagi
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Card Pengaturan Penerima */}
              <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-5 h-5" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Pengaturan Penerima</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="select-trial-tenant" className="block text-xs font-bold text-slate-400 uppercase mb-1">
                      Pilih Tenant Sekolah
                    </label>
                    <SearchableSelect
                      id="select-trial-tenant"
                      aria-label="Pilih tenant sekolah untuk email sequence"
                      value={selectedTenantId}
                      onValueChange={handleSelectTenant}
                      options={tenantOptions}
                      placeholder="Pilih Tenant..."
                    />
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                    <span className="text-slate-400 block mb-0.5">Email Administrator:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{recipient || '(Belum dipilih)'}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sequence Actions Card */}
            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Mail className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Daftar Jadwal Email Sequence</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Welcome */}
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">1. Welcome & How To Start</h4>
                    <p className="text-[11px] text-slate-400">Jadwal: Hari ke-0 ({schedule.day0 || '-'})</p>
                    {subjectExists('Selamat Datang — Cara Memulai') && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                        <CheckCircle2 size={12} /> Sudah Terkirim
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="toolbar"
                    variant="toolbarPrimary"
                    disabled={sendEmailMutation.isPending || !recipient}
                    onClick={() => sendEmailMutation.mutate('welcome')}
                    className="text-xs font-bold rounded-xl"
                  >
                    <Send size={12} className="mr-1" /> Kirim
                  </Button>
                </div>

                {/* 2. Feature */}
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">2. Feature Highlight (RFID & KBM)</h4>
                    <p className="text-[11px] text-slate-400">Jadwal: Hari ke-3 ({schedule.day3 || '-'})</p>
                    {subjectExists('Fitur Unggulan: Absensi RFID & Laporan Real-time') && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                        <CheckCircle2 size={12} /> Sudah Terkirim
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="toolbar"
                    variant="toolbarPrimary"
                    disabled={sendEmailMutation.isPending || !recipient}
                    onClick={() => sendEmailMutation.mutate('feature')}
                    className="text-xs font-bold rounded-xl"
                  >
                    <Send size={12} className="mr-1" /> Kirim
                  </Button>
                </div>

                {/* 3. Case Study */}
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">3. Case Study: Efisiensi Guru</h4>
                    <p className="text-[11px] text-slate-400">Jadwal: Hari ke-10 ({schedule.day10 || '-'})</p>
                    {subjectExists('Case Study: Hemat 20 jam kerja/bulan') && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                        <CheckCircle2 size={12} /> Sudah Terkirim
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="toolbar"
                    variant="toolbarPrimary"
                    disabled={sendEmailMutation.isPending || !recipient}
                    onClick={() => sendEmailMutation.mutate('case')}
                    className="text-xs font-bold rounded-xl"
                  >
                    <Send size={12} className="mr-1" /> Kirim
                  </Button>
                </div>

                {/* 4. Upgrade */}
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">4. Upgrade Reminder (H-5)</h4>
                    <p className="text-[11px] text-slate-400">Jadwal: H-5 Berakhir ({schedule.h5 || '-'})</p>
                    {subjectExists('Trial akan berakhir dalam 5 hari — Upgrade sekarang') && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                        <CheckCircle2 size={12} /> Sudah Terkirim
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="toolbar"
                    variant="toolbarPrimary"
                    disabled={sendEmailMutation.isPending || !recipient}
                    onClick={() => sendEmailMutation.mutate('upgrade')}
                    className="text-xs font-bold rounded-xl"
                  >
                    <Send size={12} className="mr-1" /> Kirim
                  </Button>
                </div>
              </div>
            </Card>

            {/* Table Log Email */}
            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Riwayat Log Email Terkirim</h3>
              {loadingLogs ? (
                <div className="text-center py-10 text-xs text-slate-400">Memuat log email...</div>
              ) : (
                <Table
                  columns={tableColumns}
                  data={paginatedLogs}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={(col, dir) => { setSortBy(col); setSortOrder(dir); }}
                  emptyMessage="Belum ada riwayat email sequence yang tercatat."
                  pagination={{
                    currentPage,
                    totalPages: Math.max(1, Math.ceil(logs.length / itemsPerPage)),
                    totalItems: logs.length,
                    itemsPerPage,
                    onPageChange: setCurrentPage,
                    onLimitChange: (limit) => { setItemsPerPage(limit); setCurrentPage(1); }
                  }}
                />
              )}
            </Card>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default TrialEmailSequencePage;
