import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { FileText, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import useConfirm from '@/hooks/useConfirm';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Button,
  Loader,
  SectionCard,
  Input,
  PageLoader,
  Modal,
  ModalFooter,
} from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import {
  type DocumentCategory,
  type DocumentItem,
  type DocumentVersionItem,
  createDocumentSignedUrl,
  generateMouDocument,
  listDocuments,
  listDocumentVersions,
  softDeleteDocument,
  updateDocumentMetadata,
  uploadDocument,
  uploadDocumentVersion,
} from '@/api/documents.api';
import type { UploadFormValues, MouFormValues, EditMetadataFormValues } from '@/components/documents/DocumentModals';

// Lazy loaded sub-components
const DocumentTable = lazy(() => import('@/components/documents/DocumentTable').then(m => ({ default: m.DocumentTable })));
const UploadModal = lazy(() => import('@/components/documents/DocumentModals').then(m => ({ default: m.UploadModal })));
const MouModal = lazy(() => import('@/components/documents/DocumentModals').then(m => ({ default: m.MouModal })));
const VersionHistoryModal = lazy(() => import('@/components/documents/DocumentModals').then(m => ({ default: m.VersionHistoryModal })));
const EditMetadataModal = lazy(() => import('@/components/documents/DocumentModals').then(m => ({ default: m.EditMetadataModal })));

const BASE_CATEGORY_OPTIONS: Array<{ value: DocumentCategory | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Semua Dokumen' },
  { value: 'ADMINISTRATIVE', label: 'Administrasi' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'OTHER', label: 'Lainnya' },
];

const CATEGORY_CAPABILITIES: Record<DocumentCategory, string> = {
  ADMINISTRATIVE: 'documents.view_administrative_documents',
  BILLING: 'documents.view_billing_documents',
  LEGAL: 'documents.view_legal_documents',
  MANUAL: 'documents.view_manual_documents',
  OTHER: 'documents.view_other_documents',
};

function parseCategoryFromQuery(raw: string | null): DocumentCategory | 'ALL' {
  const token = String(raw ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!token) return 'ALL';
  if (['ALL', 'SEMUA', 'SEMUA_DOKUMEN'].includes(token)) return 'ALL';

  const aliasMap: Record<string, DocumentCategory> = {
    ADMIN: 'ADMINISTRATIVE',
    ADMINISTRASI: 'ADMINISTRATIVE',
    COMPANY: 'ADMINISTRATIVE',
    LEGAL_DOCUMENT: 'LEGAL',
    MANUALS: 'MANUAL',
    LAINNYA: 'OTHER',
  };

  const aliased = aliasMap[token];
  if (aliased) return aliased;

  const allowed = (BASE_CATEGORY_OPTIONS ?? [])?.map((o) => o.value).filter((v) => v !== 'ALL') as DocumentCategory[];
  if (allowed.includes(token as DocumentCategory)) return token as DocumentCategory;
  return 'ALL';
}

const uploadSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  category: z.enum(['ADMINISTRATIVE', 'LEGAL', 'MANUAL', 'OTHER']),
  description: z.string().optional(),
  file: z.any().refine((v) => v instanceof File, 'File wajib dipilih'),
});

const mouSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tanggal: z.string().optional(),
  nomor: z.string().optional(),
  pihak_kedua_nama: z.string().optional(),
  pihak_kedua_alamat: z.string().optional(),
});

const editMetadataSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  category: z.enum(['ADMINISTRATIVE', 'LEGAL', 'MANUAL', 'OTHER']),
  description: z.string().optional(),
});

export default function DocumentCenterPage() {
  const confirm = useConfirm();

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { can, isSuperAdmin } = useAuth();

  const superAdmin = isSuperAdmin();
  const canUpload = can('documents.upload');
  const canDelete = can('documents.delete') || superAdmin;

  const categoryOptions = useMemo(() => {
    const allowedCategories = (Object.keys(CATEGORY_CAPABILITIES) as DocumentCategory[]).filter((category) =>
      can(CATEGORY_CAPABILITIES[category])
    );
    const includeAll = allowedCategories.length > 1;
    return (BASE_CATEGORY_OPTIONS ?? [])?.filter((o) => {
      if (o.value === 'ALL') return includeAll;
      return allowedCategories.includes(o.value);
    });
  }, [can]);

  const initialSelectedCategory = useMemo(() => {
    const desiredFromState = parseCategoryFromQuery((location.state as { defaultCategory?: string } | null)?.defaultCategory ?? null);
    const desiredFromQuery = parseCategoryFromQuery(searchParams.get('category'));
    const desired = desiredFromState !== 'ALL' ? desiredFromState : desiredFromQuery;
    const match = (categoryOptions ?? [])?.find((o) => o.value === desired)?.value;
    const fallback = (categoryOptions ?? [])?.find((o) => o.value !== 'ALL')?.value ?? 'ALL';
    return (match ?? fallback) as DocumentCategory | 'ALL';
  }, [categoryOptions, location.state, searchParams]);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'ALL'>(initialSelectedCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [versionUploadOpen, setVersionUploadOpen] = useState(false);
  const [versionUploadProgress, setVersionUploadProgress] = useState<number | null>(null);
  const [versionTarget, setVersionTarget] = useState<DocumentItem | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [mouOpen, setMouOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [versionHistoryTarget, setVersionHistoryTarget] = useState<DocumentItem | null>(null);
  const [versionHistoryLoading, setVersionHistoryLoading] = useState(false);
  const [versionHistoryItems, setVersionHistoryItems] = useState<DocumentVersionItem[]>([]);
  const [editMetadataOpen, setEditMetadataOpen] = useState(false);
  const [editMetadataTarget, setEditMetadataTarget] = useState<DocumentItem | null>(null);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, isSubmitting, errors, isValid } = useFormValidation({
    schema: uploadSchema,
    defaultValues: { title: '', category: 'ADMINISTRATIVE', description: '', file: undefined },
    mode: 'onChange',
  });

  const { register: registerMou, handleSubmit: handleSubmitMou, reset: resetMou, isSubmitting: isSubmittingMou, errors: mouErrors, isValid: isMouValid } = useFormValidation({
    schema: mouSchema,
    defaultValues: { title: '', description: '', tanggal: '', nomor: '', pihak_kedua_nama: '', pihak_kedua_alamat: '' },
    mode: 'onChange',
  });

  const { register: registerEditMetadata, handleSubmit: handleSubmitEditMetadata, setValue: setValueEditMetadata, watch: watchEditMetadata, reset: resetEditMetadata, isSubmitting: isSubmittingEditMetadata, errors: editMetadataErrors, isValid: isEditMetadataValid } = useFormValidation({
    schema: editMetadataSchema,
    defaultValues: { title: '', category: 'ADMINISTRATIVE', description: '' },
    mode: 'onChange',
  });

  const formCategory = watch('category') as DocumentCategory;
  const formFile = watch('file') as File | undefined;
  const editMetadataCategory = watchEditMetadata('category') as DocumentCategory;

  const fetchDocuments = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await listDocuments({
          page,
          limit: itemsPerPage,
          category: selectedCategory === 'ALL' ? undefined : selectedCategory,
          search: debouncedSearch,
          is_active: true,
        });

        if (!res.success) {
          const msg = res.message || 'Gagal memuat dokumen';
          setLoadError(msg);
          toast.error(msg);
          return;
        }

        setDocuments(res.data || []);
        setCurrentPage(res.pagination.page);
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      } catch (e: unknown) {
        const msg = (e instanceof Error ? e.message : String(e)) || 'Gagal memuat dokumen';
        setLoadError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [selectedCategory, itemsPerPage, debouncedSearch]
  );

  useEffect(() => {
    fetchDocuments(1);
    setCurrentPage(1);
  }, [fetchDocuments]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchDocuments(page);
  }, [fetchDocuments]);

  const handleDownload = useCallback(async (doc: DocumentItem) => {
    try {
      const signed = await createDocumentSignedUrl(doc.id);
      window.open(signed.download_url, '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Gagal mengunduh dokumen');
    }
  }, []);

  const handleDelete = useCallback(async (doc: DocumentItem) => {
    const ok = await confirm({
      title: 'Hapus Dokumen?',
      description: `Apakah Anda yakin ingin menghapus dokumen "${doc.title}"?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;

    try {
      const res = await softDeleteDocument(doc.id);
      if (!res.success) {
        toast.error(res.message || 'Gagal menghapus dokumen');
        return;
      }
      toast.success('Dokumen berhasil dihapus');
      fetchDocuments(currentPage);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Gagal menghapus dokumen');
    }
  }, [confirm, currentPage, fetchDocuments]);

  const openVersionHistory = useCallback(async (doc: DocumentItem) => {
    try {
      setVersionHistoryTarget(doc);
      setVersionHistoryItems([]);
      setVersionHistoryOpen(true);
      setVersionHistoryLoading(true);
      const res = await listDocumentVersions(doc.id);
      if (!res.success) {
        toast.error(res.message || 'Gagal memuat riwayat versi');
        return;
      }
      const items = Array.isArray(res.data) ? res.data : [];
      setVersionHistoryItems([...items].sort((a, b) => Number(b.version) - Number(a.version)));
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Gagal memuat riwayat versi');
    } finally {
      setVersionHistoryLoading(false);
    }
  }, []);

  const handleDownloadVersion = useCallback(async (doc: DocumentItem, version: number) => {
    try {
      const signed = await createDocumentSignedUrl(doc.id, { version });
      window.open(signed.download_url, '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Gagal mengunduh versi dokumen');
    }
  }, []);

  const openEditMetadata = useCallback((doc: DocumentItem) => {
    setEditMetadataTarget(doc);
    resetEditMetadata({ title: doc.title || '', category: (doc.category || 'ADMINISTRATIVE') as 'ADMINISTRATIVE' | 'LEGAL' | 'MANUAL' | 'OTHER', description: doc.description || '' });
    setEditMetadataOpen(true);
  }, [resetEditMetadata]);

  const onSubmitEditMetadata = handleSubmitEditMetadata(async (values: EditMetadataFormValues) => {
    if (!editMetadataTarget) return;
    try {
      const res = await updateDocumentMetadata(editMetadataTarget.id, { title: values.title, category: values.category, description: values.description || null });
      if (!res.success) {
        toast.error(res.message || 'Gagal memperbarui metadata');
        return;
      }
      toast.success('Metadata berhasil diperbarui');
      setEditMetadataOpen(false);
      fetchDocuments(currentPage);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Gagal memperbarui metadata');
    }
  });

  const submitVersionUpload = useCallback(async () => {
    if (!versionTarget || !versionFile) return;
    try {
      setVersionUploadProgress(0);
      const res = await uploadDocumentVersion({ id: versionTarget.id, file: versionFile, onProgress: setVersionUploadProgress });
      if (!res.success) {
        toast.error(res.message || 'Gagal mengunggah versi');
        return;
      }
      toast.success('Versi baru berhasil diunggah');
      setVersionUploadOpen(false);
      setVersionFile(null);
      fetchDocuments(currentPage);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Gagal mengunggah versi');
    } finally {
      setVersionUploadProgress(null);
    }
  }, [currentPage, fetchDocuments, versionFile, versionTarget]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({ title: 'Hapus Massal?', description: `Hapus ${selectedIds.size} dokumen terpilih?`, confirmText: `Hapus (${selectedIds.size})`, style: 'danger' });
    if (!ok) return;

    try {
      setBulkProcessing(true);
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled((ids ?? [])?.map(id => softDeleteDocument(id)));
      const succeeded = results.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length;
      succeeded === ids.length
        ? toast.success(`Berhasil menghapus ${succeeded} dokumen`)
        : toast(`Berhasil menghapus ${succeeded} dokumen`, { icon: '⚠️' });
      setSelectedIds(new Set());
      fetchDocuments(currentPage);
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : String(err)) || 'Gagal menghapus massal');
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, confirm, fetchDocuments, currentPage]);

  const onSubmitUpload = handleSubmit(async (values: UploadFormValues) => {
    try {
      setUploadProgress(0);
      const res = await uploadDocument({ file: values.file as File, title: values.title, category: values.category as DocumentCategory, description: values.description, onProgress: setUploadProgress });
      if (!res.success) {
        toast.error(res.message || 'Gagal mengunggah');
        return;
      }
      toast.success('Dokumen berhasil diunggah');
      setUploadOpen(false);
      reset();
      fetchDocuments(1);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Gagal mengunggah');
    } finally {
      setUploadProgress(null);
    }
  });

  const onSubmitMou = handleSubmitMou(async (values: MouFormValues) => {
    try {
      const res = await generateMouDocument({ title: values.title || undefined, description: values.description || undefined, tanggal: values.tanggal || undefined, nomor: values.nomor || undefined, pihak_kedua_nama: values.pihak_kedua_nama || undefined, pihak_kedua_alamat: values.pihak_kedua_alamat || undefined });
      if (!res.success) {
        toast.error(res.message || 'Gagal generate MoU');
        return;
      }
      toast.success('MoU berhasil digenerate');
      setMouOpen(false);
      resetMou();
      fetchDocuments(1);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Gagal generate MoU');
    }
  });

  const statsList = useMemo(() => [
    { title: "Total Dokumen", value: totalItems, icon: <FileText className="h-4 w-4 text-white" />, gradient: "from-blue-500 to-indigo-600", subtitle: "Semua arsip aktif" },
    { title: "Kategori Terpilih", value: selectedCategory === 'ALL' ? 'Semua' : (BASE_CATEGORY_OPTIONS ?? [])?.find(o => o.value === selectedCategory)?.label, icon: <Search className="h-4 w-4 text-white" />, gradient: "from-indigo-500 to-purple-600", subtitle: "Filter aktif saat ini" },
  ], [totalItems, selectedCategory]);

  const toolbarSlot = useMemo(() => (
    <div className="flex gap-2 flex-wrap items-center">
      <Button variant="outline" size="sm" onClick={() => fetchDocuments(currentPage)} disabled={loading} className="rounded-xl h-9 text-xs font-bold uppercase tracking-widest gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
      </Button>
      {canDelete && selectedIds.size > 0 && (
        <Button variant="danger" size="sm" onClick={handleBulkDelete} disabled={bulkProcessing} className="rounded-xl h-9 text-xs font-bold uppercase tracking-widest gap-2">
          <Trash2 size={14} /> Hapus ({selectedIds.size})
        </Button>
      )}
      {canUpload && (
        <>
          <Button variant="outline" size="sm" onClick={() => setMouOpen(true)} className="rounded-xl h-9 text-xs font-bold uppercase tracking-widest gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <FileText size={14} /> Generate MoU
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)} className="rounded-xl h-9 text-xs font-bold uppercase tracking-widest gap-2 bg-blue-600 text-white">
            <Plus size={14} /> Upload
          </Button>
        </>
      )}
    </div>
  ), [loading, currentPage, fetchDocuments, canDelete, selectedIds.size, bulkProcessing, handleBulkDelete, canUpload]);

  return (
    <AcademicPageLayout
      title="Dokumen Legalitas Sekolah"
      description="Kelola dokumen administrasi, legal, manual, dan MoU secara terpusat dengan dukungan riwayat versi."
      stats={statsList}
      hardeningModuleKey="document_center"
      breadcrumbs={[{ label: 'System' }, { label: 'Dokumen Legalitas' }]}
      instruction={{
        title: 'Panduan Dokumen Legalitas Sekolah',
        description: 'Pusat pengelolaan file digital institusi Anda.',
        items: [
          { text: 'Gunakan filter kategori untuk menyaring dokumen spesifik.' },
          { text: 'Setiap dokumen mendukung multi-versi (Versioning History).' },
          { text: 'Fitur Generate MoU memudahkan pembuatan kontrak standar secara instan.' },
          { text: 'Pilih beberapa dokumen untuk melakukan aksi massal (Hapus).' }
        ]
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              id="search-query"
              aria-label="Cari dokumen berdasarkan judul atau deskripsi"
              placeholder="Cari dokumen berdasarkan judul atau deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
            />
          </div>
          <div className="w-full md:w-[240px]">
            <SearchableSelect
              id="category-filter"
              aria-label="Pilih Kategori Filter"
              value={selectedCategory}
              onValueChange={(v) => setSelectedCategory(v as DocumentCategory | 'ALL')}
              options={categoryOptions}
              placeholder="Pilih Kategori"
              triggerClassName="h-12 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>

        <SectionCard noPadding fullWidth>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Daftar Dokumen Resmi Institusi</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Kelola berkas legalitas, MoU, administrasi, dan manual</p>
            </div>
            {toolbarSlot}
          </div>

          {loadError ? (
            <div className="py-20 flex flex-col items-center justify-center text-rose-500 font-bold text-xs uppercase tracking-widest">{loadError}</div>
          ) : loading && documents.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader className="mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Dokumen...</p>
            </div>
          ) : (
            <Suspense fallback={<PageLoader />}>
              <DocumentTable
                documents={documents}
                selectedIds={selectedIds}
                allVisibleSelected={documents.length > 0 && documents.every(d => selectedIds.has(d.id))}
                onSelectAll={(checked) => {
                  const next = new Set(selectedIds);
                  documents.forEach(d => checked ? next.add(d.id) : next.delete(d.id));
                  setSelectedIds(next);
                }}
                onSelectOne={(id, checked) => {
                  const next = new Set(selectedIds);
                  checked ? next.add(id) : next.delete(id);
                  setSelectedIds(next);
                }}
                onDownload={handleDownload}
                onVersionHistory={openVersionHistory}
                onEditMetadata={openEditMetadata}
                onVersionUpload={(doc) => { setVersionTarget(doc); setVersionUploadOpen(true); }}
                onDelete={handleDelete}
                canUpload={canUpload}
                canDelete={canDelete}
              />
            </Suspense>
          )}

          {documents.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 gap-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-4">
                <span>Total: {totalItems} Data</span>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline">Rows:</span>
                  <SearchableSelect
                    id="rows-per-page"
                    aria-label="Jumlah baris per halaman"
                    value={String(itemsPerPage)}
                    onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
                    options={[{ value: '10', label: '10' }, { value: '25', label: '25' }, { value: '50', label: '50' }]}
                    triggerClassName="w-[70px] h-8 rounded-lg text-[10px]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1 || loading} className="rounded-xl text-[10px] font-black uppercase tracking-widest h-9 px-4">Sebelumnya</Button>
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">{currentPage} / {totalPages}</div>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages || loading} className="rounded-xl text-[10px] font-black uppercase tracking-widest h-9 px-4">Berikutnya</Button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <Suspense fallback={null}>
        <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onSubmit={onSubmitUpload} register={register} errors={errors} isValid={isValid} isSubmitting={isSubmitting} formCategory={formCategory} setValue={setValue} formFile={formFile} uploadProgress={uploadProgress} />
        <MouModal isOpen={mouOpen} onClose={() => setMouOpen(false)} onSubmit={onSubmitMou} register={registerMou} errors={mouErrors} isValid={isMouValid} isSubmitting={isSubmittingMou} />
        <VersionHistoryModal isOpen={versionHistoryOpen} onClose={() => setVersionHistoryOpen(false)} target={versionHistoryTarget} loading={versionHistoryLoading} items={versionHistoryItems} onDownload={handleDownloadVersion} />
        <EditMetadataModal isOpen={editMetadataOpen} onClose={() => setEditMetadataOpen(false)} onSubmit={onSubmitEditMetadata} register={registerEditMetadata} errors={editMetadataErrors} isValid={isEditMetadataValid} isSubmitting={isSubmittingEditMetadata} formCategory={editMetadataCategory} setValue={setValueEditMetadata} target={editMetadataTarget} />
        
        <Modal isOpen={versionUploadOpen} onClose={() => setVersionUploadOpen(false)} title="Upload Versi Baru" size="md">
            <div className="space-y-4">
                <div className="space-y-1">
                    <label htmlFor="version-file-input" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Pilih File Baru</label>
                    <input id="version-file-input" type="file" className="w-full text-xs" onChange={(e) => setVersionFile(e.target.files?.[0] || null)} />
                    {versionFile && <div className="text-[10px] text-slate-500 font-mono mt-1">{versionFile.name}</div>}
                </div>
                {typeof versionUploadProgress === 'number' && (
                    <div className="mt-4 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-black text-blue-600 tracking-widest uppercase"><span>Uploading</span><span>{versionUploadProgress}%</span></div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${versionUploadProgress}%` }} /></div>
                    </div>
                )}
                <ModalFooter>
                    <Button variant="outline" onClick={() => setVersionUploadOpen(false)} disabled={typeof versionUploadProgress === 'number'} className="rounded-xl h-10 px-6 font-bold uppercase tracking-widest text-[10px]">Batal</Button>
                    <Button onClick={submitVersionUpload} disabled={!versionFile || typeof versionUploadProgress === 'number'} className="rounded-xl h-10 px-8 font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white">Upload Versi</Button>
                </ModalFooter>
            </div>
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
}
