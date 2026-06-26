import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import api from '../../lib/axiosInstance';
import { Button } from '../../components/cooperative/ui/Button';
import { Input } from '../../components/cooperative/ui/Input';
import { Plus, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import useConfirm from '../../hooks/useConfirm';

// Lazy load komponen berat
const Table = lazy(() => import('../../components/cooperative/ui/Table').then(m => ({ default: m.Table })));
const Card = lazy(() => import('../../components/cooperative/ui/Card').then(m => ({ default: m.Card })));

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const Announcements: React.FC = () => {
  const { subscription, user } = useAuthStore();
  const confirm = useConfirm();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(10);

  // Otorisasi & Gating Logic
  const features = useMemo(() => (subscription as unknown as Record<string, unknown>)?.features as string[] || subscription?.Plan?.features_json || subscription?.plan?.features_json || [], [subscription]);
  const isLocked = useMemo(() => !Array.isArray(features) || !features.includes('KOPERASI'), [features]);

  const canCreate = useMemo(() => user?.capabilities?.includes('cooperative.announcements.create') || user?.role?.name === 'SUPERADMIN', [user]);
  const canDelete = useMemo(() => user?.capabilities?.includes('cooperative.announcements.delete') || user?.role?.name === 'SUPERADMIN', [user]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/cooperative/announcements');
      setAnnouncements(res.data.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil pengumuman');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await api.post('/cooperative/announcements', { title, content });
      toast.success('Pengumuman berhasil dibuat');
      setTitle('');
      setContent('');
      fetchAnnouncements();
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat pengumuman');
    } finally {
      setSubmitLoading(false);
    }
  }, [title, content, fetchAnnouncements]);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Pengumuman',
      description: 'Apakah Anda yakin ingin menghapus pengumuman ini?',
      confirmText: 'Hapus',
      style: 'danger'
    });
    if (!ok) return;
    try {
      await api.delete(`/cooperative/announcements/${id}`);
      toast.success('Pengumuman dihapus');
      fetchAnnouncements();
    } catch (error) {
      console.error(error);
      toast.error('Gagal menghapus pengumuman');
    }
  }, [confirm, fetchAnnouncements]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageLimit;
    return (announcements ?? []).slice(start, start + pageLimit);
  }, [announcements, currentPage, pageLimit]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((announcements ?? []).length / pageLimit)), [announcements, pageLimit]);

  const columns = useMemo(() => [
    { header: 'Judul', accessor: 'title' as keyof Announcement, className: 'font-medium' },
    { header: 'Isi', accessor: (row: Announcement) => <span className="line-clamp-2">{row.content}</span> },
    { header: 'Tanggal', accessor: (row: Announcement) => new Date(row.createdAt).toLocaleDateString('id-ID') },
    ...(canDelete ? [{
      header: 'Aksi', accessor: (row: Announcement) => (
        <button
          className="text-red-600 hover:text-red-800 font-medium text-sm px-2 py-1 rounded"
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
              <Suspense fallback={<div className="h-64 bg-gray-100 rounded-lg animate-pulse" />}>
                <Table
                  data={paginatedData}
                  columns={columns}
                  keyField="id"
                  isLoading={loading}
                  emptyMessage="Belum ada pengumuman."
                />
              </Suspense>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                  <span>Halaman {currentPage} dari {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="px-3 py-1 border rounded disabled:opacity-40"
                      aria-label="Halaman sebelumnya"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1 border rounded disabled:opacity-40"
                      aria-label="Halaman berikutnya"
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default Announcements;
