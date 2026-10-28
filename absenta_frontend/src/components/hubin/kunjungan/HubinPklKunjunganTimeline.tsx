import React from 'react';
import { History, Printer, MapPin, Pencil, Trash2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { Timeline, TimelineItem } from '../../ui';
import { getDriveThumbnailUrl, resolveAttachmentUrl } from '../../../utils/hubinUtils';

export interface KunjunganItem {
  id?: string;
  tanggal?: string;
  catatan: string;
  catatan_dudi?: string;
  foto_url?: string;
  latitude?: string | number;
  longitude?: string | number;
  jurnal_verified?: boolean;
}

export interface HubinPklKunjunganTimelineProps {
  kunjunganList: KunjunganItem[];
  editingKunjungan: { k: KunjunganItem; index: number } | null;
  onStartEdit: (k: KunjunganItem, index: number) => void;
  onDeleteItem: (k: KunjunganItem, index: number) => void;
  onPrintMonitoring?: () => void;
  getCycleLabel: (index: number) => string;
  requireJournal?: boolean;
  requirePhoto?: boolean;
}

export const HubinPklKunjunganTimeline: React.FC<HubinPklKunjunganTimelineProps> = React.memo(({
  kunjunganList,
  editingKunjungan,
  onStartEdit,
  onDeleteItem,
  onPrintMonitoring,
  getCycleLabel,
  requireJournal,
  requirePhoto,
}) => {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 min-w-0">
          <History size={15} className="text-indigo-500 shrink-0" />
          <span className="text-xs font-extrabold uppercase tracking-wider truncate">Riwayat Kunjungan</span>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100/60 dark:border-indigo-900/40 shrink-0">
            {kunjunganList.length}
          </span>
        </div>
        {onPrintMonitoring && (
          <button
            type="button"
            onClick={onPrintMonitoring}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs shrink-0"
            title="Cetak Lembar Monitoring Kunjungan (PDF)"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">Cetak Lembar Monitoring</span>
            <span className="sm:hidden">Cetak</span>
          </button>
        )}
      </div>

      {kunjunganList.length === 0 ? (
        <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2.5">
            <MapPin size={22} className="text-slate-400" />
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum Ada Catatan Kunjungan</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
            Gunakan formulir laporan untuk mendokumentasikan kunjungan monitoring pertama Anda sesuai tahapan siklus Hubin.
          </p>
        </div>
      ) : (
        <div className="max-h-[480px] overflow-y-auto pr-2 space-y-2">
          <Timeline>
            {kunjunganList.map((k, index) => {
              const isBeingEdited = editingKunjungan?.index === index;
              const cycleTitle = getCycleLabel(index);

              return (
                <TimelineItem
                  key={k.id || index}
                  title={cycleTitle.toUpperCase()}
                  time={k.tanggal ? format(new Date(k.tanggal), 'd MMMM yyyy, HH:mm', { locale: localeID }) : '-'}
                  status={isBeingEdited ? 'success' : 'warning'}
                  content={(
                    <div
                      className={`space-y-2.5 mt-1.5 p-3.5 rounded-xl border transition-all ${
                        isBeingEdited
                          ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/80 shadow-xs ring-2 ring-amber-400/30'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {isBeingEdited ? 'Sedang Diedit' : `Log Kunjungan #${index + 1}`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onStartEdit(k, index)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs ${
                              isBeingEdited
                                ? 'bg-amber-600 text-white border border-amber-600'
                                : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/70 dark:border-amber-800/60'
                            }`}
                            title="Edit laporan kunjungan ini"
                          >
                            <Pencil size={11} />
                            <span>{isBeingEdited ? 'Mengedit...' : 'Edit'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(k, index)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/70 dark:border-rose-800/60 transition-all cursor-pointer shadow-2xs"
                            title="Hapus kunjungan ini"
                          >
                            <Trash2 size={11} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {k.catatan}
                      </p>

                      {k.catatan_dudi && (
                        <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                            Catatan / Masukan DU/DI:
                          </p>
                          <p className="text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed italic whitespace-pre-wrap">
                            "{k.catatan_dudi}"
                          </p>
                        </div>
                      )}

                      {/* Status Verifikasi Jurnal PKL Siswa */}
                      {requireJournal && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 w-fit">
                          <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                          <span>Jurnal PKL Siswa Terverifikasi Pembimbing</span>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                        {k.foto_url && (() => {
                          const resolvedUrl = resolveAttachmentUrl(k.foto_url);
                          const driveThumb = getDriveThumbnailUrl(k.foto_url);
                          const displayThumb = driveThumb || resolvedUrl;
                          return (
                            <div className="flex items-center gap-2.5">
                              <a
                                href={resolvedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-16 h-16 sm:w-20 sm:h-20 relative group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:ring-2 hover:ring-indigo-600 transition-all shrink-0 bg-slate-100 dark:bg-slate-800"
                                title="Klik untuk melihat foto ukuran penuh"
                              >
                                <img
                                  src={displayThumb}
                                  alt="Dokumentasi Kunjungan"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                  <ExternalLink size={13} />
                                  <span>Lihat</span>
                                </div>
                              </a>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                <p className="font-semibold text-slate-700 dark:text-slate-200">Foto Dokumentasi</p>
                                <p className="text-[10px] text-slate-400">Terverifikasi sesuai aturan Hubin</p>
                              </div>
                            </div>
                          );
                        })()}

                        {requirePhoto && !k.foto_url && (
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 italic">
                            * Belum melampirkan foto dokumentasi lapangan (Wajib Kebijakan Hubin).
                          </p>
                        )}

                        {(k.latitude || k.longitude) && (
                          <a
                            href={`https://maps.google.com/maps?q=${k.latitude},${k.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800 transition-colors w-fit"
                            title="Buka lokasi di Google Maps"
                          >
                            <MapPin size={11} className="text-amber-500 shrink-0" />
                            <span>
                              {k.latitude || '-'}, {k.longitude || '-'}
                            </span>
                            <ExternalLink size={9} className="text-slate-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                />
              );
            })}
          </Timeline>
        </div>
      )}
    </div>
  );
});

export default HubinPklKunjunganTimeline;
