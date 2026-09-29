import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import api from '../../lib/axiosInstance';
import { Button, Input, SectionCard, Badge } from '../../components/ui';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));
import { Plus, Bell, Trash2, Eye, FileText, Search, Megaphone, ArrowRight, Calendar, Sparkles, X, User } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import useConfirm from '../../hooks/useConfirm';
import { formatDate } from '../../utils/layoutUtils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';
import { Table, type Column } from '../../components/ui/Table';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { useSocket } from '../../hooks/useSocket';

const announcementSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(150, 'Judul maksimal 150 karakter'),
  content: z.string().min(1, 'Isi pengumuman wajib diisi'),
});

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const Announcements: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { subscription } = useAuthStore();
  const confirm = useConfirm();
  const isMobile = useIsMobile();

  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Module licensing hardening
  const { isLocked } = useModuleAccess('KOPERASI');

  // Capabilities
  const { isKoperasiHead, isAdmin, can } = useCapabilities();
  const canCreate = useMemo(() => isAdmin || isKoperasiHead || can('cooperative.announcements.create'), [isAdmin, isKoperasiHead, can]);
  const canDelete = useMemo(() => isAdmin || isKoperasiHead || can('cooperative.announcements.delete'), [isAdmin, isKoperasiHead, can]);

  // Tab & Routing Synchronization
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const activeTab: 'manage' | 'feed' = useMemo(() => {
    if (!canCreate) return 'feed';
    if (tabParam === 'feed') return 'feed';
    return 'manage';
  }, [canCreate, tabParam]);

  const handleTabChange = useCallback((tabId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tabId === 'manage') {
        next.delete('tab');
      } else {
        next.set('tab', tabId);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const tabOptions: TabOption[] = useMemo(() => [
    { id: 'manage', label: 'Kelola Pengumuman', icon: FileText },
    { id: 'feed', label: 'Papan Informasi', icon: Megaphone },
  ], []);

  // Realtime live sync via WebSockets
  const { subscribe, unsubscribe } = useSocket();

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-announcements-list'] });
    };
    subscribe('coop_announcement_update', handleUpdate);
    return () => {
      unsubscribe('coop_announcement_update', handleUpdate);
    };
  }, [subscribe, unsubscribe, queryClient]);

  // Query Announcements
  const announcementsQuery = useQuery({
    queryKey: ['koperasi-announcements-list'],
    queryFn: async () => {
      const res = await api.get('/cooperative/announcements');
      return (res.data.data ?? []) as Announcement[];
    },
    enabled: subscription !== undefined,
    staleTime: 5 * 60 * 1000,
  });

  const announcements = announcementsQuery.data || [];
  const loading = announcementsQuery.isLoading;

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    if (!searchQuery.trim()) return announcements;
    const q = searchQuery.toLowerCase();
    return announcements.filter(a =>
      a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
    );
  }, [announcements, searchQuery]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageLimit;
    return filteredAnnouncements.slice(start, start + pageLimit);
  }, [filteredAnnouncements, currentPage, pageLimit]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredAnnouncements.length / pageLimit)), [filteredAnnouncements, pageLimit]);

  // Reset pagination on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Mutations
  const createAnnouncementMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string }) => {
      const res = await api.post('/cooperative/announcements', payload, {
        headers: {
          'Idempotency-Key': crypto.randomUUID()
        }
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Pengumuman berhasil diterbitkan');
      setTitle('');
      setContent('');
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['koperasi-announcements-list'] });
    },
    onError: (error) => {
      console.error(error);
      const msg = getApiErrorMessage(error, 'Gagal membuat pengumuman');
      toast.error(msg);
    }
  });

  const submitLoading = createAnnouncementMutation.isPending;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const parseResult = announcementSchema.safeParse({ title, content });
    if (!parseResult.success) {
      toast.error(parseResult.error.errors[0]?.message || 'Data pengumuman tidak valid');
      return;
    }
    await createAnnouncementMutation.mutateAsync({ title, content });
  }, [title, content, createAnnouncementMutation]);

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/cooperative/announcements/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Pengumuman berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['koperasi-announcements-list'] });
    },
    onError: (error) => {
      console.error(error);
      const msg = getApiErrorMessage(error, 'Gagal menghapus pengumuman');
      toast.error(msg);
    }
  });

  const handleDelete = useCallback(async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Hapus Pengumuman',
      message: 'Apakah Anda yakin ingin menghapus pengumuman ini? Pengumuman tidak akan dapat dilihat lagi oleh anggota.',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'danger'
    });

    if (isConfirmed) {
      deleteAnnouncementMutation.mutate(id);
    }
  }, [confirm, deleteAnnouncementMutation]);

  const isRecentAnnouncement = useCallback((dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    return diffMs <= 3 * 24 * 60 * 60 * 1000;
  }, []);

  // Columns for Management Table
  const columns = useMemo<Column[]>(() => [
    {
      key: 'title',
      label: 'Judul Pengumuman',
      sortable: true,
      render: (_val: unknown, row: Announcement) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Bell size={15} />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block truncate max-w-xs">{row.title}</span>
            <span className="text-[10px] text-slate-400">{formatDate(row.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      )
    },
    {
      key: 'content',
      label: 'Ringkasan Isi',
      render: (_val: unknown, row: Announcement) => (
        <span className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{row.content}</span>
      )
    },
    {
      key: 'createdAt',
      label: 'Tanggal Terbit',
      sortable: true,
      render: (_val: unknown, row: Announcement) => (
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          {formatDate(row.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Tindakan',
      render: (_val: unknown, row: Announcement) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            variant="outline"
            onClick={() => setSelectedAnnouncement(row)}
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold inline-flex items-center gap-1 text-[10px]"
          >
            <Eye size={11} /> Lihat
          </Button>
          {canDelete && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleDelete(row.id)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold inline-flex items-center gap-1 text-[10px]"
            >
              <Trash2 size={11} /> Hapus
            </Button>
          )}
        </div>
      )
    }
  ], [canDelete, handleDelete]);

  const renderMobileCard = useCallback((row: Announcement) => (
    <div className="p-4 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">
            {row.title}
          </h4>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
            {formatDate(row.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setSelectedAnnouncement(row)}
            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
            title="Lihat Detail"
          >
            <Eye size={15} />
          </button>
          {canDelete && (
            <button
              onClick={() => handleDelete(row.id)}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Hapus Pengumuman"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
        {row.content}
      </p>
    </div>
  ), [canDelete, handleDelete]);

  // Layout Dynamic Context
  const layoutInfo = useMemo(() => {
    if (activeTab === 'manage' && canCreate) {
      return {
        title: "Manajemen Pengumuman",
        description: "Kelola penerbitan, arsip, dan penghapusan informasi pengumuman koperasi",
        instruction: {
          title: "Panduan Manajemen Pengumuman",
          description: "Kelola informasi yang akan disiarkan kepada seluruh anggota koperasi.",
          items: [
            { text: 'Klik tombol "+ Buat Pengumuman" untuk menulis dan menerbitkan informasi baru ke anggota.' },
            { text: 'Pengumuman yang diterbitkan otomatis tersinkronisasi secara realtime ke papan informasi anggota.' },
            { text: 'Beralih ke tab "Papan Informasi" untuk melihat tampilan feed pengumuman dari sisi anggota.' }
          ]
        },
        breadcrumbs: [
          { label: 'Koperasi', path: '/cooperative' },
          { label: 'Manajemen Pengumuman' }
        ]
      };
    }
    return {
      title: "Papan Pengumuman Koperasi",
      description: "Informasi resmi, kebijakan, dan berita terbaru dari pengurus koperasi",
      instruction: {
        title: "Papan Informasi Koperasi",
        description: "Daftar pengumuman dan edaran terkini untuk seluruh anggota koperasi.",
        items: [
          { text: "Klik 'Baca Selengkapnya' pada kartu pengumuman untuk membaca isi lengkap informasi." },
          { text: "Gunakan kolom pencarian di bagian atas untuk menemukan pengumuman tertentu." }
        ]
      },
      breadcrumbs: [
        { label: 'Koperasi', path: '/cooperative' },
        { label: 'Pengumuman' }
      ]
    };
  }, [activeTab, canCreate]);

  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="KOPERASI"
      featureName="Manajemen Pengumuman"
    >
      <AcademicPageLayout
        title={layoutInfo.title}
        description={layoutInfo.description}
        hardeningModuleKey="coop_announcements"
        breadcrumbs={layoutInfo.breadcrumbs}
        instruction={layoutInfo.instruction}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0">
          {/* Tab Switcher for Pengurus */}
          {canCreate && (
            <div className="mb-6">
              <TabSwitcher
                options={tabOptions}
                activeTab={activeTab}
                onChange={handleTabChange}
              />
            </div>
          )}

          {activeTab === 'manage' && canCreate ? (
            /* ========================================================================= */
            /* TAB 1: KELOLA PENGUMUMAN (PENGURUS MODE)                                 */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari judul atau isi pengumuman..."
                    className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <Button
                  onClick={() => {
                    setTitle('');
                    setContent('');
                    setIsCreateModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
                >
                  <Plus size={16} /> Buat Pengumuman Baru
                </Button>
              </div>

              {/* Management Table */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                {isMobile ? (
                  <div className="p-4">
                    <MobileAcademicList
                      title="Daftar Pengumuman"
                      data={filteredAnnouncements}
                      loading={loading}
                      totalItems={filteredAnnouncements.length}
                      emptyMessage="Belum ada pengumuman yang sesuai."
                      pagination={{
                        currentPage,
                        totalPages,
                        totalItems: filteredAnnouncements.length,
                        itemsPerPage: pageLimit,
                        onPageChange: setCurrentPage,
                        onLimitChange: setPageLimit,
                      }}
                      renderCard={renderMobileCard}
                    />
                  </div>
                ) : (
                  <Table
                    data={paginatedData}
                    columns={columns}
                    loading={loading}
                    emptyMessage="Belum ada pengumuman yang ditemukan."
                    pagination={{
                      currentPage,
                      totalPages,
                      onPageChange: setCurrentPage,
                      totalItems: filteredAnnouncements.length,
                      itemsPerPage: pageLimit,
                      onLimitChange: setPageLimit,
                      onItemsPerPageChange: setPageLimit
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* TAB 2: PAPAN INFORMASI / BULLETIN BOARD (MEMBER & PUBLIC MODE)           */
            /* ========================================================================= */
            <div className="space-y-6">
              {/* Filter & Counter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                    <Megaphone size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Semua Informasi Koperasi</h3>
                    <p className="text-[10px] text-slate-500">
                      Menampilkan {filteredAnnouncements.length} pengumuman aktif
                    </p>
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari pengumuman..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Feed Card Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {([1, 2, 3] as const)?.map((i) => (
                    <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse border border-slate-200 dark:border-slate-800" />
                  ))}
                </div>
              ) : filteredAnnouncements.length === 0 ? (
                <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Bell size={26} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Belum Ada Pengumuman</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {searchQuery ? `Tidak ada pengumuman yang cocok dengan "${searchQuery}".` : 'Saat ini belum ada pengumuman atau edaran baru dari pengurus koperasi.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredAnnouncements?.map((item) => {
                    const isNew = isRecentAnnouncement(item.createdAt);
                    return (
                      <div
                        key={item.id}
                        className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Megaphone size={13} />
                              </div>
                              <span className="text-[10px] font-medium text-slate-400">
                                {formatDate(item.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>

                            {isNew && (
                              <Badge variant="success" size="sm" className="font-bold text-[9px] px-2 py-0.5">
                                <Sparkles size={10} className="mr-1" /> BARU
                              </Badge>
                            )}
                          </div>

                          {/* Card Title */}
                          <h4
                            onClick={() => setSelectedAnnouncement(item)}
                            className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer leading-snug"
                          >
                            {item.title}
                          </h4>

                          {/* Card Content Snippet */}
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mt-2.5">
                            {item.content}
                          </p>
                        </div>

                        {/* Card Footer */}
                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-medium">
                            Pengurus Koperasi
                          </span>
                          <button
                            onClick={() => setSelectedAnnouncement(item)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                          >
                            Baca Selengkapnya <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Lazy loaded modals */}
        <Suspense fallback={null}>
          {/* MODAL 1: BUAT PENGUMUMAN BARU */}
          {isCreateModalOpen && (
            <Modal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              title="Buat Pengumuman Koperasi Baru"
              size="lg"
            >
              <form onSubmit={handleSubmit} className="space-y-4 p-2">
                <div>
                  <label htmlFor="announcement-title" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Judul Pengumuman <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="announcement-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Contoh: Jadwal Rapat Anggota Tahunan (RAT) 2026..."
                  />
                </div>

                <div>
                  <label htmlFor="announcement-content" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Isi Pengumuman <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="announcement-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={6}
                    placeholder="Tuliskan detail pengumuman yang ingin disiarkan kepada anggota..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                  />
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  💡 Pengumuman yang diterbitkan akan langsung terkirim secara realtime ke seluruh anggota yang sedang aktif membuka aplikasi.
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={submitLoading}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    isLoading={submitLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus size={16} /> Terbitkan Sekarang
                  </Button>
                </div>
              </form>
            </Modal>
          )}

          {/* MODAL 2: BACA DETAIL PENGUMUMAN LENGKAP */}
          {selectedAnnouncement && (
            <Modal
              isOpen={!!selectedAnnouncement}
              onClose={() => setSelectedAnnouncement(null)}
              title={selectedAnnouncement.title}
              size="xl"
            >
              <div className="space-y-4 p-2">
                {/* Meta bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span>Diterbitkan: <strong>{formatDate(selectedAnnouncement.createdAt, { day: '2-digit', month: 'long', year: 'numeric' })}</strong></span>
                  </div>
                  <Badge variant="info" size="sm" className="font-semibold text-[10px]">
                    PENGUMUMAN RESMI
                  </Badge>
                </div>

                {/* Full Content */}
                <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 max-h-[60vh] overflow-y-auto">
                  <p className="whitespace-pre-line text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                    {selectedAnnouncement.content}
                  </p>
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedAnnouncement(null)}
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </Suspense>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default Announcements;
