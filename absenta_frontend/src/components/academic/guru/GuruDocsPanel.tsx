/**
 * GuruDocsPanel.tsx
 * Panel berkas kepegawaian guru dengan sistem slot kategori visual wajib
 * dan upload instan otomatis.
 */
import React, { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderOpen, FileText, Image as ImageIcon, Download, Eye, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../ui/Button';
import { Skeleton } from '../../ui/Skeleton';
import { MemberDocsViewer } from '../../documents/MemberDocsViewer';
import { cn } from '../../../lib/utils';
import {
  listGuruDocuments,
  deleteGuruDocument,
  uploadGuruDocument,
  KATEGORI_LABELS,
  formatBytes,
} from '../../../api/memberDocs.api';
import type { MemberDoc, MemberDocKategori } from '../../../api/memberDocs.api';

// Daftar Kategori Berkas Wajib untuk Guru
const WAJIB_CATEGORIES: MemberDocKategori[] = [
  'KTP',
  'KK',
  'SK',
  'SERTIFIKAT',
  'BPJS',
  'FOTO',
];

// Kategori berkas yang bisa diupload berkali-kali (repetisi)
const MULTI_CATEGORIES: MemberDocKategori[] = ['SK', 'SERTIFIKAT'];

interface GuruDocsPanelProps {
  guruId:    string;
  guruName?: string;
  mode?:     'full' | 'compact';
  canManage?: boolean;
}

export const GuruDocsPanel: React.FC<GuruDocsPanelProps> = React.memo(({
  guruId,
  guruName,
  mode = 'full',
  canManage,
}) => {
  const { user } = useAuth();
  const confirm  = useConfirm();
  const queryClient = useQueryClient();

  const canEdit = canManage ??
    (user?.roleName === 'ADMIN' || user?.roleName === 'SUPERADMIN' ||
     user?.capabilities?.includes('academic.students.manage')); // or custom capability for staff manage

  const [selectedDoc, setSelectedDoc] = useState<MemberDoc | null>(null);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [showOtherUpload, setShowOtherUpload] = useState(false);

  // Form untuk Berkas Lain-lain
  const [otherFile, setOtherFile] = useState<File | null>(null);
  const [otherJudul, setOtherJudul] = useState('');
  const [otherLoading, setOtherLoading] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['guru-docs', guruId],
    queryFn:  () => listGuruDocuments(guruId),
    enabled:  !!guruId,
  });

  const docs = data?.data ?? [];

  // Filter dokumen: wajib vs lain-lain
  const wajibDocs = docs.filter(d => WAJIB_CATEGORIES.includes(d.kategori as MemberDocKategori));
  const otherDocs = docs.filter(d => !WAJIB_CATEGORIES.includes(d.kategori as MemberDocKategori));

  const handleDelete = useCallback(async (doc: MemberDoc) => {
    const ok = await confirm({
      title:       'Hapus Berkas',
      description: `Hapus berkas "${doc.judul}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      style:       'danger',
    });
    if (!ok) return;
    try {
      await deleteGuruDocument(guruId, doc.id);
      toast.success('Berkas berhasil dihapus');
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
      queryClient.invalidateQueries({ queryKey: ['guru-docs', guruId] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus berkas');
    }
  }, [guruId, selectedDoc, confirm, queryClient]);

  // Upload otomatis untuk slot kategori wajib
  const handleUploadSlot = async (category: MemberDocKategori, file: File) => {
    const allowedMime = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const maxBytes = 10 * 1024 * 1024;

    if (!allowedMime.includes(file.type)) {
      toast.error('Format tidak didukung. Gunakan PDF, JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > maxBytes) {
      toast.error(`Ukuran file terlalu besar (maks. ${formatBytes(maxBytes)}).`);
      return;
    }

    // Auto-compose judul berkas untuk Guru
    let autoTitle = '';
    if (MULTI_CATEGORIES.includes(category)) {
      const cleanFileName = file.name.replace(/\.[^.]+$/, '').substring(0, 30);
      autoTitle = `${KATEGORI_LABELS[category]} - ${cleanFileName} - ${guruName || 'Guru'}`;
    } else {
      autoTitle = `${KATEGORI_LABELS[category]} - ${guruName || 'Guru'}`;
    }

    setUploadingCategory(category);
    setUploadProgress(prev => ({ ...prev, [category]: 0 }));

    try {
      await uploadGuruDocument({
        guruId,
        file,
        judul: autoTitle,
        kategori: category,
        onProgress: (pct) => {
          setUploadProgress(prev => ({ ...prev, [category]: pct }));
        }
      });
      toast.success(`Berkas ${KATEGORI_LABELS[category]} berhasil diupload`);
      queryClient.invalidateQueries({ queryKey: ['guru-docs', guruId] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengupload berkas');
    } finally {
      setUploadingCategory(null);
    }
  };

  // Upload Berkas Lain-lain
  const handleUploadOther = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherFile) return;
    if (!otherJudul.trim()) {
      toast.error('Judul berkas wajib diisi');
      return;
    }

    setOtherLoading(true);
    try {
      await uploadGuruDocument({
        guruId,
        file: otherFile,
        judul: otherJudul,
        kategori: 'LAINNYA',
      });
      toast.success('Berkas lainnya berhasil diupload');
      setOtherFile(null);
      setOtherJudul('');
      setShowOtherUpload(false);
      queryClient.invalidateQueries({ queryKey: ['guru-docs', guruId] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengupload berkas');
    } finally {
      setOtherLoading(false);
    }
  };

  const renderSlot = (category: MemberDocKategori) => {
    const label = KATEGORI_LABELS[category];
    const isUploading = uploadingCategory === category;
    const pct = uploadProgress[category] ?? 0;
    const isMulti = MULTI_CATEGORIES.includes(category);

    // Kategori Multi-File (SK & Sertifikat)
    if (isMulti) {
      const matchedDocs = wajibDocs.filter(d => d.kategori === category);

      return (
        <div
          key={category}
          className="p-3.5 rounded-2xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 space-y-3"
        >
          {/* Header Slot */}
          <div className="flex justify-between items-center pb-1.5 border-b border-slate-50 dark:border-slate-800/40">
            <div className="flex items-center gap-2">
              <FolderOpen size={13} className="text-indigo-500 shrink-0" />
              <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                {label}
              </p>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                {matchedDocs.length} berkas
              </span>
            </div>
            {canEdit && (
              <>
                <input
                  type="file"
                  ref={el => { fileInputRefs.current[category] = el; }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadSlot(category, file);
                  }}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRefs.current[category]?.click()}
                  disabled={isUploading}
                  variant="outline"
                  size="xs"
                  className="h-6 text-[9px] font-black rounded-lg px-2"
                >
                  {isUploading ? (
                    <Loader2 size={8} className="animate-spin mr-1" />
                  ) : (
                    <Plus size={8} className="mr-1" />
                  )}
                  Upload Baru
                </Button>
              </>
            )}
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="w-full space-y-1 bg-slate-50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
              <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[9px] text-slate-400 font-bold">Mengupload berkas baru: {pct}%</p>
            </div>
          )}

          {/* List Files */}
          {matchedDocs.length === 0 ? (
            <div className="flex items-center gap-1.5 text-slate-300 dark:text-slate-700 italic pl-1 text-[10px] font-bold">
              <AlertCircle size={12} />
              <span>✕ Belum ada berkas diunggah</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {matchedDocs.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={cn(
                    "p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer",
                    selectedDoc?.id === doc.id
                      ? "border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/30 dark:bg-indigo-950/20"
                      : "border-slate-50 bg-slate-50/30 dark:border-slate-850 dark:bg-slate-900/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/20"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                      {doc.judul.replace(`${KATEGORI_LABELS[category]} - `, '')}
                    </p>
                    <p className="text-[9px] text-gray-400 font-medium truncate mt-0.5">
                      {doc.file_original_name} ({formatBytes(doc.size_bytes)}) · {new Date(doc.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                        title="Hapus"
                        className="p-1 rounded-lg bg-white text-slate-400 border border-slate-100 dark:bg-slate-800 dark:border-slate-800 hover:text-rose-600 hover:border-rose-200 transition-all"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Kategori Single-File (KTP, KK, FOTO, dll)
    const doc = wajibDocs.find(d => d.kategori === category);

    return (
      <div
        key={category}
        onClick={() => { if (doc) setSelectedDoc(doc); }}
        className={cn(
          "p-3 rounded-2xl border transition-all flex items-center justify-between gap-4",
          doc
            ? "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
            : "border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30",
          doc && selectedDoc?.id === doc.id && "border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/30 dark:bg-indigo-950/20"
        )}
      >
        {/* Detail */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {doc ? (
              <CheckCircle2 size={14} className={cn("shrink-0", selectedDoc?.id === doc.id ? "text-indigo-500" : "text-emerald-500")} />
            ) : (
              <AlertCircle size={14} className="text-slate-300 shrink-0" />
            )}
            <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide truncate">
              {label}
            </p>
          </div>
          {doc ? (
            <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
              {doc.file_original_name} ({formatBytes(doc.size_bytes)}) · {new Date(doc.created_at).toLocaleDateString('id-ID')}
            </p>
          ) : (
            <p className="text-[10px] text-rose-500 font-bold mt-0.5">✕ Belum diunggah</p>
          )}

          {/* Progress bar */}
          {isUploading && (
            <div className="w-full mt-2 space-y-1">
              <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[9px] text-slate-400 font-bold">Mengupload: {pct}%</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {doc ? (
            <>
              {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                  title="Hapus"
                  className="p-1.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 dark:bg-slate-800 dark:border-slate-800 hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-950 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </>
          ) : (
            canEdit && (
              <>
                <input
                  type="file"
                  ref={el => { fileInputRefs.current[category] = el; }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadSlot(category, file);
                  }}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                />
                <Button
                  onClick={(e) => { e.stopPropagation(); fileInputRefs.current[category]?.click(); }}
                  disabled={isUploading}
                  variant="outline"
                  size="xs"
                  className="h-7 text-[10px] font-black rounded-xl"
                >
                  {isUploading ? (
                    <Loader2 size={10} className="animate-spin mr-1" />
                  ) : (
                    <Plus size={10} className="mr-1" />
                  )}
                  Upload
                </Button>
              </>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="text-indigo-500" />
          <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Berkas Kepegawaian & Sertifikasi Guru
          </h4>
        </div>
        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-lg">
          {docs.length} berkas terupload
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : mode === 'full' ? (
        /* Full: 2-panel list + viewer */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left panel: Kategori slots */}
          <div className="lg:col-span-6 space-y-4 max-h-[600px] overflow-y-auto pr-1">
            <div className="space-y-2.5">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-1">Slot Berkas Wajib</p>
              {WAJIB_CATEGORIES.map(renderSlot)}
            </div>

            {/* Other files / Berkas Lain-lain */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center pl-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Berkas Lain-Lain</p>
                {canEdit && !showOtherUpload && (
                  <button
                    onClick={() => setShowOtherUpload(true)}
                    className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase flex items-center gap-1"
                  >
                    <Plus size={10} /> Tambah
                  </button>
                )}
              </div>

              {/* Form upload berkas lainnya */}
              {showOtherUpload && (
                <form onSubmit={handleUploadOther} className="p-3 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/10 dark:border-indigo-900/40 dark:bg-indigo-950/10 space-y-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Judul Berkas</label>
                    <input
                      value={otherJudul}
                      onChange={e => setOtherJudul(e.target.value)}
                      placeholder="cth. Sertifikat Seminar IT"
                      className="w-full h-8 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">File (PDF/JPG/PNG/WEBP)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setOtherFile(file);
                          if (!otherJudul) setOtherJudul(file.name.replace(/\.[^.]+$/, ''));
                        }
                      }}
                      className="w-full text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button type="button" variant="outline" size="xs" onClick={() => setShowOtherUpload(false)} disabled={otherLoading}>Batal</Button>
                    <Button type="submit" size="xs" disabled={!otherFile || otherLoading}>
                      {otherLoading ? 'Mengupload...' : 'Simpan'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Render berkas lainnya */}
              {otherDocs.length === 0 ? (
                <p className="text-[10px] text-gray-400 font-medium italic pl-1">Tidak ada berkas tambahan.</p>
              ) : (
                <div className="space-y-2">
                  {otherDocs.map(doc => (
                    <div key={doc.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/20 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <FileText size={12} className="text-indigo-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{doc.judul}</p>
                          <p className="text-[9px] text-gray-400 truncate font-medium">
                            {doc.file_original_name} ({formatBytes(doc.size_bytes)})
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className={cn(
                            "p-1.5 rounded-lg border",
                            selectedDoc?.id === doc.id
                              ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/30"
                              : "bg-white text-slate-500 border-slate-100 dark:bg-slate-800"
                          )}
                        >
                          <Eye size={10} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleDelete(doc)}
                            className="p-1.5 rounded-lg bg-white text-slate-500 border border-slate-100 hover:text-rose-600 hover:border-rose-100 dark:bg-slate-800 dark:border-slate-800"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: built-in Previewer */}
          <div className="lg:col-span-6 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 min-h-[500px] flex flex-col bg-slate-50/20 dark:bg-slate-900/10">
            <MemberDocsViewer
              doc={selectedDoc}
              entityType="GURU"
              entityId={guruId}
              entityName={guruName}
              className="flex-1"
            />
          </div>
        </div>
      ) : (
        /* Compact layout: list only slots */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {WAJIB_CATEGORIES.map(renderSlot)}
        </div>
      )}
    </div>
  );
});

export default GuruDocsPanel;
