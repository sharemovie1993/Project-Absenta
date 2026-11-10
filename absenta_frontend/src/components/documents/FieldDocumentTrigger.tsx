/**
 * FieldDocumentTrigger.tsx
 * Komponen pemicu upload & pratinjau dokumen pendukung yang terikat langsung di samping field formulir.
 * Menghubungkan langsung bukti dokumen fisik/digital (KK, Akta Lahir, KTP, NISN, Ijazah)
 * ke data rill siswa & guru demi validasi terpadu dan rekonsiliasi Dapodik.
 */

import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Eye, CheckCircle2, FileText, Loader2, Paperclip, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  listSiswaDocuments,
  listGuruDocuments,
  uploadSiswaDocument,
  uploadGuruDocument,
  getMemberDocPreviewUrl,
  type MemberDoc,
  type MemberDocEntityType,
  type MemberDocKategori,
} from '@/api/memberDocs.api';
import { MemberDocsViewer } from '@/components/documents/MemberDocsViewer';

export interface FieldDocumentTriggerProps {
  entityType: MemberDocEntityType;
  entityId?: string;
  entityName?: string;
  kategori: MemberDocKategori;
  label: string; // e.g. "KK", "Akta", "KTP", "NISN"
  disabled?: boolean;
  className?: string;
}

export const FieldDocumentTrigger: React.FC<FieldDocumentTriggerProps> = ({
  entityType,
  entityId,
  entityName,
  kategori,
  label,
  disabled = false,
  className = '',
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Ambil daftar dokumen entitas
  const { data: docsData, isLoading } = useQuery({
    queryKey: ['member-docs', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return { data: [] };
      if (entityType === 'SISWA') {
        return await listSiswaDocuments(entityId);
      } else {
        return await listGuruDocuments(entityId);
      }
    },
    enabled: Boolean(entityId),
    staleTime: 60 * 1000,
  });

  const matchingDoc: MemberDoc | undefined = (docsData?.data || []).find(
    (d: MemberDoc) => d.kategori?.toUpperCase() === kategori.toUpperCase()
  );

  const handleTriggerUpload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!entityId) {
      toast.error(`Simpan data ${entityType === 'SISWA' ? 'siswa' : 'guru'} terlebih dahulu sebelum mengunggah dokumen.`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entityId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10MB.');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Mengunggah berkas ${label}...`);

    try {
      if (entityType === 'SISWA') {
        await uploadSiswaDocument({
          siswaId: entityId,
          file,
          judul: `${label} - ${entityName || 'Siswa'}`,
          kategori,
        });
      } else {
        await uploadGuruDocument({
          guruId: entityId,
          file,
          judul: `${label} - ${entityName || 'Guru'}`,
          kategori,
        });
      }

      toast.success(`Berkas ${label} berhasil diunggah!`, { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['member-docs', entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ['dapodik-student-comparison'] });
    } catch (err: any) {
      toast.error(err?.message || `Gagal mengunggah berkas ${label}`, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenViewer = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (matchingDoc) {
      setIsViewerOpen(true);
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />

      {isLoading ? (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 animate-pulse">
          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Cek {label}...
        </span>
      ) : matchingDoc ? (
        <div className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-md px-1.5 py-0.5 shadow-2xs">
          <button
            type="button"
            onClick={handleOpenViewer}
            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 cursor-pointer transition-colors"
            title={`Klik untuk pratinjau dokumen ${matchingDoc.file_original_name}`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Lihat {label}</span>
          </button>
          {!disabled && (
            <button
              type="button"
              onClick={handleTriggerUpload}
              disabled={isUploading}
              className="text-[10px] text-emerald-600/70 hover:text-emerald-800 dark:text-emerald-400/70 dark:hover:text-emerald-200 pl-1 border-l border-emerald-200 dark:border-emerald-800 cursor-pointer"
              title={`Ganti dokumen ${label}`}
            >
              {isUploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Ganti'}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleTriggerUpload}
          disabled={disabled || isUploading}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          title={`Unggah dokumen pendukung ${label} (PDF atau JPG/PNG)`}
        >
          {isUploading ? (
            <Loader2 className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400" />
          ) : (
            <Upload className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          )}
          <span>Unggah {label}</span>
        </button>
      )}

      {/* Viewer Modal */}
      {isViewerOpen && matchingDoc && entityId && (
        <MemberDocsViewer
          doc={matchingDoc}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </div>
  );
};
