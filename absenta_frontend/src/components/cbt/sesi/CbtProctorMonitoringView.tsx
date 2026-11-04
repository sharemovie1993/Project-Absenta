import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Badge,
  Table,
  SearchableSelect,
} from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import {
  Users,
  Activity,
  CheckCircle2,
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
} from 'lucide-react';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtPesertaUjian } from '@/types/cbt.types';
import { CbtTransferNilaiModal } from '../jadwal/CbtTransferNilaiModal';
import { CbtBeritaAcaraPrintModal } from '../jadwal/CbtBeritaAcaraPrintModal';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';

interface CbtProctorMonitoringViewProps {
  initialJadwalId?: string;
  guruId?: string;
  onBack?: () => void;
}

export const CbtProctorMonitoringView: React.FC<CbtProctorMonitoringViewProps> = ({
  initialJadwalId,
  guruId,
  onBack,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [selectedJadwalId, setSelectedJadwalId] = useState<string>(initialJadwalId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Sync apabila initialJadwalId berubah dari luar (misal klik tombol Monitor pada baris tabel)
  React.useEffect(() => {
    if (initialJadwalId) {
      setSelectedJadwalId(initialJadwalId);
    }
  }, [initialJadwalId]);

  // Fetch active/all schedules for dropdown selector
  const { data: jadwalData } = useQuery({
    queryKey: cbtQueryKeys.jadwal({ limit: 50, guru_id: guruId }),
    queryFn: () => cbtApi.getJadwalList({ limit: 50, guru_id: guruId }),
  });

  const jadwalList = jadwalData?.items || [];
  const activeJadwal = jadwalList.find((j) => j.id === selectedJadwalId) || jadwalList[0];

  // Auto-select first active schedule if none selected
  React.useEffect(() => {
    if (!selectedJadwalId && jadwalList.length > 0) {
      setSelectedJadwalId(jadwalList[0].id);
    }
  }, [jadwalList, selectedJadwalId]);

  // Fetch live participants with auto-refresh every 12 seconds
  const { data: pesertaList = [], isLoading, refetch } = useQuery({
    queryKey: cbtQueryKeys.pesertaList(selectedJadwalId, { search: searchQuery }),
    queryFn: () =>
      selectedJadwalId ? cbtApi.getPesertaList(selectedJadwalId, { search: searchQuery }) : Promise.resolve([]),
    enabled: Boolean(selectedJadwalId),
    refetchInterval: 12000, // 12 seconds live poll
  });

  // Reset Student Login Mutation
  const resetMutation = useMutation({
    mutationFn: ({ jadwalId, siswaId }: { jadwalId: string; siswaId: string }) =>
      cbtApi.resetPeserta(jadwalId, siswaId),
    onSuccess: async () => {
      toast.success('Sesi login siswa berhasil di-reset. Siswa dapat login kembali.');
      await queryClient.invalidateQueries({
        queryKey: cbtQueryKeys.pesertaList(selectedJadwalId),
        exact: false,
        refetchType: 'all',
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal mereset sesi siswa'),
  });

  // Session Control & Token Mutations (Untuk Pengawas Kelas / Proktor / Pengampu)
  const activateMutation = useMutation({
    mutationFn: (id: string) => cbtApi.activateJadwal(id),
    onSuccess: async () => {
      toast.success('Sesi ujian berhasil diaktifkan! Siswa kini dapat masuk menggunakan token.');
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
      toast.success(`Token baru berhasil dibuat: ${res.token_ujian}`);
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal membuat ulang token'),
  });

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    toast.success(`Token "${token}" berhasil disalin!`);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleActivateSession = async () => {
    if (!activeJadwal) return;
    const isConfirmed = await confirm({
      title: 'Aktifkan Sesi Ujian?',
      message: `Aktifkan sesi "${activeJadwal.nama_sesi}"? Siswa yang termasuk dalam rombel target akan dapat mulai masuk menggunakan token "${activeJadwal.token_ujian}".`,
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
      message: `Akhiri sesi "${activeJadwal.nama_sesi}"? Siswa tidak dapat lagi masuk atau mengirimkan jawaban baru.`,
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
      title: 'Reset Sesi Siswa?',
      message: `Reset sesi "${peserta.Siswa?.nama_lengkap || 'Siswa'}"? Sesi Redis akan dibersihkan agar siswa dapat masuk kembali pada perangkat lain. Jawaban yang sudah tersinkronisasi tidak akan hilang.`,
      confirmText: 'Reset Sesi Login',
      cancelText: 'Batal',
      style: 'warning',
    });

    if (isConfirmed) {
      resetMutation.mutate({ jadwalId: selectedJadwalId, siswaId: peserta.siswa_id });
    }
  };

  // Metrics calculation
  const totalPeserta = pesertaList.length;
  const inProgress = pesertaList.filter((p) => p.status === 'IN_PROGRESS').length;
  const finished = pesertaList.filter((p) => p.status === 'FINISHED').length;
  const disqualified = pesertaList.filter((p) => p.status === 'DISQUALIFIED').length;

  const isOwnerOrAdmin =
    !guruId ||
    activeJadwal?.BankSoal?.guru_id === guruId ||
    activeJadwal?.setting_keamanan?.created_by_guru_id === guruId;

  const filteredItems = pesertaList.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.Siswa?.nama_lengkap?.toLowerCase().includes(q);
      const matchNis = p.Siswa?.nis?.includes(q);
      return matchName || matchNis;
    }
    return true;
  });

  const scheduleOptions = jadwalList.map((j) => ({
    value: j.id,
    label: `${j.nama_sesi} [Token: ${j.token_ujian}] (${j.status})`,
  }));

  const columns: Column[] = [
    {
      key: 'siswa',
      title: 'Nama & Identitas Siswa',
      label: 'Nama & Identitas Siswa',
      className: 'min-w-[220px]',
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
      title: 'Status Pengerjaan',
      label: 'Status Pengerjaan',
      className: 'min-w-[130px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        if (row.status === 'IN_PROGRESS') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span>MENGERJAKAN</span>
            </span>
          );
        }
        if (row.status === 'FINISHED') {
          return (
            <Badge variant="success" className="text-[10px] font-bold">
              SELESAI SUBMIT
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
          <Badge variant="outline" className="text-[10px] font-bold">
            STANDBY
          </Badge>
        );
      },
    },
    {
      key: 'progres',
      title: 'Terjawab',
      label: 'Terjawab',
      className: 'min-w-[100px] text-center',
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
      title: 'Log Anti-Curang',
      label: 'Log Anti-Curang',
      className: 'min-w-[120px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        const vCount = Array.isArray(row.log_pelanggaran_json) ? row.log_pelanggaran_json.length : 0;
        if (vCount === 0) {
          return <span className="text-[11px] text-emerald-600 font-semibold">Tertib (0)</span>;
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
            <ShieldAlert size={12} />
            <span>{vCount} Pelanggaran</span>
          </span>
        );
      },
    },
    {
      key: 'nilai',
      title: 'Nilai Akhir',
      label: 'Nilai Akhir',
      className: 'min-w-[100px] text-center',
      render: (_val: unknown, row: CbtPesertaUjian) => {
        if (row.status !== 'FINISHED') {
          return <span className="text-slate-400 text-xs italic">-</span>;
        }
        return (
          <span className="font-black text-xs px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            {Number(row.nilai_akhir).toFixed(1)}
          </span>
        );
      },
    },
    {
      key: 'aksi',
      title: 'Aksi Proctor',
      label: 'Aksi Proctor',
      className: 'min-w-[130px] text-right',
      render: (_val: unknown, row: CbtPesertaUjian) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleReset(row)}
          className="text-[11px] h-7 px-2 border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900"
          title="Reset Sesi Login (Jika Laptop Rusak/Mati Listrik)"
        >
          <RotateCcw size={12} className="mr-1" />
          <span>Reset Login</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* Selector & Top Filter */}
      <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          {onBack && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              className="text-xs h-9 px-3 shrink-0 font-bold"
              title="Kembali ke Daftar Jadwal Ujian"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              <span>Kembali</span>
            </Button>
          )}

          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Pilih Sesi Ujian:
            </label>
            <SearchableSelect
              options={scheduleOptions}
              value={selectedJadwalId}
              onChange={setSelectedJadwalId}
              placeholder="Pilih Sesi Ujian..."
              aria-label="Pilih Sesi Ujian Aktif"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeJadwal && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/70">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">Token Masuk:</span>
              <span className="font-mono text-sm font-black tracking-widest text-indigo-700 dark:text-indigo-300 px-1">
                {activeJadwal.token_ujian}
              </span>
              <button
                type="button"
                onClick={() => handleCopyToken(activeJadwal.token_ujian)}
                className="p-1 rounded-md text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                title="Salin Token Ujian untuk Siswa"
              >
                {copiedToken ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                onClick={() => regenerateTokenMutation.mutate(activeJadwal.id)}
                disabled={regenerateTokenMutation.isPending}
                className="p-1 rounded-md text-slate-500 hover:text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                title="Acak Ulang Token Baru (Jika Token Bocor)"
              >
                <RotateCw size={13} className={regenerateTokenMutation.isPending ? 'animate-spin' : ''} />
              </button>
            </div>
          )}

          {/* Kontrol Jalannya Sesi Langsung dari Layar Pengawas Kelas */}
          {activeJadwal && (
            <>
              {(activeJadwal.status === 'DRAFT' || activeJadwal.status === 'PAUSED') && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleActivateSession}
                  disabled={activateMutation.isPending}
                  className="text-xs h-9 px-3 text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 font-bold"
                  title="Aktifkan Sesi Ujian agar Siswa Bisa Masuk"
                >
                  <Play size={13} className="mr-1" />
                  <span>{activeJadwal.status === 'PAUSED' ? 'Lanjutkan Sesi' : 'Aktifkan Sesi'}</span>
                </Button>
              )}

              {activeJadwal.status === 'ACTIVE' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => pauseMutation.mutate(activeJadwal.id)}
                    disabled={pauseMutation.isPending}
                    className="text-xs h-9 px-2.5 text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 font-bold"
                    title="Jeda Sementara Sesi Ujian"
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
                    className="text-xs h-9 px-2.5 text-slate-700 border-slate-300 hover:bg-slate-100 font-bold"
                    title="Akhiri & Selesaikan Sesi Ujian"
                  >
                    <CheckCircle size={13} className="mr-1" />
                    <span>Selesaikan</span>
                  </Button>
                </>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBeritaAcaraOpen(true)}
                className="text-xs h-9 px-3 font-semibold"
                title="Cetak Berita Acara Pelaksanaan Ujian"
              >
                <Printer size={13} className="mr-1.5" />
                <span>Berita Acara</span>
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-9 px-3"
            title="Segarkan Data Peserta"
          >
            Segarkan
          </Button>

          {isOwnerOrAdmin && activeJadwal && activeJadwal.status !== 'DRAFT' && totalPeserta > 0 && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsTransferModalOpen(true)}
              className="text-xs h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5"
              title="Transfer Nilai Hasil CBT ke Slot Rapor (SUM 1, SUM 2, SUM 3, SUM AKHIR)"
            >
              <ArrowRightLeft size={14} />
              <span>Transfer ke e-Rapor</span>
            </Button>
          )}
        </div>
      </div>

      {/* Info Bar Konteks Ruang & Mata Pelajaran */}
      {activeJadwal && (
        <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {activeJadwal.BankSoal?.MataPelajaran?.nama_mapel || 'Mata Pelajaran Umum'}
            </span>
            <span>•</span>
            <span>Pengampu: <strong>{activeJadwal.BankSoal?.Guru?.nama_guru || '-'}</strong></span>
            {activeJadwal.setting_keamanan?.ruang_ujian && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                  <MapPin size={12} className="text-indigo-500" />
                  {activeJadwal.setting_keamanan.ruang_ujian}
                </span>
              </>
            )}
            {activeJadwal.setting_keamanan?.pengawas_1_nama && (
              <>
                <span>•</span>
                <span>Pengawas: <strong>{activeJadwal.setting_keamanan.pengawas_1_nama}</strong></span>
              </>
            )}
          </div>
          <div>
            {activeJadwal.status === 'ACTIVE' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                SESI AKTIF
              </span>
            ) : activeJadwal.status === 'DRAFT' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                BELUM DIAKTIFKAN (KLIK AKTIFKAN SESI AGAR SISWA BISA MASUK)
              </span>
            ) : (
              <Badge variant="outline" className="text-[10px] font-bold">
                STATUS: {activeJadwal.status}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Shopee-Grade Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Peserta</p>
              <h4 className="text-base font-black text-slate-800 dark:text-slate-100">{totalPeserta}</h4>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <Activity size={16} className="animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sedang Ujian</p>
              <h4 className="text-base font-black text-emerald-600 dark:text-emerald-400">{inProgress}</h4>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selesai Submit</p>
              <h4 className="text-base font-black text-indigo-600 dark:text-indigo-400">{finished}</h4>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diskualifikasi</p>
              <h4 className="text-base font-black text-rose-600 dark:text-rose-400">{disqualified}</h4>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto no-scrollbar">
          {['ALL', 'IN_PROGRESS', 'FINISHED', 'DISQUALIFIED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {st === 'ALL'
                ? 'Semua Status'
                : st === 'IN_PROGRESS'
                ? 'Mengerjakan'
                : st === 'FINISHED'
                ? 'Selesai'
                : 'Diskualifikasi'}
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
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            aria-label="Cari siswa pada sesi"
          />
        </div>
      </div>

      {/* Table Data Peserta */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
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
