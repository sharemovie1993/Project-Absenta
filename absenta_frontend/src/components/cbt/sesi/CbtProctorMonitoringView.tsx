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
  AlertTriangle,
  RotateCcw,
  Clock,
  ShieldAlert,
  Search,
  Filter,
} from 'lucide-react';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtPesertaUjian, CbtJadwalUjian } from '@/types/cbt.types';
import useConfirm from '@/hooks/useConfirm';
import toast from 'react-hot-toast';

interface CbtProctorMonitoringViewProps {
  initialJadwalId?: string;
  onBack?: () => void;
}

export const CbtProctorMonitoringView: React.FC<CbtProctorMonitoringViewProps> = ({
  initialJadwalId,
  onBack,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [selectedJadwalId, setSelectedJadwalId] = useState<string>(initialJadwalId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Fetch active/all schedules for dropdown selector
  const { data: jadwalData } = useQuery({
    queryKey: cbtQueryKeys.jadwal({ limit: 50 }),
    queryFn: () => cbtApi.getJadwalList({ limit: 50 }),
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

  const handleReset = async (peserta: CbtPesertaUjian) => {
    const isConfirmed = await confirm({
      title: 'Reset Sesi Siswa?',
      message: `Reset sesi "${peserta.Siswa?.nama_lengkap || 'Siswa'}"? Sesi Redis akan dibersihkan agar siswa dapat masuk kembali pada perangkat lain. Jawaban yang sudah tersinkronisasi tidak akan hilang.`,
      confirmText: 'Reset Sesi',
      cancelText: 'Batal',
      style: 'danger',
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
        <div className="flex-1 max-w-md">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Pilih Sesi Ujian Aktif:
          </label>
          <SearchableSelect
            options={scheduleOptions}
            value={selectedJadwalId}
            onChange={setSelectedJadwalId}
            placeholder="Pilih Sesi Ujian..."
            aria-label="Pilih Sesi Ujian Aktif"
          />
        </div>

        <div className="flex items-center gap-2">
          {activeJadwal && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              <span className="text-xs text-slate-500 font-medium">Token Sesi:</span>
              <span className="font-mono text-sm font-black tracking-widest text-indigo-600 dark:text-indigo-400">
                {activeJadwal.token_ujian}
              </span>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-9 px-3"
            title="Segarkan Data Proctor"
          >
            Segarkan
          </Button>
        </div>
      </div>

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
    </div>
  );
};
