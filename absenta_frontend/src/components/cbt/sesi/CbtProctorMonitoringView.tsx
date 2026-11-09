import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Table,
} from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import {
  RotateCcw,
  ShieldAlert,
  Search,
  ArrowRightLeft,
  ArrowLeft,
  Copy,
  Check,
  RotateCw,
  Play,
  Pause,
  CheckCircle,
  Printer,
  MapPin,
  Clock,
  FileText,
  PenTool,
  DoorOpen,
} from 'lucide-react';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtPesertaUjian } from '@/types/cbt.types';
import { CbtTransferNilaiModal } from '../jadwal/CbtTransferNilaiModal';
import { CbtBeritaAcaraPrintModal } from '../jadwal/CbtBeritaAcaraPrintModal';
import { CbtDaftarHadirPrintModal } from '../jadwal/CbtDaftarHadirPrintModal';
import { CbtDenahModal } from '../jadwal/CbtDenahModal';
import { DigitalSignaturePadModal } from '@/components/ui/DigitalSignaturePadModal';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { formatLocalTimeFromISO } from '@/utils/attendance/time';

export interface ParsedSessionInfo {
  roomCode: string;
  rombel: string;
  mapel: string;
}

export const parseSessionLabel = (j: any): ParsedSessionInfo => {
  if (!j) return { roomCode: 'Ruang Ujian', rombel: '', mapel: 'Mata Pelajaran' };
  const rawRoom = (j.setting_keamanan?.ruang_ujian || '').trim();
  const namaSesi = j.nama_sesi || '';

  let rombel = '';
  let roomCode = rawRoom;

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
    roomCode = j.setting_keamanan?.ruang_ujian_nama || 'R.XX';
  }

  const mapel =
    j.BankSoal?.MataPelajaran?.nama_mapel ||
    j.BankSoal?.Mapel?.nama_mapel ||
    j.BankSoal?.judul ||
    'Mata Pelajaran';

  return {
    roomCode,
    rombel,
    mapel,
  };
};

interface CbtProctorMonitoringViewProps {
  initialJadwalId?: string;
  guruId?: string;
  onBack?: () => void;
  myPengawasData?: any[];
  schedulesList?: any[];
  isPanitiaView?: boolean;
}

export const CbtProctorMonitoringView: React.FC<CbtProctorMonitoringViewProps> = ({
  initialJadwalId,
  guruId,
  onBack,
  myPengawasData,
  schedulesList,
  isPanitiaView = false,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [selectedJadwalId, setSelectedJadwalId] = useState<string>(initialJadwalId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState(false);
  const [isDaftarHadirOpen, setIsDaftarHadirOpen] = useState(false);
  const [isDenahModalOpen, setIsDenahModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Sync bila initialJadwalId berubah dari luar
  useEffect(() => {
    if (initialJadwalId) {
      setSelectedJadwalId(initialJadwalId);
    }
  }, [initialJadwalId]);

  // Fetch jadwal list hanya jika myPengawasData / schedulesList tidak disediakan
  const { data: jadwalData } = useQuery({
    queryKey: cbtQueryKeys.jadwal({ limit: 50, guru_id: guruId }),
    queryFn: () => cbtApi.getJadwalList({ limit: 50, guru_id: guruId }),
    enabled: (!myPengawasData || myPengawasData.length === 0) && (!schedulesList || schedulesList.length === 0),
  });

  const availableSchedules = useMemo(() => {
    if (schedulesList && schedulesList.length > 0) return schedulesList;
    if (myPengawasData && myPengawasData.length > 0) return myPengawasData;
    return jadwalData?.items || [];
  }, [schedulesList, myPengawasData, jadwalData]);

  // Urutan Ruang Natural (R.01, R.02, dst)
  const sortedSchedules = useMemo(() => {
    return [...availableSchedules].sort((a, b) => {
      const infoA = parseSessionLabel(a);
      const infoB = parseSessionLabel(b);
      const numA = parseInt(infoA.roomCode.replace(/\D/g, ''), 10) || 9999;
      const numB = parseInt(infoB.roomCode.replace(/\D/g, ''), 10) || 9999;
      if (numA !== numB) return numA - numB;
      return infoA.roomCode.localeCompare(infoB.roomCode);
    });
  }, [availableSchedules]);

  // Auto-select jadwal pertama jika belum dipilih
  useEffect(() => {
    if (!selectedJadwalId && availableSchedules.length > 0) {
      setSelectedJadwalId(availableSchedules[0].id);
    }
  }, [availableSchedules, selectedJadwalId]);

  // Query detail jadwal aktif secara reaktif untuk menjamin data setting_keamanan & TTD selalu teranyar
  const { data: activeJadwalDetail } = useQuery({
    queryKey: cbtQueryKeys.jadwalDetail(selectedJadwalId),
    queryFn: () => (selectedJadwalId ? cbtApi.getJadwalById(selectedJadwalId) : Promise.resolve(null)),
    enabled: Boolean(selectedJadwalId),
  });

  const activeJadwal = useMemo(() => {
    if (activeJadwalDetail) return activeJadwalDetail;
    return availableSchedules.find((j) => j.id === selectedJadwalId) || availableSchedules[0];
  }, [availableSchedules, selectedJadwalId, activeJadwalDetail]);

  const activeInfo = useMemo(() => parseSessionLabel(activeJadwal), [activeJadwal]);

  // Fetch live peserta dengan interval 10 detik
  const { data: pesertaList = [], isLoading, refetch } = useQuery({
    queryKey: cbtQueryKeys.pesertaList(selectedJadwalId, { search: searchQuery }),
    queryFn: () =>
      selectedJadwalId ? cbtApi.getPesertaList(selectedJadwalId, { search: searchQuery }) : Promise.resolve([]),
    enabled: Boolean(selectedJadwalId),
    refetchInterval: 10000,
  });

  const activeRombel =
    activeInfo.rombel || (pesertaList?.[0] as CbtPesertaUjian)?.Siswa?.Kelas?.nama_kelas || '';

  // Resolusi Kode Ruang & Label Sorotan untuk Denah Pengawas
  const activeRoomCode = useMemo(() => {
    if (activeInfo.roomCode && activeInfo.roomCode !== 'R.XX' && activeInfo.roomCode !== 'Ruang Ujian') {
      return activeInfo.roomCode;
    }
    const raw = activeJadwal?.setting_keamanan?.ruang_ujian?.trim();
    if (raw && !raw.toLowerCase().includes('multi') && raw.toLowerCase() !== 'ruang kelas') {
      return raw;
    }
    const firstPeserta = (pesertaList as CbtPesertaUjian[])?.[0];
    if (firstPeserta?.Siswa?.Kelas?.nama_kelas) {
      return firstPeserta.Siswa.Kelas.nama_kelas;
    }
    return raw || null;
  }, [activeInfo, activeJadwal, pesertaList]);

  const activeRoomLabel = useMemo(() => {
    if (activeRoomCode) {
      return `Ruang: ${activeRoomCode}`;
    }
    return 'Ruang Ujian';
  }, [activeRoomCode]);

  // Mutasi Reset Login Siswa
  const resetMutation = useMutation({
    mutationFn: ({ jadwalId, siswaId }: { jadwalId: string; siswaId: string }) =>
      cbtApi.resetPeserta(jadwalId, siswaId),
    onSuccess: async () => {
      toast.success('Sesi login siswa di-reset. Siswa dapat login kembali.');
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.pesertaList(selectedJadwalId),
        exact: false,
        refetchType: 'all',
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal mereset sesi siswa'),
  });

  // Mutasi Kontrol Sesi & Token
  const activateMutation = useMutation({
    mutationFn: (id: string) => cbtApi.activateJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ujian aktif! Siswa dapat masuk dengan token.');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal mengaktifkan sesi ujian'),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => cbtApi.pauseJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ujian dijeda sementara.');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menjeda sesi ujian'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => cbtApi.completeJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ujian resmi diselesaikan.');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menyelesaikan sesi ujian'),
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: (id: string) => cbtApi.regenerateToken(id),
    onSuccess: async (res) => {
      toast.success(`Token baru dibuat: ${res.token_ujian}`);
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal membuat ulang token'),
  });

  const pengawasSignature = activeJadwal?.setting_keamanan?.tanda_tangan_pengawas_1;
  const waktuTtdPengawas = activeJadwal?.setting_keamanan?.waktu_ttd_pengawas_1;

  const updatePengawasSignatureMutation = useMutation({
    mutationFn: async (base64Signature: string) => {
      if (!activeJadwal?.id) throw new Error('Jadwal tidak ditemukan');
      const rawSetting = activeJadwal.setting_keamanan || {};
      const currentSetting = typeof rawSetting === 'string' ? JSON.parse(rawSetting) : rawSetting;
      const updatedSetting = {
        ...currentSetting,
        tanda_tangan_pengawas_1: base64Signature,
        waktu_ttd_pengawas_1: new Date().toISOString(),
      };
      return cbtApi.updateJadwal(activeJadwal.id, {
        setting_keamanan: updatedSetting,
      });
    },
    onSuccess: async () => {
      toast.success('Tanda tangan digital pengawas berhasil disimpan');
      setIsSignModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['my-pengawas-cbt-schedules'], exact: false, refetchType: 'all' });
      if (activeJadwal?.id) {
        await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.jadwalDetail(activeJadwal.id) });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan tanda tangan pengawas');
    },
  });

  const handleCopyToken = (token: string) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    toast.success(`Token "${token}" disalin!`);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleActivateSession = async () => {
    if (!activeJadwal) return;
    const isConfirmed = await confirm({
      title: 'Aktifkan Sesi Ujian?',
      message: `Aktifkan sesi "${activeJadwal.nama_sesi}"? Siswa dapat mulai masuk menggunakan token "${activeJadwal.token_ujian}".`,
      confirmText: 'Aktifkan Sekarang',
      cancelText: 'Batal',
      style: 'primary',
    });
    if (isConfirmed) {
      activateMutation.mutate(activeJadwal.id);
    }
  };

  const handleCompleteSession = async () => {
    if (!activeJadwal) return;
    const isConfirmed = await confirm({
      title: 'Selesaikan Sesi Ujian?',
      message: `Akhiri sesi "${activeJadwal.nama_sesi}"? Siswa tidak dapat lagi login atau mengirimkan jawaban baru.`,
      confirmText: 'Selesaikan Ujian',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (isConfirmed) {
      completeMutation.mutate(activeJadwal.id);
    }
  };

  const handleReset = async (peserta: CbtPesertaUjian) => {
    const isConfirmed = await confirm({
      title: 'Reset Login Siswa?',
      message: `Reset sesi "${peserta.Siswa?.nama_lengkap || 'Siswa'}"? Sesi dibersihkan agar siswa dapat login kembali. Jawaban yang sudah tersimpan aman.`,
      confirmText: 'Reset Login',
      cancelText: 'Batal',
      style: 'warning',
    });
    if (isConfirmed) {
      resetMutation.mutate({ jadwalId: selectedJadwalId, siswaId: peserta.siswa_id });
    }
  };

  // Metrik Ringkas
  const totalPeserta = pesertaList.length;
  const inProgress = pesertaList.filter((p) => p.status === 'IN_PROGRESS').length;
  const finished = pesertaList.filter((p) => p.status === 'FINISHED').length;
  // Deteksi Seluruh Peserta yang Terindikasi Curang (Baik berstatus DISQUALIFIED maupun memiliki riwayat log pelanggaran)
  const cheatingCount = pesertaList.filter(
    (p) =>
      p.status === 'DISQUALIFIED' ||
      (Array.isArray(p.log_pelanggaran_json) && p.log_pelanggaran_json.length > 0)
  ).length;

  const isOwnerOrAdmin =
    !guruId ||
    activeJadwal?.BankSoal?.guru_id === guruId ||
    activeJadwal?.setting_keamanan?.created_by_guru_id === guruId;

  const filteredItems = useMemo(() => {
    return pesertaList.filter((p) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'DISQUALIFIED') {
          const isCheating =
            p.status === 'DISQUALIFIED' ||
            (Array.isArray(p.log_pelanggaran_json) && p.log_pelanggaran_json.length > 0);
          if (!isCheating) return false;
        } else if (p.status !== statusFilter) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = p.Siswa?.nama_lengkap?.toLowerCase().includes(q);
        const matchNis = p.Siswa?.nis?.includes(q);
        return matchName || matchNis;
      }
      return true;
    });
  }, [pesertaList, statusFilter, searchQuery]);

  const jamMulai = formatLocalTimeFromISO(activeJadwal?.tanggal_mulai);
  const jamSelesai = formatLocalTimeFromISO(activeJadwal?.tanggal_selesai);

  // Kolom Desktop
  const columns: Column[] = [
    {
      key: 'siswa',
      title: 'Siswa',
      label: 'Siswa',
      className: 'min-w-[200px]',
      render: (_val: unknown, row: CbtPesertaUjian) => (
        <div className="space-y-0.5">
          <p className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
            {row.Siswa?.nama_lengkap || '-'}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>NIS: {row.Siswa?.nis || '-'}</span>
            <span>•</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {row.Siswa?.Kelas?.nama_kelas || '-'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      label: 'Status',
      className: 'min-w-[120px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        if (row.status === 'IN_PROGRESS') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span>UJIAN</span>
            </span>
          );
        }
        if (row.status === 'FINISHED') {
          return (
            <Badge variant="success" className="text-[10px] font-bold">
              SELESAI
            </Badge>
          );
        }
        if (row.status === 'DISQUALIFIED') {
          return (
            <Badge variant="danger" className="text-[10px] font-bold">
              DISKUALIFIKASI
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-[10px] font-bold text-slate-500">
            STANDBY
          </Badge>
        );
      },
    },
    {
      key: 'progres',
      title: 'Terjawab',
      label: 'Terjawab',
      className: 'min-w-[90px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        const jwbCount = Array.isArray(row.jawaban_json)
          ? row.jawaban_json.filter((j: any) => Boolean(j.jawaban_siswa)).length
          : 0;
        return (
          <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
            {jwbCount} Soal
          </span>
        );
      },
    },
    {
      key: 'pelanggaran',
      title: 'Anti-Curang',
      label: 'Anti-Curang',
      className: 'min-w-[110px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        const vCount = Array.isArray(row.log_pelanggaran_json) ? row.log_pelanggaran_json.length : 0;
        if (vCount === 0) {
          return <span className="text-[11px] text-emerald-600 font-semibold">Tertib (0)</span>;
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
            <ShieldAlert size={12} />
            <span>{vCount} Curang</span>
          </span>
        );
      },
    },
    {
      key: 'nilai',
      title: 'Nilai',
      label: 'Nilai',
      className: 'min-w-[80px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        if (row.status !== 'FINISHED') {
          return <span className="text-slate-400 text-xs italic">-</span>;
        }
        return (
          <span className="font-black text-xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            {Number(row.nilai_akhir).toFixed(1)}
          </span>
        );
      },
    },
    {
      key: 'aksi',
      title: 'Aksi',
      label: 'Aksi',
      className: 'min-w-[90px] text-right',
      render: (_val: unknown, row: CbtPesertaUjian) => (
        <button
          type="button"
          onClick={() => handleReset(row)}
          className="text-[11px] h-7 px-2.5 rounded-lg border border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100 font-bold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
          title="Reset Sesi Login Siswa"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      ),
    },
  ];

  return (
    <div className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
      {/* ── BARIS 1: HEADER INFORMASI SESI & HERO TOKEN (ZERO DUPLICATION) ── */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Kiri: Tombol Back + Room Badge + Mapel/Rombel + Status + Waktu */}
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Kembali ke Pusat Komando"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </button>
          )}

          {/* Badge Ruang (Cyan) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200 font-black text-xs shrink-0 shadow-2xs">
            <DoorOpen size={13} className="text-cyan-600" />
            <span>{activeInfo.roomCode}</span>
          </div>

          {/* Mapel & Rombel */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                {activeInfo.mapel}
              </h3>
              {activeRombel && (
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  • {activeRombel}
                </span>
              )}

              {/* Status Sesi Badge */}
              {activeJadwal?.status === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>AKTIF</span>
                </span>
              ) : activeJadwal?.status === 'DRAFT' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  DRAFT
                </span>
              ) : activeJadwal?.status === 'PAUSED' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                  DIJEDA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {activeJadwal?.status || 'SELESAI'}
                </span>
              )}
            </div>

            {/* Sub-info: Jam & Pengawas */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              {jamMulai && jamSelesai && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} />
                  {jamMulai}–{jamSelesai}
                </span>
              )}
              {activeJadwal?.setting_keamanan?.pengawas_1_nama && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500">
                      Pengawas: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{activeJadwal.setting_keamanan.pengawas_1_nama}</strong>
                    </span>
                    {isPanitiaView && (
                      pengawasSignature ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Check size={10} className="text-emerald-600" />
                          <span>Sudah TTD</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <span>Belum TTD</span>
                        </span>
                      )
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Kanan: Hero Token Box */}
        {activeJadwal && (
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <div
              onClick={() => handleCopyToken(activeJadwal.token_ujian)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500/80 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 cursor-pointer hover:bg-emerald-100/70 transition-all select-none shadow-xs group"
              title="Klik untuk menyalin token siswa"
            >
              <div className="text-left">
                <div className="text-[9px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 leading-none">
                  Token Siswa
                </div>
                <div className="font-mono text-base sm:text-lg font-black tracking-widest text-emerald-700 dark:text-emerald-300 leading-tight">
                  {activeJadwal.token_ujian || '------'}
                </div>
              </div>
              <button
                type="button"
                className="p-1 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 transition-colors cursor-pointer"
                aria-label="Salin Token"
              >
                {copiedToken ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => regenerateTokenMutation.mutate(activeJadwal.id)}
              disabled={regenerateTokenMutation.isPending}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
              title="Acak Ulang Token"
              aria-label="Acak Ulang Token"
            >
              <RotateCw size={14} className={regenerateTokenMutation.isPending ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* ── BARIS 2: SWITCHER SESI RUANG (Hanya jika > 1 sesi) ── */}
      {sortedSchedules.length > 1 && (
        <div className="px-3 sm:px-4 py-2 bg-slate-50/60 dark:bg-slate-800/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-black text-slate-400 shrink-0 uppercase tracking-wider mr-1">
            Ruang:
          </span>
          {sortedSchedules.map((j) => {
            const isSelected = j.id === (activeJadwal?.id || selectedJadwalId);
            const sInfo = parseSessionLabel(j);
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => setSelectedJadwalId(j.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5',
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
                )}
              >
                <span>{sInfo.roomCode}</span>
                {sInfo.rombel && (
                  <span className={cn('text-[10px]', isSelected ? 'text-white/80' : 'text-slate-400')}>
                    ({sInfo.rombel})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── BARIS 3: TOOLBAR OPERASIONAL & FILTER RINGKAS (ZERO VERTICAL WASTE) ── */}
      <div className="p-2.5 sm:p-3 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2.5">
        {/* Kiri: Filter status tabs & Search */}
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto no-scrollbar shrink-0">
            {[
              { key: 'ALL', label: 'Semua', count: totalPeserta },
              { key: 'IN_PROGRESS', label: 'Ujian', count: inProgress, dot: inProgress > 0 },
              { key: 'FINISHED', label: 'Selesai', count: finished },
              { key: 'DISQUALIFIED', label: 'Curang', count: cheatingCount, alert: cheatingCount > 0 },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                  statusFilter === st.key
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                {st.dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />}
                <span>{st.label}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                    statusFilter === st.key
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : st.alert
                      ? 'bg-rose-100 text-rose-700 font-black'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  )}
                >
                  {st.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative min-w-[150px] sm:w-44 lg:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa / NIS..."
              className="w-full pl-7 pr-3 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              aria-label="Cari siswa pada sesi"
            />
          </div>
        </div>

        {/* Kanan: Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {/* 1. Kontrol Sesi (Aktifkan / Jeda / Lanjutkan / Selesaikan) */}
          {(activeJadwal?.status === 'DRAFT' || activeJadwal?.status === 'PAUSED') && (
            <button
              type="button"
              onClick={handleActivateSession}
              disabled={activateMutation.isPending}
              className="h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95 shrink-0"
              title="Aktifkan Sesi Ujian"
            >
              <Play size={11} className="fill-white" />
              <span>{activeJadwal?.status === 'PAUSED' ? 'Lanjutkan' : 'Aktifkan'}</span>
            </button>
          )}

          {activeJadwal?.status === 'ACTIVE' && (
            <>
              <button
                type="button"
                onClick={() => pauseMutation.mutate(activeJadwal.id)}
                disabled={pauseMutation.isPending}
                className="h-7 px-2.5 rounded-lg border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                title="Jeda Sesi Ujian"
              >
                <Pause size={12} />
                <span>Jeda</span>
              </button>
              <button
                type="button"
                onClick={handleCompleteSession}
                disabled={completeMutation.isPending}
                className="h-7 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                title="Selesaikan Sesi Ujian"
              >
                <CheckCircle size={12} />
                <span>Selesaikan</span>
              </button>
            </>
          )}

          {/* 2. TTD Digital Pengawas (Hanya jika dibuka oleh Pengawas langsung, bukan di posko Panitia) */}
          {!isPanitiaView && (
            <button
              type="button"
              onClick={() => setIsSignModalOpen(true)}
              className={cn(
                'h-7 px-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95',
                pengawasSignature
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                  : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
              )}
              title={pengawasSignature ? 'Tanda tangan pengawas tersimpan' : 'Tanda tangan digital pengawas'}
            >
              <PenTool size={12} />
              <span>{pengawasSignature ? 'Sudah TTD' : 'TTD'}</span>
            </button>
          )}

          {/* 3. Daftar Hadir Siswa */}
          <button
            type="button"
            onClick={() => setIsDaftarHadirOpen(true)}
            className="h-7 px-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100/70 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
            title="Cetak Lembar Kehadiran Siswa"
          >
            <FileText size={12} />
            <span>Daftar Hadir</span>
          </button>

          {/* 4. Berita Acara Pelaksanaan */}
          <button
            type="button"
            onClick={() => setIsBeritaAcaraOpen(true)}
            className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
            title="Cetak Berita Acara Ujian"
          >
            <Printer size={12} />
            <span>Berita Acara</span>
          </button>

          {/* 5. Denah Ruang */}
          <button
            type="button"
            onClick={() => setIsDenahModalOpen(true)}
            className="h-7 px-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100/70 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
            title="Lihat Lokasi di Denah Kampus"
          >
            <MapPin size={12} />
            <span>Denah</span>
          </button>

          {/* 6. Transfer Nilai (Jika owner & ada peserta) */}
          {isOwnerOrAdmin && activeJadwal && activeJadwal.status !== 'DRAFT' && totalPeserta > 0 && (
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="h-7 px-2.5 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/70 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
              title="Transfer Nilai ke e-Rapor"
            >
              <ArrowRightLeft size={12} />
              <span>Transfer</span>
            </button>
          )}

          {/* 7. Segarkan Data */}
          <button
            type="button"
            onClick={() => refetch()}
            className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-xs shrink-0"
            title="Segarkan Data Peserta"
          >
            <RotateCw size={12} className={isLoading ? 'animate-spin text-emerald-600' : ''} />
            <span className="hidden lg:inline text-[11px] font-medium">Segarkan</span>
          </button>
        </div>
      </div>

      {/* ── BARIS 4: TABEL MONITORING LIVE (LANGSUNG MUNCUL TANPA SCROLL!) ── */}
      {/* 1. Mobile Cards View */}
      <div className="block sm:hidden p-3 space-y-2">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            Memuat data peserta ujian...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            Tidak ada peserta yang cocok dengan filter
          </div>
        ) : (
          filteredItems.map((p, idx) => {
            const jwbCount = Array.isArray(p.jawaban_json)
              ? p.jawaban_json.filter((j: any) => Boolean(j.jawaban_siswa)).length
              : 0;
            const vCount = Array.isArray(p.log_pelanggaran_json) ? p.log_pelanggaran_json.length : 0;

            return (
              <div
                key={p.id || p.siswa_id || `peserta-${idx}`}
                className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex items-center justify-between gap-2.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {p.Siswa?.nama_lengkap || '-'}
                    </span>
                    {p.status === 'IN_PROGRESS' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 shrink-0">
                        UJIAN
                      </span>
                    ) : p.status === 'FINISHED' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-100 text-indigo-800 shrink-0">
                        SELESAI
                      </span>
                    ) : p.status === 'DISQUALIFIED' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800 shrink-0">
                        CURANG
                      </span>
                    ) : null}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span>{p.Siswa?.Kelas?.nama_kelas || '-'}</span>
                    <span>•</span>
                    <span>{jwbCount} Soal</span>
                    {vCount > 0 && (
                      <span className="text-rose-600 font-bold">• {vCount} Curang</span>
                    )}
                    {p.status === 'FINISHED' && p.nilai_akhir != null && (
                      <span className="font-black text-indigo-600 dark:text-indigo-400">
                        • {Number(p.nilai_akhir).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleReset(p)}
                  className="text-[11px] h-7 px-2 shrink-0 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold rounded-lg cursor-pointer flex items-center gap-1"
                  title="Reset Sesi Siswa"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <Table
          data={filteredItems}
          columns={columns}
          loading={isLoading}
          hoverable={true}
          emptyMessage="Tidak ada data peserta ujian pada sesi ini"
          className="border-0"
        />
      </div>

      {/* Modal Transfer Nilai ke e-Rapor */}
      {isTransferModalOpen && activeJadwal && (
        <CbtTransferNilaiModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          jadwal={activeJadwal}
        />
      )}

      {/* Modal Cetak Berita Acara Pelaksanaan */}
      {isBeritaAcaraOpen && activeJadwal && (
        <CbtBeritaAcaraPrintModal
          isOpen={isBeritaAcaraOpen}
          onClose={() => setIsBeritaAcaraOpen(false)}
          jadwal={activeJadwal}
        />
      )}

      {/* Modal Cetak Lembar Daftar Hadir Siswa */}
      {isDaftarHadirOpen && activeJadwal && (
        <CbtDaftarHadirPrintModal
          isOpen={isDaftarHadirOpen}
          onClose={() => setIsDaftarHadirOpen(false)}
          jadwal={activeJadwal}
        />
      )}

      {/* Modal Denah Spasial Kampus (Interaktif Read-Only untuk Pengawas) */}
      {isDenahModalOpen && (
        <CbtDenahModal
          isOpen={isDenahModalOpen}
          onClose={() => setIsDenahModalOpen(false)}
          eventName={activeJadwal?.nama_sesi || 'Ujian CBT'}
          highlightRoomCode={activeRoomCode}
          highlightLabel={activeRoomLabel}
          isReadOnly={true}
        />
      )}

      {/* Modal Tanda Tangan Digital Pengawas Sesi */}
      {activeJadwal && (
        <DigitalSignaturePadModal
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          title="Tanda Tangan Digital Pengawas Ujian"
          subtitle={`Sesi: ${activeJadwal.nama_sesi || 'Ujian CBT'} • Ruang: ${activeJadwal.setting_keamanan?.ruang_ujian || 'Ruang CBT'}`}
          penName={activeJadwal.setting_keamanan?.pengawas_1_nama || 'Pengawas Ruang'}
          initialSignature={pengawasSignature}
          onSave={(sig) => updatePengawasSignatureMutation.mutate(sig)}
        />
      )}
    </div>
  );
};

export default CbtProctorMonitoringView;
