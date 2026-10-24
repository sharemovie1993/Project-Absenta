import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Scale,
  Send,
  Eye,
  FileText
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { HubStatusStrip, type HubStatusItem } from '@/components/ui/hub';
import { cn } from '@/lib/utils';
import { kesiswaanApi } from '@/api/kesiswaan.api';
import { bpbkApi } from '@/api/bpbk.api';
import toast from 'react-hot-toast';
import type { WalasDashboardData } from '../types';

export interface WalasDisiplinTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
}

export interface PelanggaranItem {
  id: string;
  siswaId: string;
  nama: string;
  nis: string;
  kelas: string;
  tanggal: string;
  jenisPelanggaran: string;
  poin: number;
  status: string;
  keterangan: string;
  sumber: 'TATIB' | 'BK';
}

export const WalasDisiplinTab: React.FC<WalasDisiplinTabProps> = React.memo(({
  kelasId,
  kelasNama = 'Kelas Binaan',
  data,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSumber, setSelectedSumber] = useState<string>('ALL');
  const [isRujukanModalOpen, setIsRujukanModalOpen] = useState(false);
  const [selectedStudentForRujukan, setSelectedStudentForRujukan] = useState<PelanggaranItem | null>(null);

  // Form State Rujukan BK
  const [rujukanForm, setRujukanForm] = useState({
    alasan: '',
    kategori: 'KEDISIPLINAN',
    urgensi: 'SEDANG',
    catatanAwal: '',
  });

  const isHistorical = data?.academicContext?.isHistoricalPeriod ?? false;

  // 1. Fetch Pelanggaran Siswa Rombel (Menggunakan kesiswaanApi seperti di Kaprog)
  const {
    data: apiResponse,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'walas-tab-pelanggaran',
      kelasId,
      data?.academicContext?.selectedTahunPelajaranId,
      data?.academicContext?.selectedSemesterId,
      selectedStatus,
    ],
    queryFn: () =>
      kesiswaanApi.getPelanggaran({
        page: 1,
        limit: 100,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        kelas_id: kelasId,
        tahun_pelajaran_id: data?.academicContext?.selectedTahunPelajaranId || undefined,
        semester_id: data?.academicContext?.selectedSemesterId || undefined,
        elevated_context: 'true',
      }).catch(() => null),
    enabled: Boolean(kelasId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 2. Fetch Kasus BK Rombel untuk Penggabungan Sumber
  const { data: bpbkCasesRes } = useQuery({
    queryKey: ['walas-bpbk-cases', kelasId],
    queryFn: () => bpbkApi.getCases({ kelas_id: kelasId, limit: 50 }).catch(() => null),
    enabled: Boolean(kelasId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Gabungkan data dari Tatib dan BK
  const displayList: PelanggaranItem[] = useMemo(() => {
    const list: PelanggaranItem[] = [];

    // Dari Tatib Kesiswaan
    const rawApiList = (apiResponse as { data?: { list?: any[] }; list?: any[] })?.data?.list ||
      (apiResponse as { list?: any[] })?.list;
    if (Array.isArray(rawApiList) && rawApiList.length > 0) {
      rawApiList.forEach((item: any) => {
        list.push({
          id: item.id || String(Math.random()),
          siswaId: item.siswa_id || item.Siswa?.id || '',
          nama: item.Siswa?.nama_siswa || item.nama_siswa || 'Siswa',
          nis: item.Siswa?.nis || item.nis || '',
          kelas: item.Kelas?.nama_kelas || item.Siswa?.Kelas?.nama_kelas || kelasNama,
          tanggal: typeof item.tanggal === 'string' ? item.tanggal.split('T')[0] : item.tanggal || '',
          jenisPelanggaran: item.jenis_pelanggaran || item.keterangan || '-',
          poin: Number(item.poin || 0),
          status: (item.status || 'BARU').toUpperCase(),
          keterangan: item.keterangan || '',
          sumber: (item.sumber || 'TATIB') as 'TATIB' | 'BK',
        });
      });
    }

    // Dari BP/BK
    const rawBpbk = (bpbkCasesRes as any)?.data?.cases || (bpbkCasesRes as any)?.cases || [];
    if (Array.isArray(rawBpbk) && rawBpbk.length > 0) {
      rawBpbk.forEach((c: any) => {
        list.push({
          id: `bk-${c.id}`,
          siswaId: c.siswa_id || c.Siswa?.id || '',
          nama: c.Siswa?.nama_siswa || c.nama_siswa || 'Siswa',
          nis: c.Siswa?.nis || c.nis || '',
          kelas: c.Kelas?.nama_kelas || kelasNama,
          tanggal: typeof c.created_at === 'string' ? c.created_at.split('T')[0] : '',
          jenisPelanggaran: c.kategori || c.judul || 'Konseling Kasus Siswa',
          poin: Number(c.poin || 0),
          status: (c.status || 'PROSES').toUpperCase(),
          keterangan: c.deskripsi || c.catatan || '',
          sumber: 'BK',
        });
      });
    }

    return list;
  }, [apiResponse, bpbkCasesRes, kelasNama]);

  // Filter gabungan (search, status, sumber)
  const filteredList = useMemo(() => {
    return displayList.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.nama?.toLowerCase().includes(q) ||
        item.nis?.toLowerCase().includes(q) ||
        item.jenisPelanggaran?.toLowerCase().includes(q) ||
        item.keterangan?.toLowerCase().includes(q);

      const matchStatus =
        selectedStatus === 'ALL' ||
        item.status?.toUpperCase() === selectedStatus.toUpperCase();

      const matchSumber =
        selectedSumber === 'ALL' ||
        (selectedSumber === 'BK' && item.sumber === 'BK') ||
        (selectedSumber === 'TATIB' && item.sumber !== 'BK');

      return matchSearch && matchStatus && matchSumber;
    });
  }, [displayList, searchTerm, selectedStatus, selectedSumber]);

  // Statistik Ringkas (Identik dengan Kaprog)
  const stats = useMemo(() => {
    const total = displayList.length;
    const baru = displayList.filter((p) => p.status?.toUpperCase() === 'BARU').length;
    const proses = displayList.filter((p) => ['PROSES', 'RUJUKAN', 'DALAM_PENANGANAN'].includes(p.status?.toUpperCase() || '')).length;
    const totalPoin = displayList.reduce((acc, curr) => acc + (curr.poin || 0), 0);
    const highAlertCount = displayList.filter((p) => (p.poin || 0) >= 15).length;

    return { total, baru, proses, totalPoin, highAlertCount };
  }, [displayList]);

  const miniStatusItems: HubStatusItem[] = useMemo(() => [
    {
      id: 'total',
      title: `${stats.total} Kasus`,
      subtitle: 'Total Catatan',
    },
    {
      id: 'baru',
      title: `${stats.baru} Baru`,
      subtitle: 'Tindak Lanjut',
      className: stats.baru > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : undefined,
    },
    {
      id: 'proses',
      title: `${stats.proses} Proses`,
      subtitle: 'Bimbingan BK',
      className: stats.proses > 0 ? 'text-blue-600 dark:text-blue-400 font-bold' : undefined,
    },
    {
      id: 'poin',
      title: `${stats.totalPoin} Poin`,
      subtitle: stats.highAlertCount > 0 ? `${stats.highAlertCount} Kritis` : 'Total Sanksi',
      className: stats.totalPoin > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : undefined,
    },
  ], [stats]);

  // Mutation Rujukan Kasus ke BP/BK
  const rujukanMutation = useMutation({
    mutationFn: (payload: {
      siswa_id: string;
      alasan: string;
      kategori: string;
      urgensi: string;
      catatan_awal?: string;
    }) => bpbkApi.createRujukan(payload),
    onSuccess: () => {
      toast.success('Rujukan kasus berhasil dikirim ke Tim BP/BK');
      setIsRujukanModalOpen(false);
      setSelectedStudentForRujukan(null);
      setRujukanForm({ alasan: '', kategori: 'KEDISIPLINAN', urgensi: 'SEDANG', catatanAwal: '' });
      queryClient.invalidateQueries({ queryKey: ['walas-bpbk-cases'] });
      queryClient.invalidateQueries({ queryKey: ['walas-dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mengirim rujukan ke BP/BK');
    },
  });

  const handleOpenRujukan = (p?: PelanggaranItem) => {
    if (p) {
      setSelectedStudentForRujukan(p);
      setRujukanForm(prev => ({
        ...prev,
        alasan: `Tindak lanjut pelanggaran ${p.jenisPelanggaran} (Poin: +${p.poin})`,
      }));
    } else {
      setSelectedStudentForRujukan(null);
    }
    setIsRujukanModalOpen(true);
  };

  const handleRujukanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rujukanForm.alasan.trim()) {
      toast.error('Alasan rujukan wajib diisi');
      return;
    }
    if (!selectedStudentForRujukan?.siswaId) {
      toast.error('Pilih siswa yang akan dirujuk');
      return;
    }

    rujukanMutation.mutate({
      siswa_id: selectedStudentForRujukan.siswaId,
      alasan: rujukanForm.alasan.trim(),
      kategori: rujukanForm.kategori,
      urgensi: rujukanForm.urgensi,
      catatan_awal: rujukanForm.catatanAwal.trim(),
    });
  };

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. MINI ANALYTIC CARD (Mobile < lg: Shopee-Grade Hairline 1-Baris) */}
      <div className="lg:hidden">
        <HubStatusStrip items={miniStatusItems} />
      </div>

      {/* 1b. STAT CARDS (Desktop >= lg: 4 Kolom Penuh) */}
      <div className="hidden lg:grid grid-cols-4 gap-3.5">
        <Card
          noPadding
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Catatan
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.total}
            </span>
            <span className="text-[11px] text-slate-400">kasus</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Akumulasi pelanggaran siswa {kelasNama}
          </p>
        </Card>

        <Card
          noPadding
          className="p-4 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 shadow-xs bg-white dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
              Perlu Tindak Lanjut
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              {stats.baru}
            </span>
            <span className="text-[11px] text-rose-500/80 font-medium">status baru</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Menunggu bimbingan walas / tatib
          </p>
        </Card>

        <Card
          noPadding
          className="p-4 rounded-2xl border border-blue-200/70 dark:border-blue-900/40 shadow-xs bg-white dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Dalam Penanganan
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {stats.proses}
            </span>
            <span className="text-[11px] text-blue-500/80 font-medium">proses / BK</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Konseling BK atau pemanggilan ortu
          </p>
        </Card>

        <Card
          noPadding
          className="p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 shadow-xs bg-white dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Akumulasi Poin
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {stats.totalPoin}
            </span>
            <span className="text-[11px] text-amber-500/80 font-medium">poin sanksi</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {stats.highAlertCount > 0 ? `${stats.highAlertCount} siswa poin kritis (≥15)` : 'Tidak ada kasus kritis'}
          </p>
        </Card>
      </div>

      {/* 2. MAIN CARD WITH TOOLBAR & FILTERS */}
      <Card noPadding className="p-3 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-3 sm:space-y-4">
        {/* Header Toolbar (Shopee-Grade: Strictly Max 2 Words & Zero Box-in-Box Clutter) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                Kasus Rombel
              </h3>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">
                Monitoring tata tertib harian dan tindak lanjut konseling BK siswa rombel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 sm:h-9 px-2.5 text-xs font-semibold rounded-xl cursor-pointer"
              title="Refresh data pelanggaran"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              <span className="hidden sm:inline ml-1.5">Refresh</span>
            </Button>
            {!isHistorical && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleOpenRujukan()}
                className="h-8 sm:h-9 px-3 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 sm:mr-1.5" />
                <span>Rujuk BK</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar (Search Input + Horizontal Scrollable Chips) */}
        <div className="space-y-2">
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa, NIS, atau pelanggaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 h-9 text-xs rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Pills: Status & Sumber */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap text-xs">
            {[
              { id: 'ALL', label: 'Semua Status' },
              { id: 'BARU', label: 'Baru' },
              { id: 'PROSES', label: 'Proses' },
              { id: 'SELESAI', label: 'Selesai' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatus(st.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer',
                  selectedStatus === st.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {st.label}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0 mx-0.5" />

            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'TATIB', label: 'Tatib' },
              { id: 'BK', label: 'BK' },
            ].map((sm) => (
              <button
                key={sm.id}
                type="button"
                onClick={() => setSelectedSumber(sm.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer',
                  selectedSumber === sm.id
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {sm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile View (< lg): Shopee-Grade High-Density Violations Card List */}
        <div className="lg:hidden space-y-2.5">
          {filteredList.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {searchTerm || selectedStatus !== 'ALL' || selectedSumber !== 'ALL'
                  ? 'Tidak ada kasus sesuai filter.'
                  : 'Rombel tertib, tidak ada kasus.'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Seluruh siswa terpantau kondusif.
              </p>
            </div>
          ) : (
            filteredList.map((p) => {
              const isHighAlert = (p.poin || 0) >= 15;
              const isBk = p.sumber === 'BK';

              return (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {p.nama}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        NIS {p.nis || '-'}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0',
                        isHighAlert
                          ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 ring-1 ring-rose-300 dark:ring-rose-800'
                          : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                      )}
                    >
                      +{p.poin} Poin
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[9.5px] font-bold shrink-0',
                        isBk
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {isBk ? 'Konseling BK' : 'Tatib'}
                    </span>
                    <span className="font-medium truncate">{p.jenisPelanggaran}</span>
                  </div>

                  {p.keterangan && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {p.keterangan}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10.5px]">
                    <span className="text-slate-400 font-mono">{p.tanggal}</span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider',
                          p.status === 'SELESAI'
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                            : p.status === 'PROSES' || p.status === 'RUJUKAN'
                            ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                            : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                        )}
                      >
                        {p.status}
                      </span>

                      {!isHistorical && !isBk && (
                        <button
                          type="button"
                          onClick={() => handleOpenRujukan(p)}
                          className="px-2 py-1 text-[10.5px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-lg flex items-center gap-1 hover:bg-rose-100 transition-colors"
                        >
                          <Send className="w-3 h-3 text-rose-500" />
                          <span>Rujuk BK</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => navigate(isBk ? '/bpbk/cases' : '/kesiswaan/pelanggaran')}
                        className="px-2 py-1 text-[10.5px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg flex items-center gap-0.5 transition-colors"
                      >
                        <span>{isBk ? 'Kasus' : 'Detail'}</span>
                        <ArrowUpRight className="w-3 h-3 text-indigo-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View (>= lg): Data Table Penuh */}
        <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200/70 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Siswa</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-2.5 px-4">Pelanggaran &amp; Keterangan</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Poin</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Aksi / Koordinasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {searchTerm || selectedStatus !== 'ALL' || selectedSumber !== 'ALL'
                          ? 'Tidak ditemukan data pelanggaran sesuai filter yang dipilih.'
                          : 'Tidak ada catatan pelanggaran tata tertib pada rombel ini.'}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Seluruh siswa rombel terpantau tertib aturan dan kondusif.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((p) => {
                  const isHighAlert = (p.poin || 0) >= 15;
                  const isBk = p.sumber === 'BK';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {p.nama}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {p.nis || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                        {p.tanggal}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-200 max-w-[280px]">
                        <div className="flex items-center gap-1.5 mb-1">
                          {isBk ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shrink-0">
                              Konseling BK
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                              Tatib
                            </span>
                          )}
                          <span className="font-medium truncate" title={p.jenisPelanggaran}>
                            {p.jenisPelanggaran}
                          </span>
                        </div>
                        {p.keterangan && (
                          <span className="block text-[11px] text-slate-400 truncate font-normal">
                            {p.keterangan}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[11px]',
                            isHighAlert
                              ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-extrabold ring-1 ring-rose-300 dark:ring-rose-800'
                              : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                          )}
                        >
                          +{p.poin} Poin
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                            p.status === 'SELESAI'
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                              : p.status === 'PROSES' || p.status === 'RUJUKAN'
                              ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                              : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                          )}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isHistorical && !isBk && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenRujukan(p)}
                              className="h-7 px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                              title="Rujuk kasus ini ke Guru BK"
                            >
                              <Send className="w-3 h-3 text-rose-500" />
                              <span>Rujuk BK</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(isBk ? '/bpbk/cases' : '/kesiswaan/pelanggaran')}
                            className="h-7 px-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                            title={isBk ? 'Buka detail kasus di BP/BK' : 'Buka modul kesiswaan'}
                          >
                            <span>{isBk ? 'Kasus BK' : 'Detail'}</span>
                            <ArrowUpRight className="w-3 h-3 text-indigo-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. MODAL RUJUKAN ALIH TANGAN KASUS KE BP/BK */}
      {isRujukanModalOpen && (
        <Modal
          isOpen={isRujukanModalOpen}
          onClose={() => {
            setIsRujukanModalOpen(false);
            setSelectedStudentForRujukan(null);
          }}
          title="Formulir Alih Tangan Kasus ke BP/BK"
          size="md"
        >
          <form onSubmit={handleRujukanSubmit} className="p-4 space-y-4 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1">
              <span className="font-bold text-amber-900 dark:text-amber-200 block">Siswa Binaan yang Dirujuk:</span>
              <p className="text-amber-800 dark:text-amber-300 font-medium">
                {selectedStudentForRujukan?.nama || 'Pilih Siswa Rombel'}
                {selectedStudentForRujukan?.nis && ` (NIS: ${selectedStudentForRujukan.nis})`}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Masalah:
              </label>
              <select
                value={rujukanForm.kategori}
                onChange={(e) => setRujukanForm({ ...rujukanForm, kategori: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="KEDISIPLINAN">Kedisiplinan &amp; Tata Tertib</option>
                <option value="KEHADIRAN">Absensi / Mangkir Berulang</option>
                <option value="PERILAKU">Perilaku &amp; Sikap Sosial</option>
                <option value="AKADEMIK">Kesulitan Belajar &amp; Motivasi</option>
                <option value="KELUARGA">Permasalahan Lingkungan / Keluarga</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tingkat Urgensi:
              </label>
              <select
                value={rujukanForm.urgensi}
                onChange={(e) => setRujukanForm({ ...rujukanForm, urgensi: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="RENDAH">Rendah (Pemantauan Berkala)</option>
                <option value="SEDANG">Sedang (Perlu Konseling Segera)</option>
                <option value="TINGGI">Tinggi (Perlu Panggilan Orang Tua)</option>
                <option value="MENDESAK">Mendesak (Kasus Berat / Perlu Tindakan Cepat)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alasan / Latar Belakang Rujukan: <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Jelaskan alasan dan latar belakang masalah siswa..."
                value={rujukanForm.alasan}
                onChange={(e) => setRujukanForm({ ...rujukanForm, alasan: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Awal Pembinaan Wali Kelas:
              </label>
              <textarea
                rows={2}
                placeholder="Langkah pembinaan yang telah dilakukan sebelumnya oleh wali kelas..."
                value={rujukanForm.catatanAwal}
                onChange={(e) => setRujukanForm({ ...rujukanForm, catatanAwal: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRujukanModalOpen(false);
                  setSelectedStudentForRujukan(null);
                }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                disabled={rujukanMutation.isPending}
              >
                {rujukanMutation.isPending ? 'Mengirim...' : 'Kirim Rujukan ke BK'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
});

WalasDisiplinTab.displayName = 'WalasDisiplinTab';
