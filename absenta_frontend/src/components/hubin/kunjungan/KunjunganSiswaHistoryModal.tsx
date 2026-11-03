import React, { useState } from 'react';
import {
  History,
  Calendar,
  Building2,
  MapPin,
  Plus,
  Printer,
  X,
  Pencil,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Camera,
  User,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, Badge } from '@/components/ui';
import { resolveAttachmentUrl, getDriveThumbnailUrl } from '@/utils/hubinUtils';
import type { SiswaTargetItem, KunjunganItemDetail } from './types';

export interface KunjunganSiswaHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: SiswaTargetItem | null;
  visits: KunjunganItemDetail[];
  readOnly?: boolean;
  onRecordVisit?: (target: SiswaTargetItem) => void;
  onEditVisit?: (item: KunjunganItemDetail) => void;
  onDeleteVisit?: (item: KunjunganItemDetail) => void;
  onPrint?: (target: SiswaTargetItem) => void;
}

export const KunjunganSiswaHistoryModal: React.FC<KunjunganSiswaHistoryModalProps> = React.memo(({
  isOpen,
  onClose,
  target,
  visits,
  readOnly = false,
  onRecordVisit,
  onEditVisit,
  onDeleteVisit,
  onPrint,
}) => {
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  if (!target) return null;

  // Urutkan kunjungan dari yang terbaru ke terlama
  const sortedVisits = [...visits].sort((a, b) => {
    return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      contentClassName="p-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
    >
      {/* 1. Modal Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs border border-indigo-100 dark:border-indigo-900/40">
            <History size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                Riwayat Supervisi DU/DI
              </h2>
              <Badge variant="indigo" className="text-[10px] font-black px-1.5 py-0">
                {target.visitsCount} Kunjungan
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              <span className="font-bold text-slate-700 dark:text-slate-300">{target.nama_siswa}</span>
              {' • NIS: '}{target.nis}
              {' • '}{target.kelas}
            </p>
          </div>
        </div>

        {/* Action Header: Cetak & Tutup */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {onPrint && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onPrint(target)}
              className="text-xs font-bold rounded-xl h-9 px-3 gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Cetak Lembar Monitoring Siswa Ini"
            >
              <Printer size={14} className="text-indigo-500" />
              <span className="hidden sm:inline">Cetak Lembar</span>
            </Button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. Compact Student & Mitra Info Strip */}
      <div className="px-4 sm:px-5 py-3 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100/60 dark:border-indigo-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 truncate block">
              {target.nama_mitra}
            </span>
            {target.alamat_mitra && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                {target.alamat_mitra}
              </span>
            )}
          </div>
        </div>

        {!readOnly && onRecordVisit && (
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => {
              onClose();
              onRecordVisit(target);
            }}
            className="text-xs font-bold rounded-xl h-8 px-3 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Catat Supervisi Baru</span>
          </Button>
        )}
      </div>

      {/* 3. Modal Body: List of Visits / Timeline */}
      <div className="p-4 sm:p-5 max-h-[65vh] sm:max-h-[70vh] overflow-y-auto space-y-3.5 no-scrollbar">
        {sortedVisits.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <AlertCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2.5" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Belum Ada Catatan Supervisi
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              Siswa ini belum memiliki catatan monitoring atau supervisi berkala di tempat DU/DI.
            </p>
            {!readOnly && onRecordVisit && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => {
                  onClose();
                  onRecordVisit(target);
                }}
                className="mt-4 text-xs font-bold rounded-xl h-8 px-3.5 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus size={14} />
                <span>Catat Supervisi Sekarang</span>
              </Button>
            )}
          </div>
        ) : (
          sortedVisits.map((visit, idx) => {
            const formattedDate = (() => {
              try {
                return new Date(visit.tanggal).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
              } catch {
                return visit.tanggal;
              }
            })();

            const hasGps =
              visit.latitude !== undefined &&
              visit.longitude !== undefined &&
              visit.latitude !== 0;
            const mapsUrl = hasGps
              ? `https://www.google.com/maps/search/?api=1&query=${visit.latitude},${visit.longitude}`
              : null;

            const photoPreview = visit.foto_url
              ? resolveAttachmentUrl(visit.foto_url)
              : null;
            const thumbnail = photoPreview
              ? getDriveThumbnailUrl(photoPreview) || photoPreview
              : null;

            // Hitung nomor sesi (1, 2, ...) berdasarkan urutan kronologis
            const sessionNumber = sortedVisits.length - idx;

            return (
              <div
                key={visit.id || `visit-${idx}`}
                className="bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3 transition-all hover:border-indigo-300 dark:hover:border-indigo-700"
              >
                {/* Header Visit Item */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                      Sesi #{sessionNumber}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{formattedDate}</span>
                    </span>
                    {hasGps && (
                      <a
                        href={mapsUrl!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40"
                        title="Lihat titik lokasi di Google Maps"
                      >
                        <MapPin size={10} />
                        <span>GPS Terverifikasi</span>
                      </a>
                    )}
                  </div>

                  {/* Actions per item (Edit, Hapus) */}
                  {!readOnly && (
                    <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                      {onEditVisit && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEditVisit(visit);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title="Edit Catatan Supervisi"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {onDeleteVisit && (
                        <button
                          type="button"
                          onClick={() => onDeleteVisit(visit)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                          title="Hapus Catatan Supervisi"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Catatan Observasi Guru */}
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5 text-[11px] uppercase tracking-wider text-slate-400">
                    Catatan Observasi Guru Pembimbing:
                  </span>
                  <p className="whitespace-pre-wrap">{visit.catatan || 'Tidak ada catatan observasi.'}</p>
                </div>

                {/* Catatan / Feedback Mitra DU/DI jika ada */}
                {visit.catatan_dudi && (
                  <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed bg-indigo-50/50 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                    <span className="font-bold block mb-0.5 text-[11px] uppercase tracking-wider text-indigo-500">
                      Umpan Balik / Catatan Mentor DU/DI:
                    </span>
                    <p className="whitespace-pre-wrap">{visit.catatan_dudi}</p>
                  </div>
                )}

                {/* Foto Dokumentasi */}
                {thumbnail && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(photoPreview || thumbnail)}
                      className="group relative inline-flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 transition-all cursor-pointer"
                      title="Klik untuk memperbesar foto dokumentasi"
                    >
                      <img
                        src={thumbnail}
                        alt="Bukti Supervisi"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-all"
                      />
                      <div className="text-left pr-2">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Camera size={12} className="text-indigo-500" />
                          <span>Foto Bukti Supervisi</span>
                        </span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 group-hover:underline block mt-0.5">
                          Klik untuk memperbesar 🔍
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Modal Footer */}
      <div className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="text-[11px] font-semibold text-slate-400">
          Total {sortedVisits.length} sesi supervisi tercatat
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onClose}
          className="rounded-xl h-8 px-4 font-bold text-xs"
        >
          Tutup
        </Button>
      </div>

      {/* 5. Lightbox Preview Foto Besar */}
      {previewPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-xl max-h-[85vh] bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all cursor-pointer z-10"
              title="Tutup foto"
            >
              <X size={16} />
            </button>
            <img
              src={previewPhoto}
              alt="Bukti Supervisi Penuh"
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </Modal>
  );
});

KunjunganSiswaHistoryModal.displayName = 'KunjunganSiswaHistoryModal';
