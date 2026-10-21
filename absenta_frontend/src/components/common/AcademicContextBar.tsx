import React from 'react';
import { cn } from '@/lib/utils';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AcademicContextBarVariant =
  /** Inline, tanpa label — cocok untuk toolbar / topSlot halaman */
  | 'toolbar'
  /** Dengan label kecil di atas tiap dropdown — cocok untuk panel filter */
  | 'filter';

export interface AcademicContextBarProps {
  // ── Nilai terpilih ──
  tahunPelajaranId: string;
  semesterId: string;

  // ── Handler perubahan ──
  onTahunPelajaranChange: (id: string) => void;
  onSemesterChange: (id: string) => void;

  // ── Options (dari useAcademicContext atau hook terpisah) ──
  tpOptions: SearchableSelectOption[];
  semesterOptions: SearchableSelectOption[];

  // ── Loading state ──
  isLoadingTp?: boolean;
  isLoadingSem?: boolean;

  // ── Varian tampilan ──
  /**
   * - `toolbar` (default): inline tanpa label, lebar fixed, cocok di header halaman
   * - `filter`: dengan label teks kecil di atas, lebar mengikuti parent/min-width
   */
  variant?: AcademicContextBarVariant;

  // ── Optional overrides ──
  /** Class tambahan pada wrapper terluar */
  className?: string;
  /** Nonaktifkan dropdown TP */
  tpDisabled?: boolean;
  /** Nonaktifkan dropdown Semester */
  semDisabled?: boolean;
  /** ID untuk aksesibilitas — jika diisi, di-suffix dengan "-tp" dan "-sem" */
  id?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bar selector Tahun Pelajaran + Semester yang bisa dipakai di semua halaman.
 *
 * Gunakan bersama `useAcademicContext()` agar tidak perlu menulis state/hook sendiri.
 *
 * @example
 * // Di toolbar halaman:
 * const ctx = useAcademicContext({ initialTpId: tpParam, initialSemId: semParam });
 * <AcademicContextBar
 *   tahunPelajaranId={ctx.selectedTahunPelajaran}
 *   semesterId={ctx.selectedSemester}
 *   onTahunPelajaranChange={ctx.handleTpChange}
 *   onSemesterChange={ctx.handleSemesterChange}
 *   tpOptions={ctx.tpOptions}
 *   semesterOptions={ctx.semesterOptions}
 *   isLoadingTp={ctx.isLoadingTp}
 *   isLoadingSem={ctx.isLoadingSem}
 *   variant="toolbar"
 * />
 */
// ── FLAG DEBUG IDENTIFIKASI MIGRASI (DEV MODE ONLY) ───────────
// Otomatis aktif HANYA pada lingkungan development (import.meta.env.DEV).
// Menandai komponen legacy AcademicContextBar dengan border warna UNGU.
const DEBUG_BORDER_ACADEMIC_CONTEXT = Boolean(import.meta.env.DEV);

export function AcademicContextBar({
  tahunPelajaranId,
  semesterId,
  onTahunPelajaranChange,
  onSemesterChange,
  tpOptions,
  semesterOptions,
  isLoadingTp = false,
  isLoadingSem = false,
  variant = 'toolbar',
  className,
  tpDisabled = false,
  semDisabled = false,
  id,
}: AcademicContextBarProps) {
  const tpId = id ? `${id}-tp` : 'academic-ctx-tp';
  const semId = id ? `${id}-sem` : 'academic-ctx-sem';

  // ── Varian: toolbar ──────────────────────────────────────────────────────
  if (variant === 'toolbar') {
    return (
      <div
        className={cn(
          'relative grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto transition-all',
          DEBUG_BORDER_ACADEMIC_CONTEXT &&
            'p-2 rounded-xl !border-2 !border-purple-600 shadow-md shadow-purple-600/10 ring-2 ring-purple-600/20 bg-purple-50/20 dark:bg-purple-950/20',
          className
        )}
      >
        {DEBUG_BORDER_ACADEMIC_CONTEXT && (
          <span className="absolute -top-2.5 right-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-700 text-white rounded-md shadow-xs pointer-events-none select-none z-20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
            AcademicContextBar (Legacy)
          </span>
        )}

        {/* Tahun Pelajaran */}
        <div className="w-full sm:w-52 min-w-0">
          <SearchableSelect
            id={tpId}
            aria-label="Pilih tahun pelajaran"
            value={tahunPelajaranId}
            onValueChange={onTahunPelajaranChange}
            options={tpOptions}
            placeholder="Tahun Pelajaran"
            isLoading={isLoadingTp}
            disabled={tpDisabled}
          />
        </div>

        {/* Semester */}
        <div className="w-full sm:w-44 min-w-0">
          <SearchableSelect
            id={semId}
            aria-label="Pilih semester"
            value={semesterId}
            onValueChange={onSemesterChange}
            options={semesterOptions}
            placeholder="Semester"
            isLoading={isLoadingSem}
            disabled={semDisabled}
          />
        </div>
      </div>
    );
  }

  // ── Varian: filter (dengan label di atas) ────────────────────────────────
  return (
    <div
      className={cn(
        'relative flex items-end gap-3 flex-wrap transition-all',
        DEBUG_BORDER_ACADEMIC_CONTEXT &&
          'p-3 rounded-xl !border-2 !border-purple-600 shadow-md shadow-purple-600/10 ring-2 ring-purple-600/20 bg-purple-50/20 dark:bg-purple-950/20',
        className
      )}
    >
      {DEBUG_BORDER_ACADEMIC_CONTEXT && (
        <span className="absolute -top-2.5 right-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-700 text-white rounded-md shadow-xs pointer-events-none select-none z-20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
          AcademicContextBar (Legacy)
        </span>
      )}

      {/* Tahun Pelajaran */}
      <div className="space-y-1 w-full max-w-full min-w-0 sm:w-auto">
        <label
          htmlFor={tpId}
          className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block"
        >
          Tahun Pelajaran
        </label>
        <SearchableSelect
          id={tpId}
          value={tahunPelajaranId}
          onValueChange={onTahunPelajaranChange}
          options={tpOptions}
          placeholder="Pilih TP"
          isLoading={isLoadingTp}
          disabled={tpDisabled}
          className="w-full max-w-full min-w-0 sm:min-w-[210px]"
        />
      </div>

      {/* Semester */}
      <div className="space-y-1 w-full max-w-full min-w-0 sm:w-auto">
        <label
          htmlFor={semId}
          className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block"
        >
          Semester
        </label>
        <SearchableSelect
          id={semId}
          value={semesterId}
          onValueChange={onSemesterChange}
          options={semesterOptions}
          placeholder="Pilih Semester"
          isLoading={isLoadingSem}
          disabled={semDisabled}
          className="w-full max-w-full min-w-0 sm:min-w-[170px]"
        />
      </div>
    </div>
  );
}
