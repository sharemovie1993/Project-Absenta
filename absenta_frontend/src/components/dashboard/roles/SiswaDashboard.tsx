import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getRekapBulananSiswaMe, getRekapHarianSiswaMe } from '../../../api/attendanceGerbang.api';
import { getMyJadwalTemplate } from '../../../api/attendance/jadwalTemplate.api';
import { formatLocalDateTime, getVirtualDate, toLocalDate, toLocalMonth } from '../../../utils/attendance/time';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  User, 
  QrCode, 
  Users, 
  ClipboardList,
  History,
  CalendarDays,
  Target,
  Flame, 
  Trophy, 
  Star, 
  AlertTriangle, 
  PlayCircle, 
  BookOpen,
  ArrowRight,
  Medal,
  TrendingUp,
  MapPin,
  ChevronRight,
  LayoutList,
  Activity,
  Fingerprint,
  MessageCircle,
  Briefcase
} from 'lucide-react';
import { kesiswaanApi } from '../../../api/kesiswaan.api';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { CircularProgress } from '../../ui/CircularProgress';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { cn } from '../../../lib/utils';
import { WelcomeBanner } from '../shared/WelcomeBanner';
import { QuickActionGrid, type QuickAction } from '../shared/QuickActionGrid';
import { InfoStripGrid, type InfoStripItem } from '../shared/InfoStripGrid';
import { CompactSectionCard } from '../shared/CompactSectionCard';
import { useSmartMenu } from '../../../hooks/useSmartMenu';
import { iconForName } from '../../../lib/iconForName';
import { siswaApi } from '../../../api/academic.api';

export const SiswaDashboard: React.FC = () => {
  const { user, tenantMode } = useAuthStore();
  const { can } = useAuth();
  const navigate = useNavigate();
  const { menu: groupedMenu } = useSmartMenu();
  
  const caps = user?.capabilities || [];
  const isPetugasKelas = can('attendance.sessions.update.attendance');

  const todayIso = useMemo(() => toLocalDate(), []);
  const monthIso = useMemo(() => toLocalMonth(), []);

  // 1. Get Student Detailed Profile
  const { data: siswaProfileRes } = useQuery({
    queryKey: ['siswa-profile-me', user?.siswa_id],
    queryFn: () => siswaApi.getById(user?.siswa_id || ''),
    enabled: !!user?.siswa_id,
  });

  const siswaProfile = siswaProfileRes?.data;

  // 2. Attendance & Schedule Data
  const { data: dailyRecapRes, isLoading: isDailyRecapLoading } = useQuery({
    queryKey: ['rekap-harian-siswa-me', todayIso, user?.siswa_id],
    queryFn: () => getRekapHarianSiswaMe({ tanggal: todayIso }),
    enabled: !!user && !!user?.siswa_id,
  });

  const { data: monthlyRecapRes, isLoading: isMonthlyRecapLoading } = useQuery({
    queryKey: ['rekap-bulanan-siswa-me', monthIso, user?.siswa_id],
    queryFn: () => getRekapBulananSiswaMe({ bulan: monthIso }),
    enabled: !!user && !!user?.siswa_id,
  });

  const { data: scheduleRes, isLoading: isScheduleLoading } = useQuery({
    queryKey: ['jadwal-template-siswa-me', todayIso, user?.siswa_id],
    queryFn: () => getMyJadwalTemplate({ tanggal: todayIso }),
    enabled: !!user && !!user?.siswa_id && tenantMode === 'MULTI_SESI',
  });

  const { data: pelanggaranRes, isLoading: isPelanggaranLoading } = useQuery({
    queryKey: ['pelanggaran-siswa-me', user?.siswa_id],
    queryFn: () => kesiswaanApi.getPelanggaran({ siswa_id: user?.siswa_id }),
    enabled: !!user && !!user?.siswa_id,
  });

  const dailyRecap = dailyRecapRes?.data ?? null;
  const monthlyRecap = monthlyRecapRes?.data ?? null;
  const jadwalTemplates = scheduleRes?.data ?? [];

  const studentStatus = useMemo(() => {
    if (!dailyRecap) {
      return { isPresent: false, checkInTime: '--:--', checkOutTime: null as string | null, statusLabel: '-' };
    }

    const rincian = Array.isArray(dailyRecap.rincian) ? dailyRecap.rincian : [];
    const pickTime = (predicate: (x: any) => boolean): string | null => {
      const found = rincian.find((x: any) => predicate(x) && x?.waktu_tap);
      return found?.waktu_tap ?? null;
    };

    const checkInTime =
      pickTime((x) => String(x?.jenis_kegiatan || '').toUpperCase().includes('GERBANG_DATANG')) ||
      pickTime((x) => String(x?.jenis_kegiatan || '').toUpperCase().includes('MASUK')) ||
      pickTime((x) => !!x?.waktu_tap) || '--:--';

    const checkOutTime =
      pickTime((x) => String(x?.jenis_kegiatan || '').toUpperCase().includes('GERBANG_PULANG')) ||
      pickTime((x) => String(x?.jenis_kegiatan || '').toUpperCase().includes('PULANG'));

    const statusLabel = String(dailyRecap.status || '-').toUpperCase();
    const isPresent = statusLabel === 'HADIR' || statusLabel === 'TERLAMBAT';

    return { isPresent, checkInTime: String(checkInTime), checkOutTime, statusLabel };
  }, [dailyRecap]);

  const schedule = useMemo(() => {
    const d = getVirtualDate();
    const nowHHMM = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const toMinutes = (hhmm: string): number => {
      const [h, m] = String(hhmm || '').split(':');
      const hh = Number(h);
      const mm = Number(m);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
      return hh * 60 + mm;
    };
    const nowMin = toMinutes(nowHHMM);

    return (jadwalTemplates || []).map((item: any) => {
      const start = String(item.jam_mulai || '00:00');
      const end = String(item.jam_selesai || '00:00');
      const startMin = toMinutes(start);
      const endMin = toMinutes(end);
      const active = nowMin >= startMin && nowMin < endMin;

      const subject = item?.Mapel?.nama_mapel || item?.jenis_kegiatan || 'Kegiatan';
      const teacher = item?.Guru?.User?.full_name || '-';
      const status = active ? 'BERLANGSUNG' : nowMin < startMin ? 'MENUNGGU' : 'SELESAI';
      const attendanceStatus = item.attendance_status;

      return { id: item.id, subject, time: `${start} - ${end}`, teacher, status, active, attendanceStatus };
    });
  }, [jadwalTemplates]);

  // Gamification Logic
  const gamification = useMemo(() => {
    const detail = Array.isArray(monthlyRecap?.detail) ? monthlyRecap.detail : [];
    
    let streak = 0;
    const sortedDays = [...detail].sort((a: any, b: any) => 
      new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );
    
    for (const d of sortedDays) {
      const status = String(d.status || '').toUpperCase();
      if (status === 'HADIR' || status === 'TERLAMBAT') {
        streak++;
      } else if (status !== 'LIBUR' && status !== 'MINGGU') {
        break;
      }
    }

    const attendanceRate = monthlyRecap?.persentase_kehadiran || 0;
    const totalPoinPelanggaran = Array.isArray(pelanggaranRes?.data) 
      ? pelanggaranRes.data.reduce((acc: number, curr: any) => acc + (curr.poin || 0), 0)
      : 0;

    let level = "Prajurit";
    if (attendanceRate >= 95 && totalPoinPelanggaran === 0) level = "Ksatria Absenta";
    else if (attendanceRate >= 85 && totalPoinPelanggaran < 50) level = "Penjaga Disiplin";
    else if (attendanceRate >= 70) level = "Siswa Aktif";

    return { streak, level, attendanceRate, totalPoinPelanggaran };
  }, [monthlyRecap, pelanggaranRes]);

  const activeSession = useMemo(() => schedule.find(s => s.active), [schedule]);

  const infoStrips: InfoStripItem[] = [
    { label: 'Status Presensi', value: studentStatus.isPresent ? `Hadir ${studentStatus.checkInTime}` : 'Belum Absen', icon: Fingerprint, color: studentStatus.isPresent ? 'emerald' : 'amber' },
    { label: 'Attendance Rate', value: `${gamification.attendanceRate}%`, icon: TrendingUp, color: 'blue' },
    { label: 'Poin Disiplin', value: `${monthlyRecap?.total_poin ?? 0} pts`, icon: Medal, color: 'indigo' },
    { label: 'Siswa Streak', value: `${gamification.streak} Hari`, icon: Flame, color: 'orange' },
  ];

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [
      { label: 'Jadwal Saya', icon: CalendarDays, onClick: () => navigate('/kurikulum/jadwal-me'), color: 'indigo' },
      { label: 'Riwayat Absen', icon: History, onClick: () => navigate('/attendance/riwayat-absen-me'), color: 'orange' },
      { label: 'Laporan Kelas', icon: LayoutList, onClick: () => navigate('/attendance/rekap-kelas-me'), color: 'emerald' },
      { label: 'Konseling', icon: MessageCircle, onClick: () => navigate('/kesiswaan/konseling'), color: 'blue' },
    ];

    if (can('hubin.self.pkl') || caps.includes('hubin.self.pkl') || can('hubin.view.pkl') || caps.includes('hubin.view.pkl')) {
      actions.unshift({ label: 'Presensi & Jurnal PKL', icon: Briefcase, onClick: () => navigate('/hubin/absensi'), color: 'emerald' });
    }

    if (isPetugasKelas) {
      actions.unshift({ label: 'Menu Petugas', icon: ClipboardList, onClick: () => navigate('/attendance/ops'), color: 'amber' });
    }

    return actions;
  }, [navigate, can, caps, isPetugasKelas]);

  // Sidebar Prep
  const sidebarNavGroups = useMemo(() => {
    const groups = groupedMenu.map(group => ({
      label: group.label,
      items: group.items.map(item => ({
        label: item.name,
        icon: iconForName(item.icon) || ChevronRight,
        active: false,
        onClick: () => navigate(item.path || '#'),
        children: item.children
      }))
    }));

    // Add "Layanan Mandiri" for Digital Card
    groups.push({
      label: 'Layanan Mandiri',
      items: [
        {
          label: 'Kartu Digital',
          icon: QrCode,
          onClick: () => navigate('/profile'),
          active: false,
          children: undefined
        }
      ]
    });

    return groups;
  }, [groupedMenu, navigate]);

  return (
    <>
      <WelcomeBanner
        title={`Halo, ${user?.full_name?.split(' ')[0]}!`}
        subtitle={gamification.streak >= 3 ? `Kamu sudah rajin sekolah ${gamification.streak} hari berturut-turut. Keren!` : "Tetap semangat belajar dan jaga kehadiranmu."}
        icon={User}
        badge={studentStatus.isPresent ? { label: 'Hadir', color: 'green' } : { label: 'Belum Presensi', color: 'amber' }}
      />

      <QuickActionGrid title="Aksi Cepat" actions={quickActions.slice(0, 4)} columns={4} />

      <InfoStripGrid items={infoStrips} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Sesi Saat Ini */}
        <CompactSectionCard title="Sesi Saat Ini" icon={PlayCircle} iconColor="indigo">
          {activeSession ? (
            <div className="bg-indigo-600 rounded-lg p-3 text-white">
              <h4 className="text-sm font-bold leading-tight">{activeSession.subject}</h4>
              <div className="flex items-center gap-3 mt-1.5 text-indigo-100 text-[11px]">
                <span className="flex items-center gap-1"><User size={12} /> {activeSession.teacher}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {activeSession.time}</span>
              </div>
              <div className="flex gap-2 mt-3">
                 <Button className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-md flex-1 font-bold text-[11px] h-8">
                    Masuk Kelas
                 </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-[11px] text-gray-400">Tidak ada jadwal belajar aktif</div>
          )}
        </CompactSectionCard>

        {/* Pangkat Siswa */}
        <CompactSectionCard title="Capaian Belajar" icon={Trophy} iconColor="amber">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
                <Medal size={24} />
             </div>
             <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{gamification.level}</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Pertahankan kehadiranmu!</p>
             </div>
          </div>
        </CompactSectionCard>
      </div>

      {/* Learning Journey Timeline */}
      <CompactSectionCard title="Agenda Belajar Hari Ini" icon={LayoutList} iconColor="indigo">
        <div className="space-y-2">
          {schedule.length > 0 ? (
            schedule.map((item) => (
              <div 
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md border transition-colors",
                  item.active 
                    ? 'border-indigo-200 bg-indigo-50/50' 
                    : 'border-gray-50 hover:bg-gray-50'
                )}
              >
                <div className="text-[11px] font-bold text-gray-500 w-12 text-right flex-shrink-0">
                  {item.time.split(' - ')[0]}
                </div>
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", item.active ? 'bg-indigo-500 animate-pulse' : item.status === 'SELESAI' ? 'bg-emerald-500' : 'bg-gray-200')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800 dark:text-white truncate">{item.subject}</span>
                    {item.active && <Badge className="bg-indigo-600 text-white border-none text-[8px] px-1.5 py-0 h-4 animate-pulse">ACTIVE</Badge>}
                  </div>
                  <span className="text-[10px] text-gray-400 truncate block">{item.teacher}</span>
                </div>
                {item.attendanceStatus && (
                   <div className={cn(
                     "px-2 py-0.5 rounded text-[9px] font-bold",
                     item.attendanceStatus === 'HADIR' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                   )}>
                      {item.attendanceStatus}
                   </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-[11px] text-gray-400 italic">Libur telah tiba! Tidak ada jadwal hari ini.</div>
          )}
        </div>
      </CompactSectionCard>

      {!user?.siswa_id && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-800">
           <AlertTriangle size={16} />
           <p className="text-[11px] font-medium">Sesi perlu diperbarui. Silakan Logout dan Login kembali.</p>
        </div>
      )}
    </>
  );
};
