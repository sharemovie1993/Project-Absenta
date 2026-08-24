import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axiosInstance';
import { Button } from '../../components/cooperative/ui/Button';
import { Input } from '../../components/cooperative/ui/Input';
import { Plus, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import useConfirm from '../../hooks/useConfirm';

import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
const Card = lazy(() => import('../../components/cooperative/ui/Card').then(m => ({ default: m.Card })));

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const Announcements: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { subscription, user } = useAuthStore();
  const confirm = useConfirm();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);

  // Otorisasi & Gating Logic
  const features = useMemo(() => (subscription as unknown as Record<string, unknown>)?.features as string[] || subscription?.Plan?.features_json || subscription?.plan?.features_json || [], [subscription]);
  const isLocked = useMemo(() => !Array.isArray(features) || !features.includes('KOPERASI'), [features]);

  const { isKoperasiHead, isAdmin, can } = useCapabilities();
  const canCreate = useMemo(() => isAdmin || isKoperasiHead || can('cooperative.announcements.create'), [isAdmin, isKoperasiHead, can]);
  const canDelete = useMemo(() => isAdmin || isKoperasiHead || can('cooperative.announcements.delete'), [isAdmin, isKoperasiHead, can]);

  const announcementsQuery = useQuery({
    queryKey: ['koperasi-announcements-list'],
    queryFn: async () => {
      const res = await api.get('/cooperative/announcements');
      return (res.data.data ?? []) as Announcement[];
    },
    enabled: !isLocked,
    staleTime: 5 * 60 * 1000,
  });

  const announcements = announcementsQuery.data || [];
  const loading = announcementsQuery.isLoading;

  const fetchAnnouncements = useCallback(async () => {
    await announcementsQuery.refetch();
  }, [announcementsQuery]);

  const createAnnouncementMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string }) => {
      const res = await api.post('/cooperative/announcements', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Pengumuman berhasil dibuat');
      setTitle('');
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['koperasi-announcements-list'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Gagal membuat pengumuman');
    }
  });

  const submitLoading = createAnnouncementMutation.isPending;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await createAnnouncementMutation.mutateAsync({ title, content });
  }, [title, content, createAnnouncementMutation]);

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/cooperative/announcements/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Pengumuman dihapus');
      queryClient.invalidateQueries({ queryKey: ['koperasi-announcements-list'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Gagal menghapus pengumuman');
    }
  });

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Pengumuman',
      description: 'Apakah Anda yakin ingin menghapus pengumuman ini?',
      confirmText: 'Hapus',
      style: 'danger'
    });
    if (!ok) return;
    await deleteAnnouncementMutation.mutateAsync(id);
  }, [confirm, deleteAnnouncementMutation]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageLimit;
    return (announcements ?? []).slice(start, start + pageLimit);
  }, [announcements, currentPage, pageLimit]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((announcements ?? []).length / pageLimit)), [announcements, pageLimit]);

  const columns = useMemo<Column[]>(() => [
    {
      key: 'title',
      label: 'Judul',
      sortable: true,
      render: (_val: unknown, row: Announcement) => (
        <span className="font-semibold text-slate-800 dark:text-slate-100">{row.title}</span>
      )
    },
    {
      key: 'content',
      label: 'Isi',
      render: (_val: unknown, row: Announcement) => (
        <span className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{row.content}</span>
      )
    },
    {
      key: 'createdAt',
      label: 'Tanggal',
      sortable: true,
      render: (_val: unknown, row: Announcement) => (
        <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString('id-ID')}</span>
      )
    },
    ...(canDelete ? [{
      key: 'actions',
      label: 'Aksi',
      render: (_val: unknown, row: Announcement) => (
        <button
          className="text-red-600 hover:text-red-800 font-medium text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          onClick={() => handleDelete(row.id)}
          aria-label={`Hapus pengumuman ${row.title}`}
        >
          Hapus
        </button>
      )
    }] : [])
  ], [canDelete, handleDelete]);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative' },
    { label: 'Pengumuman' }
  ], []);

  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="KOPERASI"
      featureName="Manajemen Pengumuman"
    >
      <AcademicPageLayout
        title={canCreate ? "Manajemen Pengumuman" : "Pengumuman Koperasi"}
        description={canCreate ? "Kelola pengumuman koperasi" : "Pengumuman dan info terbaru dari pengurus koperasi"}
        hardeningModuleKey="coop_announcements"
        breadcrumbs={breadcrumbs}
        instruction={{
          title: 'Panduan Manajemen Pengumuman',
          description: 'Halaman ini digunakan untuk mengelola pengumuman yang akan ditampilkan kepada seluruh anggota koperasi.',
          items: [
            { text: 'Isi judul dan isi pengumuman pada form di sebelah kiri, lalu klik "Publish" untuk menerbitkan.' },
            { text: 'Pengumuman yang sudah diterbitkan akan langsung terlihat oleh seluruh anggota koperasi.' },
            { text: 'Klik tombol "Hapus" pada baris pengumuman untuk menghapusnya (hanya admin).' }
          ]
        }}
      >
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Bell className="mr-2" /> {canCreate ? "Manajemen Pengumuman" : "Pengumuman Koperasi"}
          </h2>

          <div className={canCreate ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "block"}>
            {/* Form */}
            {canCreate && (
              <div className="md:col-span-1">
                <Suspense fallback={<div className="h-48 bg-gray-100 rounded-lg animate-pulse" />}>
                  <Card title="Buat Pengumuman Baru">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <Input
                        label="Judul"
                        id="announcement-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        placeholder="Judul pengumuman..."
                      />
                      <div>
                        <label htmlFor="announcement-content" className="block text-sm font-medium text-gray-700 mb-1">Isi Pengumuman</label>
                        <textarea
                          id="announcement-content"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          rows={4}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          required
                          placeholder="Tulis isi pengumuman..."
                          aria-label="Isi pengumuman koperasi"
                        ></textarea>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        isLoading={submitLoading}
                        icon={<Plus size={18} />}
                      >
                        Publish
                      </Button>
                    </form>
                  </Card>
                </Suspense>
              </div>
            )}

            {/* List */}
            <div className={canCreate ? "md:col-span-2" : "w-full"}>
              <Table
                data={paginatedData}
                columns={columns}
                loading={loading}
                emptyMessage="Belum ada pengumuman."
                pagination={{
                  currentPage,
                  totalPages,
                  onPageChange: setCurrentPage,
                  totalItems: announcements.length,
                  itemsPerPage: pageLimit,
                  onItemsPerPageChange: setPageLimit
                }}
              />
            </div>
          </div>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default Announcements;
