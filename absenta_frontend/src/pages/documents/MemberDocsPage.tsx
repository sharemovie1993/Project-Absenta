import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { Plus, Search, Archive, Users, UserCheck, CalendarPlus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { z } from 'zod';
import useConfirm from '../../hooks/useConfirm';
import { useAuth } from '../../hooks/useAuth';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useDebounce } from '../../hooks/useDebounce';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui/SectionCard';
import { Button } from '../../components/ui/Button';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { Loader } from '../../components/ui';
import { MemberDocsList } from '../../components/documents/MemberDocsList';
import { MemberDocsViewer } from '../../components/documents/MemberDocsViewer';
import { cn } from '../../lib/utils';
import { guruApi, siswaApi } from '../../api/academic.api';
import type { Guru, Siswa } from '../../types/academic';
import {
  listAllMemberDocs,
  deleteSiswaDocument,
  deleteGuruDocument,
  KATEGORI_OPTIONS,
} from '../../api/memberDocs.api';
import type { MemberDoc, MemberDocEntityType } from '../../api/memberDocs.api';

// ─── Lazy-loaded heavy modals (Pilar 11) ─────────────────────────────────────
const MemberDocsUploadModal = lazy(() =>
  import('../../components/documents/MemberDocsUploadModal')
);
const SearchableSelect = lazy(() =>
  import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect }))
);

// ─── Constants ────────────────────────────────────────────────────────────────

const TAB_OPTIONS = [
  { id: 'SISWA', label: 'Berkas Siswa', icon: Users },
  { id: 'GURU',  label: 'Berkas Guru',  icon: UserCheck },
];

const ALL_KATEGORI = { label: 'Semua Tipe', value: 'ALL' };

const searchSchema = z.object({
  query: z.string().max(100, 'Pencarian terlalu panjang')
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemberDocsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState<MemberDocEntityType>('SISWA');
  const [searchTerm,   setSearchTerm]   = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('ALL');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState('');
  const [selectedDoc,  setSelectedDoc]  = useState<MemberDoc | null>(null);
  const [uploadOpen,   setUploadOpen]   = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 400);

  // Zod Validation Guard for search input
  useEffect(() => {
    const result = searchSchema.safeParse({ query: searchTerm });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || 'Input pencarian tidak valid');
    }
  }, [searchTerm]);

  // ── Permissions ────────────────────────────────────────────────────────────
  const { isAdmin, can } = useCapabilities();
  const canManage = useMemo(() =>
    isAdmin || can('academic.students.manage') || can('academic.teachers.manage'),
  [isAdmin, can]);

  // ── Remote: reference data (siswa + guru lists for upload modal) ──────────
  const { data: siswaRes } = useQuery({
    queryKey: ['siswa-list-for-docs'],
    queryFn:  () => siswaApi.getAll({ limit: 2000 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: guruRes } = useQuery({
    queryKey: ['guru-list-for-docs'],
    queryFn:  () => guruApi.getAll({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const siswaList: Siswa[] = useMemo(() => siswaRes?.data ?? [], [siswaRes]);
  const guruList:  Guru[]  = useMemo(() => guruRes?.data  ?? [], [guruRes]);

  const siswaOptions = useMemo(() => siswaList?.map(s => ({ label: s.nama_siswa, value: s.id, nis: s.nis, nisn: s.nisn })), [siswaList]);
  const guruOptions  = useMemo(() => guruList?.map(g  => ({ label: g.nama_guru,  value: g.id })), [guruList]);

  // ── Entity name map for list display ──────────────────────────────────────
  const entityNameMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    siswaList.forEach(s => { map[s.id] = s.nama_siswa; });
    guruList.forEach(g  => { map[g.id] = g.nama_guru; });
    return map;
  }, [siswaList, guruList]);

  // ── Remote: documents ─────────────────────────────────────────────────────
  const { data: docsRes, isLoading } = useQuery({
    queryKey: ['member-docs', activeTab, debouncedSearch, kategoriFilter, selectedEntityFilter],
    queryFn:  () => listAllMemberDocs({
      entityType: activeTab,
      entityId:   selectedEntityFilter || undefined,
      search:     debouncedSearch || undefined,
      kategori:   kategoriFilter !== 'ALL' ? kategoriFilter : undefined,
      page:       1,
      limit:      100,
    }),
  });

  const docs: MemberDoc[] = useMemo(() => docsRes?.data ?? [], [docsRes]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const { data: siswaDocsRes } = useQuery({
    queryKey: ['member-docs-stats-siswa'],
    queryFn:  () => listAllMemberDocs({ entityType: 'SISWA', limit: 1 }),
  });
  const { data: guruDocsRes } = useQuery({
    queryKey: ['member-docs-stats-guru'],
    queryFn:  () => listAllMemberDocs({ entityType: 'GURU', limit: 1 }),
  });

  const totalSiswa = siswaDocsRes?.pagination?.total ?? 0;
  const totalGuru  = guruDocsRes?.pagination?.total  ?? 0;
  const totalToday = useMemo(() => {
    const formatOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', timeZone: getTimezone() };
    const today = new Date().toLocaleDateString('id-ID', formatOpts);
    return (docs || [])?.filter(d => new Date(d.created_at).toLocaleDateString('id-ID', formatOpts) === today).length;
  }, [docs]);

  const stats = useMemo(() => [
    { title: 'Total Berkas Siswa', value: totalSiswa,         icon: <Archive size={14} />,     gradient: 'from-indigo-500 to-blue-600',  subtitle: 'Seluruh berkas siswa' },
    { title: 'Total Berkas Guru',  value: totalGuru,          icon: <UserCheck size={14} />,   gradient: 'from-violet-500 to-purple-600', subtitle: 'Seluruh berkas guru' },
    { title: 'Jenis Dokumen',      value: KATEGORI_OPTIONS.length, icon: <Users size={14} />, gradient: 'from-emerald-500 to-teal-600',  subtitle: 'Kategori berkas tersedia' },
    { title: 'Upload Hari Ini',    value: totalToday,         icon: <CalendarPlus size={14} />, gradient: 'from-amber-500 to-orange-600', subtitle: 'Berkas baru hari ini' },
  ], [totalSiswa, totalGuru, totalToday]);

  // ── Reset selected doc on tab/filter change ────────────────────────────────
  useEffect(() => {
    setSelectedDoc(null);
    setSelectedEntityFilter('');
  }, [activeTab, kategoriFilter]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (doc: MemberDoc) => {
    const entityName = entityNameMap[doc.siswa_id ?? doc.guru_id ?? ''] ?? 'pemilik';
    const ok = await confirm({
      title:       'Hapus Berkas',
      description: `Hapus berkas "${doc.judul}" milik ${entityName}? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      style:       'danger',
    });
    if (!ok) return;

    try {
      if (doc.siswa_id) await deleteSiswaDocument(doc.siswa_id, doc.id);
      else if (doc.guru_id) await deleteGuruDocument(doc.guru_id, doc.id);
      toast.success('Berkas berhasil dihapus');
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
      queryClient.invalidateQueries({ queryKey: ['member-docs'] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus berkas';
      toast.error(msg);
    }
  }, [confirm, selectedDoc, entityNameMap, queryClient]);

  const handleUploadSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['member-docs'] });
    queryClient.invalidateQueries({ queryKey: ['member-docs-stats-siswa'] });
    queryClient.invalidateQueries({ queryKey: ['member-docs-stats-guru'] });
  }, [queryClient]);

  const selectedEntityId   = selectedDoc?.siswa_id ?? selectedDoc?.guru_id ?? '';
  const selectedEntityName = entityNameMap[selectedEntityId] ?? '';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AcademicPageLayout
      title="Arsip Digital Kepegawaian"
      description="Pengarsipan digital berkas siswa dan guru — KK, Ijazah, Akta, SKHUN, dan dokumen lainnya."
      stats={stats}
      hardeningModuleKey="memberdocspage"
      breadcrumbs={[
        { label: 'Dokumen',         path: '/documents' },
        { label: 'Arsip Digital Kepegawaian' },
      ]}
      instruction={{
        title: 'Panduan Arsip Digital Kepegawaian',
        description: 'Simpan berkas digital warga sekolah untuk kebutuhan verifikasi data dan operasional Dapodik.',
        items: [
          { text: 'Klik "+ Upload Berkas" untuk mengunggah KK, Ijazah, Akta, atau berkas lainnya.' },
          { text: 'Klik baris berkas untuk melihat preview langsung di panel sebelah kanan.' },
          { text: 'Gunakan tombol 📱 "Minta Rescan" jika berkas tidak terbaca — notifikasi WA dikirim otomatis.' },
        ],
      }}
    >
      <div className="space-y-4">
        {/* Tab Navigator (Floating outside card, matching Jurusan page layout) */}
        <TabSwitcher
          options={TAB_OPTIONS}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as MemberDocEntityType)}
        />

        {/* Unified Wrapper Card (Pembungkus) */}
        <SectionCard fullWidth className="p-6">
          {/* Top Panel: Filters & Upload Button */}
          <div className="space-y-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            {/* Search Input (Row 1: full width, memanjang ke kanan) */}
            <div className="relative w-full">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Cari nama ${activeTab === 'SISWA' ? 'siswa' : 'guru'} atau judul berkas...`}
                aria-label="Cari berkas"
                className="w-full pl-11 pr-4 h-11 text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Dropdowns & Actions (Row 2: horizontal flex) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-48">
                  <Suspense fallback={<div className="h-9 w-48 bg-slate-50 dark:bg-slate-900 rounded-2xl animate-pulse" />}>
                    <SearchableSelect
                      id="kategori-filter"
                      value={kategoriFilter}
                      onValueChange={setKategoriFilter}
                      options={[ALL_KATEGORI, ...KATEGORI_OPTIONS]}
                      placeholder="Semua Tipe"
                    />
                  </Suspense>
                </div>
                <div className="w-48">
                  <Suspense fallback={<div className="h-9 w-48 bg-slate-50 dark:bg-slate-900 rounded-2xl animate-pulse" />}>
                    <SearchableSelect
                      id="entity-filter"
                      value={selectedEntityFilter}
                      onValueChange={setSelectedEntityFilter}
                      options={[
                        { label: `Semua ${activeTab === 'SISWA' ? 'Siswa' : 'Guru'}`, value: '' },
                        ...(activeTab === 'SISWA' ? siswaOptions : guruOptions)
                      ]}
                      placeholder={`Pilih ${activeTab === 'SISWA' ? 'Siswa' : 'Guru'}...`}
                      clearable
                    />
                  </Suspense>
                </div>
                {(debouncedSearch || kategoriFilter !== 'ALL' || selectedEntityFilter) && (
                  <p className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                    {docs.length} hasil
                  </p>
                )}
              </div>

              {/* Upload Button */}
              {canManage && (
                <Button
                  onClick={() => setUploadOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none h-9 px-4 text-xs font-bold uppercase tracking-widest gap-2 self-end sm:self-auto"
                >
                  <Plus size={14} /> Upload Berkas
                </Button>
              )}
            </div>
          </div>

          {/* 2-column documents preview layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-6">

            {/* List panel */}
            <div className="lg:col-span-5 flex flex-col min-w-0 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  {activeTab === 'SISWA' ? 'Berkas Siswa' : 'Berkas Guru'}
                </h3>
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-lg">
                  {docs.length} berkas
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[600px]">
                <MemberDocsList
                  docs={docs}
                  loading={isLoading}
                  selectedDocId={selectedDoc?.id ?? null}
                  onSelect={setSelectedDoc}
                  onDelete={handleDelete}
                  canDelete={canManage}
                  entityNameMap={entityNameMap}
                />
              </div>
            </div>

            <div className={cn(
              'lg:col-span-7 flex flex-col min-w-0 p-5 border rounded-2xl transition-all duration-300',
              selectedDoc
                ? 'border-indigo-100 bg-indigo-50/10 dark:border-indigo-900/20 dark:bg-indigo-950/5'
                : 'border-slate-100 bg-slate-50/50 dark:border-slate-800/10 dark:bg-slate-900/10',
            )}>
              <MemberDocsViewer
                doc={selectedDoc}
                entityType={activeTab}
                entityId={selectedEntityId}
                entityName={selectedEntityName}
                className="flex-1"
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Upload Modal (lazy) ─────────────────────────────────────────── */}
      <Suspense fallback={null}>
        {uploadOpen && (
          <MemberDocsUploadModal
            isOpen={uploadOpen}
            onClose={() => setUploadOpen(false)}
            onSuccess={handleUploadSuccess}
            siswaOptions={siswaOptions}
            guruOptions={guruOptions}
          />
        )}
      </Suspense>
    </AcademicPageLayout>
  );
}
