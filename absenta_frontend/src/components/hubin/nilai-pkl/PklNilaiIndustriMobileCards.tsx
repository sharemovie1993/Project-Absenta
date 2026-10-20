import React, { useState, useMemo } from 'react';
import { ScoreRow } from './types';
import { 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  UserCheck, 
  Copy, 
  RotateCcw, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface PklNilaiIndustriMobileCardsProps {
  paginatedScores: ScoreRow[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setItemsPerPage: (limit: number) => void;
  setCurrentPage: (updater: number | ((prev: number) => number)) => void;
  handleScoreChange: (siswaPklId: string, field: keyof ScoreRow, value: string | number | null) => void;
  handleApplyToSameMitra: (mitraNama: string, instruktur: string, pic: string) => void;
  handleSyncFromDailyAttendance: () => void;
  onSaveBatch: () => void;
  isSavingBatch: boolean;
  displayedScoresLength: number;
  isLoadingRekap: boolean;
}

const PAGINATION_LIMITS = [10, 25, 50, 100];

export const PklNilaiIndustriMobileCards: React.FC<PklNilaiIndustriMobileCardsProps> = ({
  paginatedScores,
  currentPage,
  totalPages,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
  handleScoreChange,
  handleApplyToSameMitra,
  handleSyncFromDailyAttendance,
  onSaveBatch,
  isSavingBatch,
  displayedScoresLength,
  isLoadingRekap,
}) => {
  // Set default: kartu pertama dibuka agar guru langsung paham layoutnya
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
    const allIds = (paginatedScores || []).map((s) => s.siswa_pkl_id).filter(Boolean);
    setExpandedCardIds(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedCardIds(new Set());
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Header Bar Kontrol Mobile */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Daftar Penilaian Siswa
          </span>
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {displayedScoresLength} Siswa
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={expandAll}
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            Buka Semua
          </button>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium"
          >
            Tutup Semua
          </button>
        </div>
      </div>

      {isLoadingRekap ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Memuat kartu penilaian siswa...</p>
        </div>
      ) : paginatedScores.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-400 text-xs italic">
          Tidak ada data siswa pada filter ini.
        </div>
      ) : (
        paginatedScores.map((score, index) => {
          const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
          const isExpanded = expandedCardIds.has(score.siswa_pkl_id);
          const isAktif = score.status === 'AKTIF' || !score.status;
          const isSelesai = score.status === 'SELESAI';

          // Hitung kelengkapan 8 aspek nilai
          const aspects = [
            score.hard_kompetensi_teknis,
            score.hard_sop_k3lh,
            score.hard_alur_bisnis,
            score.soft_kedisiplinan,
            score.soft_kerajinan_inisiatif,
            score.soft_kerjasama,
            score.soft_kejujuran,
            score.soft_tanggung_jawab,
          ];
          const filledCount = aspects.filter((v) => v !== null && v !== undefined && v !== '').length;
          const isComplete = filledCount === 8;

          return (
            <div
              key={score.siswa_pkl_id || `mobile-score-${index}`}
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
                className="p-3 cursor-pointer flex items-start justify-between gap-2.5 select-none hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {/* Nomor Urut */}
                  <span className="font-mono text-xs font-bold text-slate-400 pt-0.5 shrink-0">
                    #{globalIndex}
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Baris 1: Nama Siswa + Kelas + Dot Status */}
                    <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate" title={score.nama_siswa}>
                        {score.nama_siswa}
                      </span>
                      {score.nama_kelas && (
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          ({score.nama_kelas})
                        </span>
                      )}
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900',
                          isAktif ? 'bg-emerald-500' : isSelesai ? 'bg-blue-500' : 'bg-slate-400'
                        )}
                        title={`Status: ${score.status || 'Aktif'}`}
                      />
                    </div>

                    {/* Baris 2: Nama Tempat PKL */}
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate flex items-center gap-1">
                      <Building2 size={12} className="shrink-0 opacity-75" />
                      <span className="truncate">{score.mitra_nama || 'Belum ada DUDI'}</span>
                    </div>

                    {/* Baris 3: Status Kelengkapan Nilai */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1',
                          isComplete
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : filledCount > 0
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        )}
                      >
                        {isComplete ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                        <span>{filledCount}/8 Aspek Terisi</span>
                      </span>

                      {score.instruktur_nama && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                          👤 {score.instruktur_nama}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bagian Kanan: Nilai Akhir & Tombol Expand */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700 text-center min-w-[50px]">
                    <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 leading-tight">
                      {score.nilai_akhir_pkl ?? '-'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300">
                      {score.predikat_pkl || 'PRED'}
                    </span>
                  </div>

                  <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {/* Card Detail Form (Expanded View) */}
              {isExpanded && (
                <div className="p-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40 space-y-3.5 animate-in fade-in duration-150">
                  {/* Bagian 1: Instruktur & Jabatan */}
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <span>Pembimbing / Instruktur DUDI</span>
                      {score.mitra_nama && score.instruktur_nama && (
                        <button
                          type="button"
                          onClick={() => handleApplyToSameMitra(score.mitra_nama, score.instruktur_nama, score.penanggung_jawab_nama)}
                          className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                          title="Salin data instruktur ke semua siswa mitra ini"
                        >
                          <Copy size={11} />
                          <span>Salin se-Mitra</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Nama Instruktur</label>
                        <input
                          type="text"
                          placeholder="Nama Instruktur..."
                          value={score.instruktur_nama || ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'instruktur_nama', e.target.value)}
                          className="w-full h-8 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Jabatan / Posisi</label>
                        <input
                          type="text"
                          placeholder="Jabatan..."
                          value={score.penanggung_jawab_nama || ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'penanggung_jawab_nama', e.target.value)}
                          className="w-full h-8 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 2: Hard Skill (3 Aspek - 70%) */}
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40">
                    <div className="flex items-center justify-between text-[11px] font-bold text-blue-900 dark:text-blue-200">
                      <span>HARD SKILL (3 ASPEK)</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        BOBOT 70%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-blue-800 dark:text-blue-300 text-center mb-0.5">Teknis</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="-"
                          value={score.hard_kompetensi_teknis ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'hard_kompetensi_teknis', e.target.value)}
                          className="w-full h-9 text-center font-mono font-bold text-sm bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-950 dark:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-800 dark:text-blue-300 text-center mb-0.5">K3LH</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="-"
                          value={score.hard_sop_k3lh ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'hard_sop_k3lh', e.target.value)}
                          className="w-full h-9 text-center font-mono font-bold text-sm bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-950 dark:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-800 dark:text-blue-300 text-center mb-0.5">Bisnis</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="-"
                          value={score.hard_alur_bisnis ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'hard_alur_bisnis', e.target.value)}
                          className="w-full h-9 text-center font-mono font-bold text-sm bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-950 dark:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 3: Soft Skill (5 Aspek - 30%) */}
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                      <span>SOFT SKILL (5 ASPEK)</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                        BOBOT 30%
                      </span>
                    </div>
                    {/* Baris 1: Disiplin, Inisiatif, Kerjasama */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 text-center mb-0.5 truncate">Disiplin</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="-"
                          value={score.soft_kedisiplinan ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kedisiplinan', e.target.value)}
                          className="w-full h-9 text-center font-mono font-bold text-sm bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-950 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 text-center mb-0.5 truncate">Inisiatif</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="-"
                          value={score.soft_kerajinan_inisiatif ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kerajinan_inisiatif', e.target.value)}
                          className="w-full h-9 text-center font-mono font-bold text-sm bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-950 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 text-center mb-0.5 truncate">Kerjasama</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="-"
                          value={score.soft_kerjasama ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kerjasama', e.target.value)}
                          className="w-full h-9 text-center font-mono font-bold text-sm bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-950 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        />
                      </div>
                    </div>
                    {/* Baris 2: Kejujuran & Tanggung Jawab */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 text-center mb-0.5 truncate">Kejujuran</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="-"
                          value={score.soft_kejujuran ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kejujuran', e.target.value)}
                          className="w-full h-9 text-center font-mono font-bold text-sm bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-950 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 text-center mb-0.5 truncate">Tanggung Jawab</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="-"
                          value={score.soft_tanggung_jawab ?? ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_tanggung_jawab', e.target.value)}
                          className="w-full h-9 text-center font-mono font-bold text-sm bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-950 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 4: Presensi (S, I, A) & Catatan */}
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <span>Presensi (Sakit / Izin / Alpa)</span>
                      <button
                        type="button"
                        onClick={handleSyncFromDailyAttendance}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 font-medium"
                        title="Tarik presensi PKL dari absensi harian"
                      >
                        <RotateCcw size={10} />
                        <span>Sinkron Harian</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Sakit</label>
                        <input
                          type="number"
                          min={0}
                          value={score.sakit_pkl || ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'sakit_pkl', e.target.value)}
                          className="w-full h-8 text-xs font-bold text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="text-center">
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Izin</label>
                        <input
                          type="number"
                          min={0}
                          value={score.izin_pkl || ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'izin_pkl', e.target.value)}
                          className="w-full h-8 text-xs font-bold text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="text-center">
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Alpa</label>
                        <input
                          type="number"
                          min={0}
                          value={score.alpa_pkl || ''}
                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'alpa_pkl', e.target.value)}
                          className="w-full h-8 text-xs font-bold text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Catatan Evaluasi PKL</label>
                      <input
                        type="text"
                        placeholder="Catatan dari DUDI atau guru pembimbing..."
                        value={score.catatan_pkl || ''}
                        onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'catatan_pkl', e.target.value)}
                        className="w-full h-8 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Paginasi Mobile */}
      {displayedScoresLength > 0 && (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <label htmlFor="mobile-limit-select" className="text-[10px] font-bold text-slate-400 uppercase">Limit:</label>
            <select
              id="mobile-limit-select"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              {PAGINATION_LIMITS.map((limit) => (
                <option key={limit} value={limit}>{limit} / hal</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="h-7 px-2.5 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
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
              className="h-7 px-2.5 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Bar (Mudah Disentuh Jempol Kapan Saja di HP) */}
      <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
        <Button
          type="button"
          onClick={onSaveBatch}
          disabled={isSavingBatch || displayedScoresLength === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-2xl shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSavingBatch ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan Perubahan...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Nilai</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
