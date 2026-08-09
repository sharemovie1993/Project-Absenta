import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  User, 
  Settings, 
  GraduationCap, 
  Users, 
  CalendarCheck, 
  Warehouse, 
  Briefcase, 
  FileText,
  BadgeCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Mail
} from 'lucide-react';
import { Badge } from '@/components/ui';

interface UserCapabilityCardProps {
  user: any;
  subscription?: any;
}

interface CapabilityGroup {
  category: string;
  items: { label: string; icon: any; path?: string }[];
}

export const UserCapabilityCard: React.FC<UserCapabilityCardProps> = React.memo(({ user, subscription }) => {
  const roleName = user?.role?.name || 'USER';
  const caps = user?.capabilities || [];
  const navigate = useNavigate();

  // Grouping logic for capabilities to make them human-readable
  const groupedCapabilities = useMemo(() => {
    const groups: CapabilityGroup[] = [];

    // 1. Core / Dashboard
    const coreItems = [];
    if (caps.includes('dashboard.view.overview')) coreItems.push({ label: 'Overview Eksekutif', icon: Zap, path: '/dashboard' });
    if (caps.includes('dashboard.view.kepsek')) coreItems.push({ label: 'Monitoring Kepsek', icon: ShieldCheck, path: '/dashboard' });
    if (coreItems.length > 0) groups.push({ category: 'Dashboard & Analitik', items: coreItems });

    // 2. Akademik
    const academicItems = [];
    if (caps.some((c: string) => c.startsWith('academic.students'))) academicItems.push({ label: 'Data Siswa', icon: Users, path: '/academic/siswa' });
    if (caps.some((c: string) => c.startsWith('academic.teacher'))) academicItems.push({ label: 'Data Guru', icon: GraduationCap, path: '/academic/guru' });
    if (caps.includes('dashboard.view.kurikulum')) academicItems.push({ label: 'Kelola Kurikulum', icon: FileText, path: '/kurikulum/struktur' });
    if (caps.includes('dashboard.view.walikelas')) academicItems.push({ label: 'Wali Kelas', icon: User, path: '/kurikulum/wali-kelas' });
    if (academicItems.length > 0) groups.push({ category: 'Manajemen Akademik', items: academicItems });

    // 3. Absensi
    const attendanceItems = [];
    if (caps.includes('attendance.gate.tap.entry') || caps.includes('attendance.gate.tap.exit') || caps.includes('attendance.gate.face.verify')) {
      attendanceItems.push({ label: 'Operasional Gerbang', icon: CalendarCheck, path: '/attendance/ops' });
    }
    if (caps.includes('dashboard.view.petugas')) attendanceItems.push({ label: 'Petugas Absensi', icon: BadgeCheck, path: '/attendance/petugas' });
    if (attendanceItems.length > 0) groups.push({ category: 'Absensi & Kehadiran', items: attendanceItems });

    // 4. Operasional Lainnya
    const opItems = [];
    if (caps.includes('sarpras.inventory.view.list') || caps.includes('dashboard.view.sarpras')) opItems.push({ label: 'Manajemen Sarpras', icon: Warehouse, path: '/sarpras/dashboard' });
    if (
      caps.includes('hubin.view.pkl') || 
      caps.includes('hubin.self.pkl') || 
      caps.includes('hubin.pkl.view.list') || 
      caps.includes('hubin.bkk.manage') || 
      caps.includes('hubin.tracer.view') || 
      caps.includes('dashboard.view.hubin')
    ) {
      opItems.push({ label: 'Hubungan Industri', icon: Briefcase, path: '/hubin' });
    }
    if (caps.includes('tu.manage_surat') || caps.includes('dashboard.view.tu')) opItems.push({ label: 'Tata Usaha', icon: FileText, path: '/profile' });
    if (opItems.length > 0) groups.push({ category: 'Operasional & Sarana', items: opItems });

    return groups;
  }, [caps]);

  // Handle Role Color/Label
  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'SUPERADMIN': return { color: 'bg-red-500 text-white', label: 'Super Admin System' };
      case 'ADMIN': return { color: 'bg-indigo-600 text-white', label: 'Administrator Sekolah' };
      case 'KEPALA_SEKOLAH': return { color: 'bg-emerald-600 text-white', label: 'Kepala Sekolah' };
      case 'GURU': return { color: 'bg-blue-600 text-white', label: 'Tenaga Pendidik' };
      case 'SISWA': return { color: 'bg-amber-600 text-white', label: 'Siswa' };
      default: return { color: 'bg-gray-500 text-white', label: role.replace('_', ' ') };
    }
  };

  const roleConfig = getRoleConfig(roleName);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 mb-8"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-50 dark:bg-purple-900/20 rounded-full blur-3xl opacity-50" />

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* User Profile Section */}
          <div className="flex-shrink-0 w-full lg:w-64">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                {/* FIX: Removed truncate, added break-words for long names */}
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 break-words leading-tight">
                  {user?.full_name || 'User'}
                </h2>
                <Badge className={`${roleConfig.color} border-none text-[10px] mt-1 uppercase tracking-tighter`}>
                  {roleConfig.label}
                </Badge>
                {/* NEW: Added Email display here to centralize identity */}
                {user?.email && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <Mail size={12} className="text-gray-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-indigo-500 shrink-0" />
                <span className="truncate">ID: {user?.id?.slice(0, 8)}...</span>
              </div>
              {user?.tenant?.name && (
                <div className="flex items-center gap-2">
                  <Settings size={14} className="text-purple-500 shrink-0" />
                  <span className="truncate">Tenant: {user.tenant.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Capabilities Grid */}
          <div className="flex-1 w-full">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              Apa yang bisa Anda lakukan di sistem?
            </h3>
            
            {groupedCapabilities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupedCapabilities.map((group, idx) => (
                  <div key={idx} className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 pb-1">
                      {group.category}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item, iidx) => (
                        <button 
                          key={iidx}
                          onClick={() => item.path && navigate(item.path)}
                          className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 transition-all hover:bg-white dark:hover:bg-indigo-900/30 hover:shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
                        >
                          <item.icon size={12} className="text-indigo-500 transition-transform group-hover:scale-110" />
                          <span>{item.label}</span>
                          {item.path && (
                            <ArrowRight size={10} className="opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">Anda memiliki akses dasar ke sistem.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
