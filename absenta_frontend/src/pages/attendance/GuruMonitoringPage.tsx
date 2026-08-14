import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  SectionCard, 
  Badge, 
  Table, 
  Input, 
  Button, 
  Alert, 
  AlertDescription,
  Loader,
  Label 
} from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { getSesiAbsensiList } from '../../api/attendanceGerbang.api';
import { kelasApi, guruApi } from '../../api/academic.api';
import { toLocalDate } from '../../utils/attendance/time';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useSocket } from '../../hooks/useSocket';
import { 
  Activity, 
  RefreshCw, 
  UserCheck, 
  LayoutGrid,
  Users,
  Presentation
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

interface SessionSummary {
  HADIR?: number;
}

interface SesiMonitoringData {
  id: string;
  kelas_id?: string;
  kelas_nama?: string;
  guru_id?: string;
  guru_nama?: string;
  jenis_kegiatan?: string;
  status?: string;
  summary?: SessionSummary;
  total_siswa_kelas?: number;
}

interface DropdownOptionResponse {
  id: string;
  nama_kelas?: string;
  nama_guru?: string;
  nama?: string;
}

const breadcrumbs = [
  { label: 'Presensi', path: '/attendance/ops' },
  { label: 'Monitoring Mengajar Guru', active: true }
];

export default React.memo(function GuruMonitoringPage() {
  const { subscription } = useAuthStore();
  const memoBreadcrumbs = useMemo(() => breadcrumbs, []);
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();
  const [tanggal, setTanggal] = useState<string>(toLocalDate());
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedGuruId] = useState<string>('');
  const [explicitTanggal, setExplicitTanggal] = useState<boolean>(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { isAdmin, isKurikulum, isKepalaSekolah, can } = useCapabilities();
  const canView = useMemo(
    () => isAdmin || isKurikulum || isKepalaSekolah || (can('attendance.reports.view') && can('academic.teachers.view.list')),
    [isAdmin, isKurikulum, isKepalaSekolah, can],
  );

  const subFeatures = (subscription as unknown as Record<string, unknown>)?.features || 
                      subscription?.Plan?.features_json || 
                      subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  const sessionsQuery = useQuery({
    queryKey: ['guru-monitoring-sessions', explicitTanggal, tanggal, selectedKelasId, selectedGuruId],
    queryFn: async () => {
      const params: Record<string, unknown> = { summary: true };
      if (explicitTanggal && tanggal) params.tanggal = tanggal;
      if (selectedKelasId) params.kelas_id = selectedKelasId;
      if (selectedGuruId) params.guru_id = selectedGuruId;
      const res = await getSesiAbsensiList(params);
      const rawData = res.data;
      const items = Array.isArray(rawData)
        ? rawData
        : Array.isArray((rawData as any)?.data)
        ? (rawData as any).data
        : Array.isArray((res as any)?.items)
        ? (res as any).items
        : [];
      return items as SesiMonitoringData[];
    },
    enabled: !isLocked,
    staleTime: 5 * 60 * 1000,
  });

  const sessions = Array.isArray(sessionsQuery.data)
    ? sessionsQuery.data
    : Array.isArray((sessionsQuery.data as any)?.data)
    ? (sessionsQuery.data as any).data
    : [];

  const loading = sessionsQuery.isLoading;

  const fetchSessions = useCallback(async () => {
    await sessionsQuery.refetch();
  }, [sessionsQuery]);

  useEffect(() => {
    if (!isConnected || isLocked) return;

    const params: Record<string, unknown> = {};
    if (explicitTanggal && tanggal) params.tanggal = tanggal;
    if (selectedKelasId) params.kelas_id = selectedKelasId;
    if (selectedGuruId) params.guru_id = selectedGuruId;
    emit('attendance_feed_subscribe', params);

    const handleUpdate = () => fetchSessions();
    subscribe('attendance_feed_update', handleUpdate);
    subscribe('sesi_status_update', handleUpdate);

    return () => {
      unsubscribe('attendance_feed_update', handleUpdate);
      unsubscribe('sesi_status_update', handleUpdate);
    };
  }, [isConnected, explicitTanggal, tanggal, selectedKelasId, selectedGuruId, subscribe, unsubscribe, emit, fetchSessions, isLocked]);

  const refsQuery = useQuery({
    queryKey: ['guru-monitoring-refs'],
    queryFn: async () => {
      const [kRes, gRes] = await Promise.all([
        kelasApi.getAll({ limit: 1000 } as unknown as Record<string, unknown>),
        guruApi.getAll({ limit: 1000 } as unknown as Record<string, unknown>)
      ]);
      const kList = (kRes.data as DropdownOptionResponse[]) || [];
      const gList = (gRes.data as DropdownOptionResponse[]) || [];
      const km: Record<string, string> = {};
      const gm: Record<string, string> = {};
      const kOpts: Array<{ value: string; label: string }> = [];

      kList.forEach((k) => {
        if (k.id) {
          const name = k.nama_kelas || k.nama || String(k.id);
          km[k.id] = name;
          kOpts.push({ value: k.id, label: name });
        }
      });

      gList.forEach((g) => {
        if (g.id) {
          gm[g.id] = g.nama_guru || g.nama || String(g.id);
        }
      });

      return { kelasMap: km, guruMap: gm, kelasOptions: kOpts };
    },
    staleTime: 5 * 60 * 1000,
  });

  const kelasMap = refsQuery.data?.kelasMap || {};
  const guruMap = refsQuery.data?.guruMap || {};
  const kelasOptions = refsQuery.data?.kelasOptions || [];

  const stats = useMemo(() => [
    {
      title: "Sesi Aktif",
      value: (sessions?.length || 0).toString(),
      icon: <Presentation size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Monitoring realtime"
    },
    {
      title: "Update Status",
      value: "Live",
      icon: <Activity size={14} />,
      gradient: "from-emerald-55 to-teal-600",
      subtitle: isConnected ? "Terhubung ke Socket" : "Offline Reconnecting"
    }
  ], [sessions, isConnected]);

  const instructionData = {
    title: "Monitoring Mengajar Guru",
    description: "Pantau kehadiran guru dan status sesi KBM secara realtime di seluruh kelas.",
    items: [
      { text: "Data diperbarui secara instan saat guru memulai atau mengakhiri sesi." },
      { text: "Gunakan filter tanggal untuk melihat riwayat sesi sebelumnya." },
      { text: "Hadir/Total menunjukkan jumlah siswa yang sudah diabsen oleh guru." }
    ]
  };

  const columns = useMemo(() => [
    { 
      key: 'kelas_id', 
      label: 'Kelas', 
      render: (_v: unknown, r: unknown) => {
        const row = r as SesiMonitoringData;
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <LayoutGrid size={16} />
            </div>
            <div className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {kelasMap[String(row?.kelas_id || '')] || row?.kelas_nama || '-'}
            </div>
          </div>
        );
      } 
    },
    { 
      key: 'guru_id', 
      label: 'Guru Pengajar', 
      render: (_v: unknown, r: unknown) => {
        const row = r as SesiMonitoringData;
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
              <UserCheck size={16} />
            </div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">
              {guruMap[String(row?.guru_id || '')] || row?.guru_nama || '-'}
            </div>
          </div>
        );
      } 
    },
    { 
      key: 'jenis_kegiatan', 
      label: 'Jenis', 
      render: (v: unknown) => (
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v ? String(v) : '-'}</span>
      ) 
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (v: unknown) => {
        const statusStr = String(v || '');
        return (
          <Badge 
            variant={statusStr === 'SELESAI' ? 'success' : 'info'} 
            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
          >
            {statusStr || 'DRAFT'}
          </Badge>
        );
      } 
    },
    { 
      key: 'kehadiran', 
      label: 'Absensi Siswa', 
      render: (_v: unknown, r: unknown) => {
        const row = r as SesiMonitoringData;
        return (
          <div className="flex items-center gap-2">
            <Users size={12} className="text-slate-300" />
            <div className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
              {Number(row?.summary?.HADIR || 0)} <span className="text-slate-300 mx-1">/</span> {Number(row?.total_siswa_kelas || 0)}
            </div>
          </div>
        );
      }
    },
  ], [kelasMap, guruMap]);

  // Paginate sessions
  const pagedSessions = useMemo(() => {
    const start = (page - 1) * limit;
    return sessions.slice(start, start + limit);
  }, [sessions, page, limit]);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, []);

  const handleLimitChange = useCallback((l: number) => {
    setLimit(l);
    setPage(1);
  }, []);

  if (!canView) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  const pageContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="space-y-2">
          <Label htmlFor="date-filter-field">Pilih Tanggal</Label>
          <div className="relative group">
            <Input 
              id="date-filter-field"
              type="date" 
              value={tanggal} 
              onChange={e => { setTanggal(e.target.value); setExplicitTanggal(true); }} 
              className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="kelas-filter-select">Filter Kelas</Label>
          <SearchableSelect
            id="kelas-filter-select"
            value={selectedKelasId}
            onValueChange={setSelectedKelasId}
            options={[{ value: '', label: 'Semua Kelas' }, ...kelasOptions]}
            placeholder="Cari Kelas..."
            triggerClassName="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-955 border-slate-100 dark:border-slate-800"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 h-12 rounded-xl font-black text-[11px] uppercase tracking-widest border-slate-200 dark:border-slate-800"
            onClick={fetchSessions}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <SectionCard title="Live Monitoring Sesi" icon={Activity} fullWidth noPadding>
        <div className="bg-white dark:bg-slate-955 overflow-hidden">
          <Table 
            columns={columns} 
            data={pagedSessions} 
            loading={loading} 
            emptyMessage="Tidak ada aktivitas sesi belajar mengajar untuk filter saat ini." 
            compact={true}
            className="border-none"
            pagination={{
              currentPage: page,
              totalPages: Math.ceil(sessions.length / limit),
              totalItems: sessions.length,
              itemsPerPage: limit,
              onPageChange: handlePageChange,
              onLimitChange: handleLimitChange
            }}
          />
        </div>
      </SectionCard>
    </div>
  );

  return (
    <AcademicPageLayout
      hardeningModuleKey="gurumonitoringpage"
      title="Monitoring Mengajar Guru"
      description="Pantau kehadiran guru dan status sesi mengajar KBM secara realtime di seluruh kelas."
      stats={stats}
      instruction={instructionData}
      breadcrumbs={memoBreadcrumbs}
    >
      <PremiumFeatureGate
        isLocked={isLocked}
        moduleName="ABSENSI"
        featureName="Monitoring Kehadiran Guru"
        description="Pantau kegiatan belajar mengajar secara realtime dan pastikan setiap kelas terisi oleh guru yang bertugas."
      >
        {pageContent}
      </PremiumFeatureGate>
    </AcademicPageLayout>
  );
});
