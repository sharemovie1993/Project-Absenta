import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Send,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  Clock,
  Filter,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { HubStatusStrip, type HubStatusItem } from '@/components/ui/hub';
import { getEwsPerKelasList } from '@/api/kurikulum/waliKelas.api';
import { bpbkApi } from '@/api/bpbk.api';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import toast from 'react-hot-toast';
import type { WalasDashboardData } from '../types';

const TrackingSiswaModal = lazy(() =>
  import('@/components/attendance/tracking/TrackingSiswaModal').then((m) => ({ default: m.TrackingSiswaModal }))
);

export interface WalasDeteksiDiniTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
  onOpenRujukanModal?: (siswa: any) => void;
}

export interface AtRiskStudentItem {
  id: string;
  nama: string;
  nis: string;
  persentase: number;
  alfaCount: number;
  statusHariIni: string;
  rekomendasi: string;
  kategoriRisk?: string;
}

export const WalasDeteksiDiniTab: React.FC<WalasDeteksiDiniTabProps> = React.memo(({
  kelasId,
  kelasNama = 'Kelas Binaan',
  data,
  onOpenRujukanModal,
}) => {
  const isMobile = useIsMobile(640);
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');

  // Modal Tracking Siswa State
  const [trackingTarget, setTrackingTarget] = useState<{
    isOpen: boolean;
    siswaId: string;
    siswaNama: string;
  }>({
    isOpen: false,
    siswaId: '',
    siswaNama: '',
  });

  // Modal Rujukan BP/BK State (Inline Fast-Action)
  const [isRujukanModalOpen, setIsRujukanModalOpen] = useState(false);
  const [selectedStudentForRujukan, setSelectedStudentForRujukan] = useState<AtRiskStudentItem | null>(null);
  const [rujukanForm, setRujukanForm] = useState({
    alasan: '',
    urgensi: 'TINGGI' as 'TINGGI' | 'SEDANG' | 'RENDAH',
    catatanAwal: '',
  });

  // Query EWS Siswa At-Risk Rombel (High-Performance Cache)
  const { data: ewsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['walas-ews-deteksi-dini', kelasId],
    queryFn: () => getEwsPerKelasList(kelasId),
    enabled: Boolean(kelasId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Resolve list of at-risk students
  const rawStudents: AtRiskStudentItem[] = useMemo(() => {
    const raw = Array.isArray(ewsData?.data) ? ewsData.data : (Array.isArray(ewsData) ? ewsData : []);
    if (raw.length > 0) {
      return raw.map((item: any) => ({
        id: item.siswa_id || item.id,
        nama: item.nama_siswa || item.nama || 'Siswa',
        nis: item.nis || '-',
        persentase: item.persentase_kehadiran || item.persentase || 80,
        alfaCount: item.total_alfa || item.alfaCount || 3,
        statusHariIni: item.status_hari_ini || 'BELUM_ADA',
        rekomendasi: item.rekomendasi_tindak_lanjut || 'Perlu bimbingan wali kelas & koordinasi BP/BK',
        kategoriRisk: item.kategori_risk || item.kategoriRisk || 'TINGGI',
      }));
    }
    // Fallback ke data agregator walas jika ada
    if (data?.earlyWarningAlerts && data.earlyWarningAlerts.length > 0) {
      return data.earlyWarningAlerts.map((a) => ({
        id: a.siswaId,
        nama: a.nama,
        nis: '-',
        persentase: 75,
        alfaCount: a.alfaCount,
        statusHariIni: 'BELUM_ADA',
        rekomendasi: a.rekomendasi,
        kategoriRisk: a.kategoriRisk || 'TINGGI',
      }));
    }
    return [];
  }, [ewsData, data]);

  // Filtered students by search & severity
  const filteredStudents = useMemo(() => {
    return rawStudents.filter((s) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);
      
      const isHigh = s.persentase < 75 || s.alfaCount >= 3;
      if (riskFilter === 'HIGH') return matchSearch && isHigh;
      if (riskFilter === 'MEDIUM') return matchSearch && !isHigh;
      return matchSearch;
    });
  }, [rawStudents, searchTerm, riskFilter]);

  // Statistik Ringkas Deteksi Dini
  const stats = useMemo(() => {
    const total = rawStudents.length;
    const critical = rawStudents.filter((s) => s.persentase < 75 || s.alfaCount >= 3).length;
    const totalAlfa = rawStudents.reduce((acc, curr) => acc + curr.alfaCount, 0);
    const avgPct = total > 0 ? Math.round(rawStudents.reduce((acc, curr) => acc + curr.persentase, 0) / total) : 100;
    return { total, critical, totalAlfa, avgPct };
  }, [rawStudents]);

  // Mini Status Items untuk Mobile 1-Baris Hairline Strip (< sm / isMobile) ala Shopee-Grade
  const miniStatusItems: HubStatusItem[] = useMemo(() => [
    {
      id: 'total',
      title: `${stats.total} Siswa`,
      subtitle: 'Butuh Perhatian',
      className: stats.total > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : undefined,
    },
    {
      id: 'kritis',
      title: `${stats.critical} Kritis`,
      subtitle: 'Alpa ≥ 3x',
      className: stats.critical > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : undefined,
    },
    {
      id: 'alfa',
      title: `${stats.totalAlfa} Alpa`,
      subtitle: 'Total Akumulasi',
      className: stats.totalAlfa > 0 ? 'text-slate-800 dark:text-slate-200 font-bold' : undefined,
    },
    {
      id: 'avg',
      title: `${stats.avgPct}%`,
      subtitle: 'Rata-rata At-Risk',
      className: 'text-indigo-600 dark:text-indigo-400 font-bold',
    },
  ], [stats]);

  // Mutasi Kirim Rujukan ke BP/BK
  const rujukanMutation = useMutation({
    mutationFn: (payload: {
      siswa_id: string;
      alasan: string;
      kategori: string;
      urgensi: string;
      catatan_awal?: string;
    }) => bpbkApi.createRujukan(payload),
    onSuccess: () => {
      toast.success('Rujukan siswa berhasil dikirim ke Tim BP/BK');
      setIsRujukanModalOpen(false);
      setSelectedStudentForRujukan(null);
      setRujukanForm({ alasan: '', urgensi: 'TINGGI', catatanAwal: '' });
      queryClient.invalidateQueries({ queryKey: ['walas-ews-deteksi-dini'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mengirim rujukan ke BP/BK');
    },
  });

  const handleOpenRujukan = (siswa: AtRiskStudentItem) => {
    if (onOpenRujukanModal) {
      onOpenRujukanModal(siswa);
      return;
    }
    setSelectedStudentForRujukan(siswa);
    setRujukanForm({
      alasan: `Tingkat kehadiran rendah (${siswa.persentase}%) dengan akumulasi ${siswa.alfaCount}x Alpa.`,
      urgensi: siswa.alfaCount >= 3 ? 'TINGGI' : 'SEDANG',
      catatanAwal: siswa.rekomendasi,
    });
    setIsRujukanModalOpen(true);
  };

  const handleSubmitRujukan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForRujukan) return;
    if (!rujukanForm.alasan.trim()) {
      toast.error('Mohon isi alasan rujukan');
      return;
    }
    rujukanMutation.mutate({
      siswa_id: selectedStudentForRujukan.id,
      alasan: rujukanForm.alasan.trim(),
      kategori: 'KEHADIRAN',
      urgensi: rujukanForm.urgensi,
      catatan_awal: rujukanForm.catatanAwal.trim(),
    });
  };

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 pb-28 sm:pb-8">
      {/* ── HEADER IDENTITAS TAB ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Deteksi Dini & Peringatan Kehadiran Siswa</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900 shrink-0">
              {rawStudents.length} Siswa At-Risk
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Sistem Pemantauan Intervensi Dini (EWS) bagi peserta didik di <strong>Kelas {kelasNama}</strong> yang berada di bawah ambang batas kehadiran aman (85%).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 px-3 text-xs font-semibold gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin text-primary')} />
          <span>Segarkan Data</span>
        </Button>
      </div>

      {/* ── METRIK RINGKASAN: SHOPEE-GRADE HUBSTATUSSTRIP (MOBILE) VS 4 CARDS (DESKTOP) ── */}
      {isMobile ? (
        <div className="mb-2">
          <HubStatusStrip items={miniStatusItems} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <AnalyticsCard
            title="Siswa Butuh Perhatian"
            value={`${stats.total} Siswa`}
            icon={<ShieldAlert className="w-4 h-4" />}
            gradient="from-rose-600 to-rose-700"
            variant="compact-premium"
            compact={true}
          />
          <AnalyticsCard
            title="Status Kritis (Alpa ≥ 3)"
            value={`${stats.critical} Siswa`}
            icon={<AlertTriangle className="w-4 h-4" />}
            gradient="from-amber-500 to-amber-600"
            variant="compact-premium"
            compact={true}
          />
          <AnalyticsCard
            title="Total Alpa Akumulasi"
            value={`${stats.totalAlfa} Alpa`}
            icon={<Clock className="w-4 h-4" />}
            gradient="from-slate-700 to-slate-900"
            variant="compact-premium"
            compact={true}
          />
          <AnalyticsCard
            title="Rata-rata Kehadiran"
            value={`${stats.avgPct}%`}
            icon={<Activity className="w-4 h-4" />}
            gradient="from-indigo-600 to-indigo-700"
            variant="compact-premium"
            compact={true}
          />
        </div>
      )}

      {/* ── TOOLBAR PENCARIAN & FILTER SEVERITAS ── */}
      <Card noPadding className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Input Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama siswa atau NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Segmented Filter Risiko */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setRiskFilter('ALL')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                riskFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Semua ({rawStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter('HIGH')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                riskFilter === 'HIGH'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
              )}
            >
              Kritis ({stats.critical})
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter('MEDIUM')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                riskFilter === 'MEDIUM'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
              )}
            >
              Waspada ({stats.total - stats.critical})
            </button>
          </div>
        </div>
      </Card>

      {/* ── KONTEN DAFTAR SISWA BUTUH PERHATIAN ── */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <Loader size="lg" />
          <span className="text-xs text-slate-400">Menganalisis indikator deteksi dini rombel...</span>
        </div>
      ) : rawStudents.length === 0 ? (
        /* KONDISI PRIMA (0 SISWA AT-RISK) */
        <Card noPadding className="p-8 sm:p-12 text-center rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Kondisi Kelas Prima &amp; Terkendali
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tidak ada peserta didik di <strong>Kelas {kelasNama}</strong> yang memiliki kehadiran di bawah batas minimum (85%) atau memiliki akumulasi alpa beruntun. Seluruh siswa berada dalam batas aman.
            </p>
          </div>
        </Card>
      ) : filteredStudents.length === 0 ? (
        /* TIDAK DITEMUKAN PENCARIAN */
        <Card noPadding className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs text-slate-400">Tidak ada siswa yang sesuai dengan filter pencarian.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* ── TAMPILAN MOBILE: KARTU SISWA AT-RISK SHOPEE-GRADE (0 HORIZONTAL SCROLL) ── */}
          <div className="block sm:hidden space-y-3">
            {filteredStudents.map((siswa) => {
              const isCritical = siswa.persentase < 75 || siswa.alfaCount >= 3;
              return (
                <div
                  key={siswa.id}
                  className={cn(
                    'p-3.5 rounded-2xl border bg-white dark:bg-slate-900 space-y-2.5 shadow-2xs transition-all',
                    isCritical
                      ? 'border-rose-200/90 dark:border-rose-900/70'
                      : 'border-amber-200/90 dark:border-amber-900/70'
                  )}
                >
                  {/* Header Siswa & Indikator */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block truncate">
                        {siswa.nama}
                      </span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono block">
                        NIS: {siswa.nis}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold',
                          siswa.persentase < 75
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200'
                        )}
                      >
                        {siswa.persentase}% Hadir
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200">
                        {siswa.alfaCount} Alpa
                      </span>
                    </div>
                  </div>

                  {/* Box Rekomendasi */}
                  <div className="flex items-start gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block text-[10px] uppercase tracking-wider">
                        Rekomendasi Tindak Lanjut:
                      </span>
                      <span>{siswa.rekomendasi}</span>
                    </div>
                  </div>

                  {/* Tombol Aksi Grid 2 Kolom Ramah Sentuhan */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setTrackingTarget({
                          isOpen: true,
                          siswaId: siswa.id,
                          siswaNama: siswa.nama,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100 cursor-pointer active:scale-98 transition-all"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Tracking</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenRujukan(siswa)}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/80 hover:bg-rose-100 cursor-pointer active:scale-98 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Rujuk BP/BK</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── TAMPILAN DESKTOP: TABEL LENGKAP & TERSTRUKTUR ── */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3.5 w-12 text-center">No</th>
                  <th className="py-3 px-4 min-w-[200px]">Nama Peserta Didik</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">NIS</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Tingkat Kehadiran</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Akumulasi Alpa</th>
                  <th className="py-3 px-4 min-w-[240px]">Rekomendasi Tindak Lanjut</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Aksi Penanganan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredStudents.map((siswa, idx) => {
                  const isCritical = siswa.persentase < 75 || siswa.alfaCount >= 3;
                  return (
                    <tr
                      key={siswa.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {siswa.nama}
                        </span>
                        <span className="text-[10.5px] text-slate-400 font-mono">
                          ID: {siswa.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                        {siswa.nis}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] inline-block',
                            isCritical
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          )}
                        >
                          {siswa.persentase}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900 inline-block">
                          {siswa.alfaCount} Alpa
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 leading-snug">
                        {siswa.rekomendasi}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tombol Tracking Standar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setTrackingTarget({
                                isOpen: true,
                                siswaId: siswa.id,
                                siswaNama: siswa.nama,
                              })
                            }
                            className="h-7.5 px-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                            title={`Linimasa tracking presensi ${siswa.nama}`}
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Tracking</span>
                            <ArrowUpRight className="w-3 h-3 opacity-60" />
                          </Button>

                          {/* Tombol Rujuk ke BP/BK */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRujukan(siswa)}
                            className="h-7.5 px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                            title={`Buat rujukan kasus ke Tim BP/BK`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Rujuk BP/BK</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL TRACKING SISWA RESMI (STANDAR ABSENTA) - Lazy Mounted ── */}
      {trackingTarget.isOpen && (
        <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
          <TrackingSiswaModal
            isOpen={trackingTarget.isOpen}
            onClose={() => setTrackingTarget({ isOpen: false, siswaId: '', siswaNama: '' })}
            siswaId={trackingTarget.siswaId}
            siswaNama={trackingTarget.siswaNama}
            kelasId={kelasId}
            kelasNama={kelasNama}
            tahunPelajaranId={data?.academicContext?.selectedTahunPelajaranId}
            semesterId={data?.academicContext?.selectedSemesterId}
          />
        </Suspense>
      )}

      {/* ── MODAL RUJUKAN KE BP/BK INLINE FAST-ACTION ── */}
      {isRujukanModalOpen && selectedStudentForRujukan && (
        <Modal
          isOpen={isRujukanModalOpen}
          onClose={() => setIsRujukanModalOpen(false)}
          title={`Rujuk Siswa ke BP/BK — ${selectedStudentForRujukan.nama}`}
          size="lg"
        >
          <form onSubmit={handleSubmitRujukan} className="p-4 sm:p-5 space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-200">
                Data Terdeteksi Sistem EWS:
              </div>
              <div className="text-amber-800 dark:text-amber-300">
                Peserta didik memiliki tingkat kehadiran <strong>{selectedStudentForRujukan.persentase}%</strong> dengan akumulasi <strong>{selectedStudentForRujukan.alfaCount} hari alpa</strong>.
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Alasan / Pokok Masalah Rujukan <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rujukanForm.alasan}
                onChange={(e) => setRujukanForm({ ...rujukanForm, alasan: e.target.value })}
                rows={3}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Jelaskan alasan rujukan kasus ke guru BP/BK..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Tingkat Urgensi
              </label>
              <div className="flex items-center gap-2">
                {(['SEDANG', 'TINGGI'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setRujukanForm({ ...rujukanForm, urgensi: lvl })}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                      rujukanForm.urgensi === lvl
                        ? lvl === 'TINGGI'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    )}
                  >
                    {lvl === 'TINGGI' ? 'Urgensi Tinggi (Alpa Beruntun)' : 'Urgensi Sedang'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Catatan Awal / Upaya Wali Kelas Sebelumnya
              </label>
              <input
                type="text"
                value={rujukanForm.catatanAwal}
                onChange={(e) => setRujukanForm({ ...rujukanForm, catatanAwal: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Misal: Sudah dihubungi orang tua via WhatsApp..."
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRujukanModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={rujukanMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
              >
                {rujukanMutation.isPending ? (
                  <span>Mengirim...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Rujukan ke BP/BK</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
});

WalasDeteksiDiniTab.displayName = 'WalasDeteksiDiniTab';
