import React, { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FileText, Presentation } from 'lucide-react';
import { Modal, Button, SearchableSelect } from '../../ui';
import { z } from 'zod';
import { cn, resolveProfilePhotoUrl } from '../../../lib/utils';

export const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  catatan_reviewer: z.string().optional()
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

interface PerangkatAjarReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewingItem?: any;
  reviewForm: {
    status: 'APPROVED' | 'REJECTED';
    catatan_reviewer: string;
  };
  setReviewForm: React.Dispatch<React.SetStateAction<{
    status: 'APPROVED' | 'REJECTED';
    catatan_reviewer: string;
  }>>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function getExtUpper(fileUrl?: string): string {
  const clean = String(fileUrl || '').split('?')[0].toLowerCase();
  const match = clean.match(/\.([a-z0-9]+)$/);
  return (match?.[1] || 'FILE').toUpperCase();
}

export default React.memo(function PerangkatAjarReviewModal({
  isOpen,
  onClose,
  reviewingItem,
  reviewForm,
  setReviewForm,
  isSubmitting,
  onSubmit,
}: PerangkatAjarReviewModalProps) {
  const isPublicOrigin = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return (
      !['localhost', '127.0.0.1'].includes(host) &&
      !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
    );
  }, []);

  const [useOfficeViewer, setUseOfficeViewer] = useState<boolean>(isPublicOrigin);

  useEffect(() => {
    if (isOpen) {
      setUseOfficeViewer(isPublicOrigin);
    }
  }, [isOpen, reviewingItem?.id, isPublicOrigin]);

  const fileUrl = reviewingItem?.file_url || '';
  const ext = getExtUpper(fileUrl);
  const isOriginalPdf = ext === 'PDF';
  const isOfficeFile = ['PPT', 'PPTX', 'DOC', 'DOCX', 'XLS', 'XLSX'].includes(ext);
  const previewPdfUrl = reviewingItem?.preview_pdf_url || (isOriginalPdf ? fileUrl : null);
  const hasLivePreview = Boolean(fileUrl);

  const iframeSrc = useMemo(() => {
    if (!fileUrl) return null;
    if (useOfficeViewer && isOfficeFile && typeof window !== 'undefined') {
      const resolved = resolveProfilePhotoUrl(fileUrl) || fileUrl;
      const absUrl = new URL(resolved, window.location.origin).toString();
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absUrl)}`;
    }
    if (previewPdfUrl) {
      return resolveProfilePhotoUrl(previewPdfUrl) || previewPdfUrl;
    }
    return null;
  }, [fileUrl, useOfficeViewer, isOfficeFile, previewPdfUrl]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verifikasi & Baca Langsung Perangkat Ajar"
      size={hasLivePreview ? 'full' : 'md'}
      className={hasLivePreview ? 'h-[94vh] max-h-[94vh] flex flex-col' : undefined}
    >
      <div className={cn(
        hasLivePreview ? 'grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden' : ''
      )}>
        {/* KIRI: LIVE DOCUMENT READER */}
        {hasLivePreview && (
          <div className="lg:col-span-8 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 min-h-[360px]">
            <div className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {reviewingItem?.jenis || 'MODUL'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                    Asli: {ext}
                  </span>
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {reviewingItem?.judul || 'Dokumen Perangkat Ajar'}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Guru: {reviewingItem?.Guru?.nama_guru || '-'} • Mapel: {reviewingItem?.Mapel?.nama_mapel || '-'}
                  {reviewingItem?.fase ? ` • Fase ${reviewingItem.fase}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {isOfficeFile && isPublicOrigin && (
                  <button
                    type="button"
                    onClick={() => setUseOfficeViewer((prev) => !prev)}
                    className={cn(
                      'h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1 border cursor-pointer transition-colors',
                      useOfficeViewer
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300'
                    )}
                  >
                    <Presentation size={13} />
                    <span>{useOfficeViewer ? 'Kembali ke PDF' : 'Office Viewer'}</span>
                  </button>
                )}
                {!isOriginalPdf && (
                  <a
                    href={resolveProfilePhotoUrl(fileUrl) || fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="h-8 px-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                  >
                    <Download size={13} />
                    <span>Unduh Asli</span>
                  </a>
                )}
                {previewPdfUrl && (
                  <a
                    href={resolveProfilePhotoUrl(previewPdfUrl) || previewPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                  >
                    <ExternalLink size={13} />
                    <span>Tab Baru</span>
                  </a>
                )}
              </div>
            </div>

            {iframeSrc ? (
              <iframe
                key={`${reviewingItem?.id}-${useOfficeViewer ? 'office' : 'pdf'}`}
                src={iframeSrc}
                title={reviewingItem?.judul || 'Pratinjau Perangkat Ajar'}
                className="w-full flex-1 border-0 bg-white"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-400" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Pratinjau belum tersedia di mode lokal. Silakan unduh berkas untuk memeriksa isi dokumen.
                </p>
                <a
                  href={resolveProfilePhotoUrl(fileUrl) || fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="h-9 px-4 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Unduh Dokumen</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* KANAN: PANEL VERIFIKASI KURIKULUM */}
        <form
          onSubmit={onSubmit}
          className={cn(
            'space-y-4 flex flex-col justify-between',
            hasLivePreview ? 'lg:col-span-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto' : ''
          )}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="review-status" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status Persetujuan <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                id="review-status"
                value={reviewForm.status}
                onValueChange={(val) => setReviewForm((prev) => ({ ...prev, status: val as 'APPROVED' | 'REJECTED' }))}
                options={[
                  { label: 'Disetujui (APPROVED)', value: 'APPROVED' },
                  { label: 'Perlu Revisi (REJECTED)', value: 'REJECTED' }
                ]}
              />
            </div>

            <div>
              <label htmlFor="catatan-reviewer" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Verifikator / Masukan Revisi
              </label>
              <textarea
                id="catatan-reviewer"
                rows={hasLivePreview ? 6 : 3}
                value={reviewForm.catatan_reviewer}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, catatan_reviewer: e.target.value }))}
                placeholder="Berikan catatan perbaikan atau rekomendasi untuk guru..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl font-bold">
              BATAL
            </Button>
            <Button
              type="submit"
              variant="toolbarPrimary"
              disabled={isSubmitting}
              className="rounded-xl font-bold"
            >
              {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN VERIFIKASI'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
});
