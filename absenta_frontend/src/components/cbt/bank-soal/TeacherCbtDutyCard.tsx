import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Users,
  Plus,
  Eye,
  FileEdit,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';
import { useTeacherCbtDutyStatus, type TeacherDutyItem } from './useTeacherCbtDutyStatus';
import type { CbtBankSoal } from '@/types/cbt.types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

interface TeacherCbtDutyCardProps {
  guruId?: string;
  variant?: 'detailed' | 'compact';
  onNavigateToCbt?: () => void;
  onCreateBankSoal?: (mapelId: string, tingkatRoman: string, jurusan?: string) => void;
  onPreviewBankSoal?: (bankSoal: CbtBankSoal) => void;
  className?: string;
}

export const TeacherCbtDutyCard: React.FC<TeacherCbtDutyCardProps> = ({
  guruId,
  variant = 'detailed',
  onNavigateToCbt,
  onCreateBankSoal,
  onPreviewBankSoal,
  className,
}) => {
  const {
    isLoading,
    activeEventName,
    hasActiveEvent,
    totalDuties,
    coveredDuties,
    draftDuties,
    uncreatedDuties,
    pendingDuties,
    completionPercentage,
    isFullyExempt,
    hasNoDuties,
    items,
    pendingJurusanSummary,
  } = useTeacherCbtDutyStatus(guruId);

  const [isExpanded, setIsExpanded] = useState(true);

  // Jika tidak sedang loading dan guru tidak punya penugasan mengajar di tingkat aktif
  if (isLoading || hasNoDuties || totalDuties === 0) {
    return null;
  }

  // ── VARIANT COMPACT (Untuk Beranda Utama Guru / StaffBerandaTab) ──
  if (variant === 'compact') {
    if (isFullyExempt) {
      return (
        <div
          className={cn(
            'p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 shadow-2xs',
            className
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs">Bebas Tugas Bank Soal CBT</span>
                {activeEventName && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    {activeEventName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 truncate">
                Seluruh {totalDuties} sasaran rombel/jurusan binaan Anda telah ter-cover (Mandiri &amp; MGMP).
              </p>
            </div>
          </div>

          {onNavigateToCbt && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNavigateToCbt}
              className="text-xs h-7 px-2.5 rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 font-bold shrink-0 flex items-center gap-1"
            >
              <span>Meja CBT</span>
              <ArrowRight size={11} />
            </Button>
          )}
        </div>
      );
    }

    // Masih ada tugas
    return (
      <div
        className={cn(
          'p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-2xs',
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
            {uncreatedDuties > 0 ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs text-amber-900 dark:text-amber-100">
                {uncreatedDuties > 0
                  ? `Tugas CBT: ${uncreatedDuties} Belum Dibuat${draftDuties > 0 ? `, ${draftDuties} Masih Draf` : ''}`
                  : `Tugas CBT: ${draftDuties} Bank Soal Masih 0 Butir Soal`}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                {coveredDuties}/{totalDuties} Siap ({completionPercentage}%)
              </span>
            </div>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 truncate">
              {pendingJurusanSummary
                ? `Perlu perhatian: ${pendingJurusanSummary}`
                : 'Buka Meja CBT untuk melengkapi pembuatan & pengisian butir soal.'}
            </p>
          </div>
        </div>

        {onNavigateToCbt && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onNavigateToCbt}
            className="text-xs h-7 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <span>Buka CBT</span>
            <ArrowRight size={11} />
          </Button>
        )}
      </div>
    );
  }

  // ── VARIANT DETAILED (Untuk Ruang Kerja CBT Guru / CbtBankSoalView) ──
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all overflow-hidden shadow-2xs',
        isFullyExempt
          ? 'bg-gradient-to-b from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/30 dark:to-slate-900/40 border-emerald-200 dark:border-emerald-800/80'
          : uncreatedDuties === 0
          ? 'bg-gradient-to-b from-amber-50/70 to-yellow-50/30 dark:from-amber-950/30 dark:to-slate-900/40 border-amber-300 dark:border-amber-800/80'
          : 'bg-gradient-to-b from-amber-50/80 to-rose-50/30 dark:from-amber-950/30 dark:to-slate-900/40 border-amber-200 dark:border-amber-800/80',
        className
      )}
    >
      {/* Header Banner */}
      <div className="p-3.5 sm:p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              isFullyExempt
                ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none'
                : uncreatedDuties === 0
                ? 'bg-amber-500 text-white shadow-amber-200 dark:shadow-none'
                : 'bg-rose-500 text-white shadow-rose-200 dark:shadow-none'
            )}
          >
            {isFullyExempt ? (
              <ShieldCheck size={22} />
            ) : uncreatedDuties === 0 ? (
              <AlertTriangle size={22} />
            ) : (
              <AlertCircle size={22} />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={cn(
                  'text-sm font-black tracking-tight',
                  isFullyExempt
                    ? 'text-emerald-900 dark:text-emerald-100'
                    : 'text-amber-950 dark:text-amber-100'
                )}
              >
                {isFullyExempt
                  ? 'Bebas Tugas Pembuatan Bank Soal CBT'
                  : uncreatedDuties > 0
                  ? `Perhatian: ${uncreatedDuties} Sasaran Belum Dibuat${draftDuties > 0 ? `, ${draftDuties} Masih Draf (0 Soal)` : ''}`
                  : `Perhatian: ${draftDuties} dari ${totalDuties} Bank Soal Masih Draf (0 Soal)`}
              </h3>

              <span
                className={cn(
                  'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider',
                  isFullyExempt
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 text-white'
                )}
              >
                {isFullyExempt ? 'Bebas Tugas' : `${coveredDuties}/${totalDuties} Siap (${completionPercentage}%)`}
              </span>

              {activeEventName && (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {activeEventName}
                </span>
              )}
            </div>

            <p
              className={cn(
                'text-xs mt-1 leading-relaxed',
                isFullyExempt
                  ? 'text-emerald-800/90 dark:text-emerald-300/90'
                  : 'text-amber-900/90 dark:text-amber-300/90'
              )}
            >
              {isFullyExempt
                ? 'Seluruh rombel dan sasaran jurusan binaan Anda telah memiliki bank soal siap pakai (dibuat mandiri atau di-cover rekan MGMP). Anda tidak perlu membuat soal baru lagi.'
                : pendingJurusanSummary
                ? `Sasaran yang membutuhkan perhatian: ${pendingJurusanSummary}. Klik "Kelola Soal" untuk mengisi butir soal pada draf yang sudah dibuat, atau "+ Buat" jika bank soal belum ada.`
                : 'Terdapat kelas binaan Anda yang belum memiliki bank soal siap pakai. Anda dapat membuat soal mandiri atau meminta rekan MGMP membagikan paket Master MGMP.'}
            </p>
          </div>
        </div>

        {/* Toggle Collapse */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          title={isExpanded ? 'Sembunyikan rincian' : 'Tampilkan rincian'}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Rincian Penugasan Mapel Guru (Pills Grid) */}
      {isExpanded && (
        <div className="px-3.5 sm:px-4 pb-3.5 pt-0">
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-2">
            {items.map((item) => {
              const isCovered = item.status === 'COVERED_OWN' || item.status === 'COVERED_MGMP';
              const isDraft = item.status === 'DRAFT_OWN' || item.status === 'DRAFT_MGMP';

              return (
                <div
                  key={item.key}
                  className={cn(
                    'p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all text-xs',
                    isCovered
                      ? 'bg-white/90 dark:bg-slate-900/80 border-emerald-200/80 dark:border-emerald-900/50'
                      : isDraft
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-800/60'
                      : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300/80 dark:border-rose-900/60'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {item.mapelName}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Tingkat {item.tingkatRoman}
                      </span>
                      {item.targetJurusan ? (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Jurusan {item.targetJurusan}
                        </span>
                      ) : (
                        <span className="text-[9.5px] font-medium px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Semua Jurusan
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 text-[11px] flex-wrap">
                      {/* Rombel Binaan */}
                      <span className="text-slate-400">Rombel:</span>
                      <span
                        className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[200px]"
                        title={item.rombelNames.join(', ')}
                      >
                        {item.rombelNames.join(', ') || '-'}
                      </span>
                    </div>

                    {/* Status Info */}
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {item.status === 'COVERED_OWN' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>Siap Uji ({item.soalCount} Soal)</span>
                        </span>
                      )}

                      {item.status === 'COVERED_MGMP' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                          <Users size={11} className="text-indigo-600" />
                          <span>Di-cover MGMP ({item.masterAuthorName || 'Rekan Guru'} — {item.soalCount} Soal)</span>
                        </span>
                      )}

                      {item.status === 'DRAFT_OWN' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                          <AlertTriangle size={11} className="text-amber-600" />
                          <span>Wadah Dibuat (0 Soal — Perlu Diisi)</span>
                        </span>
                      )}

                      {item.status === 'DRAFT_MGMP' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                          <AlertTriangle size={11} className="text-amber-600" />
                          <span>Draf MGMP ({item.masterAuthorName || 'Rekan Guru'} — 0 Soal)</span>
                        </span>
                      )}

                      {item.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                          <AlertCircle size={11} className="text-rose-600" />
                          <span>Belum Ada Bank Soal</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {/* Jika Belum Dibuat: Tombol "+ Buat" */}
                    {item.status === 'PENDING' && onCreateBankSoal && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          onCreateBankSoal(item.mapelId, item.tingkatRoman, item.targetJurusan)
                        }
                        className="text-[11px] h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        title={`Buat Bank Soal untuk ${item.mapelName}${item.targetJurusan ? ` (${item.targetJurusan})` : ''}`}
                      >
                        <Plus size={11} />
                        <span>Buat</span>
                      </Button>
                    )}

                    {/* Jika Sudah Dibuat Tapi Masih Draf (0 Soal): Tombol "Kelola Soal" */}
                    {isDraft && item.bankSoal && onPreviewBankSoal && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onPreviewBankSoal(item.bankSoal!)}
                        className="text-[11px] h-7 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        title={`Isi Butir Soal untuk ${item.mapelName}`}
                      >
                        <FileEdit size={12} />
                        <span>Kelola Soal</span>
                      </Button>
                    )}

                    {/* Jika Sudah Siap Uji (Ada Soal): Tombol "Lihat" */}
                    {isCovered && item.bankSoal && onPreviewBankSoal && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onPreviewBankSoal(item.bankSoal!)}
                        className="text-[11px] h-7 px-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Lihat Butir Soal"
                      >
                        <Eye size={12} className="mr-1" />
                        <span>Lihat</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
