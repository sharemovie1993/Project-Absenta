import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
// Standardized using lazy( and Suspense
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
import { useAuth } from '../../hooks/useAuth';
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
  { label: 'Monitoring Guru', active: true }
];

export default function GuruMonitoringPage() {
  const { subscription } = useAuthStore();
  const { can, isLoading } = useAuth();
  const memoBreadcrumbs = useMemo(() => breadcrumbs, []);
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();
  const [tanggal, setTanggal] = useState<string>(toLocalDate());
  const [sessions, setSessions] = useState<SesiMonitoringData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [kelasMap, setKelasMap] = useState<Record<string, string>>({});
  const [guruMap, setGuruMap] = useState<Record<string, string>>({});
  const [kelasOptions, setKelasOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedGuruId] = useState<string>('');
  const [explicitTanggal, setExplicitTanggal] = useState<boolean>(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const canView = useMemo(
    () => can('attendance.reports.view') && can('academic.teachers.view.list'),
    [can],
  );

  const subFeatures = (subscription as unknown as Record<string, unknown>)?.features || 
                      subscription?.Plan?.features_json || 
                      subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  const fetchSessions = useCallback(async () => {
    if (isLocked) return;
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, unknown> = { summary: true };
      if (explicitTanggal && tanggal) params.tanggal = tanggal;
      if (selectedKelasId) params.kelas_id = selectedKelasId;
      if (selectedGuruId) params.guru_id = selectedGuruId;
      const res = await getSesiAbsensiList(params);
      const list = (res.data as SesiMonitoringData[]) || [];
      setSessions(list);
      setPage(1); // Reset page on fresh load
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = errObj?.response?.data?.message || errObj?.message || 'Gagal memuat sesi';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }, [explicitTanggal, tanggal, selectedKelasId, selectedGuruId, isLocked]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

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

  useEffect(() => {
    let mounted = true;
    const loadRefs = async () => {
      try {
        const [kRes, gRes] = await Promise.all([
          kelasApi.getAll({ limit: 1000 } as unknown as Record<string, unknown>),
          guruApi.getAll({ limit: 1000 } as unknown as Record<string, unknown>)
        ]);
        const km: Record<string, string> = {};
        const gm: Record<string, string> = {};
        const kOpts: Array<{ value: string; label: string }> = [];
        
        ((kRes.data as DropdownOptionResponse[]) || []).forEach((k) => { 
          if (k?.id) { 
            const lbl = k.nama_kelas || k.nama || String(k.id); 
            km[k.id] = lbl; 
            kOpts.push({ value: String(k.id), label: lbl }); 
          } 
        });
        ((gRes.data as DropdownOptionResponse[]) || []).forEach((g) => { 
          if (g?.id) { 
            const lbl = g.nama_guru || g.nama || String(g.id); 
            gm[g.id] = lbl; 
          } 
        });
        if (mounted) { 
          setKelasMap(km); 
          setGuruMap(gm); 
          setKelasOptions(kOpts); 
        }
      } catch {}
    };
    loadRefs();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => [
    {
      title: "Sesi Aktif",
      value: sessions.length.toString(),
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
  ], [sessions.length, isConnected]);

  const instructionData = {
    title: "Monitoring Guru",
    description: "Pantau kegiatan belajar mengajar secara realtime di seluruh kelas.",
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

  if (isLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;
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
      title="Monitoring Guru"
      description="Pantau kehadiran guru dan status sesi KBM secara realtime di seluruh kelas."
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
}
