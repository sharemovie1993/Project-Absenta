import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, History, Pencil, Plus, RefreshCw, Search, Trash2, CheckSquare } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import useConfirm from '@/hooks/useConfirm';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/authStore';
import {
  Badge,
  Button,
  Loader,
  Modal,
  ModalFooter,
  SectionHeader,
  Table,
  TableActions,
  Textarea,
  ToastContainer,
  Input,
  Checkbox,
} from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { formatDateTime } from '@/utils/layoutUtils';
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
  const token = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (!token) return 'ALL';
  if (
    token === 'ALL' ||
    token === 'SEMUA' ||
    token === 'SEMUA_DOKUMEN' ||
    token === 'SEMUA_DOKUMENT' ||
    token === 'SEMUA_DOCUMENT' ||
    token === 'SEMUA_DOCUMENTS'
  ) {
    return 'ALL';
  }

  const aliasMap: Record<string, DocumentCategory> = {
    ADMIN: 'ADMINISTRATIVE',
    ADMINISTRASI: 'ADMINISTRATIVE',
    COMPANY: 'ADMINISTRATIVE',
    COMPANY_DOCUMENT: 'ADMINISTRATIVE',
    COMPANY_DOCUMENTS: 'ADMINISTRATIVE',
    COMPANY_DOC: 'ADMINISTRATIVE',
    COMPANY_DOCS: 'ADMINISTRATIVE',
    LEGAL_DOCUMENT: 'LEGAL',
    LEGAL_DOCUMENTS: 'LEGAL',
    LEGAL_DOC: 'LEGAL',
    LEGAL_DOCS: 'LEGAL',
    MANUALS: 'MANUAL',
    MANUAL_DOCUMENT: 'MANUAL',
    MANUAL_DOCUMENTS: 'MANUAL',
    SOP: 'MANUAL',
    LAINNYA: 'OTHER',
  };

  const aliased = aliasMap[token];
  if (aliased) return aliased;

  const allowed = BASE_CATEGORY_OPTIONS.map((o) => o.value).filter((v) => v !== 'ALL') as DocumentCategory[];
  if (allowed.includes(token as DocumentCategory)) return token as DocumentCategory;
  return 'ALL';
}

function formatBytes(bytes: number): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '-';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

const uploadSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  category: z.enum(['ADMINISTRATIVE', 'LEGAL', 'MANUAL', 'OTHER']),
  description: z.string().optional(),
  file: z.any().refine((v) => v instanceof File, 'File wajib dipilih'),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

const mouSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tanggal: z.string().optional(),
  nomor: z.string().optional(),
  pihak_kedua_nama: z.string().optional(),
  pihak_kedua_alamat: z.string().optional(),
});

type MouFormValues = z.infer<typeof mouSchema>;

const editMetadataSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  category: z.enum(['ADMINISTRATIVE', 'LEGAL', 'MANUAL', 'OTHER']),
  description: z.string().optional(),
});

type EditMetadataFormValues = z.infer<typeof editMetadataSchema>;

export default function DocumentCenterPage() {
  const confirm = useConfirm();
  const { toasts, success, error, removeToast } = useToast();
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
    return BASE_CATEGORY_OPTIONS.filter((o) => {
      if (o.value === 'ALL') return includeAll;
      return allowedCategories.includes(o.value);
    });
  }, [can]);

  const initialSelectedCategory = useMemo(() => {
    const desiredFromState = parseCategoryFromQuery((location.state as any)?.defaultCategory ?? null);
    const desiredFromQuery = parseCategoryFromQuery(searchParams.get('category'));
    const desired = desiredFromState !== 'ALL' ? desiredFromState : desiredFromQuery;
    const match = categoryOptions.find((o) => o.value === desired)?.value;
    const fallback = categoryOptions.find((o) => o.value !== 'ALL')?.value ?? 'ALL';
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

  // Pagination & Bulk Actions
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    isSubmitting,
    errors,
    isValid,
  } = useFormValidation({
    schema: uploadSchema,
    defaultValues: {
      title: '',
      category: 'ADMINISTRATIVE',
      description: '',
      file: undefined,
    },
    mode: 'onChange',
  });

  const {
    register: registerMou,
    handleSubmit: handleSubmitMou,
    reset: resetMou,
    isSubmitting: isSubmittingMou,
    errors: mouErrors,
    isValid: isMouValid,
  } = useFormValidation({
    schema: mouSchema,
    defaultValues: {
      title: '',
      description: '',
      tanggal: '',
      nomor: '',
      pihak_kedua_nama: '',
      pihak_kedua_alamat: '',
    },
    mode: 'onChange',
  });

  const {
    register: registerEditMetadata,
    handleSubmit: handleSubmitEditMetadata,
    setValue: setValueEditMetadata,
    watch: watchEditMetadata,
    reset: resetEditMetadata,
    isSubmitting: isSubmittingEditMetadata,
    errors: editMetadataErrors,
    isValid: isEditMetadataValid,
  } = useFormValidation({
    schema: editMetadataSchema,
    defaultValues: {
      title: '',
      category: 'ADMINISTRATIVE',
      description: '',
    },
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
          error(msg);
          return;
        }

        setDocuments(res.data || []);
        setCurrentPage(res.pagination.page);
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      } catch (e: any) {
        const msg = e?.message || 'Gagal memuat dokumen';
        setLoadError(msg);
        error(msg);
      } finally {
        setLoading(false);
      }
    },
    [error, selectedCategory, itemsPerPage, debouncedSearch]
  );

  useEffect(() => {
    setSelectedCategory((prev) => (prev === initialSelectedCategory ? prev : initialSelectedCategory));
  }, [initialSelectedCategory]);

  useEffect(() => {
    fetchDocuments(1);
    setCurrentPage(1);
  }, [fetchDocuments]);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      fetchDocuments(page);
    },
    [fetchDocuments]
  );

  const paginationInfo = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    if (totalItems === 0) return 'Menampilkan 0 data';
    return `Menampilkan ${start}-${end} dari ${totalItems} data`;
  }, [currentPage, totalItems]);

  const emptyState = useMemo(() => {
    const label = BASE_CATEGORY_OPTIONS.find((o) => o.value === selectedCategory)?.label || String(selectedCategory);
    const title = selectedCategory === 'ALL' ? 'Belum ada dokumen' : `Belum ada dokumen untuk ${label}`;
    const description = canUpload
      ? 'Silakan upload dokumen atau generate MoU untuk mulai mengisi Document Center.'
      : 'Dokumen akan muncul di sini setelah diupload oleh Admin.';
    return { title, description };
  }, [canUpload, selectedCategory]);

  const setCategory = useCallback(
    (next: DocumentCategory | 'ALL') => {
      setSelectedCategory(next);
    },
    []
  );

  const handleDownload = useCallback(
    async (doc: DocumentItem) => {
      try {
        const a = document.createElement('a');
        const signed = await createDocumentSignedUrl(doc.id);
        a.href = signed.download_url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e: any) {
        error(e?.message || 'Gagal mengunduh dokumen');
      }
    },
    [error]
  );

  const handleDelete = useCallback(
    async (doc: DocumentItem) => {
      const ok = await confirm({
        title: 'Konfirmasi Hapus Dokumen',
        description: `Apakah Anda yakin ingin menghapus dokumen "${doc.title}"?`,
        confirmText: 'Hapus',
        cancelText: 'Batal',
        style: 'danger',
      });
      if (!ok) return;

      try {
        const res = await softDeleteDocument(doc.id);
        if (!res.success) {
          error(res.message || 'Gagal menghapus dokumen');
          return;
        }
        success('Dokumen berhasil dihapus');
        fetchDocuments(currentPage);
      } catch (e: any) {
        error(e?.message || 'Gagal menghapus dokumen');
      }
    },
    [confirm, currentPage, error, fetchDocuments, success]
  );

  const openVersionUpload = useCallback((doc: DocumentItem) => {
    setVersionTarget(doc);
    setVersionFile(null);
    setVersionUploadProgress(null);
    setVersionUploadOpen(true);
  }, []);

  const openVersionHistory = useCallback(
    async (doc: DocumentItem) => {
      try {
        setVersionHistoryTarget(doc);
        setVersionHistoryItems([]);
        setVersionHistoryOpen(true);
        setVersionHistoryLoading(true);

        const res = await listDocumentVersions(doc.id);
        if (!res.success) {
          error(res.message || 'Gagal memuat version history');
          return;
        }
        const items = Array.isArray(res.data) ? res.data : [];
        const sorted = [...items].sort((a, b) => Number(b.version) - Number(a.version));
        setVersionHistoryItems(sorted);
      } catch (e: any) {
        error(e?.message || 'Gagal memuat version history');
      } finally {
        setVersionHistoryLoading(false);
      }
    },
    [error]
  );

  const closeVersionHistory = useCallback(() => {
    setVersionHistoryOpen(false);
    setVersionHistoryTarget(null);
    setVersionHistoryItems([]);
    setVersionHistoryLoading(false);
  }, []);

  const handleDownloadVersion = useCallback(
    async (doc: DocumentItem, version: number) => {
      try {
        const a = document.createElement('a');
        const signed = await createDocumentSignedUrl(doc.id, { version });
        a.href = signed.download_url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e: any) {
        error(e?.message || 'Gagal mengunduh dokumen');
      }
    },
    [error]
  );

  const openEditMetadata = useCallback(
    (doc: DocumentItem) => {
      setEditMetadataTarget(doc);
      resetEditMetadata({
        title: doc.title || '',
        category: (doc.category || 'ADMINISTRATIVE') as any,
        description: doc.description || '',
      });
      setEditMetadataOpen(true);
    },
    [resetEditMetadata]
  );

  const closeEditMetadata = useCallback(() => {
    setEditMetadataOpen(false);
    setEditMetadataTarget(null);
    resetEditMetadata({
      title: '',
      category: 'ADMINISTRATIVE',
      description: '',
    });
  }, [resetEditMetadata]);

  const onSubmitEditMetadata = useMemo(
    () =>
      handleSubmitEditMetadata(async (values: EditMetadataFormValues) => {
        if (!editMetadataTarget) return;
        try {
          const title = String(values.title || '').trim();
          const descriptionRaw = String(values.description ?? '');
          const descriptionTrimmed = descriptionRaw.trim();
          const description = descriptionTrimmed.length > 0 ? descriptionTrimmed : null;

          const res = await updateDocumentMetadata(editMetadataTarget.id, {
            title,
            category: values.category as any,
            description,
          });

          if (!res.success) {
            error(res.message || 'Gagal memperbarui metadata dokumen');
            return;
          }

          success('Metadata dokumen berhasil diperbarui');
          closeEditMetadata();
          fetchDocuments(currentPage);
        } catch (e: any) {
          error(e?.message || 'Gagal memperbarui metadata dokumen');
        }
      }),
    [closeEditMetadata, currentPage, editMetadataTarget, error, fetchDocuments, handleSubmitEditMetadata, success]
  );

  const closeVersionUpload = useCallback(() => {
    setVersionUploadOpen(false);
    setVersionTarget(null);
    setVersionFile(null);
    setVersionUploadProgress(null);
  }, []);

  const submitVersionUpload = useCallback(async () => {
    if (!versionTarget || !versionFile) return;
    try {
      setVersionUploadProgress(0);
      const res = await uploadDocumentVersion({
        id: versionTarget.id,
        file: versionFile,
        onProgress: setVersionUploadProgress,
      });
      if (!res.success) {
        error(res.message || 'Gagal mengunggah versi dokumen');
        return;
      }
      success('Versi dokumen berhasil diunggah');
      closeVersionUpload();
      fetchDocuments(currentPage);
    } catch (e: any) {
      error(e?.message || 'Gagal mengunggah versi dokumen');
    } finally {
      setVersionUploadProgress(null);
    }
  }, [closeVersionUpload, currentPage, error, fetchDocuments, success, versionFile, versionTarget]);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const newSelected = new Set(selectedIds);
        documents.forEach((item) => newSelected.add(item.id));
        setSelectedIds(newSelected);
      } else {
        const newSelected = new Set(selectedIds);
        documents.forEach((item) => newSelected.delete(item.id));
        setSelectedIds(newSelected);
      }
    },
    [documents, selectedIds]
  );

  const handleSelectOne = useCallback(
    (id: string, checked: boolean) => {
      const newSelected = new Set(selectedIds);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      setSelectedIds(newSelected);
    },
    [selectedIds]
  );

  const allVisibleSelected = useMemo(() => {
    if (documents.length === 0) return false;
    return documents.every((item) => selectedIds.has(item.id));
  }, [documents, selectedIds]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const ok = await confirm({
      title: 'Konfirmasi Hapus Massal',
      description: `Apakah Anda yakin ingin menghapus ${selectedIds.size} dokumen terpilih?`,
      confirmText: `Hapus (${selectedIds.size})`,
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;

    try {
      setBulkProcessing(true);
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const res = await softDeleteDocument(id);
          if (!res.success) throw new Error(res.message || 'Gagal menghapus');
          return id;
        })
      );

      const failed: { id: string; message: string }[] = [];
      const succeeded: string[] = [];

      results.forEach((r, idx) => {
        const id = ids[idx];
        if (r.status === 'fulfilled') {
          succeeded.push(id);
        } else {
          failed.push({ id, message: (r.reason as Error)?.message || 'Gagal menghapus' });
        }
      });

      if (failed.length > 0) {
        error(`Gagal menghapus ${failed.length} dokumen. Berhasil: ${succeeded.length}`);
      } else {
        success(`Berhasil menghapus ${succeeded.length} dokumen`);
      }

      const next = new Set<string>(selectedIds);
      succeeded.forEach((id) => next.delete(id));
      setSelectedIds(next);
      fetchDocuments(currentPage);
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kesalahan saat hapus massal';
      error(msg);
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, confirm, error, success, fetchDocuments, currentPage]);

  const columns = useMemo(
    () => [
      {
        key: 'select',
        label: (
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={(checked) => handleSelectAll(!!checked)}
            aria-label="Select all"
          />
        ),
        className: 'w-10',
        render: (_: any, row: DocumentItem) => (
          <Checkbox
            checked={selectedIds.has(row.id)}
            onCheckedChange={(checked) => handleSelectOne(row.id, !!checked)}
            aria-label={`Select ${row.title}`}
          />
        ),
      },
      {
        key: 'title',
        label: 'Dokumen',
        render: (_: any, row: DocumentItem) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{row.title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {row.file_original_name} (v{row.current_version || 1})
            </div>
            {row.description ? (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{row.description}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'category',
        label: 'Kategori',
        className: 'w-40',
        render: (value: DocumentCategory) => {
          const label = BASE_CATEGORY_OPTIONS.find((o) => o.value === value)?.label || value;
          return <Badge variant="outline">{label}</Badge>;
        },
      },
      {
        key: 'size_bytes',
        label: 'Ukuran',
        className: 'w-28',
        render: (value: number) => formatBytes(value),
      },
      {
        key: 'created_at',
        label: 'Dibuat',
        className: 'w-48',
        render: (value: string) => formatDateTime(value),
      },
      {
        key: 'actions',
        label: 'Aksi',
        className: 'w-44',
        render: (_: any, row: DocumentItem) => (
          <TableActions>
            <Button size="sm" variant="outline" onClick={() => handleDownload(row)} title="Unduh">
              <Download className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => openVersionHistory(row)} title="Version history">
              <History className="w-4 h-4" />
            </Button>
            {canUpload ? (
              <>
                <Button size="sm" variant="outline" onClick={() => openEditMetadata(row)} title="Edit metadata">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => openVersionUpload(row)} title="Upload versi">
                  <Plus className="w-4 h-4" />
                </Button>
              </>
            ) : null}
            {canDelete ? (
              <Button size="sm" variant="danger" onClick={() => handleDelete(row)} title="Hapus">
                <Trash2 className="w-4 h-4" />
              </Button>
            ) : null}
          </TableActions>
        ),
      },
    ],
    [
      canDelete,
      canUpload,
      handleDelete,
      handleDownload,
      openEditMetadata,
      openVersionHistory,
      openVersionUpload,
      allVisibleSelected,
      handleSelectAll,
      handleSelectOne,
      selectedIds,
    ]
  );

  const closeUpload = useCallback(() => {
    setUploadOpen(false);
    setUploadProgress(null);
    reset({
      title: '',
      category: 'ADMINISTRATIVE',
      description: '',
      file: undefined,
    });
  }, [reset]);

  const onSubmitUpload = useMemo(
    () =>
      handleSubmit(async (values: UploadFormValues) => {
        try {
          setUploadProgress(0);
          const res = await uploadDocument({
            file: values.file as File,
            title: values.title,
            category: values.category as DocumentCategory,
            description: values.description,
            onProgress: setUploadProgress,
          });

          if (!res.success) {
            error(res.message || 'Gagal mengunggah dokumen');
            return;
          }

          success('Dokumen berhasil diunggah');
          closeUpload();
          fetchDocuments(1);
          setCurrentPage(1);
        } catch (e: any) {
          error(e?.message || 'Gagal mengunggah dokumen');
        } finally {
          setUploadProgress(null);
        }
      }),
    [closeUpload, error, fetchDocuments, handleSubmit, success]
  );

  const closeMou = useCallback(() => {
    setMouOpen(false);
    resetMou({
      title: '',
      description: '',
      tanggal: '',
      nomor: '',
      pihak_kedua_nama: '',
      pihak_kedua_alamat: '',
    });
  }, [resetMou]);

  const onSubmitMou = useMemo(
    () =>
      handleSubmitMou(async (values: MouFormValues) => {
        try {
          const normalize = (v: any) => {
            const s = String(v ?? '').trim();
            return s.length > 0 ? s : undefined;
          };
          const res = await generateMouDocument({
            title: normalize(values.title),
            description: normalize(values.description),
            tanggal: normalize(values.tanggal),
            nomor: normalize(values.nomor),
            pihak_kedua_nama: normalize(values.pihak_kedua_nama),
            pihak_kedua_alamat: normalize(values.pihak_kedua_alamat),
          });

          if (!res.success) {
            error(res.message || 'Gagal generate MoU');
            return;
          }

          success('MoU berhasil digenerate');
          closeMou();
          fetchDocuments(1);
          setCurrentPage(1);
        } catch (e: any) {
          error(e?.message || 'Gagal generate MoU');
        }
      }),
    [closeMou, error, fetchDocuments, handleSubmitMou, success]
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Document Center"
        subtitle="Kelola dokumen: unggah, unduh, dan hapus"
        icon={<FileText className="w-6 h-6" />}
      >
        <Button variant="outline" onClick={() => fetchDocuments(currentPage)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        {canDelete && selectedIds.size > 0 && (
          <Button variant="danger" onClick={handleBulkDelete} disabled={bulkProcessing}>
            <Trash2 className="w-4 h-4 mr-2" />
            Hapus ({selectedIds.size})
          </Button>
        )}
        {canUpload ? (
          <>
            <Button variant="outline" onClick={() => setMouOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Generate MoU
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </>
        ) : null}
      </SectionHeader>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full md:w-[200px]">
          <SearchableSelect
            value={selectedCategory}
            onValueChange={(v) => setCategory(v as DocumentCategory | 'ALL')}
            options={categoryOptions}
            placeholder="Pilih kategori"
            className="w-full"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader size="lg" />
          </div>
        ) : (
          <div>
            {loadError ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-red-500" />
                </div>
                <div className="font-medium text-slate-700 dark:text-slate-200">Gagal memuat dokumen</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{loadError}</div>
                <div className="mt-5 flex items-center justify-center gap-2">
                  <Button variant="outline" onClick={() => fetchDocuments(currentPage)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Coba Lagi
                  </Button>
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-slate-400" />
                </div>
                <div className="font-medium text-slate-700 dark:text-slate-200">{emptyState.title}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{emptyState.description}</div>
                {canUpload ? (
                  <div className="mt-5 flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => setMouOpen(true)}>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate MoU
                    </Button>
                    <Button onClick={() => setUploadOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Table columns={columns} data={documents} emptyMessage="Tidak ada dokumen" />
            )}

            {documents.length > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between px-4 py-4 border-t dark:border-gray-700 gap-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-4">
                  <span>{paginationInfo}</span>
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">Baris per halaman:</span>
                    <SearchableSelect
                      value={String(itemsPerPage)}
                      onValueChange={(v) => {
                        setItemsPerPage(Number(v));
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: '10', label: '10' },
                        { value: '25', label: '25' },
                        { value: '50', label: '50' },
                        { value: '100', label: '100' },
                      ]}
                      className="w-[70px]"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={uploadOpen && canUpload}
        onClose={closeUpload}
        title="Upload Dokumen"
        description="Unggah dokumen baru ke Document Center"
        size="md"
      >
        <form onSubmit={onSubmitUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Judul</label>
            <Input
              className="w-full"
              placeholder="Contoh: Panduan Penggunaan"
              {...register('title')}
              error={(errors as any).title?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Kategori</label>
            <SearchableSelect
              value={formCategory}
              onValueChange={(v) => setValue('category', v as any, { shouldValidate: true })}
              options={BASE_CATEGORY_OPTIONS.filter((o) => o.value !== 'ALL')}
              placeholder="Pilih kategori"
              searchPlaceholder="Cari kategori..."
              triggerClassName="h-10"
            />
            {errors?.category ? (
              <div className="text-xs text-red-600 mt-1">{String((errors as any).category?.message || '')}</div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Deskripsi</label>
            <Textarea
              rows={3}
              placeholder="Opsional"
              className="w-full"
              {...register('description')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">File</label>
            <input
              type="file"
              className="w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setValue('file', file, { shouldValidate: true });
              }}
            />
            {formFile ? (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {formFile.name} ({formatBytes(formFile.size)})
              </div>
            ) : null}
            {errors?.file ? (
              <div className="text-xs text-red-600 mt-1">{String((errors as any).file?.message || '')}</div>
            ) : null}
            {typeof uploadProgress === 'number' ? (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Upload</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mt-1 overflow-hidden">
                  <div className="h-2 bg-blue-600" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : null}
          </div>

          <ModalFooter>
            <Button variant="outline" type="button" onClick={closeUpload} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Mengunggah...' : 'Upload'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal
        isOpen={versionUploadOpen && canUpload}
        onClose={closeVersionUpload}
        title="Upload Versi Dokumen"
        description={versionTarget ? `Upload versi baru untuk "${versionTarget.title}"` : 'Upload versi baru'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">File</label>
            <input
              type="file"
              className="w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setVersionFile(file);
              }}
            />
            {versionFile ? (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {versionFile.name} ({formatBytes(versionFile.size)})
              </div>
            ) : null}
            {typeof versionUploadProgress === 'number' ? (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Upload</span>
                  <span>{versionUploadProgress}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mt-1 overflow-hidden">
                  <div className="h-2 bg-blue-600" style={{ width: `${versionUploadProgress}%` }} />
                </div>
              </div>
            ) : null}
          </div>

          <ModalFooter>
            <Button variant="outline" type="button" onClick={closeVersionUpload} disabled={typeof versionUploadProgress === 'number'}>
              Batal
            </Button>
            <Button type="button" onClick={submitVersionUpload} disabled={!versionTarget || !versionFile || typeof versionUploadProgress === 'number'}>
              Upload Versi
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      <Modal
        isOpen={mouOpen && canUpload}
        onClose={closeMou}
        title="Generate MoU"
        description="Generate MoU dalam bentuk PDF dan simpan ke Document Center"
        size="md"
      >
        <form onSubmit={onSubmitMou} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Judul</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-100"
              placeholder="Opsional"
              {...registerMou('title')}
            />
            {mouErrors?.title ? (
              <div className="text-xs text-red-600 mt-1">{String((mouErrors as any).title?.message || '')}</div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nomor</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-100"
                placeholder="Opsional"
                {...registerMou('nomor')}
              />
              {mouErrors?.nomor ? (
                <div className="text-xs text-red-600 mt-1">{String((mouErrors as any).nomor?.message || '')}</div>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tanggal</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-100"
                {...registerMou('tanggal')}
              />
              {mouErrors?.tanggal ? (
                <div className="text-xs text-red-600 mt-1">{String((mouErrors as any).tanggal?.message || '')}</div>
              ) : null}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Pihak Kedua (Nama)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-100"
              placeholder="Opsional"
              {...registerMou('pihak_kedua_nama')}
            />
            {mouErrors?.pihak_kedua_nama ? (
              <div className="text-xs text-red-600 mt-1">{String((mouErrors as any).pihak_kedua_nama?.message || '')}</div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Pihak Kedua (Alamat)</label>
            <Textarea rows={2} placeholder="Opsional" className="w-full" {...registerMou('pihak_kedua_alamat')} />
            {mouErrors?.pihak_kedua_alamat ? (
              <div className="text-xs text-red-600 mt-1">{String((mouErrors as any).pihak_kedua_alamat?.message || '')}</div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Deskripsi</label>
            <Textarea rows={3} placeholder="Opsional" className="w-full" {...registerMou('description')} />
            {mouErrors?.description ? (
              <div className="text-xs text-red-600 mt-1">{String((mouErrors as any).description?.message || '')}</div>
            ) : null}
          </div>

          <ModalFooter>
            <Button variant="outline" type="button" onClick={closeMou} disabled={isSubmittingMou}>
              Batal
            </Button>
            <Button type="submit" disabled={!isMouValid || isSubmittingMou}>
              {isSubmittingMou ? 'Memproses...' : 'Generate'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal
        isOpen={versionHistoryOpen}
        onClose={closeVersionHistory}
        title="Version History"
        description={versionHistoryTarget ? `Riwayat versi untuk "${versionHistoryTarget.title}"` : 'Riwayat versi dokumen'}
        size="md"
      >
        {versionHistoryLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader size="lg" />
          </div>
        ) : versionHistoryItems.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">Belum ada versi yang tersimpan.</div>
        ) : (
          <div className="space-y-2">
            {versionHistoryItems.map((v) => (
              <div
                key={v.id}
                className="flex items-start justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    v{v.version} <span className="text-xs text-gray-500 dark:text-gray-400">({formatBytes(v.size_bytes)})</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{v.file_original_name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(v.created_at)}</div>
                </div>
                {versionHistoryTarget ? (
                  <Button size="sm" variant="outline" onClick={() => handleDownloadVersion(versionHistoryTarget, v.version)} title="Unduh versi">
                    <Download className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={editMetadataOpen && canUpload}
        onClose={closeEditMetadata}
        title="Edit Metadata Dokumen"
        description={editMetadataTarget ? `Perbarui metadata untuk "${editMetadataTarget.title}"` : 'Perbarui metadata dokumen'}
        size="md"
      >
        <form onSubmit={onSubmitEditMetadata} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Judul</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-100"
              placeholder="Judul dokumen"
              {...registerEditMetadata('title')}
            />
            {editMetadataErrors?.title ? (
              <div className="text-xs text-red-600 mt-1">{String((editMetadataErrors as any).title?.message || '')}</div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Kategori</label>
            <SearchableSelect
              value={editMetadataCategory}
              onValueChange={(v) => setValueEditMetadata('category', v as any, { shouldValidate: true })}
              options={BASE_CATEGORY_OPTIONS.filter((o) => o.value !== 'ALL')}
              placeholder="Pilih kategori"
              searchPlaceholder="Cari kategori..."
              triggerClassName="h-10"
            />
            {editMetadataErrors?.category ? (
              <div className="text-xs text-red-600 mt-1">{String((editMetadataErrors as any).category?.message || '')}</div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Deskripsi</label>
            <Textarea rows={3} placeholder="Opsional" className="w-full" {...registerEditMetadata('description')} />
          </div>

          <ModalFooter>
            <Button variant="outline" type="button" onClick={closeEditMetadata} disabled={isSubmittingEditMetadata}>
              Batal
            </Button>
            <Button type="submit" disabled={!isEditMetadataValid || isSubmittingEditMetadata}>
              {isSubmittingEditMetadata ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
