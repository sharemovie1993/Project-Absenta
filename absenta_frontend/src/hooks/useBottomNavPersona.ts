import { useMemo } from 'react';
import { 
  Home, 
  Calendar, 
  QrCode, 
  FileText, 
  User, 
  BookOpen, 
  Users, 
  Clock, 
  AlertTriangle, 
  ScanLine, 
  UserX, 
  ShieldAlert, 
  Activity, 
  Mail, 
  LayoutGrid,
  LucideIcon
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';

export type NavPersonaType = 'SISWA' | 'GURU' | 'PARENT' | 'GERBANG' | 'MANAGEMENT';

export interface BottomNavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  isAction?: boolean; // e.g. Open QR Modal or Open Drawer Sheet
  badgeCount?: number;
}

export function useBottomNavPersona() {
  const { user } = useAuthStore();
  const { isSiswa, isGerbang, isPetugasKelas, can } = useCapabilities();

  const roleName = useMemo(() => {
    if (!user?.role) return '';
    if (typeof user.role === 'string') return user.role.toUpperCase();
    if (typeof user.role === 'object' && (user.role as any)?.name) {
      return String((user.role as any).name).toUpperCase();
    }
    return '';
  }, [user?.role]);

  const persona: NavPersonaType = useMemo(() => {
    if (isSiswa || roleName === 'SISWA') return 'SISWA';
    if (roleName === 'PARENT' || roleName === 'ORANGTUA' || roleName === 'ORANG_TUA') return 'PARENT';
    if (isGerbang || roleName === 'GERBANG' || roleName === 'SATPAM') return 'GERBANG';
    if (roleName === 'GURU' || !!(user as any)?.guru_profile || !!(user as any)?.guru_id) return 'GURU';
    return 'MANAGEMENT';
  }, [isSiswa, isGerbang, roleName, user]);

  const isWaliKelas = useMemo(() => {
    return can('academic.homeroom.manage') || !!(user as any)?.wali_kelas || !!(user as any)?.guru_profile?.is_wali_kelas;
  }, [can, user]);

  const navItems = useMemo<BottomNavItem[]>(() => {
    switch (persona) {
      case 'SISWA':
        return [
          { id: 'beranda', label: 'Beranda', path: '/dashboard', icon: Home },
          { id: 'jadwal', label: 'Jadwal', path: '/akademik/jadwal-pelajaran', icon: Calendar },
          { id: 'qr', label: 'Kartu/QR', path: '/account/profile', icon: QrCode, isAction: true },
          { id: 'izin', label: 'Izin', path: '/kesiswaan/perizinan-siswa', icon: FileText },
          { id: 'profil', label: 'Profil', path: '/account/profile', icon: User },
        ];

      case 'GURU':
        const guruItems: BottomNavItem[] = [
          { id: 'beranda', label: 'Beranda', path: '/dashboard', icon: Home },
          { id: 'kbm', label: 'KBM & Absen', path: '/absensi/sesi-kbm', icon: BookOpen },
        ];

        if (isWaliKelas) {
          guruItems.push({ id: 'walas', label: 'Wali Kelas', path: '/akademik/siswa', icon: Users });
        }

        guruItems.push(
          { id: 'piket', label: 'Piket', path: '/absensi/piket-harian', icon: Clock },
          { id: 'profil', label: 'Profil', path: '/account/profile', icon: User }
        );
        return guruItems;

      case 'PARENT':
        return [
          { id: 'beranda', label: 'Beranda', path: '/parent/dashboard', icon: Home },
          { id: 'presensi', label: 'Presensi', path: '/parent/presensi', icon: Clock },
          { id: 'izin', label: 'Perizinan', path: '/parent/perizinan', icon: FileText },
          { id: 'poin', label: 'Pelanggaran', path: '/parent/poin-pelanggaran', icon: AlertTriangle },
          { id: 'profil', label: 'Profil', path: '/account/profile', icon: User },
        ];

      case 'GERBANG':
        return [
          { id: 'scan', label: 'Scan', path: '/absensi/terminal-gate', icon: ScanLine },
          { id: 'belum', label: 'Belum Absen', path: '/absensi/monitoring', icon: UserX },
          { id: 'penindakan', label: 'Penindakan', path: '/kesiswaan/pelanggaran', icon: ShieldAlert },
          { id: 'profil', label: 'Profil', path: '/account/profile', icon: User },
        ];

      case 'MANAGEMENT':
      default:
        return [
          { id: 'beranda', label: 'Beranda', path: '/dashboard', icon: Home },
          { id: 'monitoring', label: 'Monitoring', path: '/absensi/monitoring', icon: Activity },
          { id: 'surat', label: 'Persuratan', path: '/persuratan/surat-masuk', icon: Mail },
          { id: 'kelola', label: 'Kelola', path: '#drawer', icon: LayoutGrid, isAction: true },
          { id: 'profil', label: 'Profil', path: '/account/profile', icon: User },
        ];
    }
  }, [persona, isWaliKelas]);

  return {
    persona,
    navItems,
    isWaliKelas
  };
}
