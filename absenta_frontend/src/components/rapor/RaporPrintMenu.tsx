import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  ChevronDown,
  FileText,
  BookOpen,
  UserCheck,
  Award,
  Sparkles,
  Briefcase,
  GraduationCap,
  Lock,
} from 'lucide-react';
import { useRaporPdf } from '../../hooks/useRaporPdf';
import type { DokumenEligibility } from '../../types/cetakRapor.types';
import { toast } from 'sonner';

export interface RaporPrintMenuProps {
  studentId: string;
  studentName?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  showSumatifArchive?: boolean;
  hasPkl?: boolean;
  hasUkk?: boolean;
  hasSkl?: boolean;
  siswaPklId?: string;
  className?: string;
  btnSize?: 'sm' | 'md';
  eligibility?: DokumenEligibility;
  onPrintRaporPkl?: () => void;
  onPrintSertifikatPkl?: () => void;
  onPrintSertifikatUkk?: () => void;
  onOpenTranskrip?: () => void;
}

export const RaporPrintMenu: React.FC<RaporPrintMenuProps> = ({
  studentId,
  studentName,
  tahunPelajaranId,
  semesterId,
  tahunPelajaranNama,
  semesterNama,
  showSumatifArchive = true,
  hasPkl = false,
  hasUkk = false,
  hasSkl = false,
  siswaPklId,
  className = '',
  btnSize = 'sm',
  eligibility,
  onPrintRaporPkl,
  onPrintSertifikatPkl,
  onPrintSertifikatUkk,
  onOpenTranskrip,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    printCover,
    printBiodata,
    printRaporSemester,
    printRaporSumatif,
    printP5,
    printSkl,
    printUkk,
    printPkl,
  } = useRaporPdf({ tahunPelajaranId, semesterId, tahunPelajaranNama, semesterNama });

  // Close dropdown on click outside
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

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const btnPadding = btnSize === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  // Helper untuk merender tombol aksi dengan Industrial Eligibility Guardrail (Opsi A)
  const renderEligibleMenuItem = ({
    icon: Icon,
    title,
    subtitle,
    colorClasses,
    iconColor,
    eligible = true,
    reason = '',
    onClick,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle: string;
    colorClasses: string;
    iconColor: string;
    eligible?: boolean;
    reason?: string;
    onClick: () => void;
  }) => {
    if (!eligible) {
      return (
        <button
          type="button"
          onClick={() => {
            if (reason) toast.warning(`${title}: ${reason}`);
          }}
          className="w-full text-left flex items-start gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-not-allowed group border-l-2 border-slate-300 dark:border-slate-700"
          title={`🔒 ${title} Terkunci: ${reason || 'Belum memenuhi syarat kelayakan'}`}
        >
          <div className="relative shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 opacity-60" />
            <Lock className="w-2.5 h-2.5 text-amber-500 absolute -bottom-1 -right-1 drop-shadow-xs" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
              <span>{title}</span>
              <span className="text-[9px] px-1 py-0.2 rounded-sm bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-300 font-normal">
                Terkunci
              </span>
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400/90 truncate font-normal mt-0.5" title={reason}>
              🔒 {reason || subtitle}
            </div>
          </div>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleAction(onClick)}
        className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${colorClasses}`}
      >
        <Icon className={`w-4 h-4 ${iconColor} shrink-0`} />
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          <div className="text-[10px] text-gray-400">{subtitle}</div>
        </div>
      </button>
    );
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${btnPadding}`}
        title={`Cetak Dokumen untuk ${studentName || 'Siswa'}`}
        aria-expanded={isOpen}
      >
        <Printer className="w-3.5 h-3.5" />
        <span>Cetak</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-64 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 focus:outline-none transform transition-all duration-150 animate-in fade-in slide-in-from-top-1 max-h-[85vh] overflow-y-auto">
          <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
              PILIHAN CETAK RAPOR
            </p>
            {studentName && (
              <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate mt-0.5">
                {studentName}
              </p>
            )}
          </div>

          <div className="py-1 divide-y divide-gray-50 dark:divide-gray-750">
            <div className="space-y-0.5">
              {/* 1. Biodata Rapor (Cover dimerger ke Biodata) */}
              <button
                type="button"
                onClick={() => handleAction(() => printBiodata(studentId))}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Biodata Rapor</div>
                  <div className="text-[10px] text-gray-400">Cover &amp; Biodata Siswa 17 Butir</div>
                </div>
              </button>

              {/* 2. Rapor Sumatif */}
              {showSumatifArchive && (
                <button
                  type="button"
                  onClick={() => handleAction(() => printRaporSumatif(studentId))}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 transition-colors cursor-pointer"
                >
                  <Award className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">Rapor Sumatif</div>
                    <div className="text-[10px] text-gray-400">Penilaian Sumatif &amp; Nilai Akhir</div>
                  </div>
                </button>
              )}

              {/* 3. Rapor Semester CK1-CK2 */}
              <button
                type="button"
                onClick={() => handleAction(() => printRaporSemester(studentId))}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Rapor Semester CK1-CK2</div>
                  <div className="text-[10px] text-gray-400">Intrakurikuler, Ekskul, &amp; TTD</div>
                </div>
              </button>

              {/* 4. Rapor P5 */}
              <button
                type="button"
                onClick={() => handleAction(() => printP5(studentId))}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Rapor P5</div>
                  <div className="text-[10px] text-gray-400">Matriks Kolom Kualifikasi Projek</div>
                </div>
              </button>
            </div>

            {/* Dokumen Khusus dengan Validasi Syarat Kelayakan */}
            <div className="pt-1 space-y-0.5">
              {/* 5. Rapor PKL */}
              {renderEligibleMenuItem({
                icon: Briefcase,
                title: 'Rapor PKL',
                subtitle: 'Praktik Kerja Lapangan',
                colorClasses: 'text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300',
                iconColor: 'text-purple-600 dark:text-purple-400',
                eligible: eligibility ? eligibility.rapor_pkl?.eligible ?? true : true,
                reason: eligibility?.rapor_pkl?.reason,
                onClick: () => {
                  if (onPrintRaporPkl) onPrintRaporPkl();
                  else if (siswaPklId) printPkl(siswaPklId);
                  else printRaporSemester(studentId);
                },
              })}

              {/* 6. Sertifikat PKL */}
              {renderEligibleMenuItem({
                icon: Award,
                title: 'Sertifikat PKL',
                subtitle: 'Piagam & Transkrip Nilai PKL',
                colorClasses: 'text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300',
                iconColor: 'text-amber-500 dark:text-amber-400',
                eligible: eligibility ? eligibility.sertifikat_pkl?.eligible ?? true : true,
                reason: eligibility?.sertifikat_pkl?.reason,
                onClick: () => {
                  if (onPrintSertifikatPkl) onPrintSertifikatPkl();
                  else if (siswaPklId) printPkl(siswaPklId);
                  else printRaporSemester(studentId);
                },
              })}

              {/* 7. Sertifikat UKK */}
              {renderEligibleMenuItem({
                icon: Award,
                title: 'Sertifikat UKK',
                subtitle: 'Uji Kompetensi Keahlian',
                colorClasses: 'text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300',
                iconColor: 'text-orange-600 dark:text-orange-400',
                eligible: eligibility ? eligibility.sertifikat_ukk?.eligible ?? true : true,
                reason: eligibility?.sertifikat_ukk?.reason,
                onClick: () => {
                  if (onPrintSertifikatUkk) onPrintSertifikatUkk();
                  else printUkk(studentId);
                },
              })}

              {/* 8. SKL */}
              {renderEligibleMenuItem({
                icon: GraduationCap,
                title: 'SKL',
                subtitle: 'Surat Keterangan Kelulusan',
                colorClasses: 'text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-700 dark:hover:text-rose-300',
                iconColor: 'text-rose-600 dark:text-rose-400',
                eligible: eligibility ? eligibility.skl?.eligible ?? true : true,
                reason: eligibility?.skl?.reason,
                onClick: () => printSkl(studentId),
              })}

              {/* 9. Transkrip Nilai */}
              {onOpenTranskrip &&
                renderEligibleMenuItem({
                  icon: Award,
                  title: 'Transkrip Nilai',
                  subtitle: 'Transkrip Kumulatif Resmi',
                  colorClasses: 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40',
                  iconColor: 'text-amber-500 dark:text-amber-400',
                  eligible: eligibility ? eligibility.transkrip?.eligible ?? true : true,
                  reason: eligibility?.transkrip?.reason,
                  onClick: onOpenTranskrip,
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
