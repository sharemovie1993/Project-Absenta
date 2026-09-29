import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../lib/axiosInstance';
import { Button, Input, SearchableSelect, Table, SectionCard, Card } from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
import { 
  Plus, 
  MessageSquare, 
  Eye, 
  Inbox, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  Filter,
  MessageCircleQuestion
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useSocket } from '../../hooks/useSocket';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { formatDate } from '@/utils/layoutUtils';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';

const Modal = lazy(() => import('../../components/cooperative/ui/Modal').then(m => ({ default: m.Modal })));

// Zod Schema Validation Guard (Pilar 25)
const ticketFormSchema = z.object({
  subject: z.string().min(3, 'Subjek minimal 3 karakter'),
  priority: z.string(),
  message: z.string().min(5, 'Pesan tiket minimal 5 karakter'),
});

interface Ticket {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  member: { name: string } | null;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

export const Tickets: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { subscription } = useAuthStore();
  const isMobile = useIsMobile();
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    subject: '',
    priority: 'MEDIUM',
    message: ''
  });

  // Gating Logic menggunakan useModuleAccess (Pilar Lisensi Hardening)
  const { isLocked } = useModuleAccess('KOPERASI');

  // Capabilities Check: Pengurus vs Anggota Biasa
  const { isAdmin, isKoperasi, isKoperasiHead, can } = useCapabilities();
  const canManage = useMemo(() => (
    isAdmin || isKoperasi || isKoperasiHead || can('cooperative.tickets.view.list')
  ), [isAdmin, isKoperasi, isKoperasiHead, can]);

  // Tab & URL Search Params Sync
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const activeTab: 'manage' | 'my' = useMemo(() => {
    if (!canManage) return 'my';
    if (tabParam === 'my') return 'my';
    return 'manage';
  }, [canManage, tabParam]);

  const handleTabChange = useCallback((tabId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    });
    setCurrentPage(1);
  }, [setSearchParams]);

  const tabOptions: TabOption[] = useMemo(() => [
    { id: 'manage', label: 'Kelola Aduan Masuk', icon: Inbox },
    { id: 'my', label: 'Aduan Saya', icon: MessageSquare },
  ], []);

  // Realtime live sync via WebSockets
  const { subscribe, unsubscribe } = useSocket();

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-tickets-list'] });
    };
    subscribe('coop_ticket_update', handleUpdate);
    return () => {
      unsubscribe('coop_ticket_update', handleUpdate);
    };
  }, [subscribe, unsubscribe, queryClient]);

  // Fetch Tickets based on Active Context View
  const ticketsQuery = useQuery({
    queryKey: ['koperasi-tickets-list', activeTab],
    queryFn: async () => {
      const endpoint = activeTab === 'my' ? '/cooperative/tickets?scope=my' : '/cooperative/tickets';
      const response = await api.get(endpoint);
      return (response.data.data ?? []) as Ticket[];
    },
    enabled: subscription !== undefined,
    staleTime: 5 * 60 * 1000,
  });

  const tickets = ticketsQuery.data || [];
  const loading = ticketsQuery.isLoading;

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const subjectMatch = item.subject.toLowerCase().includes(query);
        const memberMatch = item.member?.name?.toLowerCase().includes(query) ?? false;
        if (!subjectMatch && !memberMatch) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, priorityFilter, searchQuery]);

  // Metric Statistics for Active Tab
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'OPEN').length;
    const inProgress = tickets.filter(t => t.status === 'IN_PROGRESS').length;
    const closed = tickets.filter(t => t.status === 'CLOSED').length;
    return { total, open, inProgress, closed };
  }, [tickets]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageLimit;
    return filteredTickets.slice(start, start + pageLimit);
  }, [filteredTickets, currentPage, pageLimit]);

  const totalPages = useMemo(() => (
    Math.max(1, Math.ceil(filteredTickets.length / pageLimit))
  ), [filteredTickets.length, pageLimit]);

  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.post('/cooperative/tickets', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Tiket bantuan berhasil dibuat');
      setShowModal(false);
      setFormData({ subject: '', priority: 'MEDIUM', message: '' });
      queryClient.invalidateQueries({ queryKey: ['koperasi-tickets-list'] });
    },
    onError: (err) => {
      const msg = getApiErrorMessage(err, 'Gagal membuat tiket');
      toast.error(msg);
    }
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = ticketFormSchema.safeParse(formData);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const errorMsg = firstIssue?.message || 'Data tiket belum lengkap';
      toast.error(errorMsg);
      return;
    }
    try {
      await createTicketMutation.mutateAsync(formData);
    } catch {
      // Error handled by mutation onError
    }
  }, [formData, createTicketMutation]);

  const renderMobileCard = useCallback((row: Ticket) => {
    return (
      <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug truncate">
              {row.subject}
            </h4>
            {activeTab === 'manage' && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Dari: <span className="font-medium text-slate-700 dark:text-slate-300">{row.member?.name ?? 'Anggota'}</span>
              </p>
            )}
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
            row.status === 'OPEN' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
            row.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}>
            {row.status === 'OPEN' ? 'TERBUKA' : row.status === 'IN_PROGRESS' ? 'DIPROSES' : 'SELESAI'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50 text-xs">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
              row.priority === 'HIGH' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30' :
              row.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
            }`}>
              {row.priority}
            </span>
            <span className="text-[10px] text-slate-400">
              {formatDate(row.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <Link to={`/cooperative/tickets/${row.id}`}>
            <Button size="sm" variant="outline" className="font-bold text-xs inline-flex items-center gap-1">
              <Eye size={13} />
              <span>Detail</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }, [activeTab]);

  const columns = useMemo<Column[]>(() => {
    const cols: Column[] = [
      {
        key: 'subject',
        label: 'Subjek Aduan',
        sortable: true,
        render: (_val: unknown, row: Ticket) => (
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-100 block">{row.subject}</span>
            <span className="text-[11px] text-slate-400 block sm:hidden">
              {formatDate(row.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        )
      }
    ];

    if (activeTab === 'manage') {
      cols.push({
        key: 'member',
        label: 'Pengirim',
        sortable: true,
        render: (_val: unknown, row: Ticket) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{row.member?.name ?? 'Anggota'}</span>
        )
      });
    }

    cols.push(
      {
        key: 'priority',
        label: 'Prioritas',
        sortable: true,
        render: (_val: unknown, row: Ticket) => (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
            row.priority === 'HIGH' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' :
            row.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
          }`}>
            {row.priority}
          </span>
        )
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (_val: unknown, row: Ticket) => (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            row.status === 'OPEN' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
            row.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}>
            {row.status === 'OPEN' ? 'Terbuka' : row.status === 'IN_PROGRESS' ? 'Diproses' : 'Selesai'}
          </span>
        )
      },
      {
        key: 'createdAt',
        label: 'Tanggal Dibuat',
        sortable: true,
        render: (_val: unknown, row: Ticket) => (
          <span className="text-xs text-slate-500">
            {formatDate(row.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )
      },
      {
        key: 'actions',
        label: 'Aksi',
        render: (_val: unknown, row: Ticket) => (
          <Link to={`/cooperative/tickets/${row.id}`}>
            <Button size="xs" variant="outline" className="flex items-center gap-1 font-bold">
              <Eye size={12} />
              Lihat Percakapan
            </Button>
          </Link>
        )
      }
    );

    return cols;
  }, [activeTab]);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative/dashboard' },
    { label: 'Pusat Aduan & Tiket Bantuan' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="KOPERASI"
      featureName="Layanan Bantuan & Tiket Koperasi"
      description="Ajukan pertanyaan, klarifikasi transaksi simpan pinjam, dan kendala operasional koperasi secara terpadu."
    >
      <InfraErrorBoundary>
        <AcademicPageLayout
          title="Pusat Aduan & Bantuan Koperasi"
          description={
            canManage && activeTab === 'manage'
              ? 'Triage, monitor respon SLA, dan selesaikan keluhan serta pertanyaan seluruh anggota koperasi.'
              : 'Pantau riwayat keluhan, ajukan bantuan, dan cek balasan dari pengurus koperasi.'
          }
          breadcrumbs={breadcrumbs}
          hardeningModuleKey="coop_tickets"
          topSlot={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="toolbarPrimary"
                size="toolbar"
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                {canManage && activeTab === 'manage' ? 'Buat Tiket Baru' : 'Ajukan Aduan Baru'}
              </Button>
            </div>
          }
          instruction={{
            title: canManage && activeTab === 'manage' ? 'Panduan Pengurus Aduan' : 'Panduan Aduan Anggota',
            description: canManage && activeTab === 'manage'
              ? 'Kelola tiket yang masuk dari seluruh anggota koperasi dengan respon cepat dan tanggap.'
              : 'Gunakan modul ini untuk menyampaikan pertanyaan, klarifikasi saldo, atau kendala transaksi koperasi.',
            items: canManage && activeTab === 'manage' ? [
              { text: 'Pantau tiket berstatus OPEN yang membutuhkan respon atau tanggapan segera dari pengurus.' },
              { text: 'Ubah status menjadi IN PROGRESS saat sedang diinvestigasi, dan CLOSED saat telah terselesaikan.' },
              { text: 'Gunakan tab "Aduan Saya" jika Anda sebagai pengurus ingin mengajukan tiket aduan mandiri.' }
            ] : [
              { text: 'Klik tombol Ajukan Aduan Baru untuk menyampaikan kendala atau pertanyaan Anda.' },
              { text: 'Pantau status tiket Anda (Terbuka, Diproses, atau Selesai).' },
              { text: 'Klik tombol Lihat Percakapan untuk membaca respon resmi dari pengurus koperasi.' }
            ]
          }}
        >
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0 space-y-5">
            {/* Context View Tab Switcher for Pengurus */}
            {canManage && (
              <div className="w-full">
                <TabSwitcher
                  tabs={tabOptions}
                  activeTab={activeTab}
                  onChange={handleTabChange}
                />
              </div>
            )}

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {activeTab === 'manage' ? 'Total Masuk' : 'Total Aduan'}
                    </p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <MessageSquare size={18} />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      {activeTab === 'manage' ? 'Perlu Respon' : 'Menunggu Balasan'}
                    </p>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.open}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    <Clock size={18} />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Sedang Diproses
                    </p>
                    <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.inProgress}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    <AlertCircle size={18} />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Terselesaikan
                    </p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.closed}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="ticket-search-query"
                  aria-label="Cari berdasarkan subjek atau pengirim"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={activeTab === 'manage' ? 'Cari subjek atau nama anggota...' : 'Cari subjek aduan saya...'}
                  className="pl-9 text-xs rounded-xl w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="w-36">
                  <SearchableSelect
                    id="ticket-status-filter"
                    aria-label="Filter status aduan"
                    value={statusFilter}
                    onValueChange={(val) => {
                      setStatusFilter(val);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 'ALL', label: 'Semua Status' },
                      { value: 'OPEN', label: 'Terbuka (Open)' },
                      { value: 'IN_PROGRESS', label: 'Diproses' },
                      { value: 'CLOSED', label: 'Selesai' },
                    ]}
                    placeholder="Status"
                  />
                </div>

                <div className="w-36">
                  <SearchableSelect
                    id="ticket-priority-filter"
                    aria-label="Filter prioritas aduan"
                    value={priorityFilter}
                    onValueChange={(val) => {
                      setPriorityFilter(val);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 'ALL', label: 'Semua Prioritas' },
                      { value: 'LOW', label: 'Rendah (Low)' },
                      { value: 'MEDIUM', label: 'Sedang (Medium)' },
                      { value: 'HIGH', label: 'Tinggi (High)' },
                    ]}
                    placeholder="Prioritas"
                  />
                </div>
              </div>
            </div>

            {/* Tickets Table / Mobile List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {isMobile ? (
                <div className="p-4">
                  <MobileAcademicList
                    title={activeTab === 'manage' ? 'Daftar Aduan Masuk' : 'Daftar Aduan Saya'}
                    data={filteredTickets}
                    loading={loading}
                    totalItems={filteredTickets.length}
                    emptyMessage={
                      activeTab === 'manage'
                        ? 'Tidak ada tiket bantuan dari anggota yang sesuai filter.'
                        : 'Anda belum memiliki riwayat aduan bantuan.'
                    }
                    pagination={{
                      currentPage,
                      totalPages,
                      totalItems: filteredTickets.length,
                      itemsPerPage: pageLimit,
                      onPageChange: setCurrentPage,
                      onLimitChange: (limit) => {
                        setPageLimit(limit);
                        setCurrentPage(1);
                      },
                    }}
                    renderCard={renderMobileCard}
                  />
                </div>
              ) : (
                <Table
                  columns={columns}
                  data={paginatedTickets}
                  isLoading={loading}
                  emptyMessage={
                    activeTab === 'manage'
                      ? 'Tidak ada tiket bantuan dari anggota yang sesuai filter.'
                      : 'Anda belum memiliki riwayat aduan bantuan.'
                  }
                  pagination={{
                    currentPage,
                    totalPages,
                    totalItems: filteredTickets.length,
                    itemsPerPage: pageLimit,
                    onPageChange: setCurrentPage,
                    onLimitChange: (limit) => {
                      setPageLimit(limit);
                      setCurrentPage(1);
                    },
                  }}
                />
              )}
            </div>
          </SectionCard>
        </AcademicPageLayout>

        {/* Create Ticket Modal */}
        <Suspense fallback={null}>
          {showModal && (
            <Modal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              title={canManage && activeTab === 'manage' ? 'Buat Tiket Bantuan Koperasi' : 'Ajukan Aduan / Bantuan Baru'}
            >
              <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
                <div>
                  <label htmlFor="ticket-subject" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subjek Aduan <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="ticket-subject"
                    aria-label="Subjek tiket"
                    placeholder="Contoh: Klarifikasi pemotongan saldo simpanan"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="ticket-priority" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Prioritas
                  </label>
                  <SearchableSelect
                    id="ticket-priority"
                    aria-label="Pilih prioritas tiket"
                    value={formData.priority}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
                    options={[
                      { value: 'LOW', label: 'Rendah (Low)' },
                      { value: 'MEDIUM', label: 'Sedang (Medium)' },
                      { value: 'HIGH', label: 'Tinggi (High)' },
                    ]}
                    placeholder="Pilih Prioritas"
                  />
                </div>

                <div>
                  <label htmlFor="ticket-message" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rincian Pesan / Keluhan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="ticket-message"
                    aria-label="Rincian pesan atau keluhan"
                    placeholder="Jelaskan detail permasalahan Anda secara lengkap..."
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
                  <Button type="submit" variant="primary" disabled={createTicketMutation.isPending}>
                    {createTicketMutation.isPending ? 'Mengirim...' : 'Kirim Tiket'}
                  </Button>
                </div>
              </form>
            </Modal>
          )}
        </Suspense>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default Tickets;
