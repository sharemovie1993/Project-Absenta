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
} from 'lucide-react';
import { useRaporPdf } from '../../hooks/useRaporPdf';

export interface RaporPrintMenuProps {
  studentId: string;
  studentName?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  showSumatifArchive?: boolean;
  hasPkl?: boolean;
  hasUkk?: boolean;
  hasSkl?: boolean;
  siswaPklId?: string;
  className?: string;
  btnSize?: 'sm' | 'md';
}

export const RaporPrintMenu: React.FC<RaporPrintMenuProps> = ({
  studentId,
  studentName,
  tahunPelajaranId,
  semesterId,
  showSumatifArchive = true,
  hasPkl = false,
  hasUkk = false,
  hasSkl = false,
  siswaPklId,
  className = '',
  btnSize = 'sm',
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
  } = useRaporPdf({ tahunPelajaranId, semesterId });

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
        <span>Cetak Dokumen</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-60 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 focus:outline-none transform transition-all duration-150 animate-in fade-in slide-in-from-top-1">
          <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
              Dokumen Rapor Semester
            </p>
            {studentName && (
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate mt-0.5">
                {studentName}
              </p>
            )}
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={() => handleAction(() => printRaporSemester(studentId))}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <div className="font-semibold">Rapor Semester (CK1 & CK2)</div>
                <div className="text-[10px] text-gray-400">Intrakurikuler, Ekskul, & TTD</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction(() => printCover(studentId))}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold">Cover / Sampul Rapor</div>
                <div className="text-[10px] text-gray-400">Logo Jabar & Identitas Resmi</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction(() => printBiodata(studentId))}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <div className="font-semibold">Biodata Siswa (17 Butir)</div>
                <div className="text-[10px] text-gray-400">Buku Induk & Pas Foto 3x4</div>
              </div>
            </button>

            {showSumatifArchive && (
              <button
                type="button"
                onClick={() => handleAction(() => printRaporSumatif(studentId))}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              >
                <Award className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <div>
                  <div className="font-semibold">Rapor Penilaian Sumatif</div>
                  <div className="text-[10px] text-gray-400">Blangko Hijau Arsip Lampau</div>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleAction(() => printP5(studentId))}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <div className="font-semibold">Rapor Projek P5</div>
                <div className="text-[10px] text-gray-400">Matriks Kolom Kualifikasi Projek</div>
              </div>
            </button>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 py-1">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
              Pelaporan Kejuruan & Akhir
            </div>

            <button
              type="button"
              onClick={() => handleAction(() => {
                if (siswaPklId) printPkl(siswaPklId);
                else printRaporSemester(studentId);
              })}
              className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Rapor PKL (Praktik Kerja)</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(() => printUkk(studentId))}
              className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
            >
              <Award className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <span>Sertifikat UKK Kejuruan</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(() => printSkl(studentId))}
              className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
            >
              <GraduationCap className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Surat Kelulusan (SKL)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
