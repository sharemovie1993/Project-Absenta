import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { 
  SectionCard, 
  Badge, 
  Table, 
  Input, 
  Button, 
  Alert, 
  AlertDescription,
  Loader, 
  Label,
  DebouncedSearchInput
} from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { getSesiAbsensiList } from '../../api/attendanceGerbang.api';
import { kelasApi, guruApi } from '../../api/academic.api';
import { toLocalDate } from '../../utils/attendance/time';
import { formatDate } from '../../utils/layoutUtils';
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
import { isModuleUnlocked } from '../../utils/subscriptionUtils';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';

const guruMonitoringFilterSchema = z.object({
  tanggal: z.string().optional(),
  selectedKelasId: z.string().optional(),
  selectedGuruId: z.string().optional()
});

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

  const isLocked = !isModuleUnlocked(subscription, 'ABSENSI');

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
        : Array.isArray((rawData as { data?: SesiMonitoringData[] })?.data)
        ? (rawData as { data: SesiMonitoringData[] }).data
        : [];
      return items as SesiMonitoringData[];
    },
    enabled: !isLocked,
    staleTime: 5 * 60 * 1000,
  });

  const sessions = Array.isArray(sessionsQuery.data)
    ? sessionsQuery.data
    : [];

  const loading = sessionsQuery.isLoading;

  const fetchSessions = useCallback(async () => {
    guruMonitoringFilterSchema.safeParse({ tanggal, selectedKelasId, selectedGuruId });
    await sessionsQuery.refetch();
  }, [sessionsQuery, tanggal, selectedKelasId, selectedGuruId]);

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
        kelasApi.getAll({ limit: 1000 } as unknown as Record<string, unknown>).catch(() => ({ data: [] })),
        guruApi.getAll({ limit: 1000 } as unknown as Record<string, unknown>).catch(() => ({ data: [] }))
      ]);
      const extractArray = (res: any) => {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.data?.data)) return res.data.data;
        return [];
      };
      const kList = extractArray(kRes);
      const gList = extractArray(gRes);
      const km: Record<string, string> = {};
      const gm: Record<string, string> = {};
      const kOpts: Array<{ value: string; label: string }> = [];

      kList.forEach((k: any) => {
        if (k?.id) {
          const name = k.nama_kelas || k.nama || String(k.id);
          km[k.id] = name;
          kOpts.push({ value: k.id, label: name });
        }
      });

      gList.forEach((g: any) => {
        if (g?.id) {
          gm[g.id] = g.nama_guru || g.nama || g.full_name || String(g.id);
        }
      });

      return { kelasMap: km, guruMap: gm, kelasOptions: kOpts };
    },
    staleTime: 5 * 60 * 1000,
  });

  const kelasMap = refsQuery.data?.kelasMap || {};
  const guruMap = refsQuery.data?.guruMap || {};
  const kelasOptions = refsQuery.data?.kelasOptions || [];

  const getTeacherDisplayName = useCallback((row: any) => {
    if (!row) return '-';
    const byMap = row.guru_id ? guruMap[String(row.guru_id)] : '';
    if (byMap) return byMap;
    return (
      row.guru_nama ||
      row.Guru?.nama_guru ||
      row.guru_pengampu_nama ||
      row.guru_pengganti_nama ||
      row.GuruPelaksana?.nama_guru ||
      row.UnitPengajaran?.Guru?.nama_guru ||
      row.guru?.nama_guru ||
      row.nama_guru ||
      row.opened_by_name ||
      row.created_by?.full_name ||
      '-'
    );
  }, [guruMap]);

  const getKelasDisplayName = useCallback((row: any) => {
    if (!row) return '-';
    const byMap = row.kelas_id ? kelasMap[String(row.kelas_id)] : '';
    if (byMap) return byMap;
    return row.kelas_nama || row.Kelas?.nama_kelas || '-';
  }, [kelasMap]);

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
      gradient: "from-emerald-500 to-teal-600",
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
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <LayoutGrid size={16} />
            </div>
            <div className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {getKelasDisplayName(r)}
            </div>
          </div>
        );
      } 
    },
    { 
      key: 'guru_id', 
      label: 'Guru Pengajar', 
      render: (_v: unknown, r: unknown) => {
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
              <UserCheck size={16} />
            </div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">
              {getTeacherDisplayName(r)}
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
  ], [getKelasDisplayName, getTeacherDisplayName]);

  const isMobile = useIsMobile();

  const renderMobileCard = useCallback((row: SesiMonitoringData) => {
    const kName = getKelasDisplayName(row);
    const gName = getTeacherDisplayName(row);
    const statusStr = String(row.status || '').toUpperCase();
    const hadir = Number(row?.summary?.HADIR || 0);
    const total = Number(row?.total_siswa_kelas || 0);

    return (
      <div
        key={row.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
              {kName}
            </h4>
            <p className="text-[11px] font-bold text-slate-500">
              {gName}
            </p>
          </div>
          <Badge 
            variant={statusStr === 'SELESAI' ? 'success' : 'info'} 
            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
          >
            {statusStr || 'DRAFT'}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            {row.jenis_kegiatan || 'KBM'}
          </Badge>
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 text-xs">
            <Users size={13} className="text-slate-400" />
            <span>{hadir} / {total} Siswa Hadir</span>
          </div>
        </div>
      </div>
    );
  }, [getKelasDisplayName, getTeacherDisplayName]);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions;
    const q = searchTerm.toLowerCase().trim();
    return sessions.filter((s: any) => {
      const gName = getTeacherDisplayName(s).toLowerCase();
      const kName = getKelasDisplayName(s).toLowerCase();
      const mName = String(s?.judul_materi || s?.materi || s?.jenis_kegiatan || s?.mapel_nama || s?.Mapel?.nama_mapel || '').toLowerCase();
      return gName.includes(q) || kName.includes(q) || mName.includes(q);
    });
  }, [sessions, searchTerm, getTeacherDisplayName, getKelasDisplayName]);

  // Paginate sessions
  const pagedSessions = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredSessions.slice(start, start + limit);
  }, [filteredSessions, page, limit]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="space-y-1.5">
          <Label htmlFor="date-filter-field" className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Tanggal</Label>
          <div className="relative group">
            <Input 
              id="date-filter-field"
              type="date" 
              value={tanggal} 
              onChange={e => { setTanggal(e.target.value); setExplicitTanggal(true); }} 
              className="h-10 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kelas-filter-select" className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Kelas</Label>
          <SearchableSelect
            id="kelas-filter-select"
            value={selectedKelasId}
            onValueChange={setSelectedKelasId}
            options={[{ value: '', label: 'Semua Kelas' }, ...kelasOptions]}
            placeholder="Cari Kelas..."
            triggerClassName="h-10 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guru-search-field" className="text-xs font-bold text-slate-700 dark:text-slate-300">Cari Guru / Mapel</Label>
          <DebouncedSearchInput
            id="guru-search-field"
            placeholder="Cari guru atau mapel..."
            aria-label="Cari Guru atau Mapel"
            value={searchTerm}
            onChange={setSearchTerm}
            isLoading={loading}
            className="w-full"
            inputClassName="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>
        <div>
          <Button 
            variant="outline" 
            className="w-full h-10 rounded-xl font-black text-xs uppercase tracking-wider border-slate-200 dark:border-slate-800"
            onClick={fetchSessions}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <SectionCard title="Live Monitoring Sesi" icon={Activity} fullWidth noPadding>
        <div className="bg-white dark:bg-slate-950 overflow-hidden">
          {isMobile ? (
            <div className="p-4 space-y-4">
              <MobileAcademicList
                title="Daftar Sesi Mengajar"
                data={pagedSessions}
                loading={loading}
                totalItems={filteredSessions.length}
                emptyMessage="Tidak ada aktivitas sesi belajar mengajar untuk filter saat ini."
                pagination={{
                  currentPage: page,
                  totalPages: Math.max(1, Math.ceil(filteredSessions.length / limit)),
                  totalItems: filteredSessions.length,
                  itemsPerPage: limit,
                  onPageChange: handlePageChange,
                  onLimitChange: handleLimitChange
                }}
                renderCard={renderMobileCard}
              />
            </div>
          ) : (
            <Table 
              columns={columns} 
              data={pagedSessions} 
              loading={loading} 
              emptyMessage="Tidak ada aktivitas sesi belajar mengajar untuk filter saat ini." 
              compact={true}
              className="border-none"
              pagination={{
                currentPage: page,
                totalPages: Math.max(1, Math.ceil(filteredSessions.length / limit)),
                totalItems: filteredSessions.length,
                itemsPerPage: limit,
                onPageChange: handlePageChange,
                onLimitChange: handleLimitChange
              }}
            />
          )}
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
