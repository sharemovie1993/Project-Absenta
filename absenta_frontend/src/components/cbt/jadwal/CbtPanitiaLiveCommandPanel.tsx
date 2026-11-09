import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Play,
  Pause,
  Copy,
  Check,
  Search,
  Clock,
  Users,
  DoorOpen,
  ArrowLeft,
  RotateCw,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronDown,
  Filter,
  Calendar,
  BookOpen,
  ShieldCheck,
  TableProperties,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian, CbtEventItem } from '@/types/cbt.types';
import { CbtDenahModal } from './CbtDenahModal';
import { CbtProctorMonitoringView } from '../sesi/CbtProctorMonitoringView';
import { detectNodeTingkat, TINGKAT_STYLES } from '@/components/spasial/denahTingkatHelper';
import useConfirm from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';
import { formatLocalTimeFromISO, formatLocalDateIndo } from '@/utils/attendance/time';

interface CbtPanitiaLiveCommandPanelProps {
  jadwalList: CbtJadwalUjian[];
  isLoadingJadwal: boolean;
  refetchJadwal: () => void;
  guruList?: any[];
  onBackToPengawas?: () => void;
  activeEvent?: CbtEventItem | null;
}

export type CbtMonitoringLensMode = 'ruangan' | 'hari_sesi' | 'mapel';

export const CbtPanitiaLiveCommandPanel: React.FC<CbtPanitiaLiveCommandPanelProps> = ({
  jadwalList = [],
  isLoadingJadwal,
  refetchJadwal,
  activeEvent,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // ── 1. STATE LENSA MONITORING (DRIVEN-CENTRIC) ──
  const [lensMode, setLensMode] = useState<CbtMonitoringLensMode>('ruangan');

  // State Inspeksi Ruang Individual (Drill-Down Meja Pengawas)
  const [selectedInspectJadwalId, setSelectedInspectJadwalId] = useState<string | null>(null);

  // State Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'COMPLETED'>('ALL');
  const [tingkatFilter, setTingkatFilter] = useState<'ALL' | 10 | 11 | 12 | 13>('ALL');

  // State Denah Modal Spasial
  const [isDenahModalOpen, setIsDenahModalOpen] = useState(false);
  const [highlightRoomCode, setHighlightRoomCode] = useState<string | null>(null);
  const [highlightRoomLabel, setHighlightRoomLabel] = useState<string>('Pusat Komando CBT');

  // State Salin Token
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // State Expansion untuk Lensa Mapel & Hari
  const [expandedMapelId, setExpandedMapelId] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Countdown Timer untuk Rotasi Token Otomatis
  const tokenIntervalMinutes = activeEvent?.token_refresh_interval ?? 15;
  const isAutoRotate = tokenIntervalMinutes > 0;
  const [secondsLeft, setSecondsLeft] = useState<number>(() => tokenIntervalMinutes * 60);

  useEffect(() => {
    if (!isAutoRotate) return;
    setSecondsLeft(tokenIntervalMinutes * 60);
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return tokenIntervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [tokenIntervalMinutes, isAutoRotate]);

  const countdownText = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [secondsLeft]);

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

  // Helper Ekstraksi Ruang, Rombel, & Tingkat Kelas
  const parseRoomAndClass = (j: CbtJadwalUjian) => {
    const rawRoom = (j.setting_keamanan?.ruang_ujian || '').trim();
    const namaSesi = j.nama_sesi || '';

    let rombel = '-';
    let roomCode = rawRoom;

    // Pola nama sesi: "PSAS Ganjil - Mapel (X PHT 2 - R.06)" atau "(X PHT 2)"
    const match = namaSesi.match(/\((.*?)\)/);
    if (match) {
      const inner = match[1];
      const parts = inner.split(' - ');
      if (parts.length >= 2) {
        rombel = parts[0].trim();
        if (!roomCode) roomCode = parts[1].trim();
      } else {
        rombel = inner.trim();
      }
    }

    if (!roomCode) {
      roomCode = j.setting_keamanan?.ruang_ujian_nama || j.nama_sesi || 'R.XX';
    }

    // Ekstraksi Tingkat
    const detectedTingkat =
      detectNodeTingkat({
        label_sub: rombel,
        label_utama: roomCode,
        catatan: j.BankSoal?.tingkat,
      }) || 10;

    return {
      roomCode,
      rombel,
      tingkat: detectedTingkat,
    };
  };

  // Natural Sorting Helper untuk Kode Ruang (R.01 s/d R.36)
  const getRoomNumber = (code: string) => {
    const match = code.match(/\d+/);
    return match ? parseInt(match[0], 10) : 9999;
  };

  const compareRoomCodes = (codeA: string, codeB: string) => {
    const numA = getRoomNumber(codeA);
    const numB = getRoomNumber(codeB);
    if (numA !== numB) return numA - numB;
    return codeA.localeCompare(codeB);
  };

  // ── STATISTIK KESELURUHAN SEKOLAH (COMMAND CENTER RADAR) ──
  const summary = useMemo(() => {
    const totalRuang = jadwalList.length;
    const active = jadwalList.filter((j) => j.status === 'ACTIVE').length;
    const draft = jadwalList.filter((j) => j.status === 'DRAFT').length;
    const paused = jadwalList.filter((j) => j.status === 'PAUSED').length;
    const completed = jadwalList.filter(
      (j) => j.status === 'COMPLETED' || (j.status as string) === 'FINISHED'
    ).length;

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

  // Filter Jadwal Berdasarkan Status & Pencarian & Tingkat
  const filteredJadwal = useMemo(() => {
    return jadwalList.filter((j) => {
      const info = parseRoomAndClass(j);

      // Filter Tingkat
      if (tingkatFilter !== 'ALL' && info.tingkat !== tingkatFilter) {
        return false;
      }

      // Filter Status
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'COMPLETED') {
          if (j.status !== 'COMPLETED' && (j.status as string) !== 'FINISHED') return false;
        } else if (j.status !== statusFilter) {
          return false;
        }
      }

      // Filter Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const roomName = (info.roomCode || '').toLowerCase();
        const rombel = (info.rombel || '').toLowerCase();
        const sessionName = (j.nama_sesi || '').toLowerCase();
        const mapel = (j.BankSoal?.Mapel?.nama_mapel || j.BankSoal?.judul || '').toLowerCase();
        const pengawas1 = (j.setting_keamanan?.pengawas_1_nama || '').toLowerCase();
        const proktor = (j.setting_keamanan?.proktor_nama || '').toLowerCase();
        const token = (j.token_ujian || '').toLowerCase();

        return (
          roomName.includes(q) ||
          rombel.includes(q) ||
          sessionName.includes(q) ||
          mapel.includes(q) ||
          pengawas1.includes(q) ||
          proktor.includes(q) ||
          token.includes(q)
        );
      }

      return true;
    });
  }, [jadwalList, statusFilter, tingkatFilter, searchQuery]);

  // ── LENSA 1: TABEL BERBASIS RUANGAN (URUT R.01 S/D R.36) ──
  const sortedJadwalByRoom = useMemo(() => {
    return [...filteredJadwal].sort((a, b) => {
      const infoA = parseRoomAndClass(a);
      const infoB = parseRoomAndClass(b);
      return compareRoomCodes(infoA.roomCode, infoB.roomCode);
    });
  }, [filteredJadwal]);

  // ── LENSA 2: TABEL BERBASIS HARI & SESI (TIMELINE-CENTRIC) ──
  const daySessionGroups = useMemo(() => {
    const dayMap = new Map<
      string,
      {
        dateKey: string;
        dateLabel: string;
        sessionsMap: Map<
          string,
          {
            sessionKey: string;
            sessionName: string;
            jamMulai: string;
            jamSelesai: string;
            items: CbtJadwalUjian[];
          }
        >;
      }
    >();

    filteredJadwal.forEach((j) => {
      const rawDate = j.tanggal_mulai ? j.tanggal_mulai.split('T')[0] : 'default-date';
      const dateLabel = formatLocalDateIndo(j.tanggal_mulai);

      if (!dayMap.has(rawDate)) {
        dayMap.set(rawDate, {
          dateKey: rawDate,
          dateLabel,
          sessionsMap: new Map(),
        });
      }

      const dayEntry = dayMap.get(rawDate)!;
      const jamMulai = formatLocalTimeFromISO(j.tanggal_mulai);
      const jamSelesai = formatLocalTimeFromISO(j.tanggal_selesai);
      const sessionName = j.setting_keamanan?.nama_sesi_waktu || `Sesi ${jamMulai}–${jamSelesai}`;
      const sessionKey = `${jamMulai}-${jamSelesai}-${sessionName}`;

      if (!dayEntry.sessionsMap.has(sessionKey)) {
        dayEntry.sessionsMap.set(sessionKey, {
          sessionKey,
          sessionName,
          jamMulai,
          jamSelesai,
          items: [],
        });
      }

      dayEntry.sessionsMap.get(sessionKey)!.items.push(j);
    });

    const groups = Array.from(dayMap.values()).map((d) => {
      const sessions = Array.from(d.sessionsMap.values()).map((s) => {
        // Sort items inside session by room code
        s.items.sort((a, b) => {
          const infoA = parseRoomAndClass(a);
          const infoB = parseRoomAndClass(b);
          return compareRoomCodes(infoA.roomCode, infoB.roomCode);
        });

        const totalRuang = s.items.length;
        const active = s.items.filter((item) => item.status === 'ACTIVE').length;
        const draft = s.items.filter((item) => item.status === 'DRAFT').length;
        const completed = s.items.filter(
          (item) => item.status === 'COMPLETED' || (item.status as string) === 'FINISHED'
        ).length;
        const totalPeserta = s.items.reduce((acc, curr) => acc + (curr._count?.Peserta || 0), 0);

        return {
          ...s,
          stats: {
            totalRuang,
            active,
            draft,
            completed,
            totalPeserta,
          },
        };
      });

      return {
        dateKey: d.dateKey,
        dateLabel: d.dateLabel,
        sessions,
      };
    });

    // Urutkan tanggal ASC
    groups.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return groups;
  }, [filteredJadwal]);

  // Set default selected day key
  const activeDayKey = useMemo(() => {
    if (selectedDayKey && daySessionGroups.some((g) => g.dateKey === selectedDayKey)) {
      return selectedDayKey;
    }
    return daySessionGroups[0]?.dateKey || null;
  }, [selectedDayKey, daySessionGroups]);

  // ── LENSA 3: TABEL BERBASIS MATA PELAJARAN (SUBJECT-CENTRIC) ──
  const mapelGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        bankSoalId: string;
        mapelName: string;
        kodeBank: string;
        bankJudul: string;
        guruNama: string;
        tingkatSet: Set<number>;
        alokasiMenit: number;
        jumlahSoal: number;
        rooms: CbtJadwalUjian[];
      }
    >();

    filteredJadwal.forEach((j) => {
      const bankId = j.bank_soal_id || 'unknown-bank';
      const mapelName = j.BankSoal?.Mapel?.nama_mapel || j.BankSoal?.judul || 'Mata Pelajaran';
      const kodeBank = j.BankSoal?.kode_bank || '-';
      const bankJudul = j.BankSoal?.judul || mapelName;
      const guruNama = j.BankSoal?.Guru?.nama_guru || 'Tim Guru MGMP';
      const alokasiMenit = j.durasi_menit || j.BankSoal?.alokasi_menit || 90;
      const jumlahSoal = j.BankSoal?.jumlah_soal || 0;

      const info = parseRoomAndClass(j);

      if (!map.has(bankId)) {
        map.set(bankId, {
          bankSoalId: bankId,
          mapelName,
          kodeBank,
          bankJudul,
          guruNama,
          tingkatSet: new Set(),
          alokasiMenit,
          jumlahSoal,
          rooms: [],
        });
      }

      const entry = map.get(bankId)!;
      entry.tingkatSet.add(info.tingkat);
      entry.rooms.push(j);
    });

    return Array.from(map.values()).map((mg) => {
      mg.rooms.sort((a, b) => {
        const infoA = parseRoomAndClass(a);
        const infoB = parseRoomAndClass(b);
        return compareRoomCodes(infoA.roomCode, infoB.roomCode);
      });

      const totalRuang = mg.rooms.length;
      const activeCount = mg.rooms.filter((r) => r.status === 'ACTIVE').length;
      const draftCount = mg.rooms.filter((r) => r.status === 'DRAFT').length;
      const completedCount = mg.rooms.filter(
        (r) => r.status === 'COMPLETED' || (r.status as string) === 'FINISHED'
      ).length;
      const totalPeserta = mg.rooms.reduce((acc, curr) => acc + (curr._count?.Peserta || 0), 0);

      return {
        ...mg,
        tingkatList: Array.from(mg.tingkatSet).sort((a, b) => a - b),
        totalRuang,
        activeCount,
        draftCount,
        completedCount,
        totalPeserta,
      };
    });
  }, [filteredJadwal]);

  // ── AKSI OPERASIONAL MASSAL: AKTIFKAN SEMUA SESI DRAFT SERENTAK ──
  const [isBatchActivating, setIsBatchActivating] = useState(false);

  const handleBatchActivate = async (targetSessions?: CbtJadwalUjian[], customTitle?: string) => {
    const listToActivate = targetSessions
      ? targetSessions.filter((j) => j.status === 'DRAFT')
      : jadwalList.filter((j) => j.status === 'DRAFT');

    if (listToActivate.length === 0) {
      toast('Semua ruangan ujian pada target ini sudah dalam keadaan aktif atau selesai.', { icon: 'ℹ️' });
      return;
    }

    const title = customTitle || `Aktifkan ${listToActivate.length} Ruang Ujian Serentak?`;
    const isConfirmed = await confirm({
      title,
      message: `Tindakan ini akan mengaktifkan seluruh ${listToActivate.length} sesi ruang ujian yang masih berstatus DRAFT. Token ujian akan dibuka dan seluruh siswa di kelas tersebut dapat mulai login secara serentak.`,
      confirmText: `Aktifkan ${listToActivate.length} Ruangan Sekarang`,
      cancelText: 'Batal',
      style: 'primary',
    });

    if (!isConfirmed) return;

    try {
      setIsBatchActivating(true);
      toast.loading(`Mengaktifkan ${listToActivate.length} ruang ujian serentak...`, { id: 'batch-act' });

      const results = await Promise.allSettled(listToActivate.map((s) => cbtApi.activateJadwal(s.id)));
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;

      toast.dismiss('batch-act');
      toast.success(`Sukses mengaktifkan ${succeeded} dari ${listToActivate.length} ruang ujian!`);

      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      refetchJadwal();
    } catch {
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
    const roomInfo = inspectJadwal ? parseRoomAndClass(inspectJadwal) : null;
    const roomCode = roomInfo?.roomCode || 'Ruang Ujian';

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
              <span>Kembali ke Radar Monitoring Tabel</span>
            </button>

            <div className="h-5 w-px bg-white/20 hidden sm:block" />

            <div>
              <div className="text-[10px] uppercase font-black tracking-wider text-indigo-300">
                Inspeksi Meja Pengawas Live
              </div>
              <h3 className="text-sm sm:text-base font-black truncate flex items-center gap-2">
                <span>{roomCode}</span>
                <span className="text-white/60 font-medium text-xs">
                  ({roomInfo?.rombel || inspectJadwal?.nama_sesi || 'Sesi Ujian'})
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenRoomDenah(roomCode, `Inspeksi Panitia: ${roomCode}`)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
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
      {/* ── 1. MASTER COMMAND CENTER BAR: KONTROL OPERASIONAL PANITIA CBT (THEME-AWARE) ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                <Activity size={18} className="animate-pulse" />
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Pusat Komando &amp; Radar Live Ujian (Hari H)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Tabel monitoring serentak seluruh ruangan ujian, kontrol aktivasi per sesi, dan sebaran analitik live.
            </p>
          </div>

          {/* Master Operational Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {isAutoRotate && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-bold shrink-0">
                <Clock size={13} className="text-violet-600 animate-pulse" />
                <span>Rotasi Token ({tokenIntervalMinutes}m):</span>
                <span className="font-mono font-black text-violet-900 dark:text-violet-200">{countdownText}</span>
              </div>
            )}

            {summary.draft > 0 && (
              <button
                type="button"
                onClick={() => handleBatchActivate()}
                disabled={isBatchActivating}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                title="Aktifkan seluruh sesi yang masih DRAFT secara serentak"
              >
                <Play size={14} className="fill-white" />
                <span>Aktifkan {summary.draft} Ruang Serentak</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenRoomDenah('', 'Radar Denah Kampus CBT')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Buka Denah Spasial Kampus"
            >
              <DoorOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Denah Spasial</span>
            </button>

            <button
              type="button"
              onClick={() => refetchJadwal()}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Segarkan data radar"
            >
              <RotateCw size={15} className={isLoadingJadwal ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
        </div>

        {/* ── METRIK RINGKAS 4 KOTAK (THEME-AWARE) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Ruang Ujian
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{summary.totalRuang}</span>
              <span className="text-xs text-slate-400 font-normal">Ruang</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{summary.active} Aktif</span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">{summary.draft} Draft</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Sesi Sedang Live
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{summary.active}</span>
              <span className="text-xs text-slate-400 font-normal">Ruangan</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              Siswa sedang aktif ujian
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Menunggu Dimulai
            </span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{summary.draft}</span>
              <span className="text-xs text-slate-400 font-normal">Ruangan</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              {summary.draft > 0 ? 'Siap diaktifkan serentak' : 'Semua sudah dimulai'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Total Peserta
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{summary.totalPeserta}</span>
              <span className="text-xs text-slate-400 font-normal">Siswa</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              {summary.completed} Ruangan selesai
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. MULTI-PERSPECTIVE LENS SELECTOR (DRIVEN-CENTRIC SWITCHER) ── */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setLensMode('ruangan')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0',
              lensMode === 'ruangan'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <DoorOpen size={14} />
            <span>🏢 Berbasis Ruangan</span>
            <span className={cn('text-[10px] px-1.5 py-0.2 rounded-md font-bold', lensMode === 'ruangan' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700')}>
              {sortedJadwalByRoom.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLensMode('hari_sesi')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0',
              lensMode === 'hari_sesi'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Calendar size={14} />
            <span>📅 Berbasis Hari &amp; Sesi</span>
            <span className={cn('text-[10px] px-1.5 py-0.2 rounded-md font-bold', lensMode === 'hari_sesi' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700')}>
              {daySessionGroups.length} Hari
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLensMode('mapel')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0',
              lensMode === 'mapel'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <BookOpen size={14} />
            <span>📚 Berbasis Mata Pelajaran</span>
            <span className={cn('text-[10px] px-1.5 py-0.2 rounded-md font-bold', lensMode === 'mapel' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700')}>
              {mapelGroups.length} Mapel
            </span>
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative flex-1 md:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari R.01, X TJKT, pengawas, token..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* ── 3. FILTER BAR SPESIFIK LENSA ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Status Filter Chips */}
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

        {/* Filter Tingkat (Khusus Lensa Ruangan & Lensa Mapel) */}
        {lensMode === 'ruangan' && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl shrink-0 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Tingkat:
            </span>
            {[
              { val: 'ALL', label: 'Semua' },
              { val: 10, label: 'TK. X' },
              { val: 11, label: 'TK. XI' },
              { val: 12, label: 'TK. XII' },
            ].map((tk) => (
              <button
                key={String(tk.val)}
                type="button"
                onClick={() => setTingkatFilter(tk.val as any)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0',
                  tingkatFilter === tk.val
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                {tk.label}
              </button>
            ))}
          </div>
        )}

        {/* Filter Tab Hari (Khusus Lensa Hari & Sesi) */}
        {lensMode === 'hari_sesi' && daySessionGroups.length > 0 && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl shrink-0 overflow-x-auto no-scrollbar">
            {daySessionGroups.map((g) => (
              <button
                key={g.dateKey}
                type="button"
                onClick={() => setSelectedDayKey(g.dateKey)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
                  activeDayKey === g.dateKey
                    ? 'bg-indigo-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                <Calendar size={12} />
                <span>{g.dateLabel}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. KONTEN TABEL SESUAI LENSA PILIHAN ── */}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 🏢 LENSA 1: TABEL BERBASIS RUANGAN (ROOM-CENTRIC)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {lensMode === 'ruangan' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          {sortedJadwalByRoom.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Filter size={20} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Tidak ada ruangan yang cocok dengan filter
              </p>
              <p className="text-xs text-slate-400">
                Coba sesuaikan kata kunci pencarian atau ganti filter tingkat/status.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-3">Ruang Ujian</th>
                    <th className="py-3 px-3">Tingkat &amp; Rombel</th>
                    <th className="py-3 px-3">Mata Pelajaran</th>
                    <th className="py-3 px-3">Sesi &amp; Jam</th>
                    <th className="py-3 px-3">Pengawas Ruang</th>
                    <th className="py-3 px-3">Token Siswa</th>
                    <th className="py-3 px-3 text-center">Peserta</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Aksi Operasional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {sortedJadwalByRoom.map((j, idx) => {
                    const info = parseRoomAndClass(j);
                    const tkMeta = TINGKAT_STYLES[info.tingkat] || TINGKAT_STYLES[10];

                    const isLive = j.status === 'ACTIVE';
                    const isDraft = j.status === 'DRAFT';
                    const isPaused = j.status === 'PAUSED';

                    const jamMulai = formatLocalTimeFromISO(j.tanggal_mulai);
                    const jamSelesai = formatLocalTimeFromISO(j.tanggal_selesai);
                    const mapelName = j.BankSoal?.Mapel?.nama_mapel || j.BankSoal?.judul || 'Mata Pelajaran';
                    const pengawas = j.setting_keamanan?.pengawas_1_nama || null;

                    return (
                      <tr
                        key={j.id}
                        className={cn(
                          'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors',
                          isLive && 'bg-emerald-50/30 dark:bg-emerald-950/20'
                        )}
                      >
                        {/* No */}
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Ruang with Tingkat Styling */}
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => handleOpenRoomDenah(info.roomCode, `Lokasi Ruang: ${info.roomCode}`)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg border font-mono font-black text-xs inline-flex items-center gap-1.5 shadow-2xs hover:scale-105 transition-all cursor-pointer',
                              tkMeta.bg,
                              tkMeta.border,
                              tkMeta.text
                            )}
                            title="Klik untuk melihat lokasi di denah kampus"
                          >
                            <DoorOpen size={13} className={tkMeta.accent} />
                            <span>{info.roomCode}</span>
                          </button>
                        </td>

                        {/* Tingkat & Rombel */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'text-[10px] font-black px-1.5 py-0.5 rounded-md',
                                tkMeta.badge
                              )}
                            >
                              {tkMeta.badgeLabel}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {info.rombel}
                            </span>
                          </div>
                        </td>

                        {/* Mapel */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={mapelName}>
                            {mapelName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {j.BankSoal?.kode_bank || 'Bank Soal'} • {j.durasi_menit} menit
                          </div>
                        </td>

                        {/* Sesi & Jam */}
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1 font-semibold">
                            <Clock size={11} className="text-slate-400 shrink-0" />
                            <span>{jamMulai}–{jamSelesai}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {j.setting_keamanan?.nama_sesi_waktu || 'Sesi Ujian'}
                          </div>
                        </td>

                        {/* Pengawas */}
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          {pengawas ? (
                            <div className="font-medium truncate max-w-[150px]" title={pengawas}>
                              👤 {pengawas}
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium italic">
                              ⚠️ Belum diplot
                            </span>
                          )}
                        </td>

                        {/* Token Siswa */}
                        <td className="py-2.5 px-3">
                          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="font-mono font-black text-xs tracking-wider text-slate-900 dark:text-white">
                              {j.token_ujian || '------'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyToken(j.token_ujian, j.id)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                              title="Salin Token"
                            >
                              {copiedTokenId === j.id ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => regenerateTokenMutation.mutate(j.id)}
                              disabled={regenerateTokenMutation.isPending}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                              title="Acak Ulang Token"
                            >
                              <RotateCw
                                size={11}
                                className={regenerateTokenMutation.isPending ? 'animate-spin text-emerald-600' : ''}
                              />
                            </button>
                          </div>
                        </td>

                        {/* Peserta */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {j._count?.Peserta || 0}
                          </span>
                          <span className="text-[10px] text-slate-400 block">Siswa</span>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              <span>LIVE</span>
                            </span>
                          ) : isDraft ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              DRAFT
                            </span>
                          ) : isPaused ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800">
                              DIJEDA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              SELESAI
                            </span>
                          )}
                        </td>

                        {/* Aksi Operasional */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isDraft ? (
                              <button
                                type="button"
                                onClick={() => activateMutation.mutate(j.id)}
                                disabled={activateMutation.isPending}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Aktifkan sesi ini sekarang"
                              >
                                <Play size={10} className="fill-white" />
                                <span>Aktifkan</span>
                              </button>
                            ) : isLive ? (
                              <button
                                type="button"
                                onClick={() => pauseMutation.mutate(j.id)}
                                disabled={pauseMutation.isPending}
                                className="p-1 rounded-lg border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                                title="Jeda Sesi"
                              >
                                <Pause size={12} />
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => setSelectedInspectJadwalId(j.id)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-black text-[11px] border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                              title="Buka Layar Pengawasan Penuh Ruangan Ini"
                            >
                              <span>Pantau</span>
                              <ChevronRight size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 📅 LENSA 2: TABEL BERBASIS HARI & SESI (TIMELINE-CENTRIC)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {lensMode === 'hari_sesi' && (
        <div className="space-y-4">
          {daySessionGroups.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Tidak ada data jadwal sesi pada filter ini
              </p>
            </div>
          ) : (
            daySessionGroups
              .filter((g) => !activeDayKey || g.dateKey === activeDayKey)
              .map((dayGroup) => (
                <div key={dayGroup.dateKey} className="space-y-4">
                  {dayGroup.sessions.map((sesi) => (
                    <div
                      key={sesi.sessionKey}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
                    >
                      {/* Session Header Banner with Batch Control */}
                      <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-black text-xs">
                            <Clock size={16} />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                {sesi.sessionName} ({sesi.jamMulai} – {sesi.jamSelesai} WIB)
                              </h4>
                              {sesi.stats.active > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                                  {sesi.stats.active} LIVE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  {sesi.stats.draft} MENUNGGU
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {sesi.stats.totalRuang} Ruangan Ujian • {sesi.stats.totalPeserta} Siswa Terdaftar
                            </p>
                          </div>
                        </div>

                        {/* Batch Action Button for this Session */}
                        <div className="flex items-center gap-2">
                          {sesi.stats.draft > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleBatchActivate(
                                  sesi.items,
                                  `Aktifkan Seluruh ${sesi.stats.draft} Ruang di ${sesi.sessionName}?`
                                )
                              }
                              disabled={isBatchActivating}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                              <Play size={12} className="fill-white" />
                              <span>Aktifkan Sesi Ini ({sesi.stats.draft} Ruang)</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Session Detailed Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/60 dark:bg-slate-800/60 text-[11px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                              <th className="py-2.5 px-3 text-center w-12">No</th>
                              <th className="py-2.5 px-3">Ruang</th>
                              <th className="py-2.5 px-3">Tingkat &amp; Rombel</th>
                              <th className="py-2.5 px-3">Mata Pelajaran</th>
                              <th className="py-2.5 px-3">Pengawas</th>
                              <th className="py-2.5 px-3">Token</th>
                              <th className="py-2.5 px-3 text-center">Peserta</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {sesi.items.map((j, sIdx) => {
                              const info = parseRoomAndClass(j);
                              const tkMeta = TINGKAT_STYLES[info.tingkat] || TINGKAT_STYLES[10];
                              const isLive = j.status === 'ACTIVE';
                              const isDraft = j.status === 'DRAFT';

                              return (
                                <tr key={j.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                                    {sIdx + 1}
                                  </td>
                                  <td className="py-2 px-3 font-mono font-black">
                                    <span className={cn('px-2 py-0.5 rounded-md border text-xs', tkMeta.bg, tkMeta.border, tkMeta.text)}>
                                      {info.roomCode}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="font-bold text-slate-900 dark:text-white">{info.rombel}</span>
                                    <span className="text-[10px] text-slate-400 block">{tkMeta.name}</span>
                                  </td>
                                  <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                                    {j.BankSoal?.Mapel?.nama_mapel || j.BankSoal?.judul}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                    👤 {j.setting_keamanan?.pengawas_1_nama || '-'}
                                  </td>
                                  <td className="py-2 px-3 font-mono font-bold">
                                    {j.token_ujian || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold">
                                    {j._count?.Peserta || 0}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {isLive ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                                        LIVE
                                      </span>
                                    ) : isDraft ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        DRAFT
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                        {j.status}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedInspectJadwalId(j.id)}
                                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs cursor-pointer"
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
                  ))}
                </div>
              ))
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 📚 LENSA 3: TABEL BERBASIS MATA PELAJARAN (SUBJECT-CENTRIC)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {lensMode === 'mapel' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          {mapelGroups.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Tidak ada data mata pelajaran pada filter ini
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-3">Mata Pelajaran</th>
                    <th className="py-3 px-3 text-center">Tingkat Target</th>
                    <th className="py-3 px-3">Bank Soal &amp; Pembuat</th>
                    <th className="py-3 px-3 text-center">Alokasi &amp; Butir</th>
                    <th className="py-3 px-3 text-center">Cakupan Ruang</th>
                    <th className="py-3 px-3 text-center">Total Peserta</th>
                    <th className="py-3 px-3 text-center">Status Pelaksanaan</th>
                    <th className="py-3 px-3 text-right">Rincian &amp; Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {mapelGroups.map((mg, idx) => {
                    const isExpanded = expandedMapelId === mg.bankSoalId;

                    return (
                      <React.Fragment key={mg.bankSoalId || `mapel-${idx}`}>
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Mapel Name */}
                          <td className="py-3 px-3">
                            <div className="font-black text-slate-900 dark:text-white text-sm">
                              {mg.mapelName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {mg.bankJudul}
                            </div>
                          </td>

                          {/* Tingkat Badges */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {mg.tingkatList.map((tk) => {
                                const style = TINGKAT_STYLES[tk] || TINGKAT_STYLES[10];
                                return (
                                  <span
                                    key={tk}
                                    className={cn(
                                      'text-[10px] font-black px-2 py-0.5 rounded-md',
                                      style.badge
                                    )}
                                  >
                                    {style.badgeLabel}
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* Bank & Pembuat */}
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {mg.kodeBank}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              👤 {mg.guruNama}
                            </div>
                          </td>

                          {/* Alokasi & Butir */}
                          <td className="py-3 px-3 text-center">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {mg.alokasiMenit} Menit
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {mg.jumlahSoal} Butir PG
                            </div>
                          </td>

                          {/* Cakupan Ruang */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-black text-slate-900 dark:text-white text-xs">
                              {mg.totalRuang}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Ruangan</span>
                          </td>

                          {/* Total Peserta */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs">
                              {mg.totalPeserta}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Siswa</span>
                          </td>

                          {/* Status Pelaksanaan */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold">
                              {mg.activeCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {mg.activeCount} Live
                                </span>
                              )}
                              {mg.draftCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  {mg.draftCount} Menunggu
                                </span>
                              )}
                              {mg.completedCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {mg.completedCount} Selesai
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Aksi & Expand */}
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setExpandedMapelId(isExpanded ? null : mg.bankSoalId)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Tutup Rombel' : `Lihat ${mg.totalRuang} Rombel`}</span>
                              <ChevronDown
                                size={13}
                                className={cn('transition-transform', isExpanded && 'rotate-180')}
                              />
                            </button>
                          </td>
                        </tr>

                        {/* Accordion Rombel Ruang di Bawah Baris Mapel */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 dark:bg-slate-850/90">
                            <td colSpan={9} className="p-3 sm:p-4">
                              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
                                <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
                                  <span>Daftar Rombel &amp; Ruangan yang Mengikuti Ujian Mapel Ini:</span>
                                  {mg.draftCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleBatchActivate(
                                          mg.rooms,
                                          `Aktifkan Seluruh ${mg.draftCount} Ruang Mapel ${mg.mapelName}?`
                                        )
                                      }
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                    >
                                      <Play size={10} className="fill-white" />
                                      <span>Aktifkan Semua Ruangan Mapel Ini</span>
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
                                  {mg.rooms.map((roomJadwal) => {
                                    const rInfo = parseRoomAndClass(roomJadwal);
                                    const rTk = TINGKAT_STYLES[rInfo.tingkat] || TINGKAT_STYLES[10];
                                    const isLive = roomJadwal.status === 'ACTIVE';

                                    return (
                                      <div
                                        key={roomJadwal.id}
                                        className={cn(
                                          'p-2 rounded-xl border text-xs flex flex-col justify-between gap-1 shadow-2xs',
                                          isLive
                                            ? 'bg-emerald-50/50 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-600'
                                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                                        )}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className={cn('px-1.5 py-0.5 rounded font-mono font-black text-[10px]', rTk.badge)}>
                                            {rInfo.roomCode}
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-500">
                                            {roomJadwal._count?.Peserta || 0} Siswa
                                          </span>
                                        </div>
                                        <div className="font-bold text-slate-900 dark:text-white truncate">
                                          {rInfo.rombel}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedInspectJadwalId(roomJadwal.id)}
                                          className="mt-1 w-full py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] text-center cursor-pointer"
                                        >
                                          Pantau Ruang
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
