import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileText, Award, Lock, CheckCircle2, Clock } from 'lucide-react';
import type { SemesterDocumentOption } from '../../../types/cetakRapor.types';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

export interface SmartSemesterDropdownProps {
  studentId: string;
  studentName: string;
  documentType: 'RAPOR_SEMESTER' | 'RAPOR_SUMATIF';
  semesterList?: SemesterDocumentOption[];
  isLoading?: boolean;
  onSelectSemester: (semesterOption: SemesterDocumentOption) => void;
  className?: string;
}

export const SmartSemesterDropdown: React.FC<SmartSemesterDropdownProps> = React.memo(({
  studentId,
  studentName,
  documentType,
  semesterList = [],
  isLoading = false,
  onSelectSemester,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isRaporSemester = documentType === 'RAPOR_SEMESTER';
  const triggerLabel = isRaporSemester ? 'Rapor' : 'Sumatif';
  const Icon = isRaporSemester ? FileText : Award;

  const triggerColorClasses = isRaporSemester
    ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs focus:ring-blue-500'
    : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-xs focus:ring-teal-500';

  // Hitung jumlah semester yang siap cetak
  const readyCount = semesterList.filter((s) =>
    isRaporSemester ? s.hasNilaiRapor : s.hasNilaiSumatif
  ).length;

  return (
    <div className={cn('relative inline-block text-left', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center gap-1 h-7 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer whitespace-nowrap',
          triggerColorClasses,
          isLoading && 'opacity-60 cursor-not-allowed'
        )}
        title={`${isRaporSemester ? 'Rapor Semester (CK1-CK2)' : 'Rapor Penilaian Sumatif'} untuk ${studentName}`}
        aria-expanded={isOpen}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span>{triggerLabel}</span>
        {readyCount > 0 && (
          <span className="px-1 py-0.2 text-[9px] rounded-full bg-white/25 font-bold leading-none">
            {readyCount}
          </span>
        )}
        <ChevronDown
          className={cn('w-3 h-3 transition-transform duration-200 shrink-0', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-72 max-w-[calc(100vw-32px)] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 py-2 focus:outline-none transform transition-all duration-150 animate-in fade-in slide-in-from-top-1 max-h-[80vh] overflow-y-auto">
          {/* Header Popover */}
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isRaporSemester ? 'PILIH RAPOR SEMESTER' : 'PILIH RAPOR SUMATIF'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {readyCount} dari {semesterList.length} Tersedia
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
              {studentName}
            </p>
          </div>

          {/* List Semester */}
          <div className="py-1 divide-y divide-slate-100/70 dark:divide-slate-800/70">
            {semesterList.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                Belum ada data semester tercatat
              </div>
            ) : (
              semesterList.map((sem) => {
                const isReady = isRaporSemester ? sem.hasNilaiRapor : sem.hasNilaiSumatif;

                if (!isReady) {
                  return (
                    <button
                      key={sem.semesterNumber}
                      type="button"
                      onClick={() => {
                        toast.warning(
                          `${sem.semesterNama} (${sem.tingkatLabel}): ${sem.statusLabel || 'Nilai belum diinput ke sistem'}`
                        );
                      }}
                      className="w-full text-left flex items-start gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-not-allowed group border-l-2 border-slate-200 dark:border-slate-800"
                      title={`🔒 ${sem.semesterNama} Terkunci: ${sem.statusLabel || 'Nilai belum diinput'}`}
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <Clock className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                        <Lock className="w-2.5 h-2.5 text-amber-500 absolute -bottom-1 -right-1 drop-shadow-xs" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            {sem.semesterNama}
                          </span>
                          <span className="text-[10px] px-1 py-0.2 rounded-sm bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal">
                            {sem.tingkatLabel}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          T.A. {sem.tahunPelajaranTahun}
                        </div>
                        <div
                          className="text-[10px] text-amber-600 dark:text-amber-400 truncate mt-0.5 font-normal"
                          title={sem.statusLabel}
                        >
                          🔒 {sem.statusLabel || 'Nilai belum tersedia'}
                        </div>
                      </div>
                    </button>
                  );
                }

                return (
                  <button
                    key={sem.semesterNumber}
                    type="button"
                    onClick={() => {
                      onSelectSemester(sem);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full text-left flex items-start gap-2.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer group border-l-2',
                      isRaporSemester
                        ? 'border-blue-500 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200'
                        : 'border-teal-500 hover:bg-teal-50/70 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-200'
                    )}
                  >
                    <CheckCircle2
                      className={cn(
                        'w-4 h-4 shrink-0 mt-0.5',
                        isRaporSemester ? 'text-blue-600 dark:text-blue-400' : 'text-teal-600 dark:text-teal-400'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {sem.semesterNama}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                          Siap Cetak
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {sem.tingkatLabel} • T.A. {sem.tahunPelajaranTahun}
                      </div>
                      {sem.totalMapelDinilai > 0 && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                          ✓ {sem.totalMapelDinilai} Mata Pelajaran Terisi
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});

SmartSemesterDropdown.displayName = 'SmartSemesterDropdown';
