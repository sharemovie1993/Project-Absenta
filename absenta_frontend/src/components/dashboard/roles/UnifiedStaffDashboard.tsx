import React, { useMemo, useState } from 'react';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  User, 
  BookOpen, 
  Users,
  Activity,
  Calendar,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

// Components
import { type QuickAction } from '../shared/QuickActionGrid';
import { JurnalKbmModal } from '../../kurikulum/JurnalKbmModal';
import { SesiAttendanceList } from '../../attendance/sesi/SesiAttendanceList';
import { Modal, Badge, Button } from '../../ui';

// Widgets
import { StaffScheduleWidget } from '../widgets/StaffScheduleWidget';
import { StaffImpactWidget } from '../widgets/StaffImpactWidget';
import { WaliKelasBkDashboardWidget } from '../widgets/WaliKelasBkDashboardWidget';
import { WakasisBkDashboardWidget } from '../widgets/WakasisBkDashboardWidget';

// ✅ Sidebar Panels
import { WaliKelasSidebarPanel } from '../panels/WaliKelasSidebarPanel';
import { KurikulumSidebarPanel } from '../panels/KurikulumSidebarPanel';
import { KesiswaanSidebarPanel } from '../panels/KesiswaanSidebarPanel';
import {
  SarpraSidebarPanel,
  HubinSidebarPanel,
  ToolmanSidebarPanel,
  KaprogSidebarPanel,
  KabengSidebarPanel,
  BpbkSidebarPanel,
  BkkSidebarPanel,
  GerbangSidebarPanel,
} from '../panels/OperationalSidebarPanels';

// Hooks & APIs
import { useStaffTimeline } from '../../../hooks/useStaffTimeline';
import { useSmartMenu } from '../../../hooks/useSmartMenu';
import { guruApi } from '../../../api/academic.api';
import { kesiswaanApi } from '../../../api/kesiswaan.api';
import { hubinApi } from '../../../api/hubin.api';
import { piketApi } from '../../../api/piket.api';
import { kurikulumApi } from '../../../api/kurikulum.api';
import { getDailyClassStats, getDailyTeacherStats, getKepsekEscalations,
  getSarprasStats, getGerbangDashboardStats, getKaprogStats, getToolmanStats,
  getKabengStats, getBkkStats } from '../../../api/dashboard.api';
import { getSesiAbsenSiswa, createSesiAbsensi, updateAbsenGuru } from '../../../api/attendanceGerbang.api';
import { toLocalDate } from '../../../utils/attendance/time';



export const UnifiedStaffDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { menu: _groupedMenu } = useSmartMenu();
  // ── 1. Base Data ──────────────────────────────────────────────────────────────
  const { data: guruProfileRes } = useQuery({
    queryKey: ['guru-profile-me'],
    queryFn: () => guruApi.getMe(),
    enabled: !!user?.id,
  });
  const guruProfile = guruProfileRes?.data as any;

  const guruId = user?.guru_profile?.id || guruProfile?.id;
  const { timelineItems, isLoading: timelineLoading, impact } = useStaffTimeline(guruId);

  // ── 2. Role Detection ─────────────────────────────────────────────────────────
  const caps = user?.capabilities || [];
  // jabatan_list: gabungan dari endpoint /me dan authStore user.position_codes agar super robust
  const jabatanList: string[] = useMemo(() => {
    const list = [...(guruProfile?.jabatan_list || [])];
    const userCodes = (user as any)?.position_codes || [];
    if (Array.isArray(userCodes)) {
      userCodes.forEach((code: string) => {
        if (code && !list.includes(code)) list.push(code);
      });
    }
    return list;
  }, [guruProfile?.jabatan_list, user]);

  // jabatan: string gabungan untuk backward-compat
  const jabatan: string = guruProfile?.jabatan || (user?.guru_profile as any)?.jabatan || '';


  // Cek kode di jabatan_list ATAU substring di jabatan string
  const hasRole = (...keywords: string[]): boolean => {
    const j = jabatan.toUpperCase();
    return jabatanList.some(code => keywords.some(k => code.toUpperCase().includes(k.toUpperCase())))
        || keywords.some(k => j.includes(k.toUpperCase()));
  };

  const isWaliKelas = useMemo(() =>
    caps.includes('dashboard.view.walikelas') ||
    !!guruProfile?.wali_kelas_di?.id ||
    !!((user?.guru_profile as any)?.wali_kelas_di?.id) ||
    hasRole('WALI', 'HOMEROOM'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [caps, guruProfile, user, jabatanList, jabatan]);

  const isKurikulum = useMemo(() => 
    caps.includes('dashboard.view.kurikulum') || 
    caps.includes('attendance.sessions.view.list') || 
    user?.role?.name === 'KURIKULUM' || 
    hasRole('KURIKULUM'), 
  [caps, user, jabatanList, jabatan]);
  const isStrictKesiswaan = useMemo(() => 
    caps.includes('dashboard.view.kesiswaan') || 
    user?.role?.name === 'KESISWAAN' || 
    hasRole('KESISWAAN'), 
  [caps, user, jabatanList, jabatan]);

  const isKesiswaan = useMemo(() => 
    isStrictKesiswaan || 
    caps.includes('dashboard.view.piket') || 
    caps.includes('attendance.piket.view') || 
    caps.includes('attendance.piket.manage') || 
    caps.includes('kesiswaan.piket.view') || 
    caps.includes('kesiswaan.piket.manage') || 
    hasRole('PIKET'), 
  [isStrictKesiswaan, caps, jabatanList, jabatan]); // eslint-disable-line
  const isKepsek    = useMemo(() => caps.includes('dashboard.view.kepsek') || hasRole('KEPALA SEKOLAH', 'KEPALA_SEKOLAH', 'KEPSEK'), [caps, jabatanList, jabatan]); // eslint-disable-line
  const isSarpras   = useMemo(() => user?.role?.name === 'SARPRAS'  || hasRole('SARPRAS', 'SARANA'),                   [user, jabatanList, jabatan]); // eslint-disable-line
  const isHubin     = useMemo(() => caps.includes('dashboard.view.hubin') || user?.role?.name === 'HUBIN' || hasRole('HUBIN', 'HUBUNGAN INDUSTRI'), [caps, user, jabatanList, jabatan]); // eslint-disable-line
  const isGlobalHubin = useMemo(() => caps.includes('hubin.partners.manage') || user?.role?.name === 'ADMIN' || hasRole('HUBIN'), [caps, user, jabatanList, jabatan]); // eslint-disable-line
  const isToolman   = useMemo(() => hasRole('TOOLMAN', 'TOOL MAN', 'PENJAGA LAB'),                                     [jabatanList, jabatan]); // eslint-disable-line
  const isKaprog    = useMemo(() => user?.role?.name === 'KAPROG'   || hasRole('KAPROG', 'KEPALA PROGRAM'),             [user, jabatanList, jabatan]); // eslint-disable-line
  const isKabeng    = useMemo(() => hasRole('KABENG', 'KEPALA BENGKEL'),                                                [jabatanList, jabatan]); // eslint-disable-line
  const isBpbk      = useMemo(() => hasRole('BPBK', 'BK ', 'BIMBINGAN KONSELING', 'KONSELING'),                        [jabatanList, jabatan]); // eslint-disable-line
  const isBkk       = useMemo(() => hasRole('BKK', 'BURSA KERJA'),                                                     [jabatanList, jabatan]); // eslint-disable-line
  const isGerbang   = useMemo(() => hasRole('GERBANG', 'OPERATOR GERBANG', 'GATE'),                                    [jabatanList, jabatan]); // eslint-disable-line
  const isTU        = useMemo(() => user?.role?.name === 'TU' || user?.role?.name === 'TATA_USAHA' || hasRole('TU', 'TATA USAHA'), [user, jabatanList, jabatan]); // eslint-disable-line

  const hasStructuralRole = isWaliKelas || isKurikulum || isKesiswaan || isKepsek
    || isSarpras || isHubin || isToolman || isKaprog || isKabeng
    || isBpbk || isBkk || isGerbang || isTU;

  // ── 3. Role-Specific Queries ───────────────────────────────────────────────────
  const waliKelasId = guruProfile?.wali_kelas_di?.id || (user?.guru_profile as any)?.wali_kelas_di?.id;

  const { data: classPresence, isLoading: classPresenceLoading } = useQuery({
    queryKey: ['attendance-today-me-class', waliKelasId],
    queryFn: () => kesiswaanApi.getRekapHarianSiswa({ kelas_id: waliKelasId }),
    enabled: !!isWaliKelas && !!waliKelasId,
  });

  const { data: kbmStatsRes, isLoading: kbmLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'kbm-stats'],
    queryFn: () => getDailyClassStats(),
    enabled: !!isKurikulum || !!isKepsek,
  });

  const { data: teacherStatsRes, isLoading: teacherStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'teacher-stats'],
    queryFn: () => getDailyTeacherStats(),
    enabled: !!isKurikulum || !!isKepsek,
  });

  const { data: escalationsRes } = useQuery({
    queryKey: ['dashboard', 'kepsek', 'escalations'],
    queryFn: () => getKepsekEscalations(),
    enabled: !!isKepsek,
  });

  const { data: dailyPermitsRes, isLoading: permitsLoading } = useQuery({
    queryKey: ['dashboard', 'kesiswaan', 'daily-permits'],
    queryFn: () => piketApi.getDailyPermits(),
    enabled: !!isKesiswaan,
  });

  const { data: violationsRes, isLoading: violationsLoading } = useQuery({
    queryKey: ['dashboard', 'kesiswaan', 'violations'],
    queryFn: () => kesiswaanApi.getPelanggaran({ limit: 100 }),
    enabled: !!isKesiswaan,
  });

  const { data: kurikulumMonitoringRes, isLoading: kurikulumMonitoringLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'monitoring-global', toLocalDate()],
    queryFn: () => kurikulumApi.getKbmGlobalMonitoring(toLocalDate()),
    enabled: !!isKurikulum,
    refetchInterval: 60000, // Refresh every 1 minute for real-time feel
  });

  const { data: hubinStatsRes, isLoading: hubinStatsLoading } = useQuery({
    queryKey: ['dashboard', 'hubin', 'stats'],
    queryFn: () => hubinApi.getStats(),
    enabled: !!isHubin,
  });

  // ── Operational Panel Queries (Sarpras, Gerbang, Kaprog, Toolman, Kabeng, BKK)
  const { data: sarprasStatsRes, isLoading: sarprasStatsLoading } = useQuery({
    queryKey: ['dashboard', 'sarpras', 'stats'],
    queryFn: getSarprasStats,
    enabled: !!isSarpras,
  });

  const { data: gerbangStatsRes, isLoading: gerbangStatsLoading } = useQuery({
    queryKey: ['dashboard', 'gerbang', 'stats'],
    queryFn: getGerbangDashboardStats,
    enabled: !!isGerbang,
    refetchInterval: 60000,
  });

  const { data: kaprogStatsRes, isLoading: kaprogStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kaprog', 'stats'],
    queryFn: getKaprogStats,
    enabled: !!isKaprog,
  });

  const { data: toolmanStatsRes, isLoading: toolmanStatsLoading } = useQuery({
    queryKey: ['dashboard', 'toolman', 'stats'],
    queryFn: getToolmanStats,
    enabled: !!isToolman,
  });

  const { data: kabengStatsRes, isLoading: kabengStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kabeng', 'stats'],
    queryFn: getKabengStats,
    enabled: !!isKabeng,
  });

  const { data: bkkStatsRes, isLoading: bkkStatsLoading } = useQuery({
    queryKey: ['dashboard', 'bkk', 'stats'],
    queryFn: getBkkStats,
    enabled: !!isBkk,
  });


  // ── 4. UI State ────────────────────────────────────────────────────────────────
  const [selectedSesi, setSelectedSesi] = useState<any>(null);
  const [sessionForJournal, setSessionForJournal] = useState<any>(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [processingSesiId, setProcessingSesiId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'personal' | 'walikelas' | 'wakasis'>('personal');

  // ── 6. Mutations ─────────────────────────────────────────────────────────────
  const createSessionMutation = useMutation({
    mutationFn: (payload: any) => createSesiAbsensi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sesi-me-today'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-me'] });
    }
  });

  const selfPresensiMutation = useMutation({
    mutationFn: ({ sesiId, guruId }: { sesiId: string; guruId: string }) => 
      updateAbsenGuru(sesiId, guruId, { status: 'HADIR' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sesi-me-today'] });
    }
  });

  const handleStaffAction = async (item: any) => {
    if (!guruId) {
      toast.error('Profil guru tidak ditemukan');
      return;
    }

    try {
      // ── LOGIKA BARU: HANYA VIEW (SESUAI KEBIJAKAN INTEGRITAS) ──
      // Kita tidak lagi mengizinkan Guru membuat sesi atau absen mandiri via klik kartu.
      // Sesi harus dibuat oleh sistem/petugas, dan absen guru via tap mesin/petugas.
      
      if (item.session?.id) {
        setSelectedSesi(item.session);
      } else {
        toast('Sesi belum diaktifkan oleh sistem/petugas');
      }
    } catch (error: any) {
      toast.error('Gagal membuka dashboard sesi');
    }
  };

  const { data: detailAttendanceRes, isLoading: detailLoading } = useQuery({
    queryKey: ['sesi-detail-attendance', selectedSesi?.id],
    queryFn: () => getSesiAbsenSiswa(selectedSesi?.id),
    enabled: !!selectedSesi?.id,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      // Jika ada sesi dan belum selesai, refresh setiap 30 detik untuk real-time monitoring
      return selectedSesi && selectedSesi.status !== 'SELESAI' ? 30000 : false;
    }
  });

  // ── 5. Derived Values ─────────────────────────────────────────────────────────
  // classPresence.data kini berupa array [{id, nama, status, poin}] dari endpoint bulk baru
  const classPresenceData = useMemo(
    () => (classPresence?.data || []) as Array<{ id: string; nama: string; status: string; poin?: number }>,
    [classPresence]
  );
  const hasClassPresenceData = classPresence !== undefined && !classPresenceLoading;

  const absentStudents = useMemo(
    () => classPresenceData.filter((s) => s.status !== 'HADIR' && s.status !== 'TERLAMBAT'),
    [classPresenceData]
  );

  const attendanceRate = useMemo(() => {
    if (!hasClassPresenceData || !classPresenceData.length) return null; // null = belum ada data, bukan 0%
    return (
      classPresenceData.filter((s) => s.status === 'HADIR' || s.status === 'TERLAMBAT').length /
      classPresenceData.length
    ) * 100;
  }, [classPresenceData, hasClassPresenceData]);


  const kbmHealthScore = useMemo(() => {
    // If we have monitoring data, use it
    if (kurikulumMonitoringRes?.data) {
      return kurikulumMonitoringRes.data.healthScore || 0;
    }
    // Fallback to manual calculation
    const ka = kbmStatsRes?.data?.kelasAktif || 0;
    const kt = kbmStatsRes?.data?.totalKelas || 1;
    const gh = teacherStatsRes?.data?.guruHadir || 0;
    const gt = teacherStatsRes?.data?.totalGuru || 1;
    return Math.round((ka / kt) * 60 + (gh / gt) * 40);
  }, [kurikulumMonitoringRes, kbmStatsRes, teacherStatsRes]);

  const activeIzinCount = useMemo(() => {
    const list = dailyPermitsRes?.data || [];
    return list.filter((p: any) => p.status === 'DISETUJUI').length;
  }, [dailyPermitsRes]);

  const pointsToday = useMemo(() => {
    const list = violationsRes?.data?.list || [];
    const todayStr = new Date().toDateString();
    return list
      .filter((v: any) => new Date(v.tanggal).toDateString() === todayStr)
      .reduce((sum: number, v: any) => sum + v.poin, 0);
  }, [violationsRes]);

  const isKesiswaanLoading = permitsLoading || violationsLoading;

  const jabatanLabel = useMemo(() => {
    if (jabatan) return jabatan;
    const parts: string[] = [];
    if (isWaliKelas) parts.push('Wali Kelas');
    if (isKurikulum) parts.push('Kurikulum');
    if (isKesiswaan) parts.push('Kesiswaan');
    if (isSarpras)   parts.push('Sarpras');
    if (isHubin)     parts.push('Hubin');
    if (isToolman)   parts.push('Toolman');
    if (isKaprog)    parts.push('Kaprog');
    if (isKabeng)    parts.push('Kabeng');
    if (isBpbk)      parts.push('BK');
    if (isBkk)       parts.push('BKK');
    if (isGerbang)   parts.push('Gerbang');
    return parts.length > 0 ? `Guru / ${parts.join(' & ')}` : 'Tenaga Pendidik';
  }, [jabatan, isWaliKelas, isKurikulum, isKesiswaan, isSarpras, isHubin, isToolman, isKaprog, isKabeng, isBpbk, isBkk, isGerbang]);

  // ── 6. Quick Actions ──────────────────────────────────────────────────────────
  const quickActions = useMemo(() => {
    const actions: QuickAction[] = [
      { label: 'Jadwal Saya',  icon: Calendar, onClick: () => navigate(`/attendance/jadwal-template?guru_id=${guruId}`),          color: 'blue'   },
      { label: 'Riwayat Ajar', icon: Activity,  onClick: () => navigate('/attendance/riwayat-ajar'), color: 'indigo' },
    ];
    if (isWaliKelas) actions.push({ label: 'Kelas Saya',     icon: Users,    onClick: () => navigate('/academic/siswa'),         color: 'rose'   });
    if (isKurikulum) actions.push({ label: 'Monitoring KBM', icon: BookOpen, onClick: () => navigate('/attendance/monitoring'), color: 'purple' });
    
    // Posisikan Catat Pelanggaran paling belakang
    actions.push({ label: 'Catat Pelanggaran', icon: AlertTriangle, onClick: () => navigate('/kesiswaan/pelanggaran'), color: 'amber' });
    
    return actions;
  }, [isWaliKelas, isKurikulum, navigate]);

  // ── 7. Dynamic Structural Panels Ordering ───────────────────────────────────
  const structuralPanels = useMemo(() => {
    const list: Array<{ key: string; component: React.ReactNode }> = [];

    if (isWaliKelas) {
      list.push({
        key: 'WALIKELAS',
        component: (
          <WaliKelasSidebarPanel
            key="walikelas"
            namaKelas={guruProfile?.wali_kelas_di?.nama_kelas || (user?.guru_profile as any)?.wali_kelas_di?.nama_kelas}
            attendanceRate={attendanceRate}
            absentStudents={absentStudents.map((s) => ({ id: s.id, nama: s.nama, status: s.status }))}
            isLoading={classPresenceLoading}
            hasData={hasClassPresenceData && classPresenceData.length > 0}
            onViewRekap={() => navigate('/attendance/rekap/kelas-bulanan')}
            onFollowUp={() => navigate('/kesiswaan/monitoring')}
          />
        )
      });
    }

    if (isKurikulum) {
      list.push({
        key: 'KURIKULUM',
        component: (
          <KurikulumSidebarPanel
            key="kurikulum"
            healthScore={kurikulumMonitoringRes?.data?.healthScore ?? kbmHealthScore}
            activeClasses={kurikulumMonitoringRes?.data?.activeClasses ?? (kbmStatsRes?.data?.kelasAktif || 0)}
            totalClasses={kurikulumMonitoringRes?.data?.totalClasses ?? (kbmStatsRes?.data?.totalKelas || 0)}
            teacherPresent={kurikulumMonitoringRes?.data?.teacherPresent ?? (teacherStatsRes?.data?.guruHadir || 0)}
            totalTeachers={kurikulumMonitoringRes?.data?.totalTeachers ?? (teacherStatsRes?.data?.totalGuru || 0)}
            supervisionCount={kurikulumMonitoringRes?.data?.supervisionCount || 0}
            isLoading={kurikulumMonitoringLoading || (kbmLoading && !kurikulumMonitoringRes?.data) || (teacherStatsLoading && !kurikulumMonitoringRes?.data)}
            onMonitor={() => navigate('/attendance/monitoring')}
          />
        )
      });
    }

    if (isKepsek && (escalationsRes?.data?.length ?? 0) > 0) {
      list.push({
        key: 'KEPSEK',
        component: (
          <div key="kepsek" className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="text-amber-600 dark:text-amber-400" size={18} />
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">Eskalasi Perlu Tindakan</h3>
            </div>
            <div className="space-y-2">
              {escalationsRes?.data?.map((esc: any) => (
                <div key={esc.id} className="text-xs bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-amber-100 dark:border-amber-800/30">
                  <p className="font-bold text-amber-800 dark:text-amber-200">{esc.judul}</p>
                  <p className="text-amber-600 dark:text-amber-400 mt-0.5">{esc.deskripsi}</p>
                </div>
              ))}
            </div>
          </div>
        )
      });
    }

    if (isGlobalHubin || (hubinStatsRes?.data?.totalSiswaPkl > 0)) {
      list.push({
        key: 'HUBIN',
        component: (
          <HubinSidebarPanel
            key="hubin"
            activePklStudents={hubinStatsRes?.data?.pklAktif || hubinStatsRes?.data?.totalSiswaPkl || 0}
            activePartners={hubinStatsRes?.data?.totalMitra || 0}
            pendingReports={hubinStatsRes?.data?.pendingReports || 0}
            isLoading={hubinStatsLoading}
            onMonitor={() => navigate('/hubin/monitoring')}
          />
        )
      });
    }

    if (isSarpras) {
      list.push({
        key: 'SARPRAS',
        component: (
          <SarpraSidebarPanel
            key="sarpras"
            activeBorrows={sarprasStatsRes?.data?.totalLoaned ?? 0}
            availableAssets={(sarprasStatsRes?.data?.totalAssets ?? 0) - (sarprasStatsRes?.data?.totalLoaned ?? 0) - (sarprasStatsRes?.data?.totalBroken ?? 0)}
            pendingMaintenance={sarprasStatsRes?.data?.totalBroken ?? 0}
            isLoading={sarprasStatsLoading}
            onManage={() => navigate('/sarpras/peminjaman')}
          />
        )
      });
    }

    if (isToolman) {
      list.push({
        key: 'TOOLMAN',
        component: (
          <ToolmanSidebarPanel
            key="toolman"
            toolsBorrowed={toolmanStatsRes?.data?.toolsBorrowed ?? 0}
            toolsAvailable={toolmanStatsRes?.data?.toolsAvailable ?? 0}
            damagedReports={toolmanStatsRes?.data?.damagedReports ?? 0}
            isLoading={toolmanStatsLoading}
            onManage={() => navigate('/sarpras/inventaris')}
          />
        )
      });
    }

    if (isKaprog) {
      list.push({
        key: 'KAPROG',
        component: (
          <KaprogSidebarPanel
            key="kaprog"
            totalTeachers={kaprogStatsRes?.data?.totalTeachers ?? 0}
            activeClasses={kaprogStatsRes?.data?.activeClasses ?? 0}
            supervisionCount={kaprogStatsRes?.data?.supervisionCount ?? 0}
            programName={kaprogStatsRes?.data?.programName || jabatan.replace(/KAPROG|KEPALA PROGRAM/gi, '').trim() || 'Jurusan'}
            isLoading={kaprogStatsLoading}
            onMonitor={() => navigate('/kaprog/monitoring')}
          />
        )
      });
    }

    if (isKabeng) {
      list.push({
        key: 'KABENG',
        component: (
          <KabengSidebarPanel
            key="kabeng"
            activeBengkel={kabengStatsRes?.data?.activeBengkel ?? 0}
            availableTools={kabengStatsRes?.data?.availableTools ?? 0}
            practiceSchedules={kabengStatsRes?.data?.practiceSchedules ?? 0}
            bengkelName={kabengStatsRes?.data?.bengkelName || jabatan.replace(/KABENG|KEPALA BENGKEL/gi, '').trim() || 'Bengkel'}
            isLoading={kabengStatsLoading}
            onManage={() => navigate('/sarpras/bengkel')}
          />
        )
      });
    }

    if (isBpbk) {
      list.push({
        key: 'BPBK',
        component: (
          <BpbkSidebarPanel
            key="bpbk"
            newCases={0}
            handledCases={0}
            criticalStudents={0}
            onOpenData={() => navigate('/bpbk')}
          />
        )
      });
    }

    if (isBkk) {
      list.push({
        key: 'BKK',
        component: (
          <BkkSidebarPanel
            key="bkk"
            alumniPlaced={bkkStatsRes?.data?.alumniPlaced ?? 0}
            activeJobs={bkkStatsRes?.data?.activeJobs ?? 0}
            pendingApplications={bkkStatsRes?.data?.pendingApplications ?? 0}
            isLoading={bkkStatsLoading}
            onOpenPortal={() => navigate('/bkk/portal')}
          />
        )
      });
    }

    if (isGerbang) {
      list.push({
        key: 'GERBANG',
        component: (
          <GerbangSidebarPanel
            key="gerbang"
            totalScansToday={gerbangStatsRes?.data?.total_taps_today ?? 0}
            lateStudents={gerbangStatsRes?.data?.total_masuk ?? 0}
            gateStatus="AKTIF"
            isLoading={gerbangStatsLoading}
            onOpenGerbang={() => navigate('/attendance/gerbang')}
          />
        )
      });
    }

    if (isKesiswaan) {
      list.push({
        key: 'KESISWAAN',
        component: (
          <KesiswaanSidebarPanel
            key="kesiswaan"
            isPiketHariIni
            activeIzinCount={activeIzinCount}
            pointsToday={pointsToday}
            isLoading={isKesiswaanLoading}
            onOpenPiket={() => navigate('/kesiswaan/piket')}
            onOpenMonitoring={isStrictKesiswaan ? () => navigate('/kesiswaan/monitoring') : undefined}
          />
        )
      });
    }

    const getPanelOrder = (key: string): number => {
      const weights: Record<string, number> = {
        KAPROG: 1,
        KABENG: 2,
        TOOLMAN: 3,
        WALIKELAS: 4,
        BPBK: 5,
        KEPSEK: 6,
        KURIKULUM: 7,
        KESISWAAN: 8,
        HUBIN: 9,
        SARPRAS: 10,
        BKK: 11,
        GERBANG: 12,
        KOPERASI: 13
      };
      return weights[key] ?? 99;
    };

    return [...list].sort((a, b) => getPanelOrder(a.key) - getPanelOrder(b.key));
  }, [
    isWaliKelas, isKurikulum, isKepsek, isGlobalHubin, isSarpras, isToolman, isKaprog, isKabeng, isBpbk, isBkk, isGerbang, isKesiswaan,
    guruProfile, user, attendanceRate, absentStudents, classPresenceLoading, hasClassPresenceData, classPresenceData,
    kurikulumMonitoringRes, kbmHealthScore, kbmStatsRes, teacherStatsRes, teacherStatsLoading, kurikulumMonitoringLoading, kbmLoading,
    escalationsRes, hubinStatsRes, hubinStatsLoading, sarprasStatsRes, sarprasStatsLoading, toolmanStatsRes, toolmanStatsLoading,
    kaprogStatsRes, kaprogStatsLoading, kabengStatsRes, kabengStatsLoading, bkkStatsRes, bkkStatsLoading, gerbangStatsRes, gerbangStatsLoading,
    activeIzinCount, pointsToday, isKesiswaanLoading, navigate, jabatan
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className={hasStructuralRole
        ? 'grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6'
        : 'grid grid-cols-1 gap-6'
      }>
        {/* ── Kolom Kiri: Tugas Mengajar ── */}
        <div className="space-y-6">
          {/* Consolidated Welcome & Quick Action Card (Sekat-Sekat Premium) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/50 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            {/* Sekat 1: Sapaan (Welcome) */}
            <div className="p-4 flex items-center gap-4 bg-gradient-to-r from-sky-50/30 to-blue-50/30 dark:from-slate-700/10 dark:to-slate-700/10">
              <div className="w-10 h-10 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center flex-shrink-0 text-white font-black text-sm shadow-sm">
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-gray-800 dark:text-white leading-tight truncate">
                  Halo, {user?.full_name?.split(' ')[0]}!
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  Selamat mengabdi hari ini. Mari cetak masa depan bangsa melalui pendidikan berkualitas.
                </p>
              </div>
              <span className="flex-shrink-0 px-2.5 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 uppercase tracking-wider">
                {jabatanLabel}
              </span>
            </div>

            {/* Sekat Separator Line */}
            <div className="border-t border-gray-50 dark:border-slate-700/50" />

            {/* Sekat 2: Aksi Cepat */}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs">⚡</span>
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300">Aksi Cepat</h3>
              </div>
              <div className={`grid grid-cols-2 sm:grid-cols-${quickActions.length} gap-2`}>
                {quickActions.map((action, idx) => {
                  const colorsMap: Record<string, { icon: string; bg: string }> = {
                    blue:    { icon: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    indigo:  { icon: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                    rose:    { icon: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-900/20' },
                    purple:  { icon: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20' },
                    amber:   { icon: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    orange:  { icon: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
                  };
                  const colors = colorsMap[action.color || 'blue'] || colorsMap.blue;

                  return (
                    <button
                      key={idx}
                      onClick={action.onClick}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
                    >
                      <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <action.icon size={18} className={colors.icon} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tab View Switcher (Jika Wali Kelas atau Kesiswaan) */}
          {(isWaliKelas || isKesiswaan) && (
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
              <button
                onClick={() => setActiveView('personal')}
                className={cn(
                  "flex-1 py-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  activeView === 'personal'
                    ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white border border-slate-200/40 dark:border-slate-700/50"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                🗓️ Jadwal Mengajar & Aktivitas
              </button>
              {isWaliKelas && (
                <button
                  onClick={() => setActiveView('walikelas')}
                  className={cn(
                    "flex-1 py-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    activeView === 'walikelas'
                      ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white border border-slate-200/40 dark:border-slate-700/50"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  🛡️ BK & Risiko Kelas
                </button>
              )}
              {isKesiswaan && (
                <button
                  onClick={() => setActiveView('wakasis')}
                  className={cn(
                    "flex-1 py-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    activeView === 'wakasis'
                      ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white border border-slate-200/40 dark:border-slate-700/50"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  📊 Analitik Kesiswaan (Wakasis)
                </button>
              )}
            </div>
          )}

          {activeView === 'personal' && (
            <StaffScheduleWidget 
              timelineItems={timelineItems} 
              isLoading={timelineLoading}
              processingId={processingSesiId}
              onAction={handleStaffAction}
              onOpenJournal={(_sesiId, data) => {
                setSessionForJournal(data);
                setJournalModalOpen(true);
              }}
            />
          )}

          {activeView === 'walikelas' && isWaliKelas && (
            <WaliKelasBkDashboardWidget />
          )}

          {activeView === 'wakasis' && isKesiswaan && (
            <WakasisBkDashboardWidget />
          )}
        </div>

        {/* ── Kolom Kanan: Panel Jabatan Struktural ── */}
        {hasStructuralRole && (
          <div className="space-y-4">
            {structuralPanels.map(p => p.component)}

            {/* Dampak Pembelajaran — selalu tampil paling belakang */}
            <StaffImpactWidget 
              totalStudentsTaught={impact.totalStudents}
              totalSessions={impact.totalSessions}
              attendanceRate={impact.attendanceRate}
              isLoading={timelineLoading}
            />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <Modal 
        isOpen={!!selectedSesi} 
        onClose={() => setSelectedSesi(null)} 
        title={
          <div className="flex flex-col gap-1">
            <span className="text-sm sm:text-lg font-black truncate">{selectedSesi?.Mapel?.nama_mapel || selectedSesi?.jenis_kegiatan}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold truncate">
              {selectedSesi?.Kelas?.nama_kelas} • {selectedSesi?.Guru?.nama_guru}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge 
                variant={selectedSesi?.status === 'BERLANGSUNG' ? 'success' : 'secondary'}
                className="text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border"
              >
                {selectedSesi?.status === 'BERLANGSUNG' ? '🔴 Live' : '✅ Selesai'}
              </Badge>
              {selectedSesi?.status === 'BERLANGSUNG' && (
                <span className="flex text-[8px] font-bold text-indigo-500 animate-pulse items-center gap-1">
                  <Activity size={10} /> Live Sync
                </span>
              )}
            </div>
          </div>
        }
        size="2xl"
      >
        <div className="p-4 sm:p-6">
          {detailLoading && !detailAttendanceRes ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Memuat data hadir...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <SesiAttendanceList 
                records={detailAttendanceRes?.data || []} 
                sesi={selectedSesi} 
              />
            </div>
          )}
          
          <div className="pt-4 mt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <Button 
              variant="secondary" 
              onClick={() => setSelectedSesi(null)} 
              className="rounded-xl px-8 h-9 font-black uppercase tracking-widest text-[9px]"
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {journalModalOpen && sessionForJournal && (
        <JurnalKbmModal 
          isOpen={journalModalOpen}
          onClose={() => {
            setJournalModalOpen(false);
            setSessionForJournal(null);
          }}
          sesiId={sessionForJournal.id}
          initialData={sessionForJournal}
        />
      )}
    </>
  );
};
