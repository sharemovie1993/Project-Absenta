import React, { useMemo } from 'react';
import { Check, CheckCircle2 } from 'lucide-react';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';
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
 * Warna badge opsi huruf (A, B, C, D, E) dengan identitas warna blok segar
 * agar siswa tidak merasa jenuh selama mengerjakan ujian.
 */
export function getOptionBadgeColor(
  kode: string,
  isCorrectKey: boolean,
  isSelected: boolean = false,
  isExam: boolean = false
): string {
  // Mode Ujian Siswa (Exam Room - Color-Coded per Huruf Opsi)
  if (isExam) {
    if (isSelected) {
      return 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-black';
    }
    const k = (kode || '').toUpperCase().trim();
    if (k === 'A') return 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-black';
    if (k === 'B') return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-black';
    if (k === 'C') return 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-black';
    if (k === 'D') return 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 font-black';
    if (k === 'E') return 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 font-black';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-bold';
  }

  // Mode Pratinjau Guru - Jika Opsi ini adalah Kunci Jawaban (Wajib Emerald Green)
  if (isCorrectKey) {
    return 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-black';
  }

  // Mode Pratinjau Guru - Satu warna selaras ekosistem dashboard (Indigo/Purple Ruang Pendidik)
  return 'bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/90 dark:border-indigo-800/80 shadow-2xs font-bold';
}

/**
 * Blok warna latar kartu pilihan jawaban (Anti-Jenuh / Fresh Block Themes)
 */
export function getOptionCardStyle(kode: string, isSelected: boolean): string {
  if (isSelected) {
    return 'border-2 border-indigo-600 bg-gradient-to-r from-indigo-50 via-indigo-50/80 to-blue-50/70 dark:from-indigo-950/70 dark:via-indigo-950/50 dark:to-blue-950/40 text-indigo-950 dark:text-white shadow-xs ring-2 ring-indigo-500/25';
  }
  const k = (kode || '').toUpperCase().trim();
  if (k === 'A') {
    return 'border border-blue-200/90 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/50 via-white to-blue-50/15 dark:from-slate-900 dark:via-slate-900/80 dark:to-blue-950/20 hover:border-blue-400 hover:bg-blue-50/70 text-slate-800 dark:text-slate-200';
  }
  if (k === 'B') {
    return 'border border-emerald-200/90 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/15 dark:from-slate-900 dark:via-slate-900/80 dark:to-emerald-950/20 hover:border-emerald-400 hover:bg-emerald-50/70 text-slate-800 dark:text-slate-200';
  }
  if (k === 'C') {
    return 'border border-amber-200/90 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/15 dark:from-slate-900 dark:via-slate-900/80 dark:to-amber-950/20 hover:border-amber-400 hover:bg-amber-50/70 text-slate-800 dark:text-slate-200';
  }
  if (k === 'D') {
    return 'border border-purple-200/90 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/50 via-white to-purple-50/15 dark:from-slate-900 dark:via-slate-900/80 dark:to-purple-950/20 hover:border-purple-400 hover:bg-purple-50/70 text-slate-800 dark:text-slate-200';
  }
  if (k === 'E') {
    return 'border border-rose-200/90 dark:border-rose-900/60 bg-gradient-to-r from-rose-50/50 via-white to-rose-50/15 dark:from-slate-900 dark:via-slate-900/80 dark:to-rose-950/20 hover:border-rose-400 hover:bg-rose-50/70 text-slate-800 dark:text-slate-200';
  }
  return 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200';
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

        // ── MODE 1: UJIAN SISWA (EXAM ROOM - THEME ADAPTIVE: LIGHT & DARK) ──
        if (isExam) {
          if (is1Row) {
            return (
              <button
                key={opt.kode}
                type="button"
                onClick={() => !readOnly && onSelectAnswer?.(opt.kode)}
                disabled={readOnly}
                className={cn(
                  'p-2 sm:p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all duration-150 select-none text-center min-w-0 cursor-pointer active:scale-95 shadow-2xs',
                  getOptionCardStyle(opt.kode, isSelected)
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
                  'p-2.5 sm:p-3.5 rounded-xl border flex items-start gap-2.5 transition-all duration-150 select-none min-w-0 shadow-2xs',
                  !readOnly && 'cursor-pointer active:scale-[0.99]',
                  getOptionCardStyle(opt.kode, isSelected)
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
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words whitespace-normal">
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
                'p-3 sm:p-4 rounded-xl border flex items-start gap-3 transition-all duration-150 select-none min-w-0 shadow-2xs',
                !readOnly && 'cursor-pointer active:scale-[0.99]',
                getOptionCardStyle(opt.kode, isSelected)
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
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed break-words whitespace-normal">
                    {opt.teks || '-'}
                  </p>
                )}
                {opt.gambar_url && (
                  <img
                    src={resolveProfilePhotoUrl(opt.gambar_url)}
                    alt={`Opsi ${opt.kode}`}
                    decoding="async"
                    className="max-h-36 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1"
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
                  : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-800'
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
                  : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-800'
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
                : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-800'
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
                  src={resolveProfilePhotoUrl(opt.gambar_url)}
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
