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
 * Mendeteksi secara adaptif mode grid terbaik untuk opsi jawaban:
 * 1. 'grid-1-row': Semua opsi sangat pendek (<= 6 karakter, tanpa gambar) -> 4 atau 5 kolom sebaris horizontal.
 * 2. 'grid-2-col': Semua opsi berukuran sedang (<= 28 karakter, tanpa gambar) -> 2 kolom per baris.
 * 3. 'grid-1-col': Opsi panjang (> 28 karakter) atau memiliki gambar -> 1 kolom penuh vertikal.
 */
export function detectOptionGridMode(options: OpsiJawaban[] = []): CbtOptionGridMode {
  if (!Array.isArray(options) || options.length === 0) {
    return 'grid-1-col';
  }

  // Jika ada gambar pada opsi, wajib 1 kolom penuh agar ilustrasi jelas
  const hasImage = options.some((opt) => Boolean(opt.gambar_url));
  if (hasImage) {
    return 'grid-1-col';
  }

  // Hitung panjang teks terpanjang dari opsi yang ada
  const maxLen = Math.max(
    ...options.map((opt) => (opt.teks || '').trim().length)
  );

  // Jika teks sangat pendek (misal: 'a', '10', 'Ya', 'x=2', <= 6 karakter)
  if (maxLen <= 6) {
    return 'grid-1-row';
  }

  // Jika teks pendek/sedang (1-3 kata, <= 28 karakter)
  if (maxLen <= 28) {
    return 'grid-2-col';
  }

  // Default: kalimat panjang atau multiline
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
                  'p-2 sm:p-3 rounded-xl border flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 select-none text-center min-w-0 cursor-pointer active:scale-95',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500/60'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900 text-slate-200'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors',
                    isSelected
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'bg-slate-800 text-slate-300'
                  )}
                >
                  {opt.kode}
                </div>
                <span className="text-xs sm:text-sm font-bold truncate">
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
                  'p-3 sm:p-3.5 rounded-xl border flex items-center gap-2.5 transition-all duration-150 select-none min-w-0',
                  !readOnly && 'cursor-pointer active:scale-[0.99]',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-md ring-1 ring-indigo-500'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 text-slate-200'
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors',
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300'
                  )}
                >
                  {opt.kode}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 line-clamp-2 leading-snug">
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
                  'w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 transition-colors mt-0.5',
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300'
                )}
              >
                {opt.kode}
              </div>
              <div className="flex-1 min-w-0 space-y-2 pt-1">
                {(opt.teks?.trim() || !opt.gambar_url) && (
                  <p className="text-sm font-medium text-slate-200 leading-relaxed">
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
                'p-1.5 sm:p-2 rounded-xl border flex items-center justify-center gap-1 sm:gap-1.5 transition-all text-center min-w-0',
                isCorrectKey
                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/50 shadow-2xs'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-black shrink-0',
                  isCorrectKey
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800'
                )}
              >
                {isCorrectKey ? <Check size={11} className="stroke-[3]" /> : opt.kode}
              </div>
              <span className="text-xs font-bold truncate">
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
                'p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all min-w-0',
                isCorrectKey
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/40'
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0',
                    isCorrectKey
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800'
                  )}
                >
                  {isCorrectKey ? <Check size={11} className="stroke-[3]" /> : opt.kode}
                </div>
                <p className="text-xs font-semibold truncate leading-tight">
                  {opt.teks || '-'}
                </p>
              </div>

              {isCorrectKey && (
                <span className="text-[9.5px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded shrink-0">
                  Kunci
                </span>
              )}
            </div>
          );
        }

        // Full-Width (1 Column Stack)
        return (
          <div
            key={opt.kode}
            className={cn(
              'p-2 sm:p-2.5 rounded-xl border flex items-start gap-2.5 transition-all min-w-0',
              isCorrectKey
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5',
                isCorrectKey
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800'
              )}
            >
              {isCorrectKey ? <Check size={12} className="stroke-[2.5]" /> : opt.kode}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              {(opt.teks?.trim() || !opt.gambar_url) && (
                <p
                  className={cn(
                    'text-xs leading-relaxed',
                    isCorrectKey
                      ? 'text-emerald-950 dark:text-emerald-200 font-bold'
                      : 'text-slate-700 dark:text-slate-300 font-medium'
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
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0 self-center">
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
