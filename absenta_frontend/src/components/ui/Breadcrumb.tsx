import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
}

// Map path segments to Indonesian labels
const PATH_MAP: Record<string, string> = {
  academic: 'Akademik',
  'tahun-pelajaran': 'Tahun Pelajaran',
  semester: 'Semester',
  jurusan: 'Jurusan',
  mapel: 'Mata Pelajaran',
  guru: 'Data Guru',
  kelas: 'Data Kelas',
  siswa: 'Data Siswa',
  'wali-kelas': 'Wali Kelas',
  'guru-mapel': 'Guru Mapel',
  'registrasi-siswa': 'Registrasi Siswa',
  mutation: 'Mutasi Siswa',
  'jenis-kegiatan': 'Jenis Kegiatan',
  'student-card': 'Cetak Kartu Siswa',
  'struktur-organisasi': 'Struktur Organisasi',
  transition: 'Transisi Akademik',
  backup: 'Backup & Seed Data',
  
  // Superadmin & Billing Mappings
  superadmin: 'Superadmin Console',
  billing: 'Billing & SaaS',
  monitoring: 'Live Monitoring',
  plans: 'Manajemen Paket',
  tripay: 'Tripay Gateway',
  'tripay-health': 'Kesehatan Tripay',
  infra: 'Infrastruktur',
  'control-center': 'Worker Control',
  tenants: 'Manajemen Tenant',
  intelligence: 'Platform Intelligence',
  revenue: 'Analisis Pendapatan',
  management: 'Pengaturan Sistem',
  role: 'Hak Akses',
  menu: 'Menu Navigasi'
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const location = useLocation();

  const breadcrumbs = React.useMemo(() => {
    if (items) return items;

    // Auto-generate based on current route location
    const pathnames = location.pathname.split('/').filter((x) => x);
    const generated: BreadcrumbItem[] = [];

    let currentPath = '';
    pathnames.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = PATH_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      generated.push({ label, path: currentPath });
    });

    return generated;
  }, [location.pathname, items]);

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-500 select-none"
    >
      <Link 
        to="/" 
        className="flex items-center text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors gap-1 flex-shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Beranda</span>
      </Link>

      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700 flex-shrink-0" />
            {isLast || !item.path ? (
              <span className="text-slate-800 dark:text-slate-200 font-black truncate max-w-[150px] sm:max-w-none flex-shrink-0">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-[120px] sm:max-w-none flex-shrink-0"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
