import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Layers, 
  BookOpen, 
  Users, 
  UserCheck, 
  CalendarDays, 
  FileText, 
  Sparkles, 
  Award, 
  Printer, 
  ShieldAlert, 
  Trophy, 
  Archive, 
  ArrowUpCircle, 
  Wrench, 
  HeartHandshake, 
  Mail, 
  Home, 
  Building2, 
  GraduationCap, 
  Briefcase, 
  LayoutGrid, 
  Activity,
  Send,
  Laptop
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavPillItem {
  label: string;
  shortLabel?: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface NavPillGroup {
  id: string;
  matches: (pathname: string) => boolean;
  items: NavPillItem[];
}

// Master Registrasi Grup Menu Terkait (Related Nav Clusters)
export const RELATED_NAV_GROUPS: NavPillGroup[] = [
  // 1. Grup Penjadwalan Kurikulum
  {
    id: 'kurikulum_jadwal',
    matches: (p) => p.startsWith('/kurikulum/jam-kbm') || p.startsWith('/kurikulum/jadwal') || p.startsWith('/kurikulum/jadwal-piket') || p.startsWith('/kurikulum/jadwal-kontrak-kbm'),
    items: [
      { label: 'Jam KBM & Shift', shortLabel: 'Jam KBM', path: '/kurikulum/jam-kbm', icon: Clock },
      { label: 'Matriks Jadwal', shortLabel: 'Jadwal', path: '/kurikulum/jadwal', icon: Calendar },
      { label: 'Piket Guru', shortLabel: 'Piket', path: '/kurikulum/jadwal-piket', icon: ShieldCheck },
      { label: 'Kontrak KBM', shortLabel: 'Kontrak', path: '/kurikulum/jadwal-kontrak-kbm', icon: Layers },
    ]
  },
  // 2. Grup Master Struktur Kurikulum
  {
    id: 'kurikulum_struktur',
    matches: (p) => p.startsWith('/kurikulum/struktur') || p.startsWith('/kurikulum/guru-mapel') || p.startsWith('/kurikulum/wali-kelas') || p.startsWith('/kurikulum/kalender') || p.startsWith('/kurikulum/plotting'),
    items: [
      { label: 'Struktur Kurikulum', shortLabel: 'Struktur', path: '/kurikulum/struktur', icon: Layers },
      { label: 'Guru Mapel', shortLabel: 'Guru Mapel', path: '/kurikulum/guru-mapel', icon: Users },
      { label: 'Wali Kelas', shortLabel: 'Wali Kelas', path: '/kurikulum/wali-kelas', icon: UserCheck },
      { label: 'Kalender Akademik', shortLabel: 'Kalender', path: '/kurikulum/kalender', icon: CalendarDays },
    ]
  },
  // 3. Grup Perangkat Ajar & Supervisi Kurikulum
  {
    id: 'kurikulum_perangkat',
    matches: (p) => p.startsWith('/kurikulum/perangkat') || p.startsWith('/kurikulum/kosp') || p.startsWith('/kurikulum/supervisi') || p.startsWith('/kurikulum/evaluasi') || p.startsWith('/kurikulum/rekap-kbm') || p.startsWith('/kurikulum/cetak-berkas'),
    items: [
      { label: 'Perangkat Ajar', shortLabel: 'Perangkat', path: '/kurikulum/perangkat', icon: FileText },
      { label: 'KOSP Builder', shortLabel: 'KOSP', path: '/kurikulum/kosp-builder', icon: Sparkles },
      { label: 'Supervisi Guru', shortLabel: 'Supervisi', path: '/kurikulum/supervisi', icon: ShieldCheck },
      { label: 'Evaluasi Kinerja', shortLabel: 'Evaluasi', path: '/kurikulum/evaluasi-kinerja', icon: Award },
      { label: 'Audit JP', shortLabel: 'Audit JP', path: '/kurikulum/rekap-kbm', icon: Activity },
      { label: 'Cetak Berkas', shortLabel: 'Cetak', path: '/kurikulum/cetak-berkas', icon: Printer },
    ]
  },
  // 4. Grup Kesiswaan & Kedisiplinan
  {
    id: 'kesiswaan',
    matches: (p) => p.startsWith('/kesiswaan') && p !== '/kesiswaan/monitoring' && p !== '/kesiswaan/dashboard',
    items: [
      { label: 'Kasus Pelanggaran', shortLabel: 'Pelanggaran', path: '/kesiswaan/pelanggaran', icon: ShieldAlert },
      { label: 'Jenis Pelanggaran', shortLabel: 'Jenis Kasus', path: '/kesiswaan/jenis-pelanggaran', icon: Layers },
      { label: 'Prestasi Siswa', shortLabel: 'Prestasi', path: '/kesiswaan/prestasi', icon: Trophy },
      { label: 'Piket & Izin Keluar', shortLabel: 'Piket', path: '/kesiswaan/piket', icon: ShieldCheck },
      { label: 'Jadwal Kegiatan', shortLabel: 'Kegiatan', path: '/kesiswaan/jadwal-kegiatan', icon: Calendar },
    ]
  },
  // 5. Grup Sarpras & Fasilitas
  {
    id: 'sarpras',
    matches: (p) => p.startsWith('/sarpras') && p !== '/sarpras/dashboard',
    items: [
      { label: 'Inventory Aset', shortLabel: 'Inventory', path: '/sarpras/inventory', icon: Archive },
      { label: 'Peminjaman', shortLabel: 'Peminjaman', path: '/sarpras/loans', icon: ArrowUpCircle },
      { label: 'Pemeliharaan', shortLabel: 'Pemeliharaan', path: '/sarpras/maintenance', icon: Wrench },
      { label: 'Cetak Berkas', shortLabel: 'Cetak', path: '/sarpras/cetak-berkas', icon: Printer },
    ]
  },
  // 6. Grup Bimbingan Konseling (BP/BK)
  {
    id: 'bpbk',
    matches: (p) => p.startsWith('/bpbk') && p !== '/bpbk/dashboard',
    items: [
      { label: 'Data Kasus Siswa', shortLabel: 'Kasus', path: '/bpbk/cases', icon: ShieldAlert },
      { label: 'Konseling', shortLabel: 'Konseling', path: '/bpbk/konseling', icon: HeartHandshake },
      { label: 'Panggilan Ortu', shortLabel: 'Panggilan', path: '/bpbk/pemanggilan', icon: Mail },
      { label: 'Home Visit', shortLabel: 'Home Visit', path: '/bpbk/homevisit', icon: Home },
      { label: 'Asesmen & EWS', shortLabel: 'Asesmen', path: '/bpbk/asesmen', icon: Activity },
      { label: 'Rujukan', shortLabel: 'Rujukan', path: '/bpbk/rujukan', icon: Send },
    ]
  },
  // 7. Grup Hubin & Industri PKL
  {
    id: 'hubin',
    matches: (p) => p.startsWith('/hubin') && p !== '/hubin/dashboard',
    items: [
      { label: 'Mitra & MoU', shortLabel: 'Mitra', path: '/hubin/mitra', icon: Building2 },
      { label: 'Penempatan PKL', shortLabel: 'PKL', path: '/hubin/penempatan', icon: Briefcase },
      { label: 'Nilai PKL', shortLabel: 'Nilai', path: '/hubin/nilai-pkl', icon: Award },
      { label: 'Logbook & Jurnal', shortLabel: 'Logbook', path: '/hubin/monitoring', icon: Activity },
      { label: 'BKK Lowongan', shortLabel: 'BKK', path: '/hubin/bkk', icon: Briefcase },
      { label: 'Tracer Study', shortLabel: 'Tracer', path: '/hubin/tracer', icon: GraduationCap },
    ]
  },
  // 8. Grup Master Data Akademik
  {
    id: 'academic_master',
    matches: (p) => p.startsWith('/academic') && p !== '/academic' && p !== '/academic/dashboard',
    items: [
      { label: 'Data Siswa', shortLabel: 'Siswa', path: '/academic/siswa', icon: GraduationCap },
      { label: 'Data Guru', shortLabel: 'Guru', path: '/academic/guru', icon: Users },
      { label: 'Rombel Kelas', shortLabel: 'Kelas', path: '/academic/kelas', icon: LayoutGrid },
      { label: 'Mata Pelajaran', shortLabel: 'Mapel', path: '/academic/mapel', icon: BookOpen },
      { label: 'Tahun Ajaran', shortLabel: 'Tahun Ajaran', path: '/academic/tahun-pelajaran', icon: Calendar },
      { label: 'Semester', shortLabel: 'Semester', path: '/academic/semester', icon: CalendarDays },
      { label: 'Jurusan', shortLabel: 'Jurusan', path: '/academic/jurusan', icon: Briefcase },
    ]
  },
  // 9. Grup CBT Ujian
  {
    id: 'cbt',
    matches: (p) => p.startsWith('/cbt') && p !== '/cbt/dashboard',
    items: [
      { label: 'Bank Soal', shortLabel: 'Bank Soal', path: '/cbt/bank-soal', icon: BookOpen },
      { label: 'Jadwal Ujian', shortLabel: 'Jadwal', path: '/cbt/jadwal', icon: Calendar },
      { label: 'Sesi Ujian', shortLabel: 'Sesi', path: '/cbt/sesi', icon: Laptop },
      { label: 'Analisis Hasil', shortLabel: 'Analisis', path: '/cbt/analisis', icon: Activity },
    ]
  },
  // 10. Grup E-Rapor
  {
    id: 'rapor',
    matches: (p) => p.startsWith('/rapor') && p !== '/rapor/dashboard',
    items: [
      { label: 'Input Nilai', shortLabel: 'Input Nilai', path: '/rapor/nilai', icon: Award },
      { label: 'Cetak Lembar Rapor', shortLabel: 'Cetak', path: '/rapor/cetak', icon: Printer },
      { label: 'Projek P5', shortLabel: 'P5', path: '/rapor/p5', icon: Layers },
    ]
  },
  // 11. Grup Persuratan
  {
    id: 'correspondence',
    matches: (p) => p.startsWith('/correspondence') && p !== '/correspondence/dashboard',
    items: [
      { label: 'Surat Masuk', shortLabel: 'Masuk', path: '/correspondence/surat-masuk', icon: Mail },
      { label: 'Surat Keluar', shortLabel: 'Keluar', path: '/correspondence/surat-keluar', icon: Send },
    ]
  }
];

export const getRelatedNavGroupForPath = (pathname: string): NavPillGroup | undefined => {
  const cleanPath = pathname.toLowerCase().replace(/\/$/, "");
  return RELATED_NAV_GROUPS.find(g => g.matches(cleanPath));
};

export interface RelatedModuleNavPillsProps {
  className?: string;
  variant?: 'topbar' | 'bottombar';
}

export const RelatedModuleNavPills: React.FC<RelatedModuleNavPillsProps> = ({ 
  className,
  variant = 'topbar'
}) => {
  const location = useLocation();
  const currentPath = location.pathname.toLowerCase().replace(/\/$/, "");

  // Resolve grup yang cocok dengan path aktif
  const matchedGroup = useMemo(() => {
    return getRelatedNavGroupForPath(currentPath);
  }, [currentPath]);

  if (!matchedGroup || matchedGroup.items.length === 0) {
    return null;
  }

  // Render Varian Bottombar Mobile (Level 2 Contextual Nav - Mengadopsi Style Level 1)
  if (variant === 'bottombar') {
    return (
      <div 
        aria-label="Navigasi Menu Terkait Mobile"
        className={cn(
          "w-full bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-1 pt-1 pb-1 flex items-center shadow-md overflow-x-auto no-scrollbar",
          className
        )}
      >
        <div className="flex items-center justify-around w-full min-w-max gap-1 px-1">
          {matchedGroup.items.map(item => {
            const IconComp = item.icon;
            const isCurrentActive = currentPath === item.path.toLowerCase().replace(/\/$/, "");

            return (
              <Link
                key={item.path}
                to={item.path}
                replace={true}
                title={item.label}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all duration-200 select-none flex-1 min-w-[58px] cursor-pointer relative active:scale-95",
                  isCurrentActive
                    ? "text-indigo-600 dark:text-indigo-400 font-black"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-all relative",
                    isCurrentActive
                      ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "bg-transparent"
                  )}
                >
                  <IconComp size={17} className="stroke-[2.2]" />
                  {isCurrentActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  )}
                </div>
                <span className="truncate max-w-[64px] font-extrabold text-[9.5px]">
                  {item.shortLabel || item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Render Varian Topbar Desktop (Sejajar dengan Tombol Kembali)
  return (
    <div className={cn(
      "flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-[calc(100vw-120px)] sm:max-w-none py-0.5",
      className
    )}>
      {matchedGroup.items.map(item => {
        const IconComp = item.icon;
        const isCurrentActive = currentPath === item.path.toLowerCase().replace(/\/$/, "");

        return (
          <Link
            key={item.path}
            to={item.path}
            replace={true}
            title={item.label}
            className={cn(
              "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.2 rounded-full text-[11px] sm:text-xs font-black transition-all duration-200 cursor-pointer select-none shrink-0 border",
              isCurrentActive
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30 scale-[1.02]"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 shadow-2xs"
            )}
          >
            <IconComp 
              size={12} 
              className={cn(
                "stroke-[2.5]", 
                isCurrentActive ? "text-white" : "text-indigo-600 dark:text-indigo-400"
              )} 
            />
            <span className="hidden sm:inline tracking-tight">{item.label}</span>
            <span className="inline sm:hidden tracking-tight">{item.shortLabel || item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default RelatedModuleNavPills;
