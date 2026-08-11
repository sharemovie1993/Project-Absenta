import React, { useState, useCallback, useEffect } from 'react';
import {
  FileText, Image as ImageIcon, Download, ExternalLink,
  MessageSquare, X, AlertCircle, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import {
  formatBytes,
  getMemberDocPreviewUrl,
  KATEGORI_LABELS,
  notifyRescanDoc,
} from '../../api/memberDocs.api';
import type { MemberDoc, MemberDocEntityType, MemberDocKategori } from '../../api/memberDocs.api';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberDocsViewerProps {
  doc: MemberDoc | null;
  entityType: MemberDocEntityType;
  entityId: string;
  entityName?: string;
  onClose?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalDocs?: number;
  className?: string;
}

// ─── Rescan modal ─────────────────────────────────────────────────────────────

interface RescanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pesan: string) => Promise<void>;
  entityName?: string;
  docTitle?: string;
}

const RescanModal: React.FC<RescanModalProps> = ({ isOpen, onClose, onConfirm, entityName, docTitle }) => {
  const [pesan, setPesan] = useState('');
  const [sending, setSending] = useState(false);

  const defaultMsg = `Yth. ${entityName || 'Pemilik Berkas'}, dokumen "${docTitle || 'berkas'}" yang diupload tidak dapat terbaca dengan jelas. Mohon scan ulang dan upload kembali. Terima kasih.`;

  const handleSend = async () => {
    setSending(true);
    try {
      await onConfirm(pesan || defaultMsg);
      onClose();
      setPesan('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Minta Rescan Berkas">
      <div className="space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-2">
          <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
            Notifikasi WhatsApp akan dikirim ke nomor pemilik berkas.
          </p>
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
            Pesan (opsional — kosongkan untuk pakai template default)
          </label>
          <textarea
            value={pesan}
            onChange={(e) => setPesan(e.target.value)}
            placeholder={defaultMsg}
            rows={4}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 font-medium text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>Batal</Button>
          <Button onClick={handleSend} disabled={sending} className="bg-emerald-600 hover:bg-emerald-700">
            {sending ? 'Mengirim...' : '📱 Kirim WA'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main Viewer ──────────────────────────────────────────────────────────────

export const MemberDocsViewer: React.FC<MemberDocsViewerProps> = ({
  doc, entityType, entityId, entityName, onClose, onPrev, onNext, currentIndex, totalDocs, className,
}) => {
  const [zoom,          setZoom]          = useState(1);
  const [rescanOpen,    setRescanOpen]    = useState(false);
  const [previewError,  setPreviewError]  = useState(false);

  useEffect(() => {
    setPreviewError(false);
    setZoom(1);
  }, [doc?.id]);

  const previewUrl = doc ? getMemberDocPreviewUrl(entityType, entityId, doc.id) : null;

  const isPdf        = doc?.mime_type === 'application/pdf';
  const isImage      = doc?.mime_type?.startsWith('image/') ?? false;
  const kategoriLabel = doc ? (KATEGORI_LABELS[doc.kategori as MemberDocKategori] ?? doc.kategori) : '';

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext]);

  const handleDownload = useCallback(() => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = doc?.file_original_name ?? 'berkas';
    a.click();
  }, [previewUrl, doc]);

  const handleRescanConfirm = useCallback(async (pesan: string) => {
    if (!doc) return;
    try {
      await notifyRescanDoc({ entityType, entityId, docId: doc.id, pesan });
      toast.success(`Notifikasi WhatsApp terkirim ke ${entityName ?? 'pemilik berkas'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim notifikasi';
      toast.error(msg);
      throw err;
    }
  }, [doc, entityType, entityId, entityName]);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!doc) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-3 p-8', className)}>
        <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <FileText size={28} className="text-slate-200 dark:text-slate-700" />
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Berkas</p>
        <p className="text-xs text-gray-400 max-w-[200px]">
          Klik salah satu berkas di daftar untuk melihat preview-nya di sini.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={cn('flex flex-col h-full', className)}>

        {/* ── Header info ────────────────────────────────────────────────── */}
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-3 shrink-0 space-y-2.5">
          {/* Top Row: Full Title & Category Label */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0 mt-0.5">
                {isImage
                  ? <ImageIcon size={18} className="text-indigo-500" />
                  : <FileText  size={18} className="text-indigo-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-snug break-words">
                  {doc.judul}
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {kategoriLabel} · {formatBytes(doc.size_bytes)} {entityName ? `· ${entityName}` : ''}
                </p>
              </div>
            </div>

            {/* Close Button (X) */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Tutup preview"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all shrink-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Sub Row: Action Icons Below Title */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100/60 dark:border-slate-800/60">
            <button
              type="button"
              onClick={handleDownload}
              title="Unduh / Download Berkas"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <Download size={15} />
            </button>

            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka Berkas di Tab Baru"
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              >
                <ExternalLink size={15} />
              </a>
            )}

            <button
              type="button"
              onClick={() => setRescanOpen(true)}
              title="Minta Rescan Berkas via WA"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-600 dark:text-slate-300 hover:text-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <MessageSquare size={15} />
            </button>
          </div>
        </div>

        {/* ── Preview area ────────────────────────────────────────────────── */}
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 relative min-h-[300px] flex flex-col">

          {isPdf && previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full flex-1 min-h-[350px] border-0"
              title={doc.judul}
            />
          )}

          {isImage && previewUrl && (
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto relative group">
              <img
                src={previewUrl}
                alt={doc.judul}
                style={{ transform: `scale(${zoom})` }}
                className="max-h-[500px] w-auto object-contain transition-transform duration-200 rounded-lg shadow-sm"
                onError={() => setPreviewError(true)}
              />
              <div className="absolute bottom-3 right-3 flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-1 rounded-xl shadow border border-slate-200/80 dark:border-slate-700 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-[10px] font-mono font-bold flex items-center px-1 text-slate-500">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Fallback / error */}
          {(previewError || (!isPdf && !isImage)) && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-center p-6">
              <FileText size={32} className="text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Preview tidak tersedia untuk format ini.</p>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download size={12} className="mr-1.5" /> Unduh Berkas
              </Button>
            </div>
          )}
        </div>

        {/* ── Bottom Navigation Control Bar ────────────────────────────────────────── */}
        {totalDocs !== undefined && totalDocs > 1 && (
          <div className="pt-3 flex items-center justify-between gap-2 shrink-0 border-t border-slate-100 dark:border-slate-800/80 mt-3">
            <button
              type="button"
              onClick={onPrev}
              disabled={!onPrev}
              className="h-9 px-3.5 sm:px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <ChevronLeft size={16} />
              <span>Sebelumnya</span>
            </button>

            <div className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs font-extrabold flex items-center gap-1">
              <span>{currentIndex}</span>
              <span className="text-slate-400 font-normal">/</span>
              <span>{totalDocs}</span>
              <span className="text-[10px] text-slate-400 font-sans ml-1 font-semibold hidden sm:inline">Berkas</span>
            </div>

            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              className="h-9 px-3.5 sm:px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>Selanjutnya</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Footer: tanggal upload ──────────────────────────────────────── */}
        <p className="text-[9px] text-gray-400 font-bold mt-2.5 shrink-0">
          Diupload: {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          {doc.file_original_name && ` · ${doc.file_original_name}`}
        </p>
      </div>

      {/* Rescan modal */}
      <RescanModal
        isOpen={rescanOpen}
        onClose={() => setRescanOpen(false)}
        onConfirm={handleRescanConfirm}
        entityName={entityName}
        docTitle={doc.judul}
      />
    </>
  );
};

export default MemberDocsViewer;
