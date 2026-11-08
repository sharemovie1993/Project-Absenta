import React, { useMemo } from 'react';
import { Check, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpsiJawaban } from '@/types/cbt.types';

export type CbtOptionGridMode = 'grid-1-row' | 'grid-2-col' | 'grid-1-col';

export interface CbtOptionsRendererProps {
  options?: OpsiJawaban[];
  kunciJawaban?: string;
  selectedAnswer?: string | null;
  onSelectAnswer?: (kode: string) => void;
  readOnly?: boolean;
  modeContext?: 'preview' | 'exam';
  className?: string;
  forceGridMode?: 'auto' | CbtOptionGridMode;
}

/**
 * Palet warna pembeda khas untuk setiap opsi huruf (A, B, C, D, E)
 * agar ada kontras jelas antara huruf opsi dan isi teks opsi jawaban.
 */
export function getOptionBadgeColor(
  kode: string,
  isCorrectKey: boolean,
  isSelected: boolean = false,
  isExam: boolean = false
): string {
  // Mode Ujian Siswa (Exam Room - Dark Theme)
  if (isExam) {
    if (isSelected) {
      return 'bg-white text-indigo-700 border-white shadow-xs font-black';
    }
    switch (kode.toUpperCase()) {
      case 'A':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'B':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'C':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'D':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'E':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  }

  // Mode Pratinjau Guru - Jika Opsi ini adalah Kunci Jawaban
  if (isCorrectKey) {
    return 'bg-emerald-600 text-white border-emerald-600 shadow-2xs';
  }

  // Mode Pratinjau Guru - Warna Pembeda Khusus per Huruf Opsi (A, B, C, D, E)
  switch (kode.toUpperCase()) {
    case 'A':
      return 'bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800';
    case 'B':
      return 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
    case 'C':
      return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    case 'D':
      return 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800';
    case 'E':
      return 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  }
}

/**
 * Mendeteksi secara adaptif mode grid terbaik untuk opsi jawaban:
 * 1. 'grid-1-row': Semua opsi sangat pendek (<= 5 karakter, tanpa gambar) -> 4 atau 5 kolom sebaris horizontal.
 * 2. 'grid-2-col': Semua opsi berukuran ringkas (1-3 kata pendek, <= 20 karakter, tanpa gambar) -> 2 kolom per baris.
 * 3. 'grid-1-col': Opsi kalimat panjang (> 20 karakter), memiliki gambar, atau multi-line -> 1 kolom penuh vertikal.
 *
 * PERHATIAN: Dilarang keras melakukan truncate (...) atau line-clamp pada opsi jawaban!
 * Seluruh teks opsi wajib ditampilkan utuh (break-words whitespace-normal).
 */
export function detectOptionGridMode(options: OpsiJawaban[] = []): CbtOptionGridMode {
  if (!Array.isArray(options) || options.length === 0) {
    return 'grid-1-col';
  }

  // Jika ada gambar pada salah satu opsi, wajib 1 kolom penuh agar ilustrasi jelas dan proporsional
  const hasImage = options.some((opt) => Boolean(opt.gambar_url));
  if (hasImage) {
    return 'grid-1-col';
  }

  // Hitung panjang teks terpanjang dari opsi yang ada
  const maxLen = Math.max(
    ...options.map((opt) => (opt.teks || '').trim().length)
  );

  // 1. Grid 1 Row (4 atau 5 kolom sebaris):
  // Khusus opsi sangat pendek (misal: 'a', '10', 'Ya', 'x=2', <= 5 karakter)
  if (maxLen <= 5) {
    return 'grid-1-row';
  }

  // 2. Grid 2 Row 2 Kolom (2 kolom seimbang):
  // Opsi frasa ringkas (1-3 kata pendek, <= 20 karakter)
  if (maxLen <= 20) {
    return 'grid-2-col';
  }

  // 3. Grid 4 Row 1 Kolom (1 kolom penuh):
  // Kalimat panjang (> 20 karakter), paragraf, atau multi-line
  return 'grid-1-col';
}

/**
 * Menghasilkan kelas CSS Tailwind Grid berdasarkan mode dan jumlah opsi
 */
export function getOptionGridClasses(mode: CbtOptionGridMode, totalOptions: number = 5): string {
  if (mode === 'grid-1-row') {
    // 1 baris: jika <= 4 opsi pakai 4 kolom, jika 5 opsi pakai 5 kolom
    return totalOptions <= 4
      ? 'grid grid-cols-4 gap-1.5 sm:gap-2'
      : 'grid grid-cols-5 gap-1 sm:gap-2';
  }

  if (mode === 'grid-2-col') {
    // 2 kolom (Grid 2 row 2 kolom untuk opsi 4 pilihan)
    return 'grid grid-cols-2 gap-2 sm:gap-2.5';
  }

  // 1 kolom penuh (standar)
  return 'grid grid-cols-1 gap-2';
}

export const CbtOptionsRenderer: React.FC<CbtOptionsRendererProps> = React.memo(({
  options = [],
  kunciJawaban,
  selectedAnswer,
  onSelectAnswer,
  readOnly = false,
  modeContext = 'preview',
  className,
  forceGridMode = 'auto',
}) => {
  const safeOptions = Array.isArray(options) ? options : [];

  const effectiveGridMode: CbtOptionGridMode = useMemo(() => {
    if (forceGridMode !== 'auto') return forceGridMode;
    return detectOptionGridMode(safeOptions);
  }, [forceGridMode, safeOptions]);

  const gridClass = useMemo(() => {
    return getOptionGridClasses(effectiveGridMode, safeOptions.length);
  }, [effectiveGridMode, safeOptions.length]);

  if (safeOptions.length === 0) {
    return null;
  }

  const isExam = modeContext === 'exam';
  const is1Row = effectiveGridMode === 'grid-1-row';
  const is2Col = effectiveGridMode === 'grid-2-col';

  return (
    <div className={cn(gridClass, className)}>
      {safeOptions.map((opt) => {
        const isCorrectKey = kunciJawaban === opt.kode;
        const isSelected = selectedAnswer === opt.kode;
        const badgeColorClass = getOptionBadgeColor(opt.kode, isCorrectKey, isSelected, isExam);

        // ── MODE 1: UJIAN SISWA (EXAM ROOM - DARK THEME) ──
        if (isExam) {
          if (is1Row) {
            return (
              <button
                key={opt.kode}
                type="button"
                onClick={() => !readOnly && onSelectAnswer?.(opt.kode)}
                disabled={readOnly}
                className={cn(
                  'p-2 sm:p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all duration-150 select-none text-center min-w-0 cursor-pointer active:scale-95',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500/60'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900 text-slate-200'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors border',
                    badgeColorClass
                  )}
                >
                  {opt.kode}
                </div>
                <span className="text-xs sm:text-sm font-bold break-words whitespace-normal leading-tight">
                  {opt.teks || '-'}
                </span>
              </button>
            );
          }

          if (is2Col) {
            return (
              <div
                key={opt.kode}
                onClick={() => !readOnly && onSelectAnswer?.(opt.kode)}
                className={cn(
                  'p-2.5 sm:p-3.5 rounded-xl border flex items-start gap-2.5 transition-all duration-150 select-none min-w-0',
                  !readOnly && 'cursor-pointer active:scale-[0.99]',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-md ring-1 ring-indigo-500'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 text-slate-200'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors mt-0.5 border',
                    badgeColorClass
                  )}
                >
                  {opt.kode}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-snug break-words whitespace-normal">
                    {opt.teks || '-'}
                  </p>
                </div>
              </div>
            );
          }

          // Full-Width (1 Column Stack)
          return (
            <div
              key={opt.kode}
              onClick={() => !readOnly && onSelectAnswer?.(opt.kode)}
              className={cn(
                'p-3 sm:p-4 rounded-xl border flex items-start gap-3 transition-all duration-150 select-none min-w-0',
                !readOnly && 'cursor-pointer active:scale-[0.99]',
                isSelected
                  ? 'border-indigo-500 bg-indigo-600/15 text-white shadow-md ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 text-slate-200'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 transition-colors mt-0.5 border',
                  badgeColorClass
                )}
              >
                {opt.kode}
              </div>
              <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                {(opt.teks?.trim() || !opt.gambar_url) && (
                  <p className="text-sm font-medium text-slate-200 leading-relaxed break-words whitespace-normal">
                    {opt.teks || '-'}
                  </p>
                )}
                {opt.gambar_url && (
                  <img
                    src={opt.gambar_url}
                    alt={`Opsi ${opt.kode}`}
                    decoding="async"
                    className="max-h-36 object-contain rounded-lg border border-slate-700 bg-white/95 p-1"
                  />
                )}
              </div>
            </div>
          );
        }

        // ── MODE 2: PREVIEW EDITOR GURU (LIGHT & DARK THEME ADAPTIF) ──
        if (is1Row) {
          return (
            <div
              key={opt.kode}
              className={cn(
                'p-1.5 sm:p-2 rounded-xl border flex items-center justify-center gap-1 sm:gap-1.5 transition-all text-center min-w-0 shadow-2xs',
                isCorrectKey
                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/50'
                  : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 border transition-transform',
                  badgeColorClass
                )}
              >
                {isCorrectKey ? <Check size={11} className="stroke-[3]" /> : opt.kode}
              </div>
              <span className="text-xs font-bold break-words whitespace-normal leading-tight">
                {opt.teks || '-'}
              </span>
            </div>
          );
        }

        if (is2Col) {
          return (
            <div
              key={opt.kode}
              className={cn(
                'p-2 sm:p-2.5 rounded-xl border flex items-start gap-2 transition-all min-w-0 shadow-2xs',
                isCorrectKey
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500/50'
                  : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 border shadow-2xs',
                  badgeColorClass
                )}
              >
                {isCorrectKey ? <Check size={11} className="stroke-[3]" /> : opt.kode}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p
                  className={cn(
                    'text-xs font-semibold leading-snug break-words whitespace-normal',
                    isCorrectKey
                      ? 'text-emerald-950 dark:text-emerald-100 font-bold'
                      : 'text-slate-800 dark:text-slate-200'
                  )}
                >
                  {opt.teks || '-'}
                </p>

                {isCorrectKey && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded shadow-2xs">
                    <CheckCircle2 size={10} /> Kunci
                  </span>
                )}
              </div>
            </div>
          );
        }

        // Full-Width (1 Column Stack)
        return (
          <div
            key={opt.kode}
            className={cn(
              'p-2.5 sm:p-3 rounded-xl border flex items-start gap-2.5 transition-all min-w-0 shadow-2xs',
              isCorrectKey
                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-500/30'
                : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[11.5px] font-black shrink-0 mt-0.5 border shadow-2xs',
                badgeColorClass
              )}
            >
              {isCorrectKey ? <Check size={12} className="stroke-[2.5]" /> : opt.kode}
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              {(opt.teks?.trim() || !opt.gambar_url) && (
                <p
                  className={cn(
                    'text-xs leading-relaxed break-words whitespace-normal',
                    isCorrectKey
                      ? 'text-emerald-950 dark:text-emerald-200 font-bold'
                      : 'text-slate-800 dark:text-slate-200 font-medium'
                  )}
                >
                  {opt.teks || '-'}
                </p>
              )}
              {opt.gambar_url && (
                <img
                  src={opt.gambar_url}
                  alt={`Opsi ${opt.kode}`}
                  className="max-h-24 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1"
                />
              )}
            </div>

            {isCorrectKey && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0 self-start shadow-2xs">
                <CheckCircle2 size={11} /> Kunci
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

CbtOptionsRenderer.displayName = 'CbtOptionsRenderer';
