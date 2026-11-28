import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  Shield,
  Loader2,
  Zap,
  Clock,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Search,
  Sparkles,
  ExternalLink,
  X,
  LayoutGrid,
  TableProperties,
  Radio,
  Plus,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import {
  getKetarunaanPendamping,
  tapKetarunaanPendamping,
  getKetarunaanKepanitiaan,
  type KetarunaanPendamping,
  type KetarunaanPanitiaMember,
} from '@/api/kesiswaan/programKetarunaan.api';
import { getUnifiedTerminalFeed } from '@/api/attendance/unifiedKegiatan.api';
import { UnifiedKegiatanTerminalPanel } from '@/components/attendance/unified-kegiatan/UnifiedKegiatanTerminalPanel';
import { KetarunaanOrgChart } from './KetarunaanOrgChart';
import { KetarunaanPanitiaTable } from './KetarunaanPanitiaTable';
import { KetarunaanPanitiaFormModal } from './KetarunaanPanitiaFormModal';

interface KetarunaanKepanitiaanTabProps {
  jadwalKegiatanId: string | null;
  sesiId: string | null;
  refetchSesi: () => void;
  guard?: any;
  mode?: 'PRESENSI' | 'STRUKTUR' | 'PLOTING';
}

function statusBadge(status: string) {
  if (status === 'HADIR') return <Badge variant="success" className="text-[10px]">Hadir</Badge>;
  if (status === 'IZIN') return <Badge variant="warning" className="text-[10px]">Izin</Badge>;
  if (status === 'SAKIT') return <Badge variant="warning" className="text-[10px]">Sakit</Badge>;
  if (status === 'ALPA') return <Badge variant="error" className="text-[10px]">Alpa</Badge>;
  return <Badge variant="outline" className="text-[10px]">Belum Tap</Badge>;
}

function jabatanLabel(kode: string) {
  const map: Record<string, string> = {
    KETUA_PEMBINA_TARUNA: '🎖️ Pembina Taruna & Staf',
    KAPROG: '🏛️ Kepala Program Keahlian (Kajur)',
    WALIKELAS: '🏫 Wali Kelas',
    GURU_MAPEL: '📚 Guru Mapel KBM Beririsan (1 Tap 2 Record)',
    KEPALA_SEKOLAH: '👑 Kepala Sekolah',
    KESISWAAN: '🧑‍🎓 Waka Kesiswaan',
    PEMBINA_ESKUL: '🚩 Pembina OSIS / Ekstrakurikuler',
  };
  return map[kode] || kode;
}

export const KetarunaanKepanitiaanTab: React.FC<KetarunaanKepanitiaanTabProps> = ({
  jadwalKegiatanId,
  sesiId,
  refetchSesi,
  guard,
  mode,
}) => {
  const qc = useQueryClient();
  const [panitiaModalOpen, setPanitiaModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilterCategory, setModalFilterCategory] = useState<'SEMUA' | 'MAPEL' | 'PEMBINA' | 'WALIKELAS'>('SEMUA');
  const [forceIncidentalMode, setForceIncidentalMode] = useState(false);

  // View Mode: 'PRESENSI' (Terminal Pos - default), 'STRUKTUR' (Bagan Org Chart), 'PLOTING' (Tabel Ploting Panitia)
  const [internalViewMode, setInternalViewMode] = useState<'STRUKTUR' | 'PLOTING' | 'PRESENSI'>(mode || 'PRESENSI');
  const viewMode = mode || internalViewMode;
  const setViewMode = setInternalViewMode;

  // Kepanitiaan (Ploting Panitia) Query
  const { 
    data: kepanitiaanRes, 
    isLoading: isLoadingKepanitiaan, 
    refetch: refetchKepanitiaan 
  } = useQuery({
    queryKey: ['ketarunaan-kepanitiaan-structure'],
    queryFn: getKetarunaanKepanitiaan,
    staleTime: 60_000,
  });

  const panitiaMembers = useMemo(() => {
    const raw: any = kepanitiaanRes;
    if (!raw) return [];
    if (Array.isArray(raw.panitia)) return raw.panitia;
    if (Array.isArray(raw.data?.panitia)) return raw.data.panitia;
    return [];
  }, [kepanitiaanRes]);

  const exOfficioData = useMemo(() => {
    const raw: any = kepanitiaanRes;
    if (!raw) return { penanggung_jawab: null, pengarah: null };
    if (raw.ex_officio) return raw.ex_officio;
    if (raw.data?.ex_officio) return raw.data.ex_officio;
    return { penanggung_jawab: null, pengarah: null };
  }, [kepanitiaanRes]);

  // Modal Ploting Form State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<KetarunaanPanitiaMember | null>(null);

  const handleOpenAdd = useCallback(() => {
    setEditingMember(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((member: KetarunaanPanitiaMember) => {
    setEditingMember(member);
    setIsFormModalOpen(true);
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ketarunaan-pendamping', sesiId, jadwalKegiatanId],
    queryFn: () => getKetarunaanPendamping({
      sesi_id: sesiId ?? undefined,
      jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
    }),
    staleTime: 30_000,
  });

  const pendamping = useMemo(() => data?.data ?? [], [data?.data]);
  const realSesiId = data?.sesi_id ?? sesiId;
  const effectiveJadwalId = (data as any)?.jadwal_kegiatan_id ?? jadwalKegiatanId;
  const activeSiklus = (data as any)?.siklus_aktif || guard?.siklus_aktif || 'KETARUNAAN';
  const activePilarLabel =
    (data as any)?.siklus_pilar_label ||
    guard?.siklus_pilar_label ||
    'Pembinaan Ketarunaan & Apel Pagi • Pilar Kedisiplinan Taruna';
  const activeJadwalNama = (data as any)?.jadwal_nama || guard?.jadwal_nama || 'Program Ketarunaan';
  const isScheduledDay = (data as any)?.is_today_scheduled_day ?? guard?.is_today_scheduled_day ?? true;

  const tapMutation = useMutation({
    mutationFn: (payload: { guru_id: string; status: 'HADIR' | 'IZIN' | 'SAKIT' | 'DINAS_LUAR' | 'ALPA' }) =>
      tapKetarunaanPendamping({
        guru_id: payload.guru_id,
        sesi_id: realSesiId || undefined,
        jadwal_kegiatan_id: effectiveJadwalId || undefined,
        status: payload.status,
        catatan:
          payload.status === 'HADIR'
            ? `Hadir via Terminal Terpadu (${activeJadwalNama})`
            : undefined,
      } as any),
    onSuccess: (res) => {
      toast.success(res?.message || 'Presensi dicatat');
      if (res?.synced_kbm) {
        toast.success('⚡ 1 Tap 2 Record Berhasil: Sesi KBM reguler telah dibuka otomatis!', { duration: 5000 });
      }
      refetch();
      qc.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
      qc.invalidateQueries({ queryKey: ['unified-kbm-sessions'] });
      qc.invalidateQueries({ queryKey: ['attendance-dashboard-live'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mencatat presensi');
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
    refetchSesi();
    qc.invalidateQueries({ queryKey: ['unified-terminal-feed'] });
  }, [refetch, refetchSesi, qc]);

  const handleTap = useCallback((guruId: string, status: 'HADIR' | 'IZIN' | 'SAKIT' | 'DINAS_LUAR' | 'ALPA' = 'HADIR') => {
    if (!isScheduledDay && !forceIncidentalMode) {
      toast.error('Hari ini di luar jadwal reguler Ketarunaan. Aktifkan Mode Sesi Khusus / Insidental terlebih dahulu.');
      return;
    }
    tapMutation.mutate({ guru_id: guruId, status });
  }, [tapMutation, isScheduledDay, forceIncidentalMode]);

  // Akordeon & filter
  const [expandedTingkat, setExpandedTingkat] = useState<Record<string, boolean>>({});

  const toggleTingkat = useCallback((tingkat: string) => {
    setExpandedTingkat(prev => ({ ...prev, [tingkat]: !prev[tingkat] }));
  }, []);

  // Pisahkan kategori pendamping
  const guruMapelList = useMemo(() => {
    return pendamping.filter(p => p.jabatan_kode === 'GURU_MAPEL');
  }, [pendamping]);

  const pembinaAndKajurGroups = useMemo(() => {
    const g: Record<string, KetarunaanPendamping[]> = {};
    pendamping
      .filter(p => p.jabatan_kode !== 'GURU_MAPEL' && p.jabatan_kode !== 'WALIKELAS')
      .forEach(p => {
        const key = p.jabatan_kode;
        if (!g[key]) g[key] = [];
        g[key].push(p);
      });
    return Object.entries(g);
  }, [pendamping]);

  const waliKelasList = useMemo(() => {
    return pendamping.filter(p => p.jabatan_kode === 'WALIKELAS');
  }, [pendamping]);

  const waliKelasByTingkat = useMemo(() => {
    const map: Record<string, KetarunaanPendamping[]> = {
      'Kelas X': [],
      'Kelas XI': [],
      'Kelas XII': [],
      'Rombel Lainnya': [],
    };
    waliKelasList.forEach(w => {
      const k = (w.kelas_nama || '').toUpperCase();
      if (k.startsWith('X ') || k.startsWith('10 ') || k === 'X') {
        map['Kelas X'].push(w);
      } else if (k.startsWith('XI ') || k.startsWith('11 ') || k === 'XI') {
        map['Kelas XI'].push(w);
      } else if (k.startsWith('XII ') || k.startsWith('12 ') || k === 'XII') {
        map['Kelas XII'].push(w);
      } else {
        map['Rombel Lainnya'].push(w);
      }
    });
    return Object.entries(map).filter(([_, list]) => list.length > 0);
  }, [waliKelasList]);

  // Query Feed & Summary Unified Terminal (Guru + Siswa) — berbagi cache dengan UnifiedKegiatanTerminalPanel
  const { data: terminalFeedRes } = useQuery({
    queryKey: ['unified-terminal-feed', 'KETARUNAAN', effectiveJadwalId ?? null],
    queryFn: () =>
      getUnifiedTerminalFeed({
        jadwal_kegiatan_id: effectiveJadwalId ?? undefined,
        jenis_kegiatan: 'KETARUNAAN',
      }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const feedSummary = terminalFeedRes?.data?.summary ?? {
    siswa_hadir: 0,
    siswa_terlambat: 0,
    guru_hadir: 0,
    total_hadir: 0,
  };

  // Statistik Utama (Unified Guru + Siswa)
  const totalCount = pendamping.length;
  const hadirCount = useMemo(() => pendamping.filter(p => p.status === 'HADIR').length, [pendamping]);
  const belumHadirCount = Math.max(0, totalCount - hadirCount);
  const persenHadir = totalCount > 0 ? Math.round((hadirCount / totalCount) * 100) : 0;
  const guruMapelHadirCount = useMemo(() => guruMapelList.filter(p => p.status === 'HADIR').length, [guruMapelList]);
  const totalUnifiedHadir = Math.max(feedSummary.total_hadir, hadirCount + feedSummary.siswa_hadir);

  // Filter list untuk di dalam Modal
  const filteredModalList = useMemo(() => {
    let list = pendamping;
    if (modalFilterCategory === 'MAPEL') {
      list = guruMapelList;
    } else if (modalFilterCategory === 'PEMBINA') {
      list = pendamping.filter(p => p.jabatan_kode !== 'GURU_MAPEL' && p.jabatan_kode !== 'WALIKELAS');
    } else if (modalFilterCategory === 'WALIKELAS') {
      list = waliKelasList;
    }

    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase().trim();
      list = list.filter(p =>
        (p.nama_guru || '').toLowerCase().includes(q) ||
        (p.mapel_nama || '').toLowerCase().includes(q) ||
        (p.kelas_nama || '').toLowerCase().includes(q) ||
        (p.jabatan || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [pendamping, modalFilterCategory, modalSearch, guruMapelList, waliKelasList]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-3 sm:p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(k => (
            <Skeleton key={k} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 sm:p-4">
      {/* Header Info & Actions — hanya untuk mode selain PRESENSI */}
      {viewMode !== 'PRESENSI' && (
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant="outline"
              className={
                activeSiklus === 'DUHA'
                  ? 'text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 shrink-0'
                  : 'text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 shrink-0'
              }
            >
              {activeSiklus === 'DUHA'
                ? '🕌 Dhuha'
                : activeSiklus === 'UPACARA'
                ? '🇮🇩 Upacara'
                : activeSiklus === 'APEL_SORE'
                ? '🌇 Apel Sore'
                : '🎖️ Apel Pagi'}
            </Badge>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{activeJadwalNama}</span>
            <span className="text-[11px] font-mono font-black text-emerald-600 dark:text-emerald-400 shrink-0">
              {hadirCount}/{totalCount} Hadir
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { handleRefresh(); refetchKepanitiaan(); }}
              className="h-7 px-2 gap-1 text-[11px] font-bold rounded-xl"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Sub-Navigation Switcher Antarmuka Kepanitiaan (Hanya jika mode tidak dikunci dari Sidebar Subtab) ── */}
      {!mode && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('PRESENSI')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'PRESENSI'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Radio size={15} />
              <span>Terminal Presensi Lapangan</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {hadirCount}/{totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('STRUKTUR')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'STRUKTUR'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid size={15} />
              <span>Bagan Struktur Organisasi</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('PLOTING')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'PLOTING'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <TableProperties size={15} />
              <span>Tabel Ploting Panitia</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {panitiaMembers.length}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 pr-2 hidden md:block">
            {viewMode === 'STRUKTUR' && 'Visual Hierarki Komando'}
            {viewMode === 'PLOTING' && `${panitiaMembers.length} Anggota Panitia Terploting`}
            {viewMode === 'PRESENSI' && '1-Tap 2-Record Terminal Siaga'}
          </div>
        </div>
      )}

      {/* ── VIEW 1: BAGAN STRUKTUR ORGANISASI ── */}
      {viewMode === 'STRUKTUR' && (
        <div className="animate-in fade-in duration-150">
          <KetarunaanOrgChart
            panitiaList={panitiaMembers}
            exOfficio={exOfficioData}
            onOpenAddModal={handleOpenAdd}
          />
        </div>
      )}

      {/* ── VIEW 2: TABEL PLOTING PANITIA ── */}
      {viewMode === 'PLOTING' && (
        <div className="animate-in fade-in duration-150">
          <KetarunaanPanitiaTable
            panitiaList={panitiaMembers}
            isLoading={isLoadingKepanitiaan}
            onRefresh={refetchKepanitiaan}
            onOpenAddModal={handleOpenAdd}
            onEditMember={handleOpenEdit}
          />
        </div>
      )}

      {/* ── VIEW 3: TERMINAL PRESENSI & POS LAPANGAN (EXISTING) ── */}
      {viewMode === 'PRESENSI' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Stat bar ringkas — Unified Terminal (Guru/Panitia + Taruna) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPanitiaModalOpen(true)}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer group"
              title="Klik untuk melihat daftar kehadiran panitia"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold truncate">Panitia Hadir</p>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {hadirCount}<span className="text-[10px] font-bold text-slate-400">/{totalCount} ({persenHadir}%)</span>
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
            </button>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200/80 dark:border-sky-800/60 flex items-center gap-2">
              <Award className="w-4 h-4 text-sky-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold truncate">Taruna Hadir</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-sky-600 dark:text-sky-400">{feedSummary.siswa_hadir}</span>
                  {feedSummary.siswa_terlambat > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      {feedSummary.siswa_terlambat} telat
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold truncate">Total Hadir Sesi</p>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {totalUnifiedHadir} <span className="text-[10px] font-bold text-slate-400">Tap</span>
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold truncate">KBM ⚡</p>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{guruMapelHadirCount}<span className="text-[10px] font-bold text-slate-400">/{guruMapelList.length}</span></span>
              </div>
            </div>
          </div>

          {/* Banner Insidental — hanya muncul jika di luar jadwal reguler */}
          {!isScheduledDay && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px] bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40">
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
                  Di luar jadwal ({guard?.hari_aktif?.join(', ') || 'Rabu'})
                </span>
              </div>
              <Button
                variant={forceIncidentalMode ? "default" : "outline"}
                size="sm"
                onClick={() => setForceIncidentalMode(prev => !prev)}
                className={`h-7 px-2.5 text-[10px] font-bold gap-1 rounded-xl shrink-0 ${
                  forceIncidentalMode
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300'
                }`}
              >
                <Zap className="w-3 h-3" />
                {forceIncidentalMode ? 'Kunci' : 'Buka Sesi Insidental'}
              </Button>
            </div>
          )}

          {/* TERMINAL MULTI-INPUT LANGSUNG DI TAMPILKAN (INLINE POS) */}
          <div className="space-y-2">
            <UnifiedKegiatanTerminalPanel
              jenisKegiatan="KETARUNAAN"
              title={`Terminal Presensi — ${activeJadwalNama}`}
              subtitle={`Multi-Input Siaga: Tempel Kartu RFID, Barcode Gun HID, Scan QR Kamera atau Cari Nama Guru`}
              sesiId={realSesiId}
              jadwalKegiatanId={effectiveJadwalId}
              onSuccessTap={() => {
                handleRefresh();
                qc.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
                qc.invalidateQueries({ queryKey: ['unified-kbm-sessions'] });
                qc.invalidateQueries({ queryKey: ['attendance-dashboard-live'] });
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL LIHAT KEHADIRAN KEPANITIAAN & PENDAMPING */}
      <Modal
        isOpen={panitiaModalOpen}
        onClose={() => setPanitiaModalOpen(false)}
        maxWidth="5xl"
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                Daftar Kehadiran Kepanitiaan &amp; Pendamping
              </h3>
              <p className="text-xs text-slate-400 font-normal">
                Total {hadirCount} dari {totalCount} telah hadir ({activeJadwalNama})
              </p>
            </div>
          </div>
        }
      >
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setModalFilterCategory('SEMUA')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  modalFilterCategory === 'SEMUA'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semua ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setModalFilterCategory('MAPEL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  modalFilterCategory === 'MAPEL'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Guru Mapel ({guruMapelList.length})
              </button>
              <button
                type="button"
                onClick={() => setModalFilterCategory('PEMBINA')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  modalFilterCategory === 'PEMBINA'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pembina &amp; Kajur
              </button>
              <button
                type="button"
                onClick={() => setModalFilterCategory('WALIKELAS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  modalFilterCategory === 'WALIKELAS'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Wali Kelas ({waliKelasList.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="Cari nama guru, mapel, kelas..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* List Panitia / Pendamping */}
          {filteredModalList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tidak ada data pendamping yang cocok dengan filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredModalList.map((p) => {
                const isHadir = p.status === 'HADIR';
                const isGuruMapel = p.jabatan_kode === 'GURU_MAPEL';
                const isKbmActive = p.kbm_status === 'BERLANGSUNG';

                return (
                  <div
                    key={p.guru_id}
                    className={`p-3.5 rounded-2xl border transition-all bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between gap-3 ${
                      isHadir
                        ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/15'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isHadir ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                            {p.nama_guru}
                          </p>
                          <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            {jabatanLabel(p.jabatan_kode)}
                            {p.kelas_nama ? ` • ${p.kelas_nama}` : ''}
                          </p>
                          {p.mapel_nama && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Mapel: {p.mapel_nama} {p.jam_kbm ? `(${p.jam_kbm})` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {statusBadge(p.status)}
                        {isGuruMapel && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isKbmActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isKbmActive ? '● KBM Aktif' : '○ Menunggu'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <span className="text-slate-400">
                        {p.waktu_tap ? `Tap: ${p.waktu_tap.slice(11, 16)} WIB` : 'Belum presensi'}
                      </span>

                      {p.status === 'BELUM_TAP' ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[10px] text-slate-500"
                            disabled={tapMutation.isPending || (!isScheduledDay && !forceIncidentalMode)}
                            onClick={() => handleTap(p.guru_id, 'IZIN')}
                          >
                            Izin
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 px-2.5 text-[11px] font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={tapMutation.isPending || (!isScheduledDay && !forceIncidentalMode)}
                            onClick={() => handleTap(p.guru_id, 'HADIR')}
                          >
                            {tapMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Tap Hadir
                          </Button>
                        </div>
                      ) : (
                        <span className="font-bold text-emerald-600 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hadir Tercatat
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
      {/* MODAL FORM PLOTING PANITIA KETARUNAAN */}
      <KetarunaanPanitiaFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => {
          refetchKepanitiaan();
          refetch();
        }}
        initialData={editingMember}
      />
    </div>
  );
};
