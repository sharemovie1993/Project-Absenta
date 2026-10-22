import React, { useState, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Scale,
  Users,
  Eye,
  FileText
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Loader } from '@/components/ui';
import { cn } from '@/lib/utils';
import { kesiswaanApi } from '@/api/kesiswaan.api';
import { PelanggaranSiswaItem, KelasKehadiranItem } from '../types';

// Code-splitting modal view to optimize initial tab bundle (Pilar 21B & TBT Optimization)
const KaprogPelanggaranModal = lazy(() =>
  import('../modals/KaprogPelanggaranModal').then((m) => ({ default: m.KaprogPelanggaranModal }))
);

interface KaprogPelanggaranTabProps {
  pelanggaranList?: PelanggaranSiswaItem[];
  jurusanId?: string;
  jurusanNama?: string;
  kelasList?: KelasKehadiranItem[];
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogPelanggaranTab: React.FC<KaprogPelanggaranTabProps> = React.memo(({
  pelanggaranList: initialPelanggaranList = [],
  jurusanId,
  jurusanNama = 'Kejuruan',
  kelasList = [],
  tahunPelajaranId,
  semesterId,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSumber, setSelectedSumber] = useState<string>('ALL');
  const [selectedKelas, setSelectedKelas] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch data riil pelanggaran tersaring scope kejuruan
  const {
    data: apiResponse,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'kaprog-tab-pelanggaran',
      jurusanId,
      tahunPelajaranId,
      semesterId,
      selectedStatus,
    ],
    queryFn: () =>
      kesiswaanApi.getPelanggaran({
        page: 1,
        limit: 100,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        jurusan_id: jurusanId,
        tahun_pelajaran_id: tahunPelajaranId || undefined,
        semester_id: semesterId || undefined,
        elevated_context: 'true',
      }).catch(() => null),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Gabungkan data dari API atau fallback ke list kaprog stats
  const displayList: PelanggaranSiswaItem[] = useMemo(() => {
    const rawApiList = (apiResponse as { data?: { list?: any[] }; list?: any[] })?.data?.list ||
      (apiResponse as { list?: any[] })?.list;
    if (Array.isArray(rawApiList) && rawApiList.length > 0) {
      return rawApiList.map((item: any) => ({
        id: item.id || String(Math.random()),
        siswaId: item.siswa_id || item.Siswa?.id || '',
        nama: item.Siswa?.nama_siswa || item.nama_siswa || 'Siswa',
        nis: item.Siswa?.nis || item.nis || '',
        kelas: item.Kelas?.nama_kelas || item.Siswa?.Kelas?.nama_kelas || '-',
        tanggal: typeof item.tanggal === 'string' ? item.tanggal.split('T')[0] : item.tanggal || '',
        jenisPelanggaran: item.jenis_pelanggaran || item.keterangan || '-',
        poin: Number(item.poin || 0),
        status: (item.status || 'BARU').toUpperCase(),
        keterangan: item.keterangan || '',
        sumber: (item.sumber || 'TATIB') as 'TATIB' | 'BK',
      }));
    }
    return initialPelanggaranList || [];
  }, [apiResponse, initialPelanggaranList]);

  // Filter gabungan (search, status, sumber, kelas)
  const filteredList = useMemo(() => {
    return displayList.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm.trim() ||
        item.nama?.toLowerCase().includes(q) ||
        item.nis?.toLowerCase().includes(q) ||
        item.kelas?.toLowerCase().includes(q) ||
        item.jenisPelanggaran?.toLowerCase().includes(q);

      const matchStatus =
        selectedStatus === 'ALL' ||
        item.status?.toUpperCase() === selectedStatus.toUpperCase();

      const matchSumber =
        selectedSumber === 'ALL' ||
        (selectedSumber === 'BK' && item.sumber === 'BK') ||
        (selectedSumber === 'TATIB' && item.sumber !== 'BK');

      const matchKelas =
        selectedKelas === 'ALL' ||
        item.kelas?.toLowerCase() === selectedKelas.toLowerCase();

      return matchSearch && matchStatus && matchSumber && matchKelas;
    });
  }, [displayList, searchTerm, selectedStatus, selectedSumber, selectedKelas]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = displayList.length;
    const baru = displayList.filter((p) => p.status?.toUpperCase() === 'BARU').length;
    const proses = displayList.filter((p) => ['PROSES', 'RUJUKAN'].includes(p.status?.toUpperCase() || '')).length;
    const selesai = displayList.filter((p) => p.status?.toUpperCase() === 'SELESAI').length;
    const totalPoin = displayList.reduce((acc, curr) => acc + (curr.poin || 0), 0);
    const highAlertCount = displayList.filter((p) => (p.poin || 0) >= 15).length;

    return { total, baru, proses, selesai, totalPoin, highAlertCount };
  }, [displayList]);

  return (
    <div className="space-y-6">
      {/* Header Stat Cards */}
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
            Akumulasi pelanggaran siswa {jurusanNama}
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
            Menunggu verifikasi Kaprog / Tatib
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
            Bimbingan atau pemanggilan ortu
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

      {/* Main Table Card with Toolbar */}
      <Card noPadding className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-4">
        {/* Header Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Daftar Pelanggaran & Kedisiplinan Siswa</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                {jurusanNama}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monitoring catatan tata tertib harian dan tindak lanjut konseling BK siswa kejuruan.
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold rounded-xl cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Detail Modal
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-1">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama siswa, NIS, kelas, atau jenis pelanggaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar sm:col-span-1 lg:col-span-4">
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
                <th className="py-2.5 px-4 whitespace-nowrap">Kelas</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-2.5 px-4">Pelanggaran & Keterangan</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Poin</th>
                <th className="py-2.5 px-4 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Aksi / Koordinasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {searchTerm || selectedStatus !== 'ALL' || selectedSumber !== 'ALL'
                          ? 'Tidak ditemukan data pelanggaran sesuai filter yang dipilih.'
                          : 'Tidak ada catatan pelanggaran tata tertib pada siswa jurusan ini.'}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Lingkungan belajar kondusif dan tertib aturan.
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
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {p.kelas}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(isBk ? '/bpbk/cases' : '/kesiswaan/pelanggaran')}
                            className="h-7 px-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                            title={isBk ? 'Buka detail kasus di BP/BK' : 'Koordinasi tata tertib kesiswaan'}
                          >
                            <span>{isBk ? 'Kasus BK' : 'Koordinasi'}</span>
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

      {/* Modal Detail Pelanggaran Siswa Scoped Jurusan - Lazy Mounted */}
      {isModalOpen && (
        <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
          <KaprogPelanggaranModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            jurusanId={jurusanId}
            jurusanNama={jurusanNama}
            initialPelanggaranList={displayList}
            tahunPelajaranId={tahunPelajaranId}
            semesterId={semesterId}
          />
        </Suspense>
      )}
    </div>
  );
});

KaprogPelanggaranTab.displayName = 'KaprogPelanggaranTab';
