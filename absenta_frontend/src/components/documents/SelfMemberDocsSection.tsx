import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  Plus, 
  FileCheck, 
  X, 
  AlertCircle, 
  Image as ImageIcon, 
  Download,
  FolderOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import useConfirm from '../../hooks/useConfirm';
import { MemberDocsViewer } from './MemberDocsViewer';
import {
  listSiswaDocuments,
  listGuruDocuments,
  uploadSiswaDocument,
  uploadGuruDocument,
  deleteSiswaDocument,
  deleteGuruDocument,
  getMemberDocPreviewUrl,
  formatBytes,
  KATEGORI_LABELS,
  KATEGORI_OPTIONS,
  type MemberDoc,
  type MemberDocEntityType,
  type MemberDocKategori
} from '../../api/memberDocs.api';

interface SelfMemberDocsSectionProps {
  entityType: MemberDocEntityType;
  entityId: string;
  entityName?: string;
  className?: string;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const SelfMemberDocsSection: React.FC<SelfMemberDocsSectionProps> = ({
  entityType,
  entityId,
  entityName = '',
  className
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [selectedDoc, setSelectedDoc] = useState<MemberDoc | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [kategori, setKategori] = useState<string>('KK');
  const [judul, setJudul] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Member Documents
  const { data: docsRes, isLoading, refetch } = useQuery({
    queryKey: ['self-member-docs', entityType, entityId],
    queryFn: () => {
      if (!entityId) return Promise.resolve({ success: true, data: [] });
      return entityType === 'SISWA' 
        ? listSiswaDocuments(entityId) 
        : listGuruDocuments(entityId);
    },
    enabled: !!entityId,
  });

  const docsList: MemberDoc[] = docsRes?.data || [];

  const selectedIndex = selectedDoc ? docsList.findIndex(d => d.id === selectedDoc.id) : -1;
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex !== -1 && selectedIndex < docsList.length - 1;

  const handlePrevDoc = useCallback(() => {
    if (hasPrev) setSelectedDoc(docsList[selectedIndex - 1]);
  }, [hasPrev, docsList, selectedIndex]);

  const handleNextDoc = useCallback(() => {
    if (hasNext) setSelectedDoc(docsList[selectedIndex + 1]);
  }, [hasNext, docsList, selectedIndex]);

  // Auto-fill Judul Berkas when category changes
  React.useEffect(() => {
    if (kategori) {
      const katLabel = KATEGORI_LABELS[kategori as MemberDocKategori] || kategori;
      const ownerLabel = entityName ? ` - ${entityName}` : '';
      setJudul(`${katLabel}${ownerLabel}`);
    }
  }, [kategori, entityName]);

  const validateFile = (f: File): string => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return 'Format file tidak didukung. Gunakan PDF, JPG, PNG, atau WEBP.';
    }
    if (f.size > MAX_BYTES) {
      return `Ukuran file (${formatBytes(f.size)}) melebihi batas maksimum 10 MB.`;
    }
    return '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const err = validateFile(f);
      if (err) {
        setFileError(err);
        setSelectedFile(null);
      } else {
        setFileError('');
        setSelectedFile(f);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      const err = validateFile(f);
      if (err) {
        setFileError(err);
        setSelectedFile(null);
      } else {
        setFileError('');
        setSelectedFile(f);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setFileError('Pilih file berkas yang akan diunggah.');
      return;
    }
    if (!judul.trim()) {
      toast.error('Judul berkas tidak boleh kosong.');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      if (entityType === 'SISWA') {
        await uploadSiswaDocument({
          siswaId: entityId,
          file: selectedFile,
          judul,
          kategori,
          onProgress: (pct) => setProgress(pct),
        });
      } else {
        await uploadGuruDocument({
          guruId: entityId,
          file: selectedFile,
          judul,
          kategori,
          onProgress: (pct) => setProgress(pct),
        });
      }

      toast.success('Berkas berhasil diunggah!');
      setIsModalOpen(false);
      setSelectedFile(null);
      setProgress(0);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah berkas.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: MemberDoc) => {
    const ok = await confirm({
      title: 'Hapus Berkas Digital',
      message: `Apakah Anda yakin ingin menghapus berkas "${doc.judul}"? Data yang dihapus tidak dapat dikembalikan.`,
      confirmText: 'Hapus Berkas',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      if (entityType === 'SISWA') {
        await deleteSiswaDocument(entityId, doc.id);
      } else {
        await deleteGuruDocument(entityId, doc.id);
      }
      toast.success('Berkas berhasil dihapus.');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus berkas.');
    }
  };

  return (
    <div className={cn("p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <FolderOpen size={18} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              BERKAS &amp; DOKUMEN DIGITAL
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              KTP, Kartu Keluarga, Akta, Ijazah, Sertifikat, KIS &amp; Dokumen Resmi
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-9 px-3.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
        >
          <Plus size={15} />
          <span>Upload Berkas</span>
        </Button>
      </div>

      {/* Docs Grid / List */}
      {isLoading ? (
        <div className="py-8 text-center text-slate-400 text-xs font-semibold animate-pulse">
          Memuat berkas digital...
        </div>
      ) : docsList.length === 0 ? (
        <div className="py-8 text-center space-y-2 border-2 border-dashed border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <FileText size={20} />
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum ada berkas digital yang diunggah.</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Unggah Kartu Keluarga, KTP, Ijazah, atau Sertifikat Anda secara aman untuk kelengkapan administrasi instansi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docsList.map((doc) => {
            const isImage = doc.mime_type.startsWith('image/');
            const previewUrl = getMemberDocPreviewUrl(entityType, entityId, doc.id);
            const katLabel = KATEGORI_LABELS[doc.kategori as MemberDocKategori] || doc.kategori;

            return (
              <div
                key={doc.id}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold",
                    isImage ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}>
                    {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-block mb-1">
                      {katLabel}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={doc.judul}>
                      {doc.judul}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatBytes(doc.size_bytes)} • {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc)}
                    className="h-7 px-2.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    title="Lihat / Preview Berkas Dalam Modal"
                  >
                    <Eye size={12} />
                    <span>Lihat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    className="h-7 w-7 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                    title="Hapus Berkas"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-slate-900 dark:text-white relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Upload Berkas Digital</h3>
                  <p className="text-xs text-slate-400">PDF, JPG, PNG, WEBP (Max 10 MB)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Category Selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Kategori Berkas <span className="text-rose-500">*</span>
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {KATEGORI_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Judul Berkas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Kartu Keluarga - Nama Siswa"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Drag and Drop File Picker */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Pilih File <span className="text-rose-500">*</span>
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "p-5 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2",
                    isDragging
                      ? "border-emerald-500 bg-emerald-500/10"
                      : selectedFile
                        ? "border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-950/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50 dark:bg-slate-800/60"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <FileCheck size={20} />
                      <span className="truncate max-w-[240px]">{selectedFile.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({formatBytes(selectedFile.size)})</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} className="text-slate-400" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Klik untuk memilih file atau seret file ke sini
                      </p>
                      <p className="text-[10px] text-slate-400">PDF, JPG, PNG, WEBP (Maksimal 10 MB)</p>
                    </>
                  )}
                </div>

                {fileError && (
                  <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={13} />
                    <span>{fileError}</span>
                  </p>
                )}
              </div>

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500">
                    <span>Mengunggah...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-10 rounded-xl text-xs font-extrabold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="flex-1 h-10 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/20"
                >
                  {uploading ? 'Mengunggah...' : 'Simpan Berkas'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Document Viewer Lightbox Modal Overlay */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl h-[90vh] p-5 shadow-2xl flex flex-col my-auto relative">
            <MemberDocsViewer
              doc={selectedDoc}
              entityType={entityType}
              entityId={entityId}
              entityName={entityName}
              onClose={() => setSelectedDoc(null)}
              onPrev={hasPrev ? handlePrevDoc : undefined}
              onNext={hasNext ? handleNextDoc : undefined}
              currentIndex={selectedIndex >= 0 ? selectedIndex + 1 : undefined}
              totalDocs={docsList.length}
            />
          </div>
        </div>
      )}
    </div>
  );
};
