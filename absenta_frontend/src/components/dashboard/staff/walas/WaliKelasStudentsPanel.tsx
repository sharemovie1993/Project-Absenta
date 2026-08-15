import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Edit3, 
  MessageCircle, 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download
} from 'lucide-react';
import { Student } from './types';
import { cn } from '../../../../lib/utils';

interface WaliKelasStudentsPanelProps {
  students: Student[];
  onSelectStudent: (studentId: string) => void;
  onEditStudent: (studentId: string) => void;
  onOpenWhatsApp: (parentName: string, parentPhone: string, studentName: string, reason: string) => void;
  onOpenExportModal?: () => void;
  isApiConnected?: boolean;
  className?: string;
}

export const WaliKelasStudentsPanel: React.FC<WaliKelasStudentsPanelProps> = ({
  students,
  onSelectStudent,
  onEditStudent,
  onOpenWhatsApp,
  onOpenExportModal,
  isApiConnected = true,
  className = 'Kelas Binaan'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset pagination to page 1 when search or gender filter changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, genderFilter, pageSize]);

  // Filtered student list (Search + Gender only)
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search by Name or NIS
      const matchSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchTerm.toLowerCase());

      // Gender filter
      const matchGender = genderFilter === 'ALL' || s.gender === genderFilter;

      return matchSearch && matchGender;
    });
  }, [students, searchTerm, genderFilter]);

  // Gender counts
  const maleCount = useMemo(() => students.filter((s) => s.gender === 'L').length, [students]);
  const femaleCount = useMemo(() => students.filter((s) => s.gender === 'P').length, [students]);

  // Pagination calculations
  const totalItems = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, page, pageSize]);

  // Generate visible page numbers for pagination bar
  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  const startEntry = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endEntry = Math.min(page * pageSize, totalItems);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* ── FILTER & SEARCH BAR (HANYA PENCARIAN & GENDER ALL / L / P) ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa atau NIS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>

        {/* Gender Filter Buttons: Semua, Laki-laki, Perempuan */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setGenderFilter('ALL')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
              genderFilter === 'ALL'
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setGenderFilter('L')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
              genderFilter === 'L'
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Laki-laki
          </button>
          <button
            type="button"
            onClick={() => setGenderFilter('P')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
              genderFilter === 'P'
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Perempuan
          </button>
        </div>
      </div>

      {/* ── TABLE OF STUDENTS WITH EDIT ACTION ──────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[560px] sm:min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 font-bold">
                <th className="py-3 px-2 sm:px-4 text-center w-8 sm:w-12">No</th>
                <th className="py-3 px-2 sm:px-4">Identitas Siswa</th>
                <th className="py-3 px-2 sm:px-3 text-center w-20 sm:w-28">Aksi</th>
                <th className="py-3 px-2 sm:px-3 text-center w-20 sm:w-24">Gender</th>
                <th className="py-3 px-3 sm:px-4 min-w-[150px]">Orang Tua / Wali</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((student, idx) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* 1. Number with Pagination Offset */}
                    <td className="py-3 px-2 sm:px-4 text-center text-slate-400 font-mono text-[10px] sm:text-[11px]">
                      {(page - 1) * pageSize + idx + 1}
                    </td>

                    {/* 2. Student Info (Auto width, compact on mobile) */}
                    <td className="py-3 px-2 sm:px-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 sm:ring-2 ring-slate-100 dark:ring-slate-800 shrink-0"
                        />
                        <div className="min-w-0 max-w-[125px] xs:max-w-[160px] sm:max-w-none">
                          <button
                            type="button"
                            onClick={() => onSelectStudent(student.id)}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left block truncate cursor-pointer text-xs sm:text-sm"
                            title={student.name}
                          >
                            {student.name}
                          </button>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
                            {student.nis}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 3. Actions: Edit Profile (KOLOM KE-3 - Langsung Terlihat di HP) */}
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => onEditStudent(student.id)}
                          className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] sm:text-xs flex items-center gap-1 shadow-xs shadow-blue-600/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                          title="Edit Biodata & Profil Siswa"
                        >
                          <Edit3 size={12} className="sm:w-3.5 sm:h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>

                    {/* 4. Gender Badge */}
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <span className={cn(
                        "px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase inline-block",
                        student.gender === 'L'
                          ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50"
                          : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50"
                      )}>
                        {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </span>
                    </td>

                    {/* 5. Parent Info & WhatsApp Action */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="space-y-0.5 min-w-[130px]">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate text-xs">
                          {student.parentName || '-'}
                        </span>
                        {student.parentPhone ? (
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp(student.parentName, student.parentPhone, student.name, 'Koordinasi Perkembangan Siswa')}
                            className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <MessageCircle size={11} />
                            <span>{student.parentPhone}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] sm:text-[11px] text-slate-400 italic">No HP belum ada</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-semibold">
                    <Users size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    Tidak ada siswa yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── TABLE FOOTER: STATS SUMMARY, PAGE SELECTOR & PAGINATION NAVIGATION ── */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-3.5">
          {/* Left: Summary info, Gender Badge, Per-page selector & Export button */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {/* Total Siswa Summary */}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Total {totalItems} Siswa
            </span>

            {/* Gender Counts Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>{maleCount} L</span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>{femaleCount} P</span>
              </span>
            </div>

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

            {/* Range info */}
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400 text-[11px]">
              Menampilkan {startEntry} - {endEntry}
            </span>

            <span className="text-slate-300 dark:text-slate-700">•</span>

            {/* Page Size Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={10}>10 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
                <option value={100}>100 / hal</option>
              </select>
            </div>

            {/* Export Button Inline */}
            {onOpenExportModal && (
              <button
                type="button"
                onClick={onOpenExportModal}
                className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ml-1"
                title="Export Data Siswa Kelas Binaan"
              >
                <Download size={13} />
                <span>Export</span>
              </button>
            )}
          </div>

          {/* Right: Pagination Navigation Buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={15} />
              </button>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={15} />
              </button>
              {visiblePages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    "min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all",
                    p === page
                      ? "bg-blue-600 text-white shadow-xs"
                      : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title="Halaman Selanjutnya"
              >
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
