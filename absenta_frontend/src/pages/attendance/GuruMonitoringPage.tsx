import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { 
  SectionCard, 
  Badge, 
  Table, 
  Input, 
  Button, 
  Alert, 
  AlertDescription,
  Loader 
} from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { getSesiAbsensiList } from '../../api/attendanceGerbang.api';
import { kelasApi, guruApi } from '../../api/academic.api';
import { toLocalDate } from '../../utils/attendance/time';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { 
  Activity, 
  Search, 
  Filter, 
  RefreshCw, 
  UserCheck, 
  Clock, 
  LayoutGrid,
  Users,
  Presentation
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import PageLayout from '../../components/common/PageLayout';

export default function GuruMonitoringPage() {
  const { subscription } = useAuthStore();
  const { can, isLoading } = useAuth();
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();
  const [tanggal, setTanggal] = useState<string>(toLocalDate());
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [kelasMap, setKelasMap] = useState<Record<string, string>>({});
  const [guruMap, setGuruMap] = useState<Record<string, string>>({});
  const [kelasOptions, setKelasOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [guruOptions, setGuruOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [explicitTanggal, setExplicitTanggal] = useState<boolean>(false);

  const canView = useMemo(
    () => can('attendance.reports.view') && can('academic.teachers.view.list'),
    [can],
  );

  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  const fetchSessions = useCallback(async () => {
    if (isLocked) return;
    try {
      setLoading(true);
      setError(null);
      const params: any = { summary: true };
      if (explicitTanggal && tanggal) params.tanggal = tanggal;
      if (selectedKelasId) params.kelas_id = selectedKelasId;
      if (selectedGuruId) params.guru_id = selectedGuruId;
      const res = await getSesiAbsensiList(params);
      const list = Array.isArray(res.data) ? res.data : [];
      setSessions(list);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Gagal memuat sesi';
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

    const params: any = {};
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
          kelasApi.getAll({ limit: 1000 } as any),
          guruApi.getAll({ limit: 1000 } as any)
        ]);
        const km: Record<string, string> = {};
        const gm: Record<string, string> = {};
        const kOpts: Array<{ value: string; label: string }> = [];
        const gOpts: Array<{ value: string; label: string }> = [];
        (Array.isArray(kRes.data) ? kRes.data : []).forEach((k: any) => { if (k?.id) { const lbl = k.nama_kelas || k.nama || String(k.id); km[k.id] = lbl; kOpts.push({ value: String(k.id), label: lbl }); } });
        (Array.isArray(gRes.data) ? gRes.data : []).forEach((g: any) => { if (g?.id) { const lbl = g.nama_guru || g.nama || String(g.id); gm[g.id] = lbl; gOpts.push({ value: String(g.id), label: lbl }); } });
        if (mounted) { setKelasMap(km); setGuruMap(gm); setKelasOptions(kOpts); setGuruOptions(gOpts); }
      } catch {}
    };
    loadRefs();
    return () => { mounted = false; };
  }, []);

  if (isLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;
  if (!canView) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  const stats = [
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
      gradient: "from-emerald-500 to-teal-600",
      subtitle: isConnected ? "Terhubung ke Socket" : "Offline Reconnecting"
    }
  ];

  const instructionData = {
    title: "Monitoring Guru",
    description: "Pantau kegiatan belajar mengajar secara realtime di seluruh kelas.",
    items: [
      { text: "Data diperbarui secara instan saat guru memulai atau mengakhiri sesi." },
      { text: "Gunakan filter tanggal untuk melihat riwayat sesi sebelumnya." },
      { text: "Hadir/Total menunjukkan jumlah siswa yang sudah diabsen oleh guru." }
    ]
  };

  const columns = [
    { 
      key: 'kelas_id', 
      label: 'Kelas', 
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <LayoutGrid size={16} />
          </div>
          <div className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {kelasMap[String(row?.kelas_id || '')] || row?.kelas_nama || '-'}
          </div>
        </div>
      ) 
    },
    { 
      key: 'guru_id', 
      label: 'Guru Pengajar', 
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
            <UserCheck size={16} />
          </div>
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">
            {guruMap[String(row?.guru_id || '')] || row?.guru_nama || '-'}
          </div>
        </div>
      ) 
    },
    { 
      key: 'jenis_kegiatan', 
      label: 'Jenis', 
      render: (v: any) => (
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v || '-'}</span>
      ) 
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (v: any) => (
        <Badge 
          variant={v === 'SELESAI' ? 'success' : 'info'} 
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
        >
          {v || 'DRAFT'}
        </Badge>
      ) 
    },
    { 
      key: 'kehadiran', 
      label: 'Absensi Siswa', 
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
           <Users size={12} className="text-slate-300" />
           <div className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
             {Number(row?.summary?.HADIR || 0)} <span className="text-slate-300 mx-1">/</span> {Number(row?.total_siswa_kelas || 0)}
           </div>
        </div>
      )
    },
  ];

  const pageContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pilih Tanggal</label>
          <div className="relative group">
            <Input 
              type="date" 
              value={tanggal} 
              onChange={e => { setTanggal(e.target.value); setExplicitTanggal(true); }} 
              className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Filter Kelas</label>
          <SearchableSelect
            value={selectedKelasId}
            onValueChange={setSelectedKelasId}
            options={[{ value: '', label: 'Semua Kelas' }, ...kelasOptions]}
            placeholder="Cari Kelas..."
            triggerClassName="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 h-12 rounded-xl font-black text-[11px] uppercase tracking-widest border-slate-200 dark:border-slate-800"
            onClick={() => fetchSessions()}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <SectionCard title="Live Monitoring Sesi" icon={Activity} fullWidth noPadding>
        <div className="bg-white dark:bg-slate-950 overflow-hidden">
          <Table 
            columns={columns} 
            data={sessions} 
            loading={loading} 
            emptyMessage="Tidak ada aktivitas sesi belajar mengajar untuk filter saat ini." 
            compact={true}
            className="border-none"
          />
        </div>
      </SectionCard>
    </div>
  );

  return (
    <PageLayout
      title="Monitoring Guru"
      description="Pantau kehadiran guru dan status sesi KBM secara realtime di seluruh kelas."
      stats={stats}
      instruction={instructionData}
    >
      <PremiumFeatureGate
        isLocked={isLocked}
        moduleName="ABSENSI"
        featureName="Monitoring Kehadiran Guru"
        description="Pantau kegiatan belajar mengajar secara realtime dan pastikan setiap kelas terisi oleh guru yang bertugas."
      >
        {pageContent}
      </PremiumFeatureGate>
    </PageLayout>
  );
}
