import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axiosInstance';
import { Button } from '../../components/cooperative/ui/Button';
import { Input } from '../../components/cooperative/ui/Input';
import { Select } from '../../components/cooperative/ui/Select';
import { Plus, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
const Modal = lazy(() => import('../../components/cooperative/ui/Modal').then(m => ({ default: m.Modal })));

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

const Tickets: React.FC = React.memo(() => {
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

  const features = useMemo(() => (subscription as unknown as Record<string, unknown>)?.features as string[] || subscription?.Plan?.features_json || subscription?.plan?.features_json || [], [subscription]);
  const isLocked = useMemo(() => !Array.isArray(features) || !features.includes('KOPERASI'), [features]);

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

  const fetchTickets = useCallback(async () => {
    await ticketsQuery.refetch();
  }, [ticketsQuery]);

  const createTicketMutation = useMutation({
    mutationFn: async (payload: { subject: string; priority: string; message: string }) => {
      const res = await api.post('/cooperative/tickets', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Tiket berhasil dibuat');
      setShowModal(false);
      setFormData({ subject: '', priority: 'MEDIUM', message: '' });
      queryClient.invalidateQueries({ queryKey: ['koperasi-tickets-list'] });
    },
    onError: (error) => {
      console.error('Failed to create ticket', error);
      toast.error('Gagal membuat tiket');
    }
  });

  const submitLoading = createTicketMutation.isPending;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    if (isLocked) return;
    e.preventDefault();
    await createTicketMutation.mutateAsync(formData);
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
        <span className="text-xs text-slate-600 dark:text-slate-400">{row.member?.name ?? 'Unknown'}</span>
      )
    },
    {
      key: 'priority',
      label: 'Prioritas',
      sortable: true,
      render: (_val: unknown, row: Ticket) => (
        <span className={`text-xs font-bold ${
          row.priority === 'HIGH' ? 'text-red-600' :
          row.priority === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'
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
          row.status === 'OPEN' ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' :
          row.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
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
        <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString('id-ID')}</span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_val: unknown, row: Ticket) => (
        <Link to={`/cooperative/tickets/${row.id}`}>
          <Button size="sm" variant="outline">Lihat Detail</Button>
        </Link>
      )
    }
  ], []);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', href: '/cooperative' },
    { label: isManageRoute ? 'Kelola Tiket' : 'Tiket Bantuan' }
  ], [isManageRoute]);

  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="KOPERASI"
      featureName="Layanan Bantuan (Tiket)"
    >
      <AcademicPageLayout
        title={isManageRoute ? "Kelola Keluhan Koperasi" : "Aduan & Keluhan Anggota"}
        description={isManageRoute ? "Kelola tiket aduan dan pertanyaan dari anggota koperasi" : "Sampaikan keluhan dan pertanyaan Anda kepada pengurus koperasi"}
        hardeningModuleKey="coop_tickets"
        breadcrumbs={breadcrumbs}
        instruction={{
          title: 'Panduan Sistem Tiket',
          description: 'Sistem tiket digunakan untuk menangani pengaduan dan pertanyaan anggota koperasi secara terstruktur.',
          items: [
            { text: 'Klik "Buat Tiket Baru" untuk mengajukan aduan atau pertanyaan kepada pengurus.' },
            { text: 'Atur prioritas tiket: LOW untuk tidak mendesak, MEDIUM untuk biasa, HIGH untuk sangat mendesak.' },
            { text: 'Pantau status tiket: OPEN (menunggu), IN_PROGRESS (diproses), CLOSED (selesai).' }
          ]
        }}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <MessageSquare className="mr-2" /> {isManageRoute ? "Kelola Tiket Bantuan" : "Aduan & Keluhan"}
            </h2>
            {!isManageRoute && (
              <Button onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
                Buat Tiket Baru
              </Button>
            )}
          </div>

          <Table
            data={paginatedTickets}
            columns={columns}
            loading={loading}
            emptyMessage="Belum ada tiket bantuan."
            pagination={{
              currentPage,
              totalPages,
              onPageChange: setCurrentPage,
              totalItems: tickets.length,
              itemsPerPage: pageLimit,
              onItemsPerPageChange: setPageLimit
            }}
          />

          <Suspense fallback={null}>
            <Modal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              title="Buat Tiket Bantuan Baru"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Subjek / Judul Masalah"
                  id="ticket-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  required
                  placeholder="Contoh: Tidak bisa login"
                />

                <Select
                  label="Prioritas"
                  id="ticket-priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  options={[
                      { value: 'LOW', label: 'Low - Tidak Mendesak' },
                      { value: 'MEDIUM', label: 'Medium - Biasa' },
                      { value: 'HIGH', label: 'High - Sangat Mendesak' },
                  ]}
                />

                <div>
                  <label htmlFor="ticket-message" className="block text-sm font-medium text-gray-700 mb-1">Pesan / Detail Masalah</label>
                  <textarea
                    id="ticket-message"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    required
                    placeholder="Jelaskan masalah anda secara detail..."
                    aria-label="Detail masalah pada tiket"
                  ></textarea>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    isLoading={submitLoading}
                  >
                    Kirim Tiket
                  </Button>
                </div>
              </form>
            </Modal>
          </Suspense>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default Tickets;
