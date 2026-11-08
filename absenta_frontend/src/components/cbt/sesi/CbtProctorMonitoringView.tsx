import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
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
} from 'lucide-react';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtPesertaUjian } from '@/types/cbt.types';
import { CbtTransferNilaiModal } from '../jadwal/CbtTransferNilaiModal';
import { CbtBeritaAcaraPrintModal } from '../jadwal/CbtBeritaAcaraPrintModal';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { formatLocalTimeFromISO } from '@/utils/attendance/time';

interface CbtProctorMonitoringViewProps {
  initialJadwalId?: string;
  guruId?: string;
  onBack?: () => void;
  myPengawasData?: any[];
}

export const CbtProctorMonitoringView: React.FC<CbtProctorMonitoringViewProps> = ({
  initialJadwalId,
  guruId,
  onBack,
  myPengawasData,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [selectedJadwalId, setSelectedJadwalId] = useState<string>(initialJadwalId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Sync bila initialJadwalId berubah dari luar
  useEffect(() => {
    if (initialJadwalId) {
      setSelectedJadwalId(initialJadwalId);
    }
  }, [initialJadwalId]);

  // Fetch jadwal list hanya jika myPengawasData tidak disediakan
  const { data: jadwalData } = useQuery({
    queryKey: cbtQueryKeys.jadwal({ limit: 50, guru_id: guruId }),
    queryFn: () => cbtApi.getJadwalList({ limit: 50, guru_id: guruId }),
    enabled: !myPengawasData || myPengawasData.length === 0,
  });

  const availableSchedules = useMemo(() => {
    if (myPengawasData && myPengawasData.length > 0) return myPengawasData;
    return jadwalData?.items || [];
  }, [myPengawasData, jadwalData]);

  // Auto-select jadwal pertama jika belum dipilih
  useEffect(() => {
    if (!selectedJadwalId && availableSchedules.length > 0) {
      setSelectedJadwalId(availableSchedules[0].id);
    }
  }, [availableSchedules, selectedJadwalId]);

  const activeJadwal = useMemo(() => {
    return availableSchedules.find((j) => j.id === selectedJadwalId) || availableSchedules[0];
  }, [availableSchedules, selectedJadwalId]);

  // Fetch live peserta dengan interval 10 detik
  const { data: pesertaList = [], isLoading, refetch } = useQuery({
    queryKey: cbtQueryKeys.pesertaList(selectedJadwalId, { search: searchQuery }),
    queryFn: () =>
      selectedJadwalId ? cbtApi.getPesertaList(selectedJadwalId, { search: searchQuery }) : Promise.resolve([]),
    enabled: Boolean(selectedJadwalId),
    refetchInterval: 10000,
  });

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
  const disqualified = pesertaList.filter((p) => p.status === 'DISQUALIFIED').length;

  const isOwnerOrAdmin =
    !guruId ||
    activeJadwal?.BankSoal?.guru_id === guruId ||
    activeJadwal?.setting_keamanan?.created_by_guru_id === guruId;

  const filteredItems = useMemo(() => {
    return pesertaList.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
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
      className: 'min-w-[110px] text-right',
      render: (_val: unknown, row: CbtPesertaUjian) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleReset(row)}
          className="text-[11px] h-7 px-2 border-amber-300 text-amber-800 bg-amber-50/60 hover:bg-amber-100 font-bold"
          title="Reset Sesi Login (Jika Laptop Restart/Mati Listrik)"
        >
          <RotateCcw size={12} className="mr-1" />
          <span>Reset Login</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3.5 w-full max-w-full min-w-0 pb-16 sm:pb-8">
      {/* ── KARTU UTAMA PENGAWAS: FOKUS FUNGSI (ZERO NOISE) ── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Switcher Sesi (Hanya muncul jika guru punya > 1 sesi) */}
        {availableSchedules.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-black text-slate-400 shrink-0 uppercase tracking-wider mr-1">
              Sesi Ujian:
            </span>
            {availableSchedules.map((j) => {
              const isSelected = j.id === (activeJadwal?.id || selectedJadwalId);
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setSelectedJadwalId(j.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5',
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  )}
                >
                  <span className="truncate max-w-[150px]">{j.nama_sesi}</span>
                  {j.setting_keamanan?.ruang_ujian && (
                    <span className="opacity-75 text-[10px]">({j.setting_keamanan.ruang_ujian})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Baris Utama: Info Sesi & Hero Token */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {onBack && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                  className="text-xs h-7 px-2 shrink-0 font-bold"
                >
                  <ArrowLeft size={13} className="mr-1" />
                  <span>Kembali</span>
                </Button>
              )}
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                {activeJadwal?.nama_sesi || 'Sesi Ujian CBT'}
              </h3>

              {/* Status Sesi Badge */}
              {activeJadwal?.status === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  SESI AKTIF
                </span>
              ) : activeJadwal?.status === 'DRAFT' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  DRAFT
                </span>
              ) : activeJadwal?.status === 'PAUSED' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800">
                  DIJEDA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {activeJadwal?.status}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {activeJadwal?.BankSoal?.MataPelajaran?.nama_mapel ||
                  activeJadwal?.BankSoal?.Mapel?.nama_mapel ||
                  'Mata Pelajaran'}
              </span>
              {activeJadwal?.setting_keamanan?.ruang_ujian && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                    <MapPin size={11} className="text-emerald-500" />
                    {activeJadwal.setting_keamanan.ruang_ujian}
                  </span>
                </>
              )}
              {jamMulai && jamSelesai && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} />
                    {jamMulai}–{jamSelesai}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Hero Token Box */}
          {activeJadwal && (
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <div
                onClick={() => handleCopyToken(activeJadwal.token_ujian)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500/80 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 cursor-pointer hover:bg-emerald-100/70 transition-all select-none shadow-xs group"
                title="Klik untuk menyalin token"
              >
                <div className="text-left">
                  <div className="text-[9px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 leading-none">
                    Token Siswa
                  </div>
                  <div className="font-mono text-lg font-black tracking-widest text-emerald-700 dark:text-emerald-300 leading-tight">
                    {activeJadwal.token_ujian || '------'}
                  </div>
                </div>
                <button
                  type="button"
                  className="p-1 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 transition-colors"
                  aria-label="Salin Token"
                >
                  {copiedToken ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>

              {/* Acak Ulang Token */}
              <button
                type="button"
                onClick={() => regenerateTokenMutation.mutate(activeJadwal.id)}
                disabled={regenerateTokenMutation.isPending}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"
                title="Acak Ulang Token (Jika Bocor)"
                aria-label="Acak Ulang Token"
              >
                <RotateCw size={14} className={regenerateTokenMutation.isPending ? 'animate-spin text-emerald-600' : ''} />
              </button>
            </div>
          )}
        </div>

        {/* Baris Tombol Aksi Langsung */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tombol Aktivasi Sesi */}
            {(activeJadwal?.status === 'DRAFT' || activeJadwal?.status === 'PAUSED') && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleActivateSession}
                disabled={activateMutation.isPending}
                className="text-xs h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Play size={13} />
                <span>{activeJadwal?.status === 'PAUSED' ? 'Lanjutkan Sesi' : 'Aktifkan Sesi'}</span>
              </Button>
            )}

            {/* Tombol Kontrol Saat Aktif */}
            {activeJadwal?.status === 'ACTIVE' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => pauseMutation.mutate(activeJadwal.id)}
                  disabled={pauseMutation.isPending}
                  className="text-xs h-8 px-2.5 text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 font-bold"
                >
                  <Pause size={13} className="mr-1" />
                  <span>Jeda</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCompleteSession}
                  disabled={completeMutation.isPending}
                  className="text-xs h-8 px-2.5 text-slate-700 border-slate-300 hover:bg-slate-100 font-bold"
                >
                  <CheckCircle size={13} className="mr-1" />
                  <span>Selesaikan</span>
                </Button>
              </>
            )}

            {/* Cetak Berita Acara */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBeritaAcaraOpen(true)}
              className="text-xs h-8 px-3 font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Printer size={13} className="mr-1.5 text-slate-500" />
              <span>Berita Acara</span>
            </Button>

            {/* Transfer Rapor jika owner */}
            {isOwnerOrAdmin && activeJadwal && activeJadwal.status !== 'DRAFT' && totalPeserta > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTransferModalOpen(true)}
                className="text-xs h-8 px-3 font-bold text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70"
              >
                <ArrowRightLeft size={13} className="mr-1.5" />
                <span>Transfer Nilai</span>
              </Button>
            )}
          </div>

          {/* Tombol Segarkan */}
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1.5 flex items-center gap-1 transition-colors cursor-pointer"
            title="Segarkan Data Peserta"
          >
            <RotateCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* ── HIGH-DENSITY 4-STAT STRIP (ULTRA-RINGKAS, HEMAT RUANG VIEWPORT) ── */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Peserta</div>
          <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">{totalPeserta}</div>
        </div>
        <div className="p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/70 shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight flex items-center justify-center gap-1">
            {inProgress > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            Ujian
          </div>
          <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">{inProgress}</div>
        </div>
        <div className="p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/70 shadow-2xs">
          <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">Selesai</div>
          <div className="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-300">{finished}</div>
        </div>
        <div
          className={cn(
            'p-2 rounded-xl border shadow-2xs',
            disqualified > 0
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-700'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-500'
          )}
        >
          <div className="text-[10px] font-bold uppercase tracking-tight">Curang</div>
          <div className={cn('text-sm sm:text-base font-black', disqualified > 0 ? 'text-rose-600' : '')}>
            {disqualified}
          </div>
        </div>
      </div>

      {/* ── FILTER STATUS & PENCARIAN CEPAT SISWA ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto no-scrollbar">
          {[
            { key: 'ALL', label: `Semua (${totalPeserta})` },
            { key: 'IN_PROGRESS', label: `Ujian (${inProgress})` },
            { key: 'FINISHED', label: `Selesai (${finished})` },
            { key: 'DISQUALIFIED', label: `Curang (${disqualified})` },
          ].map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setStatusFilter(st.key)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                statusFilter === st.key
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau NIS siswa..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            aria-label="Cari siswa pada sesi"
          />
        </div>
      </div>

      {/* ── MONITORING PESERTA: RESPONSIF MOBILE & DESKTOP ── */}
      {/* 1. Mobile Cards View (Bebas Scroll Horizontal, Aksi Reset Cepat di Jari) */}
      <div className="block sm:hidden space-y-2">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            Memuat data peserta ujian...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            Tidak ada peserta yang cocok dengan filter
          </div>
        ) : (
          filteredItems.map((p) => {
            const jwbCount = Array.isArray(p.jawaban_json)
              ? p.jawaban_json.filter((j: any) => Boolean(j.jawaban_siswa)).length
              : 0;
            const vCount = Array.isArray(p.log_pelanggaran_json) ? p.log_pelanggaran_json.length : 0;

            return (
              <div
                key={p.id}
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

                {/* Tombol Reset Langsung di Mobile */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleReset(p)}
                  className="text-[11px] h-7 px-2 shrink-0 border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold"
                  title="Reset Sesi Siswa"
                >
                  <RotateCcw size={12} className="mr-1" />
                  <span>Reset</span>
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table View */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <Table
          data={filteredItems}
          columns={columns}
          loading={isLoading}
          hoverable={true}
          emptyMessage="Tidak ada data peserta ujian pada sesi ini"
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
    </div>
  );
};

export default CbtProctorMonitoringView;
