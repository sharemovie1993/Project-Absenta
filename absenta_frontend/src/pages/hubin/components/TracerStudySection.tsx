import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi, type HubinTracerStudy } from '../../../api/hubin.api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { AnalyticsCard } from '../../../components/ui/AnalyticsCard';
import { formatDate } from '../../../utils/layoutUtils';
import { exportDataToExcel, type ExcelColumnConfig } from '../../../utils/export.utils';
import { useJurusanOptions } from '../../../hooks/useJurusanOptions';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { TracerFormSubfields } from './tracer/TracerFormSubfields';
import { 
  GraduationCap, 
  Search, 
  MapPin, 
  Calendar, 
  Building, 
  BookOpen, 
  Store, 
  Clipboard,
  CheckCircle2,
  TrendingUp,
  FileWarning,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../../components/academic/shared/MobileAcademicList';

// Zod validation schema for Tracer Study Alumni Survey (Pillar 25)
const tracerSurveySchema = z.object({
  tahun_lulus: z.number().min(2000, 'Tahun kelulusan tidak valid'),
  status_alumni: z.enum(['BEKERJA', 'KULIAH', 'WIRAUSAHA', 'MENCARI_KERJA']),
  perusahaan_nama: z.string().optional(),
  posisi: z.string().optional(),
  gaji_estimasi: z.string().optional(),
  universitas_nama: z.string().optional(),
  program_studi: z.string().optional(),
  usaha_nama: z.string().optional(),
  usaha_bidang: z.string().optional(),
  keselarasan: z.string().optional(),
  masa_tunggu: z.string().optional(),
  no_wa: z.string().optional(),
});

export const TracerStudySection: React.FC = React.memo(() => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterJurusan, setFilterJurusan] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);

  // Hook Jurusan terpusat
  const { options: rawJurusanOptions } = useJurusanOptions();
  const jurusanOptions = useMemo(() => [
    { value: 'ALL', label: 'Semua Jurusan' },
    ...(rawJurusanOptions || [])
  ], [rawJurusanOptions]);

  // Survey Form State
  const [tahunLulus, setTahunLulus] = useState(new Date().getFullYear());
  const [statusAlumni, setStatusAlumni] = useState<'BEKERJA' | 'KULIAH' | 'WIRAUSAHA' | 'MENCARI_KERJA'>('BEKERJA');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [gaji, setGaji] = useState('');
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [usahaNama, setUsahaNama] = useState('');
  const [usahaBidang, setUsahaBidang] = useState('');
  const [keselarasan, setKeselarasan] = useState('');
  const [masaTunggu, setMasaTunggu] = useState('');
  const [noWa, setNoWa] = useState('');

  const { isHubin: isHubinRole, isBkk, isAdmin, can } = useCapabilities();
  const isHubin = useMemo(() => {
    return isAdmin || isHubinRole || isBkk || can('hubin.tracer.view') || can('hubin.bkk.manage') || can('hubin.partners.manage');
  }, [isAdmin, isHubinRole, isBkk, can]);

  // Queries
  const { data: tracerListData, isLoading: loadingTracerList } = useQuery({
    queryKey: ['hubin-tracer-list', { search: searchTerm, tahunLulus: filterYear, statusAlumni: filterStatus, page }],
    queryFn: () => hubinApi.getTracerStudy({ 
      search: searchTerm, 
      tahunLulus: filterYear ? parseInt(filterYear) : undefined, 
      statusAlumni: filterStatus || undefined,
      page,
      limit: 20
    }),
    enabled: isHubin
  });

  const { data: myTracerData, isLoading: loadingMyTracer } = useQuery({
    queryKey: ['my-tracer', user?.id],
    queryFn: () => hubinApi.getTracerStudy({ search: (user as { nis?: string; username: string })?.nis || user?.username, page: 1, limit: 1 }),
    enabled: !isHubin && !!user?.id
  });

  const { data: tracerStatsData } = useQuery({
    queryKey: ['hubin-tracer-stats'],
    queryFn: () => hubinApi.getTracerStats(),
    enabled: isHubin
  });

  // Mutations
  const submitSurveyMutation = useMutation({
    mutationFn: (data: Partial<HubinTracerStudy>) => hubinApi.submitTracerStudy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tracer'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-tracer-list'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-tracer-stats'] });
      toast.success('Kuesioner Tracer Study berhasil disimpan!');
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'Gagal menyimpan data';
      toast.error(errMsg);
    }
  });

  // Populate form if already submitted
  const existingTracer = useMemo(() => {
    const data = myTracerData?.data || [];
    return data.length > 0 ? data[0] : null;
  }, [myTracerData]);

  useEffect(() => {
    if (existingTracer) {
      setTahunLulus(existingTracer.tahun_lulus || new Date().getFullYear());
      setStatusAlumni(existingTracer.status_alumni);
      setCompanyName(existingTracer.perusahaan_nama || '');
      setPosition(existingTracer.posisi || '');
      setGaji(existingTracer.gaji_estimasi || '');
      setUniversity(existingTracer.universitas_nama || '');
      setMajor(existingTracer.program_studi || '');
      setUsahaNama(existingTracer.usaha_nama || '');
      setUsahaBidang(existingTracer.usaha_bidang || '');
      setKeselarasan(existingTracer.keselarasan || '');
      setMasaTunggu(existingTracer.masa_tunggu || '');
      setNoWa(existingTracer.no_wa || '');
    }
  }, [existingTracer]);

  const handleSubmitSurvey = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const surveyPayload: Partial<HubinTracerStudy> = {
      tahun_lulus: tahunLulus,
      status_alumni: statusAlumni,
    };

    if (statusAlumni === 'BEKERJA') {
      surveyPayload.perusahaan_nama = companyName;
      surveyPayload.posisi = position;
      surveyPayload.gaji_estimasi = gaji;
      surveyPayload.keselarasan = keselarasan || undefined;
      surveyPayload.masa_tunggu = masaTunggu || undefined;
    } else if (statusAlumni === 'KULIAH') {
      surveyPayload.universitas_nama = university;
      surveyPayload.program_studi = major;
      surveyPayload.keselarasan = keselarasan || undefined;
      surveyPayload.masa_tunggu = masaTunggu || undefined;
    } else if (statusAlumni === 'WIRAUSAHA') {
      surveyPayload.usaha_nama = usahaNama;
      surveyPayload.usaha_bidang = usahaBidang;
      surveyPayload.keselarasan = keselarasan || undefined;
      surveyPayload.masa_tunggu = masaTunggu || undefined;
    }

    if (noWa) {
      surveyPayload.no_wa = noWa;
    }

    // Safe parse check using Zod Schema (Pillar 25)
    const validation = tracerSurveySchema.safeParse(surveyPayload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    submitSurveyMutation.mutate(surveyPayload);
  }, [tahunLulus, statusAlumni, companyName, position, gaji, university, major, usahaNama, usahaBidang, keselarasan, masaTunggu, noWa, submitSurveyMutation]);

  const listData = useMemo(() => tracerListData?.data || [], [tracerListData]);

  const filteredListData = useMemo(() => {
    if (!filterJurusan || filterJurusan === 'ALL') return listData;
    return listData?.filter((study: HubinTracerStudy) => {
      const s = study.Siswa;
      const jId = s?.jurusan_id || s?.Kelas?.Jurusan?.id || s?.Jurusan?.id;
      const jNama = s?.Kelas?.Jurusan?.nama || s?.Kelas?.Jurusan?.nama_jurusan || s?.Jurusan?.nama || s?.Jurusan?.nama_jurusan;
      return jId === filterJurusan || jNama === filterJurusan;
    });
  }, [listData, filterJurusan]);

  const handleExportExcel = useCallback(() => {
    if (!filteredListData || filteredListData.length === 0) {
      toast.error('Tidak ada data tracer study untuk diekspor');
      return;
    }

    try {
      setIsExporting(true);
      const exportCols: ExcelColumnConfig<HubinTracerStudy>[] = [
        { header: 'No', accessor: (_, idx) => (idx !== undefined ? idx + 1 : 1), width: 6 },
        { header: 'Nama Alumni', accessor: (row) => row.Siswa?.nama_siswa || '-', width: 25 },
        { header: 'NIS', accessor: (row) => row.Siswa?.nis || '-', width: 14 },
        { 
          header: 'Jurusan', 
          accessor: (row) => row.Siswa?.Kelas?.Jurusan?.nama || row.Siswa?.Kelas?.Jurusan?.nama_jurusan || row.Siswa?.Jurusan?.nama || row.Siswa?.Jurusan?.nama_jurusan || '-', 
          width: 22 
        },
        { header: 'Tahun Lulus', accessor: (row) => row.tahun_lulus, width: 12 },
        { header: 'Status Alumni (BMW)', accessor: (row) => row.status_alumni, width: 18 },
        { 
          header: 'Detail Aktivitas', 
          accessor: (row) => {
            if (row.status_alumni === 'BEKERJA') return `${row.posisi || ''} di ${row.perusahaan_nama || ''}`.trim() || '-';
            if (row.status_alumni === 'KULIAH') return `${row.program_studi || ''} di ${row.universitas_nama || ''}`.trim() || '-';
            if (row.status_alumni === 'WIRAUSAHA') return `${row.usaha_nama || ''} (${row.usaha_bidang || ''})`.trim() || '-';
            return 'Mencari Kerja';
          }, 
          width: 34 
        },
        { header: 'Estimasi Gaji', accessor: (row) => row.gaji_estimasi || '-', width: 18 },
        { 
          header: 'Keselarasan Jurusan', 
          accessor: (row) => {
            if (row.keselarasan === 'SANGAT_SESUAI') return 'Sangat Sesuai';
            if (row.keselarasan === 'SESUAI') return 'Cukup Sesuai';
            if (row.keselarasan === 'TIDAK_SESUAI') return 'Tidak Sesuai';
            return row.keselarasan || '-';
          }, 
          width: 20 
        },
        { 
          header: 'Masa Tunggu', 
          accessor: (row) => {
            if (row.masa_tunggu === 'SEBELUM_LULUS') return 'Sebelum Lulus';
            if (row.masa_tunggu === 'KURANG_3_BULAN') return '< 3 Bulan';
            if (row.masa_tunggu === '3_SAMPAI_6_BULAN') return '3 - 6 Bulan';
            if (row.masa_tunggu === 'LEBIH_6_BULAN') return '> 6 Bulan';
            return row.masa_tunggu || '-';
          }, 
          width: 18 
        },
        { header: 'No. WhatsApp', accessor: (row) => row.no_wa || '-', width: 16 },
        { header: 'Tanggal Submit', accessor: (row) => row.created_at ? formatDate(row.created_at, { day: '2-digit', month: 'short', year: 'numeric' }) : '-', width: 16 }
      ];

      const yearLabel = filterYear ? `Angkatan_${filterYear}` : 'Semua_Angkatan';
      exportDataToExcel(filteredListData, exportCols, `Tracer_Study_${yearLabel}_${new Date().toISOString().split('T')[0]}`, 'LAPORAN REKAPITULASI TRACER STUDY ALUMNI');
      toast.success('Data Tracer Study berhasil diekspor ke Excel!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor data';
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  }, [filteredListData, filterYear]);
  const pagination = useMemo(() => tracerListData?.pagination || { total: 0, totalPages: 1 }, [tracerListData]);
  const stats = useMemo(() => tracerStatsData?.data || { BEKERJA: 0, KULIAH: 0, WIRAUSAHA: 0, MENCARI_KERJA: 0 }, [tracerStatsData]);
  const totalStats = useMemo(() => stats.BEKERJA + stats.KULIAH + stats.WIRAUSAHA + stats.MENCARI_KERJA, [stats]);

  const statsList = useMemo(() => {
    return [
      { label: 'Bekerja', val: stats.BEKERJA, icon: Building, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20', barColor: 'bg-emerald-500' },
      { label: 'Kuliah', val: stats.KULIAH, icon: BookOpen, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20', barColor: 'bg-indigo-500' },
      { label: 'Wirausaha', val: stats.WIRAUSAHA, icon: Store, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20', barColor: 'bg-amber-500' },
      { label: 'Belum Bekerja', val: stats.MENCARI_KERJA, icon: Clipboard, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20', barColor: 'bg-rose-500' },
    ];
  }, [stats]);

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const yr = new Date().getFullYear() - i;
      return { value: yr.toString(), label: yr.toString() };
    });
  }, []);

  const statusOptions = useMemo(() => [
    { value: 'BEKERJA', label: 'BEKERJA' },
    { value: 'KULIAH', label: 'KULIAH' },
    { value: 'WIRAUSAHA', label: 'WIRAUSAHA' },
    { value: 'MENCARI_KERJA', label: 'MENCARI KERJA' }
  ], []);

  const statusAlumniOptions = useMemo(() => [
    { value: 'BEKERJA', label: 'BEKERJA (Karyawan / PNS / Kontrak)' },
    { value: 'KULIAH', label: 'KULIAH (Studi Lanjut Perguruan Tinggi)' },
    { value: 'WIRAUSAHA', label: 'WIRAUSAHA (Membuka Usaha Mandiri)' },
    { value: 'MENCARI_KERJA', label: 'BELUM BEKERJA / MENCARI PEKERJAAN' }
  ], []);

  const gajiOptions = useMemo(() => [
    { value: '< 2 Juta', label: '< Rp 2.000.000' },
    { value: '2 Juta - 4 Juta', label: 'Rp 2.000.000 - Rp 4.000.000' },
    { value: '4 Juta - 7 Juta', label: 'Rp 4.000.000 - Rp 7.000.000' },
    { value: '> 7 Juta', label: '> Rp 7.000.000' }
  ], []);

  const isMobile = useIsMobile();

  const renderMobileCard = (study: HubinTracerStudy) => {
    const jurusanNama = study.Siswa?.Kelas?.Jurusan?.singkatan || study.Siswa?.Kelas?.Jurusan?.nama || study.Siswa?.Jurusan?.singkatan || study.Siswa?.Jurusan?.nama;
    return (
      <div
        key={study.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate">
              {study.Siswa?.nama_siswa}
            </h4>
            <p className="text-[10px] font-bold text-slate-400 font-mono">
              NIS: {study.Siswa?.nis || '-'} • Lulus: {study.tahun_lulus} {jurusanNama ? `• ${jurusanNama}` : ''}
            </p>
          </div>
          <Badge
            variant={
              study.status_alumni === 'BEKERJA' ? 'success' :
              study.status_alumni === 'KULIAH' ? 'info' :
              study.status_alumni === 'WIRAUSAHA' ? 'warning' : 'secondary'
            }
            className="font-bold text-[9px] uppercase shrink-0"
          >
            {study.status_alumni}
          </Badge>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Detail Penempatan:</span>
          {study.status_alumni === 'BEKERJA' && (
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {study.posisi} di <strong>{study.perusahaan_nama}</strong>
            </p>
          )}
          {study.status_alumni === 'KULIAH' && (
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {study.program_studi} di <strong>{study.universitas_nama}</strong>
            </p>
          )}
          {study.status_alumni === 'WIRAUSAHA' && (
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Usaha <strong>{study.usaha_nama}</strong> ({study.usaha_bidang})
            </p>
          )}
          {study.status_alumni === 'MENCARI_KERJA' && (
            <p className="text-xs text-slate-400 italic">Mencari Lowongan Kerja</p>
          )}
          {study.keselarasan && (
            <div className="pt-1 text-[10px]">
              <span className="text-slate-400">Keselarasan: </span>
              {study.keselarasan === 'SANGAT_SESUAI' && <span className="text-emerald-600 font-bold">🎯 Sangat Sesuai</span>}
              {study.keselarasan === 'SESUAI' && <span className="text-blue-600 font-bold">✅ Cukup Sesuai</span>}
              {study.keselarasan === 'TIDAK_SESUAI' && <span className="text-amber-600 font-bold">⚠️ Lintas Bidang</span>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          {study.no_wa ? (
            <a
              href={`https://wa.me/${study.no_wa.replace(/\D/g, '').replace(/^0/, '62')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
            >
              <span>📱 WA ({study.no_wa})</span>
            </a>
          ) : (
            <span className="text-slate-400 italic">Tidak ada no. WA</span>
          )}
          <span>Submit: {formatDate(study.created_at || '', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      
      {isHubin ? (
        /* ==================== VIEW STAF HUBIN (Tracer Study Database) ==================== */
        <div className="space-y-6 w-full max-w-full min-w-0">
          
          {/* Header Ringkasan BMW */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 w-full max-w-full min-w-0">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-bold">Indikator Kinerja Serapan Alumni (BMW):</span>
            </div>
            <div className="font-black px-3 py-1 bg-white dark:bg-slate-900 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-2xs border border-indigo-100 dark:border-indigo-900 text-xs">
              Tingkat Serapan BMW: {totalStats > 0 ? Math.round(((stats.BEKERJA + stats.KULIAH + stats.WIRAUSAHA) / totalStats) * 100) : 0}% ({stats.BEKERJA + stats.KULIAH + stats.WIRAUSAHA} dari {totalStats} Alumni)
            </div>
          </div>

          {/* Kartu Statistik Standar AnalyticsCard Compact Premium */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full min-w-0">
            <AnalyticsCard
              title={<><span className="hidden sm:inline">Lulusan </span>Bekerja</>}
              value={stats.BEKERJA}
              subtitle={`${totalStats > 0 ? Math.round((stats.BEKERJA / totalStats) * 100) : 0}% dari total`}
              icon={<Building size={16} />}
              gradient="from-emerald-500 to-teal-600"
              variant="compact-premium"
              mobileCompact
              compact
              onClick={() => setFilterStatus(filterStatus === 'BEKERJA' ? '' : 'BEKERJA')}
              className={filterStatus === 'BEKERJA' ? 'ring-2 ring-emerald-500 shadow-md ring-offset-2' : ''}
            />
            <AnalyticsCard
              title={<><span className="hidden sm:inline">Lanjut </span>Kuliah</>}
              value={stats.KULIAH}
              subtitle={`${totalStats > 0 ? Math.round((stats.KULIAH / totalStats) * 100) : 0}% dari total`}
              icon={<BookOpen size={16} />}
              gradient="from-indigo-600 to-violet-700"
              variant="compact-premium"
              mobileCompact
              compact
              onClick={() => setFilterStatus(filterStatus === 'KULIAH' ? '' : 'KULIAH')}
              className={filterStatus === 'KULIAH' ? 'ring-2 ring-indigo-500 shadow-md ring-offset-2' : ''}
            />
            <AnalyticsCard
              title="Wirausaha"
              value={stats.WIRAUSAHA}
              subtitle={`${totalStats > 0 ? Math.round((stats.WIRAUSAHA / totalStats) * 100) : 0}% dari total`}
              icon={<Store size={16} />}
              gradient="from-amber-500 to-orange-600"
              variant="compact-premium"
              mobileCompact
              compact
              onClick={() => setFilterStatus(filterStatus === 'WIRAUSAHA' ? '' : 'WIRAUSAHA')}
              className={filterStatus === 'WIRAUSAHA' ? 'ring-2 ring-amber-500 shadow-md ring-offset-2' : ''}
            />
            <AnalyticsCard
              title="Belum Bekerja"
              value={stats.MENCARI_KERJA}
              subtitle={`${totalStats > 0 ? Math.round((stats.MENCARI_KERJA / totalStats) * 100) : 0}% dari total`}
              icon={<Clipboard size={16} />}
              gradient="from-rose-500 to-red-600"
              variant="compact-premium"
              mobileCompact
              compact
              onClick={() => setFilterStatus(filterStatus === 'MENCARI_KERJA' ? '' : 'MENCARI_KERJA')}
              className={filterStatus === 'MENCARI_KERJA' ? 'ring-2 ring-rose-500 shadow-md ring-offset-2' : ''}
            />
          </div>

          {/* Filtering & Search Toolbar */}
          <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 w-full max-w-full min-w-0">
            <div className="relative w-full lg:flex-1 max-w-full min-w-0">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari nama alumni, NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs rounded-xl w-full max-w-full min-w-0"
                aria-label="Cari nama alumni"
              />
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full lg:w-auto shrink-0 z-20 max-w-full min-w-0">
              <SearchableSelect
                id="filterYear"
                value={filterYear}
                onValueChange={(val) => setFilterYear(val)}
                options={[{ value: '', label: 'Semua Angkatan' }, ...yearOptions]}
                placeholder="Semua Tahun Lulus"
                className="w-full sm:w-36 max-w-full min-w-0"
              />
              <SearchableSelect
                id="filterJurusan"
                value={filterJurusan}
                onValueChange={(val) => setFilterJurusan(val)}
                options={jurusanOptions}
                placeholder="Semua Jurusan"
                className="w-full sm:w-44 max-w-full min-w-0"
              />
              <SearchableSelect
                id="filterStatus"
                value={filterStatus}
                onValueChange={(val) => setFilterStatus(val)}
                options={[{ value: '', label: 'Semua Status' }, ...statusOptions]}
                placeholder="Semua Status Serapan"
                className="w-full sm:w-40 max-w-full min-w-0"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isExporting || filteredListData.length === 0}
                className="rounded-xl flex items-center gap-1.5 shrink-0 h-10 px-3 text-xs font-bold border-indigo-200 hover:border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30"
                title="Ekspor Data Tracer Study ke Excel"
              >
                {isExporting ? <Loader size="sm" /> : <Download size={14} />}
                <span>Ekspor Excel</span>
              </Button>
            </div>
          </div>

          {/* Tracer Study Database Table / Mobile Cards */}
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 p-5 rounded-2xl shadow-sm w-full max-w-full min-w-0">
            {loadingTracerList ? (
              <div className="py-12 flex justify-center"><Loader /></div>
            ) : isMobile ? (
              <div className="space-y-4 w-full max-w-full min-w-0">
                <MobileAcademicList
                  title="Daftar Alumni"
                  data={filteredListData || []}
                  loading={loadingTracerList}
                  totalItems={filteredListData?.length || 0}
                  emptyMessage="Tidak ada data tracer study ditemukan."
                  renderCard={renderMobileCard}
                />
              </div>
            ) : filteredListData?.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold">
                Tidak ada data tracer study ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto w-full max-w-full min-w-0">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                      <th className="py-3 px-3">Nama Alumni</th>
                      <th className="py-3 px-3">NIS</th>
                      <th className="py-3 px-3">Jurusan</th>
                      <th className="py-3 px-3">Tahun</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Detail Penempatan</th>
                      <th className="py-3 px-3">Keselarasan</th>
                      <th className="py-3 px-3 text-right">Tanggal Submit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredListData?.map((study: HubinTracerStudy) => {
                      const jurusanNama = study.Siswa?.Kelas?.Jurusan?.singkatan || study.Siswa?.Kelas?.Jurusan?.nama || study.Siswa?.Jurusan?.singkatan || study.Siswa?.Jurusan?.nama || '-';
                      return (
                        <tr key={study.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{study.Siswa?.nama_siswa}</td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{study.Siswa?.nis || '-'}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-[11px]">{jurusanNama}</td>
                          <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400">{study.tahun_lulus}</td>
                          <td className="py-3 px-3">
                             <Badge 
                               variant={
                                 study.status_alumni === 'BEKERJA' ? 'success' : 
                                 study.status_alumni === 'KULIAH' ? 'info' : 
                                 study.status_alumni === 'WIRAUSAHA' ? 'warning' : 'secondary'
                               }
                               className="font-bold text-[9px]"
                             >
                              {study.status_alumni}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate">
                            {study.status_alumni === 'BEKERJA' && (
                              <span className="text-slate-600 dark:text-slate-300">{study.posisi} di <strong>{study.perusahaan_nama}</strong></span>
                            )}
                            {study.status_alumni === 'KULIAH' && (
                              <span className="text-slate-600 dark:text-slate-300">{study.program_studi} di <strong>{study.universitas_nama}</strong></span>
                            )}
                            {study.status_alumni === 'WIRAUSAHA' && (
                              <span className="text-slate-600 dark:text-slate-300">Usaha <strong>{study.usaha_nama}</strong> ({study.usaha_bidang})</span>
                            )}
                            {study.status_alumni === 'MENCARI_KERJA' && (
                              <span className="text-slate-400 italic">Mencari Lowongan Kerja</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[11px]">
                            {study.keselarasan === 'SANGAT_SESUAI' && <span className="text-emerald-600 font-bold">🎯 Sangat Sesuai</span>}
                            {study.keselarasan === 'SESUAI' && <span className="text-blue-600 font-bold">✅ Cukup Sesuai</span>}
                            {study.keselarasan === 'TIDAK_SESUAI' && <span className="text-amber-600 font-bold">⚠️ Lintas Bidang</span>}
                            {!study.keselarasan && <span className="text-slate-400">-</span>}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-400">
                             {formatDate(study.created_at || '', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* ==================== VIEW ALUMNI (Questionnaire Form) ==================== */
        <div className="max-w-2xl mx-auto space-y-6 w-full max-w-full min-w-0">
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl shadow-sm w-full max-w-full min-w-0">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
                <GraduationCap size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Kuesioner Tracer Study Lulusan</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Bantu sekolah melakukan pelacakan serapan kerja alumni untuk evaluasi mutu kurikulum & akreditasi.</p>
              </div>
            </div>

            {loadingMyTracer ? (
              <div className="py-12 flex justify-center"><Loader /></div>
            ) : (
              <form onSubmit={handleSubmitSurvey} className="space-y-4 text-xs w-full max-w-full min-w-0">
                
                {existingTracer && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold mb-4">
                    <CheckCircle2 size={16} />
                    Anda sudah mengisi Tracer Study sebelumnya. Anda dapat memperbarui data di bawah ini kapan saja.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="tahunLulus" className="font-bold text-slate-600 dark:text-slate-400">Tahun Kelulusan Anda *</label>
                    <Input 
                      id="tahunLulus"
                      type="number" 
                      value={tahunLulus} 
                      onChange={(e) => setTahunLulus(parseInt(e.target.value))} 
                      min={2000} 
                      max={new Date().getFullYear() + 1}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="statusAlumni" className="font-bold text-slate-600 dark:text-slate-400">Status Serapan Setelah Lulus *</label>
                    <SearchableSelect
                      id="statusAlumni"
                      value={statusAlumni}
                      onValueChange={(val) => setStatusAlumni(val as 'BEKERJA' | 'KULIAH' | 'WIRAUSAHA' | 'MENCARI_KERJA')}
                      options={statusAlumniOptions}
                      placeholder="Pilih Status Serapan"
                    />
                  </div>
                </div>

                <TracerFormSubfields
                  statusAlumni={statusAlumni}
                  companyName={companyName}
                  setCompanyName={setCompanyName}
                  position={position}
                  setPosition={setPosition}
                  gaji={gaji}
                  setGaji={setGaji}
                  gajiOptions={gajiOptions}
                  university={university}
                  setUniversity={setUniversity}
                  major={major}
                  setMajor={setMajor}
                  usahaNama={usahaNama}
                  setUsahaNama={setUsahaNama}
                  usahaBidang={usahaBidang}
                  setUsahaBidang={setUsahaBidang}
                  keselarasan={keselarasan}
                  setKeselarasan={setKeselarasan}
                  masaTunggu={masaTunggu}
                  setMasaTunggu={setMasaTunggu}
                  noWa={noWa}
                  setNoWa={setNoWa}
                />

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={submitSurveyMutation.isPending} className="rounded-xl flex items-center gap-2">
                    {submitSurveyMutation.isPending && <Loader size="sm" />}
                    Simpan Laporan Tracer Study
                  </Button>
                </div>

              </form>
            )}
          </Card>
        </div>
      )}

    </div>
  );
});
