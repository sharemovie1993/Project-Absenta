import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  SectionCard, 
  Button, 
  Input, 
  Badge, 
  Loader, 
  Alert, 
  AlertDescription,
  Table
} from '../../../components/ui';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { dropdownApi, type DropdownOption } from '../../../api/dropdown.api';
import { getRekapBulananSiswa } from '../../../api/attendanceGerbang.api';
import { siswaApi, kelasApi } from '../../../api/academic.api';
import { formatDate } from '../../../utils/layoutUtils';
import { getTimezone } from '../../../utils/attendance/time';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';

import { 
  Search, 
  RefreshCw, 
  Calendar, 
  User, 
  FileText, 
  Filter, 
  Printer, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertCircle 
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

const PremiumFeatureGate = lazy(() => import('../../../components/auth/PremiumFeatureGate'));

interface RekapDetailItem {
  tanggal?: string;
  waktu?: string;
  status?: string;
  keterangan?: string;
  jam_masuk?: string;
}

interface RekapStatistik {
  HADIR?: number;
  IZIN?: number;
  SAKIT?: number;
  ALPA?: number;
  TERLAMBAT?: number;
}

interface RekapBulananResponse {
  summary?: Record<string, number>;
  detail?: RekapDetailItem[];
  nama_siswa?: string;
  statistik?: RekapStatistik;
}

interface StudentResponseItem {
  id: string;
  nama_siswa: string;
  user_id?: string;
}

export default React.memo(function RekapBulananSiswaPage() {
  const { user, subscription } = useAuthStore();
  const { can } = useCapabilities();
  const [tahunOptions, setTahunOptions] = useState<DropdownOption[]>([]);
  const [tahunPelajaranId, setTahunPelajaranId] = useState('');
  const [bulan, setBulan] = useState<string>(new Date().toISOString().slice(0, 7));
  const [siswaId, setSiswaId] = useState('');
  const [siswaOptions, setSiswaOptions] = useState<DropdownOption[]>([]);
  
  const canView = useMemo(() => can('attendance.reports.view'), [can]);
  const monthDate = useMemo(() => {
    const [y, m] = bulan.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, 15);
  }, [bulan]);
  
  const isSiswa = !!user?.isStudent;

  const subFeatures = (subscription as unknown as Record<string, unknown>)?.features || 
                      subscription?.Plan?.features_json || 
                      subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  // Dropdowns Query
  const dropdownsQuery = useQuery({
    queryKey: ['rekap-bulanan-siswa-dropdowns', isSiswa, user?.id],
    queryFn: async () => {
      const opsi = await dropdownApi.getTahunPelajaranForDropdown();
      const active = await dropdownApi.getActiveTahunPelajaran();
      let sOpts: DropdownOption[] = [];
      let autoSiswaId = '';

      if (isSiswa && user?.id) {
        const res = await siswaApi.getAll({ limit: 1000 });
        const mySiswa = (res.data as StudentResponseItem[])?.find((s) => s.user_id === user.id);
        if (mySiswa) {
          sOpts = [{ label: mySiswa.nama_siswa, value: mySiswa.id }];
          autoSiswaId = mySiswa.id;
        }
      } else {
        sOpts = await dropdownApi.getSiswaForDropdown();
      }

      return {
        tahun: opsi || [],
        activeId: active?.id || '',
        siswaOpts: sOpts,
        autoSiswaId
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (dropdownsQuery.data) {
      setTahunOptions(dropdownsQuery.data.tahun);
      if (dropdownsQuery.data.activeId && !tahunPelajaranId) setTahunPelajaranId(dropdownsQuery.data.activeId);
      setSiswaOptions(dropdownsQuery.data.siswaOpts);
      if (dropdownsQuery.data.autoSiswaId && !siswaId) setSiswaId(dropdownsQuery.data.autoSiswaId);
    }
  }, [dropdownsQuery.data, tahunPelajaranId, siswaId]);

  // Main Rekap Bulanan Siswa Query
  const rekapQuery = useQuery({
    queryKey: ['rekap-bulanan-siswa-data', siswaId, bulan, tahunPelajaranId],
    queryFn: async () => {
      const res = await getRekapBulananSiswa(siswaId, { bulan, tahun_pelajaran_id: tahunPelajaranId || undefined });
      let kNama = '';
      try {
        const siswaRes = await siswaApi.getById(siswaId);
        const kid = (siswaRes.data as { kelas_id?: string })?.kelas_id;
        if (kid) {
          const kRes = await kelasApi.getById(kid);
          kNama = (kRes.data as { nama_kelas?: string })?.nama_kelas || '';
        }
      } catch {}
      return {
        rekap: (res.data as RekapBulananResponse) || null,
        kelasNama: kNama
      };
    },
    enabled: !!siswaId && !!bulan && !isLocked,
    staleTime: 5 * 60 * 1000,
  });

  const data = rekapQuery.data?.rekap || null;
  const kelasNama = rekapQuery.data?.kelasNama || '';
  const loading = rekapQuery.isLoading;

  const openPrintView = useCallback((autoPrint: boolean) => {
    const url = `/print/rekap-bulanan-siswa?siswa_id=${siswaId}&bulan=${bulan}&tahun_pelajaran_id=${tahunPelajaranId || ''}&autoPrint=${autoPrint}`;
    window.open(url, '_blank', 'width=900,height=800');
  }, [siswaId, bulan, tahunPelajaranId]);

  if (!canView) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  const statCards = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Hadir', value: data.summary?.H || data.statistik?.HADIR || 0, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-55 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900/50' },
      { label: 'Izin', value: data.summary?.I || data.statistik?.IZIN || 0, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-100 dark:border-blue-900/50' },
      { label: 'Sakit', value: data.summary?.S || data.statistik?.SAKIT || 0, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-955/30', border: 'border-amber-100 dark:border-amber-900/50' },
      { label: 'Alpha', value: data.summary?.A || data.statistik?.ALPA || 0, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-955/30', border: 'border-rose-100 dark:border-rose-900/50' },
      { label: 'Total', value: (data.summary?.H || data.statistik?.HADIR || 0) + (data.summary?.I || data.statistik?.IZIN || 0) + (data.summary?.S || data.statistik?.SAKIT || 0) + (data.summary?.A || data.statistik?.ALPA || 0), icon: Calendar, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700/50' }
    ];
  }, [data]);

  const columns = useMemo(() => [
    { label: 'Tanggal', key: 'tanggal', sortable: true, render: (v: unknown) => <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300 uppercase tracking-widest">{formatDate(String(v), { dateStyle: 'medium' })}</div> },
    { 
      label: 'Status', 
      key: 'status',
      sortable: true,
      render: (v: unknown) => {
        const statusStr = String(v);
        const variants: Record<string, 'success' | 'info' | 'warning' | 'destructive' | 'default'> = {
          H: 'success', I: 'info', S: 'warning', A: 'destructive'
        };
        const labels: Record<string, string> = {
          H: 'Hadir', I: 'Izin', S: 'Sakit', A: 'Alpha'
        };
        return <Badge variant={variants[statusStr] || 'default'} className="text-[9px] uppercase tracking-widest px-2 py-0.5 font-black">{labels[statusStr] || statusStr || '-'}</Badge>;
      }
    },
    { 
      label: 'Waktu Masuk', 
      key: 'jam_masuk',
      sortable: true,
      render: (v: unknown) => <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{v ? String(v) : '-'}</span>
    },
    { 
      label: 'Keterangan', 
      key: 'keterangan',
      sortable: true,
      render: (v: unknown) => <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{v ? String(v) : '-'}</span>
    }
  ], []);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  const sortedData = useMemo(() => {
    if (!data?.detail || !Array.isArray(data.detail)) return [];
    return [...data.detail].sort((a: RekapDetailItem, b: RekapDetailItem) => {
      const aVal = a[sortBy as keyof RekapDetailItem];
      const bVal = b[sortBy as keyof RekapDetailItem];
      if (aVal === bVal) return 0;
      if (aVal == null) return sortOrder === 'asc' ? 1 : -1;
      if (bVal == null) return sortOrder === 'asc' ? -1 : 1;
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : 1;
      } else {
        return aVal > bVal ? -1 : 1;
      }
    });
  }, [data, sortBy, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedData.slice(start, start + limit);
  }, [sortedData, page, limit]);

  const totalPages = Math.ceil(sortedData.length / limit);

  const pageContent = (
    <div className="space-y-6">
      <SectionCard title="Filter Laporan Bulanan" icon={Filter} fullWidth>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pilih Siswa</label>
            <SearchableSelect value={siswaId} onValueChange={setSiswaId} options={siswaOptions} placeholder="Pilih Siswa" disabled={isSiswa} triggerClassName="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bulan Laporan</label>
            <Input type="month" value={bulan} onChange={e => setBulan(e.target.value)} className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tahun Pelajaran</label>
            <SearchableSelect value={tahunPelajaranId} onValueChange={setTahunPelajaranId} options={tahunOptions} placeholder="Pilih Tahun..." triggerClassName="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold" />
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <Button onClick={fetchData} disabled={loading || !siswaId || !bulan} className="h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-widest gap-2 bg-slate-900 dark:bg-blue-600 text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Tampilkan Rekapitulasi
          </Button>
        </div>
      </SectionCard>

      {data && (
        <div className="space-y-6">
          <SectionCard title="Ringkasan Statistik Bulanan" icon={FileText} fullWidth>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                  <User size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{data.nama_siswa}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5">{kelasNama || 'Kelas N/A'}</Badge>
                    <div className="w-1 h-1 rounded-full bg-slate-300 mx-1" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                      Periode: {formatDate(monthDate, { month: 'long', year: 'numeric', timeZone: getTimezone() })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {(statCards || [])?.map((stat, i) => (
                <div key={i} className={`p-5 rounded-2xl border ${stat.border} ${stat.bg} transition-all hover:scale-[1.03]`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg bg-white dark:bg-slate-900 ${stat.color} shadow-sm`}>
                      <stat.icon size={16} />
                    </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</div>
                  <div className={`text-3xl font-black tracking-tight ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Rincian Kehadiran" icon={Calendar} fullWidth noPadding>
            <div className="bg-white dark:bg-slate-950 overflow-hidden rounded-b-[2rem]">
              <Table
                columns={columns}
                data={paginatedData}
                loading={loading}
                emptyMessage="Tidak ada rincian data untuk bulan ini."
                compact={true}
                className="border-none"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                pagination={{
                  currentPage: page,
                  itemsPerPage: limit,
                  totalItems: sortedData.length,
                  totalPages,
                  onPageChange: setPage,
                  onLimitChange: setLimit
                }}
                toolbarRight={
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openPrintView(false)} className="rounded-xl border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-widest h-10 px-4">
                      <Search className="w-3.5 h-3.5 mr-2" /> Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openPrintView(true)} className="rounded-xl border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-widest h-10 px-4">
                      <Printer className="w-3.5 h-3.5 mr-2" /> Cetak
                    </Button>
                  </div>
                }
              />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );

  return (
    <AcademicPageLayout
      hardeningModuleKey="rekapbulanansiswapage"
      title="Rekap Bulanan Siswa"
      description="Visualisasikan kehadiran siswa dalam format kalender bulanan yang interaktif"
      breadcrumbs={[
        { label: 'Presensi', path: '/attendance' },
        { label: 'Rekap', path: '/attendance/rekap' },
        { label: 'Bulanan Siswa', path: '/attendance/rekap/siswa-bulanan' }
      ]}
      instruction={{
        title: "Panduan Rekap Bulanan",
        description: "Gunakan halaman ini untuk memantau rekap presensi siswa per bulan.",
        items: [
          { text: "Pilih bulan, tahun ajaran, dan nama siswa." },
          { text: "Statistik kehadiran (Hadir, Izin, Sakit, Alpha) akan terakumulasi otomatis." },
          { text: "Anda dapat mencetak laporan menggunakan tombol Cetak." }
        ]
      }}
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Loader size="lg" /></div>}>
        <PremiumFeatureGate
          isLocked={isLocked}
          moduleName="ABSENSI"
          featureName="Rekap Presensi Bulanan"
          description="Visualisasikan kehadiran siswa dalam format kalender bulanan yang interaktif dan mudah dianalisis."
        >
          {pageContent}
        </PremiumFeatureGate>
      </Suspense>
    </AcademicPageLayout>
  );
});
