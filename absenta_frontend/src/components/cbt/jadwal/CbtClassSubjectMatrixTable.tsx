import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Eye,
  FileQuestion,
  GraduationCap,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  StretchHorizontal,
  LayoutGrid,
} from 'lucide-react';
import type { CbtBankSoal } from '@/types/cbt.types';
import type { ClassSubjectMatrixResult, MatrixCellData } from './cbtClassSubjectMatrixHelper';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { cn } from '@/lib/utils';

interface CbtClassSubjectMatrixTableProps {
  matrixResult: ClassSubjectMatrixResult;
  searchQuery?: string;
  onPeriksaButir?: (bank: CbtBankSoal) => void;
  onCreateForCell?: (mapelId: string, tingkat: number, guruId?: string, jurusan?: string) => void;
}

export const CbtClassSubjectMatrixTable: React.FC<CbtClassSubjectMatrixTableProps> = ({
  matrixResult,
  searchQuery = '',
  onPeriksaButir,
  onCreateForCell,
}) => {
  const { classes, subjects, cellMap, totalCellsCovered, totalCellsRequired, overallPercentage } = matrixResult;

  // View mode: 'fit' (Muat 20 kelas dalam 1 layar tanpa horizontal scroll) atau 'detailed' (Lebar + scroll horizontal)
  const [viewMode, setViewMode] = useState<'fit' | 'detailed'>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

          {/* Legend */}
          <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 pl-2 border-l border-slate-200 dark:border-slate-700">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Ter-cover</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Belum Ada</span>
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

                      // Status COVERED
                      if (cell.status === 'COVERED') {
                        // Tampilan Fit / 1 Layar: Chip Kompak
                        if (isFit) {
                          return (
                            <td
                              key={cls.kelasId}
                              className="p-1 border-r border-slate-100 dark:border-slate-800/80 text-center"
                            >
                              <button
                                type="button"
                                onClick={() => cell.bankSoal && onPeriksaButir && onPeriksaButir(cell.bankSoal)}
                                title={`Mata Pelajaran: ${sub.mapelName}\nKelas: ${cls.kelasName}\nJudul Bank Soal: ${cell.bankTitle}\nPenyusun: ${cell.guruPembuat}\nJumlah: ${cell.soalCount} Soal\n(Klik untuk periksa butir soal)`}
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

                        // Tampilan Normal: Kartu Lebar
                        return (
                          <td
                            key={cls.kelasId}
                            className="p-1.5 border-r border-slate-100 dark:border-slate-800/80 text-center"
                          >
                            <button
                              type="button"
                              onClick={() => cell.bankSoal && onPeriksaButir && onPeriksaButir(cell.bankSoal)}
                              title={`Judul: ${cell.bankTitle}\nPenyusun: ${cell.guruPembuat}\nKlik untuk periksa butir soal`}
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

                      // Status MISSING
                      // Tampilan Fit / 1 Layar: Chip Kompak + Tombol Buat Cepat
                      if (isFit) {
                        return (
                          <td
                            key={cls.kelasId}
                            className="p-1 border-r border-slate-100 dark:border-slate-800/80 text-center"
                          >
                            <div
                              title={`Belum Ada Bank Soal\nMata Pelajaran: ${sub.mapelName}\nKelas: ${cls.kelasName}\nGuru Pengampu: ${cell.guruPengampu || '-'}\n(Klik tombol Buat untuk mengisi bank soal)`}
                              className="w-full h-8 rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 flex items-center justify-center p-0.5"
                            >
                              {onCreateForCell ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onCreateForCell(
                                      cell.mapelId,
                                      cell.tingkat,
                                      cell.guruPengampuId,
                                      cell.jurusanKode
                                    )
                                  }
                                  className="w-full h-full rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] flex items-center justify-center gap-0.5 transition-colors cursor-pointer shadow-2xs"
                                  title={`Buat Bank Soal: ${sub.mapelName} (${cls.kelasName})`}
                                >
                                  <Plus size={10} className="shrink-0" />
                                  <span>Buat</span>
                                </button>
                              ) : (
                                <span className="text-[8.5px] font-bold text-rose-500">Kosong</span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // Tampilan Normal: Kartu Lebar
                      return (
                        <td
                          key={cls.kelasId}
                          className="p-1.5 border-r border-slate-100 dark:border-slate-800/80 text-center"
                        >
                          <div className="w-full p-1.5 rounded-lg border border-rose-200/90 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 text-left flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-rose-600 dark:text-rose-400">
                                <AlertCircle size={10} className="shrink-0" />
                                <span>Belum Ada</span>
                              </span>
                              {onCreateForCell && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onCreateForCell(
                                      cell.mapelId,
                                      cell.tingkat,
                                      cell.guruPengampuId,
                                      cell.jurusanKode
                                    )
                                  }
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors shadow-2xs shrink-0 flex items-center gap-0.5"
                                  title={`Buat Bank Soal untuk ${sub.mapelName} (${cls.kelasName})`}
                                >
                                  <Plus size={9} />
                                  <span>Buat</span>
                                </button>
                              )}
                            </div>
                            <span
                              className="text-[9px] text-rose-700/80 dark:text-rose-300/80 truncate block"
                              title={`Guru Pengampu: ${cell.guruPengampu || '-'}`}
                            >
                              {cell.guruPengampu || '-'}
                            </span>
                          </div>
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
    </div>
  );
};
