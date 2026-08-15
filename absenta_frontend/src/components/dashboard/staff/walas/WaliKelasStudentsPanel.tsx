import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Edit3, 
  Phone, 
  MessageCircle, 
  ShieldCheck, 
  UserCheck, 
  Award, 
  Filter, 
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Student } from './types';
import { cn } from '../../../../lib/utils';

interface WaliKelasStudentsPanelProps {
  students: Student[];
  onSelectStudent: (studentId: string) => void;
  onEditStudent: (studentId: string) => void;
  onOpenWhatsApp: (parentName: string, parentPhone: string, studentName: string, reason: string) => void;
  isApiConnected?: boolean;
  className?: string;
}

export const WaliKelasStudentsPanel: React.FC<WaliKelasStudentsPanelProps> = ({
  students,
  onSelectStudent,
  onEditStudent,
  onOpenWhatsApp,
  isApiConnected = true,
  className = 'Kelas Binaan'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PERFECT' | 'ATTENTION'>('ALL');

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search by Name or NIS
      const matchSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchTerm.toLowerCase());

      // Gender filter
      const matchGender = genderFilter === 'ALL' || s.gender === genderFilter;

      // Attendance filter
      let matchAttendance = true;
      if (attendanceFilter === 'PERFECT') {
        matchAttendance = s.attendanceRate >= 95;
      } else if (attendanceFilter === 'ATTENTION') {
        matchAttendance = s.attendanceRate < 85 || s.alphaCount > 0 || (s.sakitCount + s.izinCount) >= 3;
      }

      return matchSearch && matchGender && matchAttendance;
    });
  }, [students, searchTerm, genderFilter, attendanceFilter]);

  // Quick stats for the top summary cards
  const stats = useMemo(() => {
    const total = students.length;
    const laki = students.filter((s) => s.gender === 'L').length;
    const perempuan = students.filter((s) => s.gender === 'P').length;
    const avgAttendance = total > 0 
      ? Math.round(students.reduce((acc, s) => acc + s.attendanceRate, 0) / total) 
      : 0;

    return { total, laki, perempuan, avgAttendance };
  }, [students]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── TOP BANNER & QUICK STATS ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Siswa</span>
            <strong className="text-lg font-black text-slate-900 dark:text-white">{stats.total} Orang</strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Laki-laki / Perempuan</span>
            <strong className="text-lg font-black text-slate-900 dark:text-white">{stats.laki} L • {stats.perempuan} P</strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rata-rata Kehadiran</span>
            <strong className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.avgAttendance}%</strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Kelas Binaan</span>
            <strong className="text-sm font-black text-purple-600 dark:text-purple-400 truncate block">{className}</strong>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ─────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Gender Filter Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setGenderFilter('ALL')}
              className={cn(
                "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
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
                "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
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
                "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                genderFilter === 'P'
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              Perempuan
            </button>
          </div>

          {/* Attendance Segment Filter */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setAttendanceFilter('ALL')}
              className={cn(
                "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                attendanceFilter === 'ALL'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              Semua Status
            </button>
            <button
              type="button"
              onClick={() => setAttendanceFilter('ATTENTION')}
              className={cn(
                "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1",
                attendanceFilter === 'ATTENTION'
                  ? "bg-rose-500 text-white shadow-2xs"
                  : "text-rose-600 dark:text-rose-400 hover:text-rose-700"
              )}
            >
              <AlertCircle size={12} />
              <span>Perlu Perhatian</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TABLE OF STUDENTS WITH EDIT ACTION ──────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 font-bold">
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4 min-w-[220px]">Identitas Siswa</th>
                <th className="py-3.5 px-3 text-center w-20">Gender</th>
                <th className="py-3.5 px-4 min-w-[180px]">Orang Tua / Wali</th>
                <th className="py-3.5 px-3 text-center w-28">Kehadiran</th>
                <th className="py-3.5 px-4 text-center w-40">Aksi Wali Kelas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, idx) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Number */}
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onSelectStudent(student.id)}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left block truncate cursor-pointer text-xs sm:text-sm"
                          >
                            {student.name}
                          </button>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            NIS: {student.nis}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Gender Badge */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-black uppercase inline-block",
                        student.gender === 'L'
                          ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50"
                          : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50"
                      )}>
                        {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </span>
                    </td>

                    {/* Parent Info & WhatsApp Action */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate text-xs">
                          {student.parentName || '-'}
                        </span>
                        {student.parentPhone ? (
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp(student.parentName, student.parentPhone, student.name, 'Koordinasi Perkembangan Siswa')}
                            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <MessageCircle size={12} />
                            <span>{student.parentPhone}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No HP belum ada</span>
                        )}
                      </div>
                    </td>

                    {/* Attendance Rate */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[11px] font-black font-mono",
                          student.attendanceRate >= 90
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                            : student.attendanceRate >= 75
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                        )}>
                          {student.attendanceRate}%
                        </span>
                        {student.alphaCount > 0 && (
                          <span className="text-[10px] text-rose-500 font-bold mt-0.5">
                            {student.alphaCount}x Alpa
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions: Edit & View Profile */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit Student Button (Main Feature Request) */}
                        <button
                          type="button"
                          onClick={() => onEditStudent(student.id)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
                          title="Edit Biodata & Profil Siswa"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>

                        {/* View Profile Button */}
                        <button
                          type="button"
                          onClick={() => onSelectStudent(student.id)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                          title="Lihat Rincian Siswa"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-semibold">
                    <Users size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    Tidak ada siswa yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold px-4">
          <span>Menampilkan {filteredStudents.length} dari {students.length} siswa binaan</span>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">Wali Kelas memiliki akses pemutakhiran data</span>
        </div>
      </div>
    </div>
  );
};
