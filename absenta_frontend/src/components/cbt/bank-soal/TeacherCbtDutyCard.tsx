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
  Layers,
  BookOpen,
} from 'lucide-react';
import { useTeacherCbtDutyStatus, type TeacherDutyItem } from './useTeacherCbtDutyStatus';
import type { CbtBankSoal } from '@/types/cbt.types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { CbtSharedDistributionModal } from './CbtSharedDistributionModal';

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
  const [distributionBank, setDistributionBank] = useState<CbtBankSoal | null>(null);

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

  // ── VARIANT DETAILED: MATRIKS PENUGASAN MENGAJAR & KETERCAKUPAN CBT ──
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all overflow-hidden shadow-2xs',
        isFullyExempt
          ? 'bg-gradient-to-b from-emerald-50/70 via-white to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-emerald-200 dark:border-emerald-800/80'
          : uncreatedDuties === 0
          ? 'bg-gradient-to-b from-amber-50/70 via-white to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 border-amber-300 dark:border-amber-800/80'
          : 'bg-gradient-to-b from-rose-50/60 via-white to-white dark:from-rose-950/25 dark:via-slate-900 dark:to-slate-900 border-rose-200 dark:border-rose-900/60',
        className
      )}
    >
      {/* ── 1. Header Banner Ringkasan ── */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
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
                    : 'text-slate-900 dark:text-slate-100'
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
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {activeEventName}
                </span>
              )}
            </div>

            <p className="text-xs mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
              {isFullyExempt
                ? 'Seluruh rombel dan sasaran jurusan binaan Anda telah memiliki bank soal siap pakai (dibuat mandiri atau di-cover rekan MGMP). Anda tidak perlu membuat soal baru lagi.'
                : pendingJurusanSummary
                ? `Sasaran yang membutuhkan perhatian: ${pendingJurusanSummary}. Klik "Kelola Soal" untuk mengisi butir soal pada draf yang sudah dibuat, atau "+ Buat" jika bank soal belum ada.`
                : 'Terdapat kelas binaan Anda yang belum memiliki bank soal siap pakai. Anda dapat membuat soal mandiri atau meminta rekan MGMP membagikan paket Master MGMP.'}
            </p>
          </div>
        </div>

        {/* Action Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs h-7 px-2.5 rounded-lg border-slate-300 dark:border-slate-700 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Layers size={12} />
            <span>{isExpanded ? 'Sembunyikan Matriks' : 'Lihat Matriks Jadwal'}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </div>
      </div>

      {/* ── 2. Matriks Penugasan Mengajar vs Status Bank Soal ── */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <BookOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Matriks Penugasan Mengajar &amp; Ketercakupan Bank Soal</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Siap: {coveredDuties}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span>Draf: {draftDuties}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                <span>Belum Dibuat: {uncreatedDuties}</span>
              </span>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-bold">
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">Mata Pelajaran &amp; Sasaran</th>
                  <th className="py-2.5 px-3">Rombel / Kelas Mengajar</th>
                  <th className="py-2.5 px-3">Bank Soal Mandiri (Milik Anda)</th>
                  <th className="py-2.5 px-3">Bank Soal MGMP (Beririsan / Berbagi)</th>
                  <th className="py-2.5 px-3 text-center">Status Bebas Tugas</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {items.map((item, idx) => {
                  const isCovered = item.status === 'COVERED_OWN' || item.status === 'COVERED_MGMP';
                  const isDraft = item.status === 'DRAFT_OWN' || item.status === 'DRAFT_MGMP';

                  const ownCount = item.ownBank?.jumlah_soal || item.ownBank?._count?.Soal || 0;
                  const mgmpCount = item.mgmpBank?.jumlah_soal || item.mgmpBank?._count?.Soal || 0;

                  return (
                    <tr
                      key={item.key}
                      className={cn(
                        'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors',
                        isCovered
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                          : isDraft
                          ? 'bg-amber-50/20 dark:bg-amber-950/10'
                          : 'bg-rose-50/20 dark:bg-rose-950/10'
                      )}
                    >
                      {/* # */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Mapel & Sasaran */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {item.mapelName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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
                      </td>

                      {/* Rombel Mengajar */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {item.rombelNames && item.rombelNames.length > 0 ? (
                            item.rombelNames.map((r, rIdx) => (
                              <span
                                key={rIdx}
                                className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                              >
                                {r}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Semua Rombel Tingkat {item.tingkatRoman}</span>
                          )}
                        </div>
                      </td>

                      {/* Bank Soal Mandiri */}
                      <td className="py-2.5 px-3">
                        {item.ownBank ? (
                          <div className="space-y-1">
                            <div className="font-medium text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[200px]" title={item.ownBank.judul}>
                              {item.ownBank.judul}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                              {ownCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 size={10} />
                                  <span>{ownCount} Soal (Siap)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                                  <AlertTriangle size={10} />
                                  <span>0 Soal (Draf)</span>
                                </span>
                              )}

                              {/* Tombol Lihat Rekan Penerima jika bank MGMP / Dibagikan */}
                              {(item.ownBank.is_shared ||
                                (item.ownBank.Kontributor && item.ownBank.Kontributor.length > 0) ||
                                item.ownBank.is_kolaborasi_resmi ||
                                item.ownBank.kolaborasi_badge) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDistributionBank(item.ownBank!);
                                  }}
                                  className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                                  title="Lihat siapa saja rekan guru yang menerima bank soal ini (Aman & Read-Only)"
                                >
                                  <Users size={10} className="text-indigo-600 dark:text-indigo-400" />
                                  <span>Lihat Penerima</span>
                                  <Eye size={9} className="opacity-70" />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                            Belum dibuat
                          </span>
                        )}
                      </td>

                      {/* Bank Soal MGMP / Kolaboratif */}
                      <td className="py-2.5 px-3">
                        {item.mgmpBank ? (
                          <div className="space-y-1">
                            <div className="font-medium text-indigo-900 dark:text-indigo-200 text-[11px] truncate max-w-[200px]" title={item.mgmpBank.judul}>
                              {item.mgmpBank.judul}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                              <span className="text-slate-500 dark:text-slate-400">
                                Oleh: <strong className="text-indigo-700 dark:text-indigo-300">{item.masterAuthorName || item.mgmpBank.Guru?.nama_guru || 'Rekan Guru'}</strong>
                              </span>
                              <span className="inline-flex items-center gap-0.5 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1 rounded">
                                <Users size={9} />
                                <span>{mgmpCount} Soal</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDistributionBank(item.mgmpBank!);
                                }}
                                className="inline-flex items-center gap-1 text-[9.5px] font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline cursor-pointer"
                                title="Lihat rekan guru yang menerima bank soal ini (Aman & Read-Only)"
                              >
                                <Eye size={9} />
                                <span>Penerima</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                            —
                          </span>
                        )}
                      </td>

                      {/* Status Bebas Tugas */}
                      <td className="py-2.5 px-3 text-center">
                        {item.status === 'COVERED_OWN' && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                            <span>Bebas Tugas (Mandiri)</span>
                          </span>
                        )}

                        {item.status === 'COVERED_MGMP' && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-300 dark:border-indigo-800">
                            <Users size={11} className="text-indigo-600 shrink-0" />
                            <span>Bebas Tugas (MGMP)</span>
                          </span>
                        )}

                        {item.status === 'DRAFT_OWN' && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800">
                            <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                            <span>Perlu Diisi (0 Soal)</span>
                          </span>
                        )}

                        {item.status === 'DRAFT_MGMP' && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800">
                            <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                            <span>Draf MGMP (0 Soal)</span>
                          </span>
                        )}

                        {item.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-950/80 px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-800">
                            <AlertCircle size={11} className="text-rose-600 shrink-0" />
                            <span>Wajib Buat Bank Soal</span>
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-2.5 px-3 text-right">
                        {item.status === 'PENDING' && onCreateBankSoal && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              onCreateBankSoal(item.mapelId, item.tingkatRoman, item.targetJurusan)
                            }
                            className="text-[11px] h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 shadow-2xs ml-auto cursor-pointer"
                            title={`Buat Bank Soal untuk ${item.mapelName}`}
                          >
                            <Plus size={11} />
                            <span>Buat</span>
                          </Button>
                        )}

                        {isDraft && item.bankSoal && onPreviewBankSoal && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onPreviewBankSoal(item.bankSoal!)}
                            className="text-[11px] h-7 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1 shadow-2xs ml-auto cursor-pointer"
                            title={`Isi Butir Soal untuk ${item.mapelName}`}
                          >
                            <FileEdit size={12} />
                            <span>Kelola Soal</span>
                          </Button>
                        )}

                        {isCovered && item.bankSoal && onPreviewBankSoal && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onPreviewBankSoal(item.bankSoal!)}
                            className="text-[11px] h-7 px-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ml-auto"
                            title="Lihat Butir Soal"
                          >
                            <Eye size={12} className="mr-1" />
                            <span>Lihat</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View */}
          <div className="md:hidden space-y-2">
            {items.map((item, idx) => {
              const isCovered = item.status === 'COVERED_OWN' || item.status === 'COVERED_MGMP';
              const isDraft = item.status === 'DRAFT_OWN' || item.status === 'DRAFT_MGMP';

              return (
                <div
                  key={item.key}
                  className={cn(
                    'p-3 rounded-xl border text-xs space-y-2 transition-all',
                    isCovered
                      ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60'
                      : isDraft
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-800/60'
                      : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300/80 dark:border-rose-900/60'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {item.mapelName}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Tingkat {item.tingkatRoman}
                        </span>
                        {item.targetJurusan && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                            Jurusan {item.targetJurusan}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isCovered ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded">
                          <CheckCircle2 size={10} />
                          <span>Bebas Tugas</span>
                        </span>
                      ) : isDraft ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded">
                          <AlertTriangle size={10} />
                          <span>Draf (0 Soal)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded">
                          <AlertCircle size={10} />
                          <span>Wajib Buat</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rombel */}
                  <div className="text-[11px]">
                    <span className="text-slate-400">Rombel Mengajar: </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.rombelNames.join(', ') || `Semua Rombel Tingkat ${item.tingkatRoman}`}
                    </span>
                  </div>

                  {/* Mandiri vs MGMP Info */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
                    <div className="text-[10.5px] space-y-0.5">
                      {item.ownBank ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            Mandiri: {item.ownBank.jumlah_soal || item.ownBank._count?.Soal || 0} Soal
                          </span>
                          {(item.ownBank.is_shared ||
                            (item.ownBank.Kontributor && item.ownBank.Kontributor.length > 0) ||
                            item.ownBank.is_kolaborasi_resmi ||
                            item.ownBank.kolaborasi_badge) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDistributionBank(item.ownBank!);
                              }}
                              className="text-[9.5px] font-semibold text-indigo-700 dark:text-indigo-300 underline cursor-pointer"
                            >
                              Lihat Penerima
                            </button>
                          )}
                        </div>
                      ) : item.mgmpBank ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-indigo-700 dark:text-indigo-400 font-medium">
                            MGMP: {item.masterAuthorName || 'Rekan'} ({item.mgmpBank.jumlah_soal || item.mgmpBank._count?.Soal || 0} Soal)
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDistributionBank(item.mgmpBank!);
                            }}
                            className="text-[9.5px] font-semibold text-indigo-600 dark:text-indigo-400 underline cursor-pointer"
                          >
                            Lihat Penerima
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum ada bank soal</span>
                      )}
                    </div>

                    {/* Button */}
                    <div>
                      {item.status === 'PENDING' && onCreateBankSoal && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            onCreateBankSoal(item.mapelId, item.tingkatRoman, item.targetJurusan)
                          }
                          className="text-[11px] h-6 px-2.5 rounded bg-indigo-600 text-white font-bold"
                        >
                          <Plus size={10} className="mr-0.5" />
                          <span>Buat</span>
                        </Button>
                      )}

                      {isDraft && item.bankSoal && onPreviewBankSoal && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onPreviewBankSoal(item.bankSoal!)}
                          className="text-[11px] h-6 px-2.5 rounded bg-amber-500 text-white font-bold"
                        >
                          <FileEdit size={10} className="mr-0.5" />
                          <span>Kelola Soal</span>
                        </Button>
                      )}

                      {isCovered && item.bankSoal && onPreviewBankSoal && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onPreviewBankSoal(item.bankSoal!)}
                          className="text-[11px] h-6 px-2 text-slate-600 dark:text-slate-300"
                        >
                          <Eye size={10} className="mr-0.5" />
                          <span>Lihat</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Distribusi Rekan MGMP (Read-Only & Bebas Human Error) */}
      <CbtSharedDistributionModal
        isOpen={Boolean(distributionBank)}
        onClose={() => setDistributionBank(null)}
        bankSoal={distributionBank}
        currentGuruId={guruId}
      />
    </div>
  );
};
