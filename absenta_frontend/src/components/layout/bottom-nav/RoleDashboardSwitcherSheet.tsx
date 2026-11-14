import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  BookOpen,
  ShieldAlert,
  Briefcase,
  FileText,
  GraduationCap,
  Award,
  HeartHandshake,
  Compass,
  Package,
  PiggyBank,
  Shield,
  ScanLine,
  Home,
  X,
  Sparkles,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useUserRoleDashboards } from '@/hooks/useUserRoleDashboards';
import { cn } from '@/lib/utils';
import { useRoleDashboardSwitcherStore } from '@/store/roleDashboardSwitcherStore';

export interface DashboardOption {
  id: string;
  tabKey: string;
  name: string;
  shortName: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  targetPath: string;
  category: 'kontrol' | 'akademik' | 'kesiswaan';
  color: {
    bgLight: string;
    bgDark: string;
    border: string;
    text: string;
    badge: string;
    accentGlow: string;
  };
}

export const RoleDashboardSwitcherSheet: React.FC = () => {
  const isOpen = useRoleDashboardSwitcherStore((s) => s.isOpen);
  const onClose = useRoleDashboardSwitcherStore((s) => s.close);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const { hasDashboard, isAdminRole } = useUserRoleDashboards();

  // Current active tab resolution
  const currentTab = searchParams.get('tab') || 'ringkasan';
  const isCoopRoute = location.pathname.startsWith('/cooperative');

  const allDashboards: DashboardOption[] = useMemo(() => [
    // ── KELOMPOK 1: PUSAT KONTROL & MANAJEMEN ────────────────────────────────
    {
      id: 'admin',
      tabKey: 'admin',
      name: 'Dashboard Administrator',
      shortName: 'Admin Master',
      description: 'Data Master & Pengaturan',
      icon: ShieldCheck,
      targetPath: '/dashboard?tab=admin',
      category: 'kontrol',
      color: {
        bgLight: 'bg-slate-100',
        bgDark: 'dark:bg-slate-800',
        border: 'border-slate-300 dark:border-slate-700',
        text: 'text-slate-800 dark:text-slate-100',
        badge: 'bg-slate-800 text-white',
        accentGlow: 'hover:border-slate-400 dark:hover:border-slate-600',
      },
    },
    {
      id: 'tu',
      tabKey: 'kepegawaian',
      name: 'Dashboard Tata Usaha',
      shortName: 'Tata Usaha',
      description: 'Kepegawaian & Surat',
      icon: FileText,
      targetPath: '/dashboard?tab=kepegawaian',
      category: 'kontrol',
      color: {
        bgLight: 'bg-indigo-50',
        bgDark: 'dark:bg-indigo-950/50',
        border: 'border-indigo-200 dark:border-indigo-800',
        text: 'text-indigo-700 dark:text-indigo-300',
        badge: 'bg-indigo-600 text-white',
        accentGlow: 'hover:border-indigo-400 dark:hover:border-indigo-600',
      },
    },
    {
      id: 'sarpras',
      tabKey: 'sarpras',
      name: 'Dashboard Sarpras',
      shortName: 'Sarpras & Aset',
      description: 'Inventaris & Ruangan',
      icon: Package,
      targetPath: '/dashboard?tab=sarpras',
      category: 'kontrol',
      color: {
        bgLight: 'bg-teal-50',
        bgDark: 'dark:bg-teal-950/50',
        border: 'border-teal-200 dark:border-teal-800',
        text: 'text-teal-700 dark:text-teal-300',
        badge: 'bg-teal-600 text-white',
        accentGlow: 'hover:border-teal-400 dark:hover:border-teal-600',
      },
    },
    {
      id: 'koperasi',
      tabKey: 'koperasi',
      name: 'Dashboard Koperasi',
      shortName: 'Koperasi & POS',
      description: 'Kasir & Tabungan',
      icon: PiggyBank,
      targetPath: '/cooperative/pos',
      category: 'kontrol',
      color: {
        bgLight: 'bg-emerald-50',
        bgDark: 'dark:bg-emerald-950/50',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-700 dark:text-emerald-300',
        badge: 'bg-emerald-600 text-white',
        accentGlow: 'hover:border-emerald-400 dark:hover:border-emerald-600',
      },
    },

    // ── KELOMPOK 2: AKADEMIK & PEMBELAJARAN ──────────────────────────────────
    {
      id: 'kurikulum',
      tabKey: 'kurikulum',
      name: 'Dashboard Kurikulum',
      shortName: 'Kurikulum & KBM',
      description: 'Jadwal, Delegasi & CBT',
      icon: BookOpen,
      targetPath: '/dashboard?tab=kurikulum',
      category: 'akademik',
      color: {
        bgLight: 'bg-emerald-50',
        bgDark: 'dark:bg-emerald-950/50',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-700 dark:text-emerald-300',
        badge: 'bg-emerald-600 text-white',
        accentGlow: 'hover:border-emerald-400 dark:hover:border-emerald-600',
      },
    },
    {
      id: 'walas',
      tabKey: 'binaan',
      name: 'Dashboard Wali Kelas',
      shortName: 'Wali Kelas',
      description: 'Rombel & Absensi Siswa',
      icon: GraduationCap,
      targetPath: '/dashboard?tab=binaan',
      category: 'akademik',
      color: {
        bgLight: 'bg-sky-50',
        bgDark: 'dark:bg-sky-950/50',
        border: 'border-sky-200 dark:border-sky-800',
        text: 'text-sky-700 dark:text-sky-300',
        badge: 'bg-sky-600 text-white',
        accentGlow: 'hover:border-sky-400 dark:hover:border-sky-600',
      },
    },
    {
      id: 'kaprog',
      tabKey: 'kaprog',
      name: 'Dashboard Jurusan (Kaprog)',
      shortName: 'Kaprog / Jurusan',
      description: 'Program Keahlian',
      icon: Award,
      targetPath: '/dashboard?tab=kaprog',
      category: 'akademik',
      color: {
        bgLight: 'bg-amber-50',
        bgDark: 'dark:bg-amber-950/50',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-300',
        badge: 'bg-amber-600 text-white',
        accentGlow: 'hover:border-amber-400 dark:hover:border-amber-600',
      },
    },
    {
      id: 'hubin',
      tabKey: 'hubin',
      name: 'Dashboard Hubinmas',
      shortName: 'Hubin & PKL',
      description: 'Kemitraan DUDI & Magang',
      icon: Briefcase,
      targetPath: '/dashboard?tab=hubin',
      category: 'akademik',
      color: {
        bgLight: 'bg-orange-50',
        bgDark: 'dark:bg-orange-950/50',
        border: 'border-orange-200 dark:border-orange-800',
        text: 'text-orange-700 dark:text-orange-300',
        badge: 'bg-orange-600 text-white',
        accentGlow: 'hover:border-orange-400 dark:hover:border-orange-600',
      },
    },

    // ── KELOMPOK 3: KESISWAAN, BIMBINGAN & LAYANAN ──────────────────────────
    {
      id: 'kesiswaan',
      tabKey: 'kesiswaan',
      name: 'Dashboard Kesiswaan',
      shortName: 'Kesiswaan',
      description: 'Disiplin & Ketarunaan',
      icon: ShieldAlert,
      targetPath: '/dashboard?tab=kesiswaan',
      category: 'kesiswaan',
      color: {
        bgLight: 'bg-rose-50',
        bgDark: 'dark:bg-rose-950/50',
        border: 'border-rose-200 dark:border-rose-800',
        text: 'text-rose-700 dark:text-rose-300',
        badge: 'bg-rose-600 text-white',
        accentGlow: 'hover:border-rose-400 dark:hover:border-rose-600',
      },
    },
    {
      id: 'bpbk',
      tabKey: 'bk',
      name: 'Dashboard BP / BK',
      shortName: 'BK & Konseling',
      description: 'Konseling & EWS Siswa',
      icon: HeartHandshake,
      targetPath: '/dashboard?tab=bk',
      category: 'kesiswaan',
      color: {
        bgLight: 'bg-purple-50',
        bgDark: 'dark:bg-purple-950/50',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-700 dark:text-purple-300',
        badge: 'bg-purple-600 text-white',
        accentGlow: 'hover:border-purple-400 dark:hover:border-purple-600',
      },
    },
    {
      id: 'bkk',
      tabKey: 'bkk',
      name: 'Dashboard BKK',
      shortName: 'Bursa Kerja (BKK)',
      description: 'Tracer Study & Alumni',
      icon: Compass,
      targetPath: '/dashboard?tab=bkk',
      category: 'kesiswaan',
      color: {
        bgLight: 'bg-cyan-50',
        bgDark: 'dark:bg-cyan-950/50',
        border: 'border-cyan-200 dark:border-cyan-800',
        text: 'text-cyan-700 dark:text-cyan-300',
        badge: 'bg-cyan-600 text-white',
        accentGlow: 'hover:border-cyan-400 dark:hover:border-cyan-600',
      },
    },
    {
      id: 'piket',
      tabKey: 'kelola',
      name: 'Dashboard Piket',
      shortName: 'Piket Harian',
      description: 'Izin Keluar & Dispensasi',
      icon: ScanLine,
      targetPath: '/dashboard?tab=kelola',
      category: 'kesiswaan',
      color: {
        bgLight: 'bg-blue-50',
        bgDark: 'dark:bg-blue-950/50',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-300',
        badge: 'bg-blue-600 text-white',
        accentGlow: 'hover:border-blue-400 dark:hover:border-blue-600',
      },
    },
    {
      id: 'satpam',
      tabKey: 'satpam',
      name: 'Pos Satpam & Gerbang',
      shortName: 'Satpam / Gerbang',
      description: 'Scan & Tap Masuk/Pulang',
      icon: Shield,
      targetPath: '/dashboard?tab=satpam',
      category: 'kesiswaan',
      color: {
        bgLight: 'bg-red-50',
        bgDark: 'dark:bg-red-950/50',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-300',
        badge: 'bg-red-600 text-white',
        accentGlow: 'hover:border-red-400 dark:hover:border-red-600',
      },
    },
    {
      id: 'portal',
      tabKey: 'ringkasan',
      name: 'Beranda Guru / Pendidik',
      shortName: 'Portal Pendidik',
      description: 'KBM Harian & Absensi Saya',
      icon: Home,
      targetPath: '/dashboard?tab=ringkasan',
      category: 'kontrol',
      color: {
        bgLight: 'bg-slate-100',
        bgDark: 'dark:bg-slate-800',
        border: 'border-slate-300 dark:border-slate-700',
        text: 'text-slate-800 dark:text-slate-200',
        badge: 'bg-slate-700 text-white',
        accentGlow: 'hover:border-slate-400',
      },
    },
  ], []);

  // Filter dashboards by permission: Admin gets ALL, other roles get their authorized ones (Single Source of Truth)
  const accessibleDashboards = useMemo(() => {
    if (isAdminRole) return allDashboards;

    return allDashboards.filter((d) => {
      if (d.id === 'portal') return true;
      return hasDashboard(d.id);
    });
  }, [allDashboards, isAdminRole, hasDashboard]);

  const handleSelectDashboard = (dash: DashboardOption) => {
    onClose();
    navigate(dash.targetPath);
  };

  const isCurrentActive = (dash: DashboardOption) => {
    if (dash.id === 'koperasi') return isCoopRoute;
    return currentTab === dash.tabKey;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
          />

          {/* Bottom Sheet Modal (Shopee-Grade High-Density) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] relative z-10 overflow-hidden"
          >
            {/* Grabber Handle */}
            <div className="pt-2.5 pb-1 flex justify-center">
              <div className="w-10 h-1.2 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight">
                    <span>Pusat Kendali Divisi</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">
                      {accessibleDashboards.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Ketuk untuk beralih instan antar dashboard sekolah
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Card Grid */}
            <div className="p-4 overflow-y-auto no-scrollbar space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                {accessibleDashboards.map((dash) => {
                  const Icon = dash.icon;
                  const active = isCurrentActive(dash);

                  return (
                    <button
                      key={dash.id}
                      type="button"
                      onClick={() => handleSelectDashboard(dash)}
                      className={cn(
                        'p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 relative group cursor-pointer active:scale-95',
                        active
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-md'
                          : `${dash.color.bgLight} ${dash.color.bgDark} ${dash.color.border} ${dash.color.accentGlow}`
                      )}
                    >
                      {active && (
                        <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-600 text-white shadow-2xs">
                          <CheckCircle2 size={10} />
                          <span>Aktif</span>
                        </span>
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
                            dash.color.badge
                          )}
                        >
                          <Icon size={16} />
                        </div>
                      </div>

                      <div className="min-w-0 pr-1">
                        <h3 className={cn('text-xs font-black truncate', dash.color.text)}>
                          {dash.shortName}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                          {dash.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-medium">
                {isAdminRole ? 'Superuser Akses Penuh' : 'Akses Terpilih Sesuai SK'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
