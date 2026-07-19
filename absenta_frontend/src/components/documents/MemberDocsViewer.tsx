import React, { useState, useCallback } from 'react';
import {
  FileText, Image as ImageIcon, Download, ExternalLink,
  MessageSquare, X, AlertCircle, ZoomIn, ZoomOut,
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
  doc, entityType, entityId, entityName, className,
}) => {
  const [zoom,          setZoom]          = useState(1);
  const [rescanOpen,    setRescanOpen]    = useState(false);
  const [previewError,  setPreviewError]  = useState(false);

  const previewUrlRaw = doc ? getMemberDocPreviewUrl(entityType, entityId, doc.id) : null;
  const token         = localStorage.getItem('access_token');
  const previewUrl    = previewUrlRaw && token ? `${previewUrlRaw}?token=${encodeURIComponent(token)}` : previewUrlRaw;

  const isPdf        = doc?.mime_type === 'application/pdf';
  const isImage      = doc?.mime_type.startsWith('image/') ?? false;
  const kategoriLabel = doc ? (KATEGORI_LABELS[doc.kategori as MemberDocKategori] ?? doc.kategori) : '';

  const handleDownload = useCallback(() => {
    if (!previewUrlRaw) return;
    const tok = localStorage.getItem('access_token');
    const dlUrl = tok ? `${previewUrlRaw}?token=${encodeURIComponent(tok)}` : previewUrlRaw;
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = doc?.file_original_name ?? 'berkas';
    a.click();
  }, [previewUrlRaw, doc]);

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
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0">
              {isImage
                ? <ImageIcon size={18} className="text-indigo-500" />
                : <FileText  size={18} className="text-indigo-500" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{doc.judul}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {kategoriLabel} · {formatBytes(doc.size_bytes)}
              </p>
              {entityName && (
                <p className="text-[10px] text-indigo-500 font-bold mt-0.5">{entityName}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={handleDownload}
              title="Unduh berkas"
              className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
            >
              <Download size={13} />
            </button>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka di tab baru"
                className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
              >
                <ExternalLink size={13} />
              </a>
            )}
            <button
              onClick={() => setRescanOpen(true)}
              title="Minta rescan via WA"
              className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all"
            >
              <MessageSquare size={13} />
            </button>
          </div>
        </div>

        {/* ── Preview area ────────────────────────────────────────────────── */}
        <div className="flex-1 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 relative min-h-[300px]">

          {isPdf && previewUrl && (
            <iframe
              src={previewUrl}
              title={doc.judul}
              className="w-full h-full min-h-[400px] border-0"
              onError={() => setPreviewError(true)}
            />
          )}

          {isImage && previewUrl && !previewError && (
            <div className="relative w-full h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={previewUrl}
                alt={doc.judul}
                className="max-w-full max-h-full object-contain transition-transform duration-200 rounded-lg"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                onError={() => setPreviewError(true)}
              />
              {/* Zoom controls */}
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                <button
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  <ZoomOut size={12} />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="px-2 h-7 rounded-lg bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-600"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  <ZoomIn size={12} />
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

        {/* ── Footer: tanggal upload ──────────────────────────────────────── */}
        <p className="text-[9px] text-gray-400 font-bold mt-3 shrink-0">
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
