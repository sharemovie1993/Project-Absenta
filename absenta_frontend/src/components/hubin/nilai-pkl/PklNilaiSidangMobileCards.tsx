import React, { useState } from 'react';
import { ScoreRow } from './types';
import { PengujiCombobox, GuruItem } from './PengujiCombobox';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  ExternalLink,
  GraduationCap,
  Building2,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface PklNilaiSidangMobileCardsProps {
  paginatedScores: ScoreRow[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setItemsPerPage: (limit: number) => void;
  setCurrentPage: (updater: number | ((prev: number) => number)) => void;
  handleScoreChange: (siswaPklId: string, field: keyof ScoreRow, value: string | number | null) => void;
  onSaveBatch: () => void;
  isSavingBatch: boolean;
  displayedScoresLength: number;
  isLoadingRekap: boolean;
  isCompositeMode: boolean;
  effectiveSettings?: {
    assessmentMode: 'DUDI_ONLY' | 'COMPOSITE';
    weightDudi: number;
    weightLaporan: number;
    weightSidang: number;
  };
  guruList?: GuruItem[];
  isLoadingGuru?: boolean;
  onApplyPengujiToAll?: (namaPenguji: string) => void;
}

const PAGINATION_LIMITS = [10, 25, 50, 100];

export const PklNilaiSidangMobileCards: React.FC<PklNilaiSidangMobileCardsProps> = ({
  paginatedScores,
  currentPage,
  totalPages,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
  handleScoreChange,
  onSaveBatch,
  isSavingBatch,
  displayedScoresLength,
  isLoadingRekap,
  isCompositeMode,
  effectiveSettings,
  guruList = [],
  isLoadingGuru = false,
  onApplyPengujiToAll,
}) => {
  // Set default: kartu pertama dibuka agar penguji/guru langsung paham alur pengisian
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (paginatedScores?.[0]?.siswa_pkl_id) {
      initial.add(paginatedScores[0].siswa_pkl_id);
    }
    return initial;
  });

  const toggleExpand = (id: string) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = (paginatedScores || [])?.map((s) => s.siswa_pkl_id).filter(Boolean);
    setExpandedCardIds(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedCardIds(new Set());
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Header Info Mode & Kontrol Mobile */}
      <div className="flex flex-col gap-2 px-1 py-1">
        {!isCompositeMode && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="leading-tight">
              <span className="font-bold">Mode DUDI 100% Aktif.</span> Nilai sidang & laporan tidak mempengaruhi nilai akhir dan terkunci dari pengeditan.
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Daftar Sidang Siswa
            </span>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {displayedScoresLength} Siswa
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={expandAll}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
            >
              Buka Semua
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium cursor-pointer"
            >
              Tutup Semua
            </button>
          </div>
        </div>
      </div>

      {isLoadingRekap ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Memuat data sidang siswa...</p>
        </div>
      ) : paginatedScores.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-400 text-xs italic">
          Belum ada data sidang siswa pada kelas atau filter ini.
        </div>
      ) : (
        paginatedScores?.map((score, index) => {
          const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
          const isExpanded = expandedCardIds.has(score.siswa_pkl_id);
          const isAktif = score.status === 'AKTIF' || !score.status;
          const isSelesai = score.status === 'SELESAI';

          // Hitung Nilai Rata-rata DUDI
          const dudiScores = [
            score.hard_kompetensi_teknis,
            score.hard_sop_k3lh,
            score.hard_alur_bisnis,
            score.soft_kedisiplinan,
            score.soft_kerajinan_inisiatif,
            score.soft_kerjasama,
            score.soft_kejujuran,
            score.soft_tanggung_jawab,
          ].filter((g): g is number => typeof g === 'number' && g !== null);
          const dudiAvg = dudiScores.length > 0
            ? (dudiScores.reduce((a, b) => a + b, 0) / dudiScores.length).toFixed(1)
            : null;

          // Status kelulusan sidang
          const hasExamined = score.nilai_sidang !== null && score.nilai_sidang !== undefined && score.nilai_sidang !== '';
          const isLulus = hasExamined && Number(score.nilai_sidang) >= 70;

          return (
            <div
              key={score.siswa_pkl_id || `mobile-sidang-${index}`}
              className={cn(
                'bg-white dark:bg-slate-900 border rounded-2xl transition-all shadow-2xs overflow-hidden',
                isExpanded
                  ? 'border-indigo-300 dark:border-indigo-800 ring-2 ring-indigo-500/10'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
              )}
            >
              {/* Card Summary Header (Tap to Expand/Collapse) */}
              <div
                onClick={() => toggleExpand(score.siswa_pkl_id)}
                className="p-3.5 cursor-pointer flex items-start justify-between gap-2.5 select-none hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {/* Nomor Urut */}
                  <span className="font-mono text-xs font-bold text-slate-400 pt-0.5 shrink-0">
                    #{globalIndex}
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Baris 1: Nama Siswa + Badge Kelas + Status PKL Dot */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {score.nama_siswa}
                      </span>
                      {score.nama_kelas && (
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {score.nama_kelas}
                        </span>
                      )}
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900 ml-0.5',
                          isAktif
                            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                            : isSelesai
                            ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]'
                            : 'bg-slate-400'
                        )}
                        title={`Status PKL: ${score.status || 'Aktif'}`}
                      />
                    </div>

                    {/* Baris 2: Tempat PKL */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="truncate">{score.mitra_nama || 'Belum ditentukan'}</span>
                    </div>

                    {/* Baris 3: Quick Badges (DUDI, Laporan, Sidang, Nilai Akhir) */}
                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      {/* DUDI Score badge */}
                      <span className="text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-900/40">
                        DUDI: {dudiAvg ?? '-'}
                      </span>

                      {/* Laporan badge */}
                      <span className={cn(
                        'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border',
                        score.nilai_laporan !== null && score.nilai_laporan !== undefined && score.nilai_laporan !== ''
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                      )}>
                        Laporan: {score.nilai_laporan ?? '-'}
                      </span>

                      {/* Sidang badge */}
                      <span className={cn(
                        'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border',
                        hasExamined
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-900/40'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                      )}>
                        Sidang: {score.nilai_sidang ?? '-'}
                      </span>

                      {/* Nilai Akhir */}
                      <span className="text-[10px] font-mono font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        Akhir: {score.nilai_akhir_pkl ?? '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Sidang Badge & Chevron */}
                <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                  {!isCompositeMode ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Non-Sidang
                    </span>
                  ) : hasExamined ? (
                    isLulus ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Lulus
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        Revisi
                      </span>
                    )
                  ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                      Belum
                    </span>
                  )}

                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {/* Card Body (Detail Nilai & Form Input Sidang) */}
              {isExpanded && (
                <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5 bg-slate-50/40 dark:bg-slate-900/40">
                  {/* Seksi 1: Komponen Nilai Utama (DUDI, Laporan, Sidang) */}
                  <div className="pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        Komponen Nilai
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {isCompositeMode
                          ? `DUDI ${effectiveSettings?.weightDudi ?? 70}% • Lap ${effectiveSettings?.weightLaporan ?? 15}% • Sid ${effectiveSettings?.weightSidang ?? 15}%`
                          : 'Skema DUDI 100%'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* DUDI (Read-Only) */}
                      <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300">
                          Nilai DUDI
                        </span>
                        <span className="text-[9px] text-blue-600/80 dark:text-blue-400 font-medium">
                          {isCompositeMode ? `${effectiveSettings?.weightDudi ?? 70}%` : '100%'}
                        </span>
                        <span className="font-mono font-black text-lg text-blue-700 dark:text-blue-300 mt-0.5">
                          {dudiAvg ?? '-'}
                        </span>
                      </div>

                      {/* Nilai Laporan (Input) */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor={`mobile-laporan-${score.siswa_pkl_id}`}
                            className="text-[10px] font-bold text-slate-700 dark:text-slate-200"
                          >
                            Laporan
                          </label>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {isCompositeMode ? `${effectiveSettings?.weightLaporan ?? 15}%` : '-'}
                          </span>
                        </div>
                        <input
                          id={`mobile-laporan-${score.siswa_pkl_id}`}
                          type="number"
                          min="0"
                          max="100"
                          disabled={!isCompositeMode}
                          placeholder={!isCompositeMode ? '-' : '0'}
                          value={!isCompositeMode ? '' : (score.nilai_laporan ?? '')}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Math.min(100, Math.max(0, Number(e.target.value)));
                            handleScoreChange(score.siswa_pkl_id, 'nilai_laporan', val);
                          }}
                          className={cn(
                            'w-full h-10 mt-1 rounded-lg text-center font-mono font-bold text-base border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all',
                            !isCompositeMode
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                              : 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800'
                          )}
                        />
                      </div>

                      {/* Nilai Sidang (Input) */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor={`mobile-sidang-${score.siswa_pkl_id}`}
                            className="text-[10px] font-bold text-slate-700 dark:text-slate-200"
                          >
                            Sidang
                          </label>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {isCompositeMode ? `${effectiveSettings?.weightSidang ?? 15}%` : '-'}
                          </span>
                        </div>
                        <input
                          id={`mobile-sidang-${score.siswa_pkl_id}`}
                          type="number"
                          min="0"
                          max="100"
                          disabled={!isCompositeMode}
                          placeholder={!isCompositeMode ? '-' : '0'}
                          value={!isCompositeMode ? '' : (score.nilai_sidang ?? '')}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Math.min(100, Math.max(0, Number(e.target.value)));
                            handleScoreChange(score.siswa_pkl_id, 'nilai_sidang', val);
                          }}
                          className={cn(
                            'w-full h-10 mt-1 rounded-lg text-center font-mono font-bold text-base border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all',
                            !isCompositeMode
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                              : 'bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-800'
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Berkas / Portofolio Siswa (Jika ada) */}
                  {score.file_portofolio && (
                    <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                          Berkas Laporan / Portofolio Siswa
                        </span>
                      </div>
                      <a
                        href={score.file_portofolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 hover:underline bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                      >
                        <span>Buka</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Seksi 2: Informasi Penguji & Catatan Revisi */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      Detail Ujian & Penguji
                    </span>

                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label
                            htmlFor={`mobile-penguji-${score.siswa_pkl_id}`}
                            className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                          >
                            Guru Penguji
                          </label>
                          {score.penguji_nama && onApplyPengujiToAll && isCompositeMode && (
                            <button
                              type="button"
                              onClick={() => onApplyPengujiToAll(score.penguji_nama)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                            >
                              Terapkan ke semua siswa
                            </button>
                          )}
                        </div>
                        <PengujiCombobox
                          id={`mobile-penguji-${score.siswa_pkl_id}`}
                          aria-label={`Nama penguji ${score.nama_siswa}`}
                          disabled={!isCompositeMode}
                          placeholder={!isCompositeMode ? 'Terkunci' : 'Ketik nama manual / pilih guru...'}
                          value={!isCompositeMode ? '' : (score.penguji_nama || '')}
                          onChange={(val) => handleScoreChange(score.siswa_pkl_id, 'penguji_nama', val)}
                          guruList={guruList}
                          isLoadingGuru={isLoadingGuru}
                          size="md"
                          onApplyToAll={onApplyPengujiToAll}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`mobile-catatan-${score.siswa_pkl_id}`}
                          className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Catatan / Hasil Revisi Sidang
                        </label>
                        <textarea
                          id={`mobile-catatan-${score.siswa_pkl_id}`}
                          rows={2}
                          disabled={!isCompositeMode}
                          placeholder={!isCompositeMode ? 'Terkunci' : 'Tambahkan catatan revisi, saran, atau catatan penguji...'}
                          value={!isCompositeMode ? '' : (score.catatan_sidang || '')}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'catatan_sidang', e.target.value)}
                          className={cn(
                            'w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none',
                            !isCompositeMode
                              ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400'
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seksi 3: Hasil Akhir & Status Kelulusan */}
                  <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">
                        Hasil Evaluasi Akhir
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Predikat: <span className="font-bold">{score.predikat_pkl || (isCompositeMode ? (hasExamined ? 'Gabungan' : 'DUDI') : '100% DUDI')}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Nilai Akhir</span>
                        <span className="font-mono font-black text-base text-indigo-600 dark:text-indigo-400">
                          {score.nilai_akhir_pkl ?? '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Pagination Mobile Controls */}
      {displayedScoresLength > 0 && (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <label htmlFor="mobile-sidang-limit-select" className="text-[11px] font-bold text-slate-400">Limit:</label>
            <select
              id="mobile-sidang-limit-select"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              {PAGINATION_LIMITS?.map((limit) => (
                <option key={limit} value={limit}>
                  {limit} / hal
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="h-7 px-2.5 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              Prev
            </button>
            <span className="px-2 text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="h-7 px-2.5 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Bar (Mudah Disentuh Jempol Kapan Saja di Layar HP) */}
      <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
        <Button
          type="button"
          onClick={onSaveBatch}
          disabled={isSavingBatch || displayedScoresLength === 0 || !isCompositeMode}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-2xl shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSavingBatch ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan Nilai Sidang...</span>
            </>
          ) : !isCompositeMode ? (
            <>
              <Lock className="w-4 h-4" />
              <span>Skema Nilai Terkunci (DUDI 100%)</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Nilai Sidang</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
