import React from 'react';
import {
  MessageSquare,
  Plus,
  Eye,
  Edit2,
  Users,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CbtBankSoal } from '@/types/cbt.types';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { AuditedTargetItem, formatNudgeMinutesAgo } from './cbtMgmpHelper';
import { useIsMobile } from '@/hooks/useIsMobile';

interface CbtReadinessTeacherTableProps {
  items: AuditedTargetItem[];
  mode: 'BELUM' | 'SUDAH';
  onNudgeWhatsApp: (target: AuditedTargetItem) => void;
  onCreateForTarget: (target: AuditedTargetItem) => void;
  onPeriksaButir: (bank: CbtBankSoal) => void;
  onEditBank: (bank: CbtBankSoal) => void;
}

export const CbtReadinessTeacherTable: React.FC<CbtReadinessTeacherTableProps> = ({
  items,
  mode,
  onNudgeWhatsApp,
  onCreateForTarget,
  onPeriksaButir,
  onEditBank,
}) => {
  const isMobile = useIsMobile(768);

  if (items.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
        {mode === 'BELUM'
          ? '🎉 Luar biasa! Tidak ada guru yang belum membuat soal pada filter ini.'
          : 'Belum ada data bank soal yang siap pada filter ini.'}
      </div>
    );
  }

  // ── Mode Mobile: High-Density Card Deck (Pilar 30 Anti-Overlapping) ──
  if (isMobile) {
    return (
      <div className="space-y-2.5 w-full max-w-full min-w-0" role="region" aria-label={`Daftar Guru ${mode === 'BELUM' ? 'Belum Buat' : 'Sudah Siap'} Seluler`}>
        {items.map((target, idx) => {
          const isReady = target.status === 'READY';
          const isCovered = Boolean(target.isCoveredByMaster);
          const isUncreated = target.status === 'UNCREATED';
          const phone = target.no_hp || target.assignedTeachers[0]?.no_hp;
          const hasNudged = Boolean(target.nudgeMeta?.sent_at);
          const nudgeTimeAgo = hasNudged ? formatNudgeMinutesAgo(target.nudgeMeta?.sent_at) : null;

          return (
            <div
              key={target.id}
              className={cn(
                'p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-2.5',
                mode === 'BELUM' ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-emerald-500'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Tingkat {formatTingkatRomawi(target.tingkat)}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-1 leading-snug">
                    {target.nama_guru}
                  </h4>
                  {phone ? (
                    <a
                      href={`tel:${phone}`}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium flex items-center gap-1 mt-0.5"
                    >
                      <Phone size={10} />
                      <span>{phone}</span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic mt-0.5 block">
                      (No. WA belum terdaftar)
                    </span>
                  )}
                </div>

                <div className="shrink-0">
                  {isReady ? (
                    isCovered ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <Users size={11} />
                        <span>Shared MGMP</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={11} />
                        <span>{target.soalCount} Soal</span>
                      </span>
                    )
                  ) : isUncreated ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                      <AlertCircle size={11} />
                      <span>Belum Buat</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                      <FileQuestion size={11} />
                      <span>0 Soal</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {target.nama_mapel}
              </div>

              {isCovered && target.masterAuthorName && (
                <div className="text-[10px] text-slate-400">
                  Master: {target.masterAuthorName} ({target.soalCount} Soal)
                </div>
              )}

              {/* Mobile Actions Toolbar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                {!isReady ? (
                  <>
                    {hasNudged ? (
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center gap-1 py-1 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[10px] font-bold">
                          <CheckCircle2 size={11} className="text-amber-600 dark:text-amber-400" />
                          <span>Di-WA ({nudgeTimeAgo})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onNudgeWhatsApp(target)}
                          aria-label={`Colek ulang WA ${target.nama_guru}`}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800"
                        >
                          <MessageSquare size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNudgeWhatsApp(target)}
                        aria-label={`Colek WhatsApp ${target.nama_guru}`}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        <span>Colek WA</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (target.bankSoal) {
                          onPeriksaButir(target.bankSoal);
                        } else {
                          onCreateForTarget(target);
                        }
                      }}
                      aria-label={`Tindakan untuk ${target.nama_guru}`}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <Plus size={13} />
                      <span>{target.bankSoal ? 'Isi Butir' : '+ Buatkan'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (target.bankSoal) onPeriksaButir(target.bankSoal);
                      }}
                      aria-label={`Periksa soal ${target.nama_mapel}`}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Periksa Soal</span>
                    </button>

                    {target.bankSoal && !isCovered && (
                      <button
                        type="button"
                        onClick={() => onEditBank(target.bankSoal!)}
                        aria-label={`Edit bank soal ${target.nama_mapel}`}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 ml-auto"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Mode Desktop: Tabular Grid Berkelanjutan ──
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs w-full max-w-full min-w-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" role="table" aria-label={`Tabel Kesiapan Soal Guru ${mode === 'BELUM' ? 'Belum Buat' : 'Sudah Siap'}`}>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 font-bold">
              <th scope="col" className="py-2.5 px-3 w-10 text-center">No</th>
              <th scope="col" className="py-2.5 px-3">Guru Pengampu &amp; Kontak</th>
              <th scope="col" className="py-2.5 px-3">Mata Pelajaran</th>
              <th scope="col" className="py-2.5 px-3 w-28 text-center">Tingkat</th>
              <th scope="col" className="py-2.5 px-3 w-48">Status Pemenuhan</th>
              <th scope="col" className="py-2.5 px-3 w-48 text-right">Aksi &amp; Status Colek</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {items.map((target, idx) => {
              const isReady = target.status === 'READY';
              const isCovered = Boolean(target.isCoveredByMaster);
              const isUncreated = target.status === 'UNCREATED';
              const phone = target.no_hp || target.assignedTeachers[0]?.no_hp;
              const hasNudged = Boolean(target.nudgeMeta?.sent_at);
              const nudgeTimeAgo = hasNudged ? formatNudgeMinutesAgo(target.nudgeMeta?.sent_at) : null;

              return (
                <tr
                  key={target.id}
                  className={cn(
                    'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors',
                    mode === 'BELUM' ? 'bg-rose-50/10' : ''
                  )}
                >
                  {/* 1. No */}
                  <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                    {idx + 1}
                  </td>

                  {/* 2. Guru Pengampu & Kontak WA */}
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-800 dark:text-slate-100">
                      {target.nama_guru}
                    </div>
                    {phone ? (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium flex items-center gap-1 mt-0.5">
                        <Phone size={10} />
                        <span>{phone}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mt-0.5 italic">
                        (No. WA belum terdaftar)
                      </div>
                    )}
                  </td>

                  {/* 3. Mata Pelajaran */}
                  <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-200">
                    {target.nama_mapel}
                  </td>

                  {/* 4. Tingkat */}
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Tingkat {formatTingkatRomawi(target.tingkat)}
                    </span>
                  </td>

                  {/* 5. Status Pemenuhan */}
                  <td className="py-2.5 px-3">
                    {isReady ? (
                      isCovered ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                            <Users size={12} />
                            <span>Ter-cover Shared MGMP</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Master: {target.masterAuthorName || 'Rekan MGMP'} ({target.soalCount} Soal)
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 size={12} />
                            <span>Pembuat Asli ({target.soalCount} Soal)</span>
                          </span>
                          {target.isShared && (
                            <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">
                              👥 Dibagikan ke Rekan MGMP
                            </span>
                          )}
                        </div>
                      )
                    ) : isUncreated ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        <AlertCircle size={12} />
                        <span>Belum Buat Naskah</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <FileQuestion size={12} />
                        <span>Wadah Siap (0 Soal)</span>
                      </span>
                    )}
                  </td>

                  {/* 6. Aksi & Status Colek WA */}
                  <td className="py-2.5 px-3 text-right">
                    {!isReady ? (
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {hasNudged ? (
                          <div className="flex items-center gap-1">
                            <span
                              className="inline-flex items-center gap-1 py-1 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[10px] font-bold"
                              title={`Diingatkan oleh ${target.nudgeMeta?.sent_by} pada ${new Date(target.nudgeMeta!.sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`}
                            >
                              <CheckCircle2 size={11} className="text-amber-600 dark:text-amber-400" />
                              <span>Di-WA ({nudgeTimeAgo})</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => onNudgeWhatsApp(target)}
                              aria-label={`Colek ulang WA ${target.nama_guru}`}
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                              title="Colek Ulang WhatsApp"
                            >
                              <MessageSquare size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNudgeWhatsApp(target)}
                            aria-label={`Colek WhatsApp ${target.nama_guru}`}
                            className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Kirim pesan WhatsApp langsung ke nomor HP guru"
                          >
                            <MessageSquare size={12} />
                            <span>Colek WA</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (target.bankSoal) {
                              onPeriksaButir(target.bankSoal);
                            } else {
                              onCreateForTarget(target);
                            }
                          }}
                          aria-label={`Tindakan untuk ${target.nama_guru}`}
                          className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title={target.bankSoal ? 'Input naskah butir soal' : 'Buatkan bank soal untuk guru ini'}
                        >
                          <Plus size={12} />
                          <span>{target.bankSoal ? 'Isi' : '+ Buat'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (target.bankSoal) onPeriksaButir(target.bankSoal);
                          }}
                          aria-label={`Periksa soal ${target.nama_mapel}`}
                          className="py-1 px-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Periksa butir soal & kisi-kisi"
                        >
                          <Eye size={12} />
                          <span>Periksa</span>
                        </button>

                        {target.bankSoal && !isCovered && (
                          <button
                            type="button"
                            onClick={() => onEditBank(target.bankSoal!)}
                            aria-label={`Edit bank soal ${target.nama_mapel}`}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            title="Edit bank soal"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
