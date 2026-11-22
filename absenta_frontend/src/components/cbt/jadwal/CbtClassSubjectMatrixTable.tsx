import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  Layers,
  Maximize2,
  Minimize2,
  StretchHorizontal,
  LayoutGrid,
  MessageSquare,
  Phone,
  User,
  Clock,
  ShieldAlert,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import type { CbtBankSoal } from '@/types/cbt.types';
import type { ClassSubjectMatrixResult, MatrixCellData } from './cbtClassSubjectMatrixHelper';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { getNudgeHistory, formatNudgeMinutesAgo } from './cbtMgmpHelper';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CbtClassSubjectMatrixTableProps {
  matrixResult: ClassSubjectMatrixResult;
  searchQuery?: string;
  onPeriksaButir?: (bank: CbtBankSoal) => void;
  onNudgeWhatsApp?: (cell: MatrixCellData) => void;
  tenantId?: string;
  eventName?: string;
  schoolName?: string;
}

export const CbtClassSubjectMatrixTable: React.FC<CbtClassSubjectMatrixTableProps> = ({
  matrixResult,
  searchQuery = '',
  onPeriksaButir,
  onNudgeWhatsApp,
  tenantId = 'default',
  eventName,
  schoolName,
}) => {
  const { classes, subjects, cellMap, totalCellsCovered, totalCellsRequired, overallPercentage } = matrixResult;

  // View mode: 'fit' (Muat 20 kelas dalam 1 layar tanpa horizontal scroll) atau 'detailed' (Lebar + scroll horizontal)
  const [viewMode, setViewMode] = useState<'fit' | 'detailed'>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal info sel yang belum ada soal & aksi Colek WA
  const [selectedMissingCell, setSelectedMissingCell] = useState<MatrixCellData | null>(null);
  const [nudgeTick, setNudgeTick] = useState<number>(Date.now());

  // Listen event update colek WA
  useEffect(() => {
    const handleUpdate = () => setNudgeTick(Date.now());
    window.addEventListener('cbt-nudge-updated', handleUpdate);
    return () => window.removeEventListener('cbt-nudge-updated', handleUpdate);
  }, []);

  const nudgeHistory = useMemo(() => getNudgeHistory(tenantId), [tenantId, nudgeTick]);

  // Keyboard shortcut ESC to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Filter baris mapel berdasarkan pencarian jika ada
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.mapelName.toLowerCase().includes(q) ||
        (s.mapelKode && s.mapelKode.toLowerCase().includes(q))
    );
  }, [subjects, searchQuery]);

  if (classes.length === 0 || subjects.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
        <FileQuestion size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
          Belum Ada Data Rombel atau Kurikulum
        </h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Pastikan SK Pembagian Tugas (Guru-Mapel) dan rombel kelas pada tingkat ini telah dikonfigurasi di Modul Kurikulum.
        </p>
      </div>
    );
  }

  const isFit = viewMode === 'fit';

  // Info untuk sel missing yang sedang dibuka di modal
  const selectedNudgeTargetKey = selectedMissingCell?.targetId || (selectedMissingCell?.guruPengampuId ? `${selectedMissingCell.guruPengampuId}_${selectedMissingCell.mapelId}_${selectedMissingCell.tingkat}` : '');
  const selectedNudgeMeta = selectedNudgeTargetKey ? nudgeHistory[selectedNudgeTargetKey] : undefined;
  const selectedHasNudged = Boolean(selectedNudgeMeta?.sent_at);
  const selectedNudgeTimeAgo = selectedHasNudged ? formatNudgeMinutesAgo(selectedNudgeMeta?.sent_at) : null;

  return (
    <div
      className={cn(
        'space-y-3 transition-all duration-200',
        isFullscreen &&
          'fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 p-4 overflow-hidden flex flex-col'
      )}
    >
      {/* ── Ringkasan Kesiapan Matriks & Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
            <Layers size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Matriks Kesiapan Bank Soal (Kelas x Mapel)</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                Tingkat {formatTingkatRomawi(classes[0]?.tingkat || 10)}
              </span>
              {isFit && (
                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Mode 1 Layar ({classes.length} Kelas Pas)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {classes.length} Rombel Kelas &bull; {subjects.length} Mata Pelajaran &bull; Terisi {totalCellsCovered} dari {totalCellsRequired} slot ({overallPercentage}%)
            </p>
          </div>
        </div>

        {/* Action Controls: Switch Density & Fullscreen & Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode View Switcher */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('fit')}
              className={cn(
                'px-2.5 py-1 rounded-md font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer',
                isFit
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
              title="Tampilkan seluruh kelas berdampingan dalam 1 layar tanpa perlu scroll horizontal (Nama kelas berdiri)"
            >
              <StretchHorizontal size={13} />
              <span>1 Layar (20 Kelas)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('detailed')}
              className={cn(
                'px-2.5 py-1 rounded-md font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer',
                !isFit
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
              title="Tampilkan kartu kelas lebar dengan scroll horizontal"
            >
              <LayoutGrid size={13} />
              <span>Detail (Scroll)</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title={isFullscreen ? 'Keluar dari Layar Penuh (Esc)' : 'Tampilan Layar Penuh (Fullscreen)'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Share to WhatsApp Button */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="px-2.5 py-1.2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
            title="Bagikan Tautan Matriks ke Grup WhatsApp"
          >
            <MessageSquare size={13} />
            <span className="hidden sm:inline">Bagikan ke WA</span>
          </button>

          {/* Legend */}
          <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 pl-2 border-l border-slate-200 dark:border-slate-700">
            <span className="flex items-center gap-1" title="Klik sel untuk melihat butir soal">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Ter-cover (Lihat Soal)</span>
            </span>
            <span className="flex items-center gap-1" title="Klik sel untuk info guru & Colek WA">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Belum Ada (Colek WA)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
              <span>Bukan Kurikulum</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Table Container dengan Freeze Left Column & Sticky Header ── */}
      <div
        className={cn(
          'relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs',
          isFullscreen ? 'flex-1 overflow-hidden flex flex-col' : ''
        )}
      >
        <div
          className={cn(
            'overflow-x-auto overflow-y-auto',
            isFullscreen ? 'flex-1 max-h-none' : 'max-h-[720px]'
          )}
        >
          <table
            className={cn(
              'w-full text-left border-collapse text-xs',
              isFit ? 'table-auto xl:table-fixed' : ''
            )}
          >
            {/* Header Kolom (Daftar Kelas Rombel) */}
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                {/* Freeze Kolom 1: Mapel (Sticky Left) */}
                <th
                  scope="col"
                  className={cn(
                    'sticky left-0 z-30 p-2.5 text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] align-bottom pb-3',
                    isFit ? 'w-[150px] min-w-[140px] max-w-[170px]' : 'min-w-[220px] max-w-[260px]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Mata Pelajaran</span>
                    <span className="text-[10px] text-slate-400 font-normal shrink-0 ml-1">
                      {filteredSubjects.length} mapel
                    </span>
                  </div>
                </th>

                {/* Kolom-kolom Kelas */}
                {classes.map((cls) => {
                  const isComplete = cls.percentage === 100;

                  // Mode 1 Layar / Fit: Header Nama Kelas Vertikal (Berdiri)
                  if (isFit) {
                    return (
                      <th
                        key={cls.kelasId}
                        scope="col"
                        className="p-1 w-[46px] min-w-[40px] max-w-[56px] text-center border-r border-slate-200 dark:border-slate-800 align-bottom pb-2"
                        title={`${cls.kelasName} (${cls.coveredMapelCount}/${cls.totalRequiredMapel} Mapel - ${cls.percentage}%)`}
                      >
                        {/* Nama Kelas Berdiri (Vertical Text) */}
                        <div className="h-28 flex flex-col items-center justify-end pb-1.5">
                          <span className="[writing-mode:vertical-rl] rotate-180 font-extrabold text-[11px] tracking-tight whitespace-nowrap text-slate-800 dark:text-slate-100 select-none py-0.5">
                            {cls.kelasName}
                          </span>
                        </div>

                        {/* Persentase Kesiapan Kelas */}
                        <div className="mt-1 flex flex-col items-center justify-center gap-0.5">
                          <span
                            className={cn(
                              'text-[9px] font-bold px-1 py-0.2 rounded leading-none',
                              isComplete
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : cls.coveredMapelCount > 0
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            )}
                          >
                            {cls.percentage}%
                          </span>
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono leading-none">
                            {cls.coveredMapelCount}/{cls.totalRequiredMapel}
                          </span>
                        </div>
                      </th>
                    );
                  }

                  // Mode Detail: Header Horizontal Standar
                  return (
                    <th
                      key={cls.kelasId}
                      scope="col"
                      className="p-2.5 min-w-[130px] max-w-[150px] text-center border-r border-slate-200 dark:border-slate-800"
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate text-[11px]" title={cls.kelasName}>
                        {cls.kelasName}
                      </div>
                      <div className="mt-1 flex items-center justify-center gap-1.5">
                        <span
                          className={cn(
                            'text-[9.5px] font-bold px-1.5 py-0.2 rounded-full',
                            isComplete
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : cls.coveredMapelCount > 0
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          )}
                        >
                          {cls.coveredMapelCount}/{cls.totalRequiredMapel} ({cls.percentage}%)
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-300',
                            isComplete ? 'bg-emerald-500' : 'bg-indigo-500'
                          )}
                          style={{ width: `${cls.percentage}%` }}
                        />
                      </div>
                    </th>
                  );
                })}

                {/* Kolom Rekap Mapel (Kanan) */}
                <th
                  scope="col"
                  className={cn(
                    'p-2 text-center font-bold text-slate-700 dark:text-slate-200 bg-slate-100/70 dark:bg-slate-800/50 align-bottom pb-3',
                    isFit ? 'w-[70px] min-w-[65px] text-[10px]' : 'min-w-[100px]'
                  )}
                >
                  Kesiapan
                </th>
              </tr>
            </thead>

            {/* Body: Baris Mata Pelajaran */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubjects.map((sub, sIdx) => {
                const isEven = sIdx % 2 === 0;
                return (
                  <tr
                    key={sub.mapelId}
                    className={cn(
                      'hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors',
                      isEven ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-900/50'
                    )}
                  >
                    {/* Freeze Kolom Mapel (Sticky Left) */}
                    <td
                      className={cn(
                        'sticky left-0 z-10 font-medium border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]',
                        isFit ? 'p-2' : 'p-2.5',
                        isEven ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-900'
                      )}
                    >
                      <div
                        className={cn(
                          'font-bold text-slate-800 dark:text-slate-100 leading-tight',
                          isFit ? 'text-[10.5px] line-clamp-2' : 'text-[11px]'
                        )}
                        title={sub.mapelName}
                      >
                        {sub.mapelName}
                      </div>
                      {sub.mapelKode && (
                        <div className="text-[9.5px] font-mono text-slate-400 mt-0.5 truncate">
                          {sub.mapelKode}
                        </div>
                      )}
                    </td>

                    {/* Sel-sel Kelas */}
                    {classes.map((cls) => {
                      const cellKey = `${sub.mapelId}_${cls.kelasId}`;
                      const cell = cellMap.get(cellKey);

                      if (!cell || cell.status === 'NOT_APPLICABLE') {
                        return (
                          <td
                            key={cls.kelasId}
                            className="p-1 text-center border-r border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-950/20 text-slate-300 dark:text-slate-600 select-none text-[10px]"
                            title="Mata pelajaran ini tidak diajarkan di rombel ini"
                          >
                            &mdash;
                          </td>
                        );
                      }

                      // Evaluasi status Nudge jika belum ada bank soal
                      const cellNudgeTargetKey = cell.targetId || (cell.guruPengampuId ? `${cell.guruPengampuId}_${cell.mapelId}_${cell.tingkat}` : '');
                      const cellNudgeMeta = cellNudgeTargetKey ? nudgeHistory[cellNudgeTargetKey] : undefined;
                      const cellHasNudged = Boolean(cellNudgeMeta?.sent_at);
                      const cellNudgeTimeAgo = cellHasNudged ? formatNudgeMinutesAgo(cellNudgeMeta?.sent_at) : null;

                      // Status COVERED: Sel Hijau (Klik untuk Lihat Soal)
                      if (cell.status === 'COVERED') {
                        const coveredTitle = `Mata Pelajaran: ${sub.mapelName}\nKelas: ${cls.kelasName}\nJudul Bank Soal: ${cell.bankTitle || '-'}\nPenyusun: ${cell.guruPembuat || '-'}\nJumlah: ${cell.soalCount || 0} Soal\n(Klik untuk lihat/periksa butir soal)`;

                        // Tampilan Fit / 1 Layar
                        if (isFit) {
                          return (
                            <td
                              key={cls.kelasId}
                              className="p-1 border-r border-slate-100 dark:border-slate-800/80 text-center"
                            >
                              <button
                                type="button"
                                onClick={() => cell.bankSoal && onPeriksaButir && onPeriksaButir(cell.bankSoal)}
                                title={coveredTitle}
                                className={cn(
                                  'w-full h-8 rounded-md border text-center transition-all cursor-pointer group flex flex-col items-center justify-center gap-0.5 shadow-2xs',
                                  cell.isJurusanSpecific
                                    ? 'bg-emerald-50/90 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                                    : 'bg-teal-50/90 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-950/80 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200'
                                )}
                              >
                                <div className="flex items-center justify-center gap-0.5">
                                  <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span className="font-extrabold text-[10px] leading-none">{cell.soalCount}</span>
                                </div>
                                {cell.isJurusanSpecific && (
                                  <span className="text-[7.5px] font-bold px-0.5 rounded bg-emerald-200/90 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 leading-none">
                                    {cls.jurusanKode}
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        }

                        // Tampilan Normal / Detailed
                        return (
                          <td
                            key={cls.kelasId}
                            className="p-1.5 border-r border-slate-100 dark:border-slate-800/80 text-center"
                          >
                            <button
                              type="button"
                              onClick={() => cell.bankSoal && onPeriksaButir && onPeriksaButir(cell.bankSoal)}
                              title={coveredTitle}
                              className={cn(
                                'w-full p-1.5 rounded-lg border text-left transition-all cursor-pointer group flex flex-col gap-0.5',
                                cell.isJurusanSpecific
                                  ? 'bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 border-emerald-300/80 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                  : 'bg-teal-50/60 hover:bg-teal-100/80 dark:bg-teal-950/30 dark:hover:bg-teal-950/60 border-teal-200/80 dark:border-teal-800 text-teal-900 dark:text-teal-200'
                              )}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700 dark:text-emerald-300">
                                  <CheckCircle2 size={11} className="shrink-0" />
                                  <span>{cell.soalCount} Soal</span>
                                </span>
                                {cell.isJurusanSpecific && (
                                  <span className="text-[8.5px] font-bold px-1 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100">
                                    {cls.jurusanKode}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate block group-hover:text-slate-700 dark:group-hover:text-slate-200">
                                {cell.guruPembuat}
                              </span>
                            </button>
                          </td>
                        );
                      }

                      // Status MISSING: Sel Merah Non-Create (Cukup Monitoring & Colek WA)
                      const missingTitle = `Belum Ada Bank Soal\nMata Pelajaran: ${sub.mapelName}\nKelas: ${cls.kelasName}\nGuru Pengampu: ${cell.guruPengampu || '-'}\n${cellHasNudged ? `(Sudah di-WA ${cellNudgeTimeAgo})` : '(Klik untuk info guru pengampu & aksi Colek WA)'}`;

                      // Tampilan Fit / 1 Layar
                      if (isFit) {
                        return (
                          <td
                            key={cls.kelasId}
                            className="p-1 border-r border-slate-100 dark:border-slate-800/80 text-center"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedMissingCell(cell)}
                              title={missingTitle}
                              className={cn(
                                'w-full h-8 rounded-md border text-center transition-all cursor-pointer group flex flex-col items-center justify-center gap-0.5 shadow-2xs',
                                cellHasNudged
                                  ? 'bg-amber-50/80 hover:bg-amber-100/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                                  : 'bg-rose-50/80 hover:bg-rose-100/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/70 text-rose-800 dark:text-rose-200'
                              )}
                            >
                              <div className="flex items-center justify-center gap-0.5">
                                <AlertCircle size={10} className={cellHasNudged ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'} />
                                <span className="font-extrabold text-[9px] leading-none">Belum</span>
                              </div>
                              {cellHasNudged ? (
                                <span className="text-[7.5px] font-bold px-1 rounded-full bg-amber-200/90 dark:bg-amber-800 text-amber-900 dark:text-amber-100 leading-none">
                                  Di-WA
                                </span>
                              ) : (
                                <span className="text-[7.5px] font-medium text-rose-600/90 dark:text-rose-300/90 leading-none truncate max-w-[40px]">
                                  {cell.guruPengampu ? cell.guruPengampu.split(' ')[0] : 'Colek'}
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      }

                      // Tampilan Normal / Detailed
                      return (
                        <td
                          key={cls.kelasId}
                          className="p-1.5 border-r border-slate-100 dark:border-slate-800/80 text-center"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedMissingCell(cell)}
                            title={missingTitle}
                            className={cn(
                              'w-full p-1.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer group',
                              cellHasNudged
                                ? 'bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/30 border-amber-200/90 dark:border-amber-900/60'
                                : 'bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/30 border-rose-200/90 dark:border-rose-900/60'
                            )}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className={cn('inline-flex items-center gap-1 text-[9.5px] font-bold', cellHasNudged ? 'text-amber-700 dark:text-amber-300' : 'text-rose-600 dark:text-rose-400')}>
                                <AlertCircle size={10} className="shrink-0" />
                                <span>Belum Ada</span>
                              </span>
                              {cellHasNudged ? (
                                <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                                  Di-WA
                                </span>
                              ) : (
                                <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                  <MessageSquare size={9} />
                                  <span>Colek</span>
                                </span>
                              )}
                            </div>
                            <span
                              className="text-[9px] text-slate-600 dark:text-slate-300 truncate block group-hover:text-slate-900 dark:group-hover:text-white"
                            >
                              {cell.guruPengampu || '-'}
                            </span>
                          </button>
                        </td>
                      );
                    })}

                    {/* Rekapitulasi per Mapel */}
                    <td
                      className={cn(
                        'text-center font-bold bg-slate-50/60 dark:bg-slate-800/30',
                        isFit ? 'p-1.5 text-[10px]' : 'p-2 text-[11px]'
                      )}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span
                          className={cn(
                            'font-bold rounded-full',
                            isFit ? 'text-[9.5px] px-1 py-0.2 leading-none' : 'text-[10px] px-1.5 py-0.2',
                            sub.percentage === 100
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : sub.coveredClassesCount > 0
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          )}
                        >
                          {sub.percentage}%
                        </span>
                        <span className="text-[8.5px] text-slate-400 font-mono">
                          {sub.coveredClassesCount}/{sub.totalClasses}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer: Rekapitulasi per Kolom Kelas */}
            <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-900/90 font-bold">
              <tr>
                <td
                  className={cn(
                    'sticky left-0 z-10 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]',
                    isFit ? 'p-2 text-[10.5px]' : 'p-2.5'
                  )}
                >
                  Total Ter-cover
                </td>
                {classes.map((cls) => (
                  <td
                    key={cls.kelasId}
                    className={cn(
                      'text-center border-r border-slate-200 dark:border-slate-800',
                      isFit ? 'p-1 text-[9.5px]' : 'p-2 text-[10.5px]'
                    )}
                  >
                    <span
                      className={cn(
                        'px-1 py-0.5 rounded font-bold block',
                        cls.percentage === 100
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {cls.coveredMapelCount}/{cls.totalRequiredMapel}
                    </span>
                  </td>
                ))}
                <td
                  className={cn(
                    'text-center text-indigo-600 dark:text-indigo-400 font-bold',
                    isFit ? 'p-1.5 text-[10px]' : 'p-2 text-[11px]'
                  )}
                >
                  {totalCellsCovered}/{totalCellsRequired} ({overallPercentage}%)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Modal Interaktif: Kesiapan Soal, Info Guru Pengampu & Aksi Colek WA ── */}
      {selectedMissingCell && (
        <Modal
          isOpen={!!selectedMissingCell}
          onClose={() => setSelectedMissingCell(null)}
          title="Kesiapan Bank Soal & Colek Guru"
          size="md"
        >
          <div className="p-5 space-y-4 text-xs">
            {/* Banner Status */}
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5">
              <ShieldAlert size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-rose-800 dark:text-rose-200 text-xs">
                  Bank Soal Belum Tersedia
                </div>
                <p className="text-[11px] text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
                  Sesuai kebijakan pengawasan CBT, meja panitia bertugas memonitor dan memeriksa butir soal. Silakan ingatkan guru pengampu melalui WhatsApp agar naskah segera disiapkan.
                </p>
              </div>
            </div>

            {/* Rincian Rombel & Mapel */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Mata Pelajaran</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block truncate" title={selectedMissingCell.mapelName}>
                  {selectedMissingCell.mapelName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Rombel Kelas</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block">
                  {selectedMissingCell.kelasName}
                </span>
              </div>
            </div>

            {/* Informasi Guru Pengampu */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <User size={12} />
                  <span>Guru Pengampu Kelas</span>
                </span>
                {selectedHasNudged ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    <Clock size={10} />
                    <span>Di-WA ({selectedNudgeTimeAgo})</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Belum dicolek</span>
                )}
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  {selectedMissingCell.guruPengampu || 'Belum Terploting di Kurikulum'}
                </h4>
                {selectedMissingCell.guruPengampuPhone ? (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                    <Phone size={11} />
                    <span>{selectedMissingCell.guruPengampuPhone}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic mt-0.5">
                    (Nomor WhatsApp belum terdaftar di master data guru)
                  </div>
                )}
              </div>

              {selectedHasNudged && selectedNudgeMeta && (
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Pengingat terakhir dikirim oleh <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedNudgeMeta.sent_by}</span> pada {new Date(selectedNudgeMeta.sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.
                </div>
              )}
            </div>

            {/* Aksi Tombol */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedMissingCell(null)}
                className="text-xs h-8 px-3 font-medium"
              >
                Tutup
              </Button>

              {onNudgeWhatsApp && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onNudgeWhatsApp(selectedMissingCell);
                    setSelectedMissingCell(null);
                  }}
                  className="text-xs h-8 px-3.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare size={13} />
                  <span>{selectedHasNudged ? 'Colek Ulang WA' : 'Colek WhatsApp Guru'}</span>
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal Bagikan Matriks ke WhatsApp ── */}
      {isShareModalOpen && (
        <Modal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title="Bagikan Tautan Matriks ke WhatsApp"
          size="md"
        >
          {(() => {
            const currentTingkat = classes[0]?.tingkat || 10;
            const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
            const publicLink = `${currentOrigin}/cbt/public-matrix?tingkat=${currentTingkat}`;
            const targetEvent = eventName || 'Asesmen CBT';
            const targetSchool = schoolName || 'Sekolah';
            const tingkatRomawi = formatTingkatRomawi(currentTingkat);

            const waText = `📢 *MATRIKS KESIAPAN BANK SOAL CBT*\n🏛️ *${targetSchool}*\n📝 *${targetEvent}*\n\n📊 *Progres Tingkat ${tingkatRomawi} (Kelas ${currentTingkat}):*\n- Terisi: *${totalCellsCovered}* dari *${totalCellsRequired}* slot (${overallPercentage}%)\n- Rombel: *${classes.length} Kelas*\n- Mata Pelajaran: *${subjects.length} Mapel*\n\nBapak/Ibu Guru dapat memeriksa status kesiapan butir soal dan kelengkapan mapel rombel masing-masing melalui tautan resmi Meja Panitia:\n👉 ${publicLink}\n\n_Mohon kerja samanya untuk melengkapi butir soal sebelum batas waktu penjadwalan._\n— *Panitia Pelaksana CBT*`;

            const handleCopy = () => {
              navigator.clipboard.writeText(publicLink);
              setCopiedLink(true);
              toast.success('Tautan berhasil disalin ke clipboard!');
              setTimeout(() => setCopiedLink(false), 2000);
            };

            const handleOpenWa = () => {
              const url = `https://wa.me/?text=${encodeURIComponent(waText)}`;
              window.open(url, '_blank');
            };

            return (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-400">
                  Tautan ini dapat diakses secara publik oleh seluruh Dewan Guru tanpa perlu login untuk memantau kelengkapan soal:
                </p>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={publicLink}
                    className="flex-1 bg-transparent border-none text-slate-700 dark:text-slate-300 font-mono text-[11px] focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-[11px] flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                  >
                    {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copiedLink ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-[10.5px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap select-all max-h-48 overflow-y-auto">
                  {waText}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsShareModalOpen(false)}
                    className="text-xs h-8 px-3 font-medium"
                  >
                    Tutup
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleOpenWa}
                    className="text-xs h-8 px-3.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    <span>Kirim ke Grup WhatsApp</span>
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};