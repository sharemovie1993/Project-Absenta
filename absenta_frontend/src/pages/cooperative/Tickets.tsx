import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axiosInstance';
import { Button, Input, SearchableSelect, Table, SectionCard, Card } from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import { Plus, MessageSquare, Eye } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { formatDate } from '@/utils/layoutUtils';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import { getApiErrorMessage } from '../../utils/errorUtils';

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
  _count: { messages: number };
}

export const Tickets: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { subscription } = useAuthStore();
  const location = useLocation();
  const isManageRoute = location.pathname.endsWith('/manage');
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);
  const [formData, setFormData] = useState({
    subject: '',
    priority: 'MEDIUM',
    message: ''
  });

  // Gating Logic menggunakan useModuleAccess (Pilar Lisensi Hardening)
  const { isLocked } = useModuleAccess('KOPERASI');

  const ticketsQuery = useQuery({
    queryKey: ['koperasi-tickets-list'],
    queryFn: async () => {
      const response = await api.get('/cooperative/tickets');
      return (response.data.data ?? []) as Ticket[];
    },
    enabled: !isLocked && subscription !== undefined,
    staleTime: 5 * 60 * 1000,
  });

  const tickets = ticketsQuery.data || [];
  const loading = ticketsQuery.isLoading;

  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.post('/cooperative/tickets', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Tiket berhasil dibuat');
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
    if (isLocked) return;
    e.preventDefault();
    const parsed = ticketFormSchema.safeParse(formData);
    if (!parsed.success) {
      const errorMsg = (parsed as any).error?.errors?.[0]?.message || (parsed as any).error?.issues?.[0]?.message || 'Data tiket belum lengkap';
      toast.error(errorMsg);
      return;
    }
    try {
      await createTicketMutation.mutateAsync(formData);
    } catch {
      // Handled in onError
    }
  }, [isLocked, formData, createTicketMutation]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageLimit;
    return (tickets ?? []).slice(start, start + pageLimit);
  }, [tickets, currentPage, pageLimit]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((tickets ?? []).length / pageLimit)), [tickets, pageLimit]);

  const columns = useMemo<Column[]>(() => [
    {
      key: 'subject',
      label: 'Subjek',
      sortable: true,
      render: (_val: unknown, row: Ticket) => (
        <span className="font-semibold text-slate-800 dark:text-slate-100">{row.subject}</span>
      )
    },
    {
      key: 'member',
      label: 'Pengirim',
      sortable: true,
      render: (_val: unknown, row: Ticket) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">{row.member?.name ?? 'Anggota'}</span>
      )
    },
    {
      key: 'priority',
      label: 'Prioritas',
      sortable: true,
      render: (_val: unknown, row: Ticket) => (
        <span className={`text-xs font-bold ${
          row.priority === 'HIGH' ? 'text-rose-600' :
          row.priority === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
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
          row.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
          row.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
        }`}>
          {row.status.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'Dibuat',
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
          <Button size="xs" variant="outline" className="flex items-center gap-1">
            <Eye size={12} />
            Lihat
          </Button>
        </Link>
      )
    }
  ], []);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative/dashboard' },
    { label: 'Tiket Bantuan' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="KOPERASI"
      featureName="Layanan Bantuan & Tiket Koperasi"
      description="Ajukan pertanyaan, klarifikasi transaksi simpan pinjam, dan kendala operasional koperasi secara terpadu."
    >
      <InfraErrorBoundary>
        <AcademicPageLayout
          title="Tiket Bantuan Koperasi"
          description="Pusat layanan komunikasi keluhan, klarifikasi simpanan, dan pengajuan bantuan anggota."
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
                Buat Tiket Baru
              </Button>
            </div>
          }
          instruction={{
            title: "Panduan Tiket Bantuan",
            description: "Gunakan modul ini untuk menyampaikan pertanyaan atau keluhan terkait operasional koperasi.",
            items: [
              { text: "Klik tombol Buat Tiket Baru untuk memulai pertanyaan atau permintaan bantuan." },
              { text: "Pantau status tiket mulai dari OPEN, IN_PROGRESS, hingga CLOSED." },
              { text: "Klik tombol Lihat pada baris untuk membuka riwayat obrolan lengkap." }
            ]
          }}
        >
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <Table
                columns={columns}
                data={paginatedTickets}
                isLoading={loading}
                emptyMessage="Belum ada tiket bantuan yang diajukan."
                pagination={{
                  currentPage,
                  totalPages,
                  totalItems: tickets.length,
                  itemsPerPage: pageLimit,
                  onPageChange: setCurrentPage,
                  onLimitChange: (limit) => {
                    setPageLimit(limit);
                    setCurrentPage(1);
                  },
                }}
              />
            </div>
          </SectionCard>
        </AcademicPageLayout>

        {/* Create Ticket Modal */}
        <Suspense fallback={null}>
          {showModal && (
            <Modal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              title="Buat Tiket Bantuan Baru"
            >
              <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
                <div>
                  <label htmlFor="ticket-subject" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subjek Tiket <span className="text-rose-500">*</span>
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
