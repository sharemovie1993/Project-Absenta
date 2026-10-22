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
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* 1. HEADER STAT CARDS (4 KOLOM PERSIS KAPROG) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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

      {/* 2. MAIN TABLE CARD WITH TOOLBAR & FILTERS PERSIS KAPROG */}
      <Card noPadding className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-4">
        {/* Header Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Daftar Pelanggaran &amp; Kedisiplinan Siswa</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                {kelasNama}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monitoring catatan tata tertib harian dan tindak lanjut konseling BK siswa rombel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs font-semibold rounded-xl cursor-pointer"
              title="Refresh data pelanggaran"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isFetching && 'animate-spin')} />
              Refresh
            </Button>
            {!isHistorical && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleOpenRujukan()}
                className="text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Rujuk ke BP/BK
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-1">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-6">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama siswa, NIS, atau jenis pelanggaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar sm:col-span-1 lg:col-span-3">
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
                  'px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                  selectedStatus === st.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Filter Sumber */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar sm:col-span-1 lg:col-span-3 justify-end">
            {[
              { id: 'ALL', label: 'Semua Sumber' },
              { id: 'TATIB', label: 'Tatib' },
              { id: 'BK', label: 'BK' },
            ].map((sm) => (
              <button
                key={sm.id}
                type="button"
                onClick={() => setSelectedSumber(sm.id)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
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

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
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
