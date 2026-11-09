import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Play,
  Pause,
  CheckCircle,
  Copy,
  Check,
  Search,
  MapPin,
  Clock,
  User,
  Users,
  DoorOpen,
  ArrowLeft,
  RotateCw,
  Sparkles,
  Layers,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian } from '@/types/cbt.types';
import { CbtDenahModal } from './CbtDenahModal';
import { CbtProctorMonitoringView } from '../sesi/CbtProctorMonitoringView';
import useConfirm from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';
import { formatLocalTimeFromISO, formatLocalDateIndo } from '@/utils/attendance/time';

interface CbtPanitiaLiveCommandPanelProps {
  jadwalList: CbtJadwalUjian[];
  isLoadingJadwal: boolean;
  refetchJadwal: () => void;
  guruList?: any[];
  onBackToPengawas?: () => void;
}

export const CbtPanitiaLiveCommandPanel: React.FC<CbtPanitiaLiveCommandPanelProps> = ({
  jadwalList = [],
  isLoadingJadwal,
  refetchJadwal,
  onBackToPengawas,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // State Inspeksi Ruang Individual
  const [selectedInspectJadwalId, setSelectedInspectJadwalId] = useState<string | null>(null);

  // State Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'COMPLETED'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // State Denah Modal Spasial
  const [isDenahModalOpen, setIsDenahModalOpen] = useState(false);
  const [highlightRoomCode, setHighlightRoomCode] = useState<string | null>(null);
  const [highlightRoomLabel, setHighlightRoomLabel] = useState<string>('Pusat Komando CBT');

  // State Salin Token
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Mutasi Aktivasi Tunggal
  const activateMutation = useMutation({
    mutationFn: (id: string) => cbtApi.activateJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ruang ujian aktif! Siswa dapat masuk.');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      refetchJadwal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal mengaktifkan sesi'),
  });

  // Mutasi Jeda Tunggal
  const pauseMutation = useMutation({
    mutationFn: (id: string) => cbtApi.pauseJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ruang ujian dijeda.');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      refetchJadwal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menjeda sesi'),
  });

  // Mutasi Selesaikan Tunggal
  const completeMutation = useMutation({
    mutationFn: (id: string) => cbtApi.completeJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ruang ujian diselesaikan.');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      refetchJadwal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menyelesaikan sesi'),
  });

  // Mutasi Buat Ulang Token
  const regenerateTokenMutation = useMutation({
    mutationFn: (id: string) => cbtApi.regenerateToken(id),
    onSuccess: async (res) => {
      toast.success(`Token baru dibuat: ${res.token_ujian}`);
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      refetchJadwal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal mengacak ulang token'),
  });

  // Salin Token
  const handleCopyToken = (token: string, id: string) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedTokenId(id);
    toast.success(`Token "${token}" disalin!`);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  // Helper Ekstraksi Ruang & Kelas
  const resolveRoomInfo = (j: CbtJadwalUjian) => {
    const raw = j.setting_keamanan?.ruang_ujian?.trim();
    if (raw && !raw.toLowerCase().includes('multi') && raw.toLowerCase() !== 'ruang kelas') {
      return raw;
    }
    return j.nama_sesi || 'R.XX';
  };

  // ── STATISTIK KESELURUHAN SEKOLAH (COMMAND CENTER RADAR) ──
  const summary = useMemo(() => {
    const totalRuang = jadwalList.length;
    const active = jadwalList.filter((j) => j.status === 'ACTIVE').length;
    const draft = jadwalList.filter((j) => j.status === 'DRAFT').length;
    const paused = jadwalList.filter((j) => j.status === 'PAUSED').length;
    const completed = jadwalList.filter((j) => j.status === 'COMPLETED' || (j.status as string) === 'FINISHED').length;

    const totalPeserta = jadwalList.reduce((acc, curr) => acc + (curr._count?.Peserta || 0), 0);

    return {
      totalRuang,
      active,
      draft,
      paused,
      completed,
      totalPeserta,
    };
  }, [jadwalList]);

  // Filter Jadwal Berdasarkan Status & Pencarian
  const filteredJadwal = useMemo(() => {
    return jadwalList.filter((j) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'COMPLETED') {
          if (j.status !== 'COMPLETED' && (j.status as string) !== 'FINISHED') return false;
        } else if (j.status !== statusFilter) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const roomName = (j.setting_keamanan?.ruang_ujian || '').toLowerCase();
        const sessionName = (j.nama_sesi || '').toLowerCase();
        const mapel = (j.BankSoal?.Mapel?.nama_mapel || j.BankSoal?.judul || '').toLowerCase();
        const pengawas1 = (j.setting_keamanan?.pengawas_1_nama || '').toLowerCase();
        const proktor = (j.setting_keamanan?.proktor_nama || '').toLowerCase();
        const token = (j.token_ujian || '').toLowerCase();

        return (
          roomName.includes(q) ||
          sessionName.includes(q) ||
          mapel.includes(q) ||
          pengawas1.includes(q) ||
          proktor.includes(q) ||
          token.includes(q)
        );
      }

      return true;
    });
  }, [jadwalList, statusFilter, searchQuery]);

  // ── AKSI OPERASIONAL MASSAL: AKTIFKAN SEMUA SESI DRAFT SERENTAK ──
  const [isBatchActivating, setIsBatchActivating] = useState(false);

  const handleBatchActivate = async () => {
    const draftSessions = jadwalList.filter((j) => j.status === 'DRAFT');
    if (draftSessions.length === 0) {
      toast('Semua ruangan ujian sudah dalam keadaan aktif atau selesai.', { icon: 'ℹ️' });
      return;
    }

    const isConfirmed = await confirm({
      title: `Aktifkan ${draftSessions.length} Ruang Ujian Serentak?`,
      message: `Tindakan ini akan mengaktifkan seluruh ${draftSessions.length} sesi ruang ujian yang masih berstatus DRAFT. Token ujian akan dibuka dan seluruh siswa di seluruh kelas tersebut dapat mulai login secara serentak.`,
      confirmText: `Aktifkan ${draftSessions.length} Ruangan Sekarang`,
      cancelText: 'Batal',
      style: 'primary',
    });

    if (!isConfirmed) return;

    try {
      setIsBatchActivating(true);
      toast.loading(`Mengaktifkan ${draftSessions.length} ruang ujian serentak...`, { id: 'batch-act' });

      // Eksekusi aktivasi paralel dengan proteksi
      const results = await Promise.allSettled(draftSessions.map((s) => cbtApi.activateJadwal(s.id)));
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;

      toast.dismiss('batch-act');
      toast.success(`Sukses mengaktifkan ${succeeded} dari ${draftSessions.length} ruang ujian!`);

      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      refetchJadwal();
    } catch (err: any) {
      toast.dismiss('batch-act');
      toast.error('Terjadi kesalahan saat aktivasi serentak');
    } finally {
      setIsBatchActivating(false);
    }
  };

  // Buka Denah Ruang Tertentu
  const handleOpenRoomDenah = (roomCode: string, label?: string) => {
    setHighlightRoomCode(roomCode);
    setHighlightRoomLabel(label || `Ruang: ${roomCode}`);
    setIsDenahModalOpen(true);
  };

  // ── JIKA SEDANG MEMBUKA INSPEKSI RUANG TERTENTU (DRILL-DOWN) ──
  if (selectedInspectJadwalId) {
    const inspectJadwal = jadwalList.find((j) => j.id === selectedInspectJadwalId);
    const roomCode = inspectJadwal ? resolveRoomInfo(inspectJadwal) : 'Ruang Ujian';

    return (
      <div className="space-y-4">
        {/* Banner Navigasi Balik ke Pusat Komando */}
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-lg flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedInspectJadwalId(null)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Radar Semua Ruang</span>
            </button>

            <div className="h-5 w-px bg-white/20 hidden sm:block" />

            <div>
              <div className="text-[10px] uppercase font-black tracking-wider text-indigo-300">
                Inspeksi Meja Pengawas
              </div>
              <h3 className="text-sm sm:text-base font-black truncate flex items-center gap-2">
                <span>{roomCode}</span>
                <span className="text-white/60 font-medium text-xs">
                  ({inspectJadwal?.nama_sesi || 'Sesi Ujian'})
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenRoomDenah(roomCode, `Inspeksi Panitia: ${roomCode}`)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <DoorOpen size={13} />
              <span>Lihat Denah Ruang Ini</span>
            </button>
          </div>
        </div>

        {/* Proctor Monitoring View Spesifik Ruang Ini */}
        <CbtProctorMonitoringView
          initialJadwalId={selectedInspectJadwalId}
          onBack={() => setSelectedInspectJadwalId(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 1. MASTER COMMAND CENTER BAR: KONTROL OPERASIONAL PANITIA CBT ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Activity size={18} className="animate-pulse" />
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Pusat Komando &amp; Radar Live Ujian (Hari H)
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Monitoring serentak seluruh ruangan ujian sekolah, kontrol aktivasi serentak, dan sebaran peserta secara live.
            </p>
          </div>

          {/* Master Operational Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Tombol Master: Aktifkan Semua Sesi Draft */}
            {summary.draft > 0 && (
              <button
                type="button"
                onClick={handleBatchActivate}
                disabled={isBatchActivating}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                title="Aktifkan seluruh sesi yang masih DRAFT secara serentak"
              >
                <Play size={14} className="fill-white" />
                <span>Aktifkan {summary.draft} Ruang Serentak</span>
              </button>
            )}

            {/* Buka Radar Denah Kampus Spasial */}
            <button
              type="button"
              onClick={() => handleOpenRoomDenah('', 'Radar Denah Kampus CBT')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Buka Denah Spasial Kampus"
            >
              <DoorOpen size={14} className="text-indigo-400" />
              <span>Denah Spasial</span>
            </button>

            {/* Tombol Segarkan */}
            <button
              type="button"
              onClick={() => refetchJadwal()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
              title="Segarkan data radar"
            >
              <RotateCw size={15} className={isLoadingJadwal ? 'animate-spin text-emerald-400' : ''} />
            </button>
          </div>
        </div>

        {/* ── 4 STAT METRICS STRIP RINGKAS & PADAT ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Ruang Ujian
            </span>
            <div className="text-xl font-black text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{summary.totalRuang}</span>
              <span className="text-xs text-slate-400 font-normal">Ruang</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">{summary.active} Aktif</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{summary.draft} Draft</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Sesi Sedang Live
            </span>
            <div className="text-xl font-black text-emerald-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{summary.active}</span>
              <span className="text-xs text-slate-400 font-normal">Ruangan</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              Siswa sedang aktif ujian
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              Menunggu Dimulai
            </span>
            <div className="text-xl font-black text-amber-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{summary.draft}</span>
              <span className="text-xs text-slate-400 font-normal">Ruangan</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              {summary.draft > 0 ? 'Siap diaktifkan serentak' : 'Semua sudah dimulai'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
              Total Peserta
            </span>
            <div className="text-xl font-black text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{summary.totalPeserta}</span>
              <span className="text-xs text-slate-400 font-normal">Siswa</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              {summary.completed} Ruangan selesai
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. FILTER & PENCARIAN CEPAT RUANGAN ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Status Tabs Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto no-scrollbar flex-nowrap min-w-0">
          {[
            { key: 'ALL', label: `Semua (${summary.totalRuang})` },
            { key: 'ACTIVE', label: `🟢 Aktif (${summary.active})` },
            { key: 'DRAFT', label: `🟡 Menunggu (${summary.draft})` },
            { key: 'PAUSED', label: `⏸️ Dijeda (${summary.paused})` },
            { key: 'COMPLETED', label: `🔵 Selesai (${summary.completed})` },
          ].map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setStatusFilter(st.key as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0',
                statusFilter === st.key
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Input Search & View Mode Switcher */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari R.01, X TJKT 1, nama pengawas, token..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer',
                viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs' : 'text-slate-400'
              )}
              title="Tampilan Grid Kartu Ruang"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer',
                viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs' : 'text-slate-400'
              )}
              title="Tampilan Tabel Rekap"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. ROOM MATRIX GRID: KARTU RUANG UJIAN BERSIH & JELAS ── */}
      {filteredJadwal.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Filter size={20} />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Tidak ada ruangan yang cocok dengan filter
          </p>
          <p className="text-xs text-slate-400">
            Coba ubah kata kunci pencarian atau ganti status filter di atas.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredJadwal.map((jadwal, idx) => {
            const roomCode = resolveRoomInfo(jadwal);
            const isLive = jadwal.status === 'ACTIVE';
            const isDraft = jadwal.status === 'DRAFT';
            const isPaused = jadwal.status === 'PAUSED';
            const isCompleted = jadwal.status === 'COMPLETED' || (jadwal.status as string) === 'FINISHED';

            const mapelName =
              jadwal.BankSoal?.Mapel?.nama_mapel ||
              jadwal.BankSoal?.judul ||
              jadwal.nama_sesi ||
              'Mata Pelajaran';

            const jamMulai = formatLocalTimeFromISO(jadwal.tanggal_mulai);
            const jamSelesai = formatLocalTimeFromISO(jadwal.tanggal_selesai);

            const pengawas1 = jadwal.setting_keamanan?.pengawas_1_nama || '-';
            const proktor = jadwal.setting_keamanan?.proktor_nama || '-';

            return (
              <div
                key={jadwal.id || `room-${idx}`}
                className={cn(
                  'rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative shadow-2xs hover:shadow-md',
                  isLive
                    ? 'bg-white dark:bg-slate-900 border-emerald-400/80 dark:border-emerald-600/60 ring-2 ring-emerald-500/10'
                    : isDraft
                    ? 'bg-white dark:bg-slate-900 border-amber-300/80 dark:border-amber-700/60'
                    : isPaused
                    ? 'bg-white dark:bg-slate-900 border-yellow-300 dark:border-yellow-700'
                    : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-80'
                )}
              >
                {/* Aksen Status Garis Atas */}
                <div
                  className={cn(
                    'h-1 w-full',
                    isLive
                      ? 'bg-emerald-500'
                      : isDraft
                      ? 'bg-amber-400'
                      : isPaused
                      ? 'bg-yellow-500'
                      : 'bg-slate-400'
                  )}
                />

                <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                  {/* Baris 1: Kode Ruang (Besar) + Status Live Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-12 h-10 rounded-xl border flex flex-col items-center justify-center font-mono font-black text-xs shrink-0 shadow-2xs',
                          isLive
                            ? 'bg-emerald-500 text-white border-emerald-600'
                            : isDraft
                            ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                            : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        )}
                      >
                        <span>{roomCode}</span>
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {jadwal.nama_sesi}
                        </h4>
                        <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                          {mapelName}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white shrink-0 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>LIVE</span>
                      </span>
                    ) : isDraft ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 shrink-0">
                        DRAFT
                      </span>
                    ) : isPaused ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-yellow-100 text-yellow-800 shrink-0">
                        DIJEDA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                        SELESAI
                      </span>
                    )}
                  </div>

                  {/* Baris 2: Waktu & Pengawas */}
                  <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                        <Clock size={11} className="text-slate-400" />
                        <span>{jamMulai}–{jamSelesai}</span>
                      </span>
                      <span className="font-bold text-[10px] text-slate-400">
                        {jadwal.durasi_menit} mnt
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="truncate max-w-[130px] font-medium" title={`Pengawas: ${pengawas1}`}>
                        👤 {pengawas1}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold shrink-0">
                        {jadwal._count?.Peserta || 0} Siswa
                      </span>
                    </div>
                  </div>

                  {/* Baris 3: Token Box Ruang Ujian */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70">
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase font-black text-slate-400 tracking-wider">
                        Token Siswa
                      </div>
                      <div className="font-mono text-sm font-black tracking-widest text-slate-900 dark:text-white leading-tight">
                        {jadwal.token_ujian || '------'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyToken(jadwal.token_ujian, jadwal.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Salin Token"
                        aria-label="Salin Token"
                      >
                        {copiedTokenId === jadwal.id ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => regenerateTokenMutation.mutate(jadwal.id)}
                        disabled={regenerateTokenMutation.isPending}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Acak Ulang Token"
                        aria-label="Acak Ulang Token"
                      >
                        <RotateCw
                          size={13}
                          className={regenerateTokenMutation.isPending ? 'animate-spin text-emerald-600' : ''}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Bar: Tombol Aksi Langsung Panitia */}
                <div className="p-2.5 bg-slate-50/90 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {isDraft ? (
                      <button
                        type="button"
                        onClick={() => activateMutation.mutate(jadwal.id)}
                        disabled={activateMutation.isPending}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <Play size={11} className="fill-white" />
                        <span>Aktifkan</span>
                      </button>
                    ) : isLive ? (
                      <button
                        type="button"
                        onClick={() => pauseMutation.mutate(jadwal.id)}
                        disabled={pauseMutation.isPending}
                        className="px-2 py-1.5 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold text-[11px] transition-colors"
                        title="Jeda Sesi"
                      >
                        <Pause size={11} />
                      </button>
                    ) : null}

                    {/* Tombol Denah Cepat */}
                    <button
                      type="button"
                      onClick={() => handleOpenRoomDenah(roomCode, `Lokasi Ruang: ${roomCode}`)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                      title="Lihat di Denah Kampus"
                    >
                      <DoorOpen size={14} />
                    </button>
                  </div>

                  {/* Tombol Utama: Masuk Meja Pengawasan (Drill Down) */}
                  <button
                    type="button"
                    onClick={() => setSelectedInspectJadwalId(jadwal.id)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-black text-[11px] border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1 cursor-pointer transition-all active:scale-95 ml-auto"
                    title="Buka Layar Pengawasan Penuh Ruangan Ini"
                  >
                    <span>Pantau Ruang</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Tampilan Tabel Rekapitulasi Ringkas */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Ruang</th>
                  <th className="py-2.5 px-3">Nama Sesi &amp; Mapel</th>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Pengawas 1</th>
                  <th className="py-2.5 px-3">Token</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Peserta</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredJadwal.map((j) => {
                  const roomCode = resolveRoomInfo(j);
                  const isLive = j.status === 'ACTIVE';
                  const isDraft = j.status === 'DRAFT';

                  return (
                    <tr key={j.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-black text-slate-900 dark:text-white">
                        <button
                          type="button"
                          onClick={() => handleOpenRoomDenah(roomCode)}
                          className="hover:text-indigo-600 underline cursor-pointer"
                        >
                          {roomCode}
                        </button>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{j.nama_sesi}</div>
                        <div className="text-[11px] text-slate-400">
                          {j.BankSoal?.Mapel?.nama_mapel || j.BankSoal?.judul}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {formatLocalTimeFromISO(j.tanggal_mulai)}–{formatLocalTimeFromISO(j.tanggal_selesai)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {j.setting_keamanan?.pengawas_1_nama || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {j.token_ujian || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isLive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                            LIVE
                          </span>
                        ) : isDraft ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            DRAFT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {j.status}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {j._count?.Peserta || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInspectJadwalId(j.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100"
                        >
                          Pantau
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL DENAH SPASIAL KAMPUS ── */}
      {isDenahModalOpen && (
        <CbtDenahModal
          isOpen={isDenahModalOpen}
          onClose={() => setIsDenahModalOpen(false)}
          eventName="Radar Ruang Ujian CBT"
          highlightRoomCode={highlightRoomCode}
          highlightLabel={highlightRoomLabel}
          isReadOnly={true}
        />
      )}
    </div>
  );
};

export default CbtPanitiaLiveCommandPanel;
