import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
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
import { getRekapHarianSiswa } from '../../../api/attendanceGerbang.api';
import { formatDate } from '../../../utils/layoutUtils';
import { useAuth } from '../../../hooks/useAuth';
import { siswaApi } from '../../../api/academic.api';
import { toLocalDate } from '../../../utils/attendance/time';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';

import { Search, RefreshCw, User, Clock, FileText, Filter } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

const PremiumFeatureGate = lazy(() => import('../../../components/auth/PremiumFeatureGate'));

interface RekapHarianRincianItem {
  waktu?: string;
  keterangan?: string;
  status?: string;
}

interface RekapHarianResponse {
  rincian?: RekapHarianRincianItem[];
  nama_siswa?: string;
  nis?: string;
  tanggal?: string;
  status?: string;
}

interface StudentResponseItem {
  id: string;
  nama_siswa: string;
  user_id?: string;
}

export default function RekapHarianSiswaPage() {
  const { subscription } = useAuthStore();
  const { can, isLoading, user } = useAuth();
  const [tahunOptions, setTahunOptions] = useState<DropdownOption[]>([]);
  const [tahunPelajaranId, setTahunPelajaranId] = useState('');
  const [tanggal, setTanggal] = useState<string>(toLocalDate());
  const [siswaId, setSiswaId] = useState('');
  const [siswaOptions, setSiswaOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RekapHarianResponse | null>(null);
  
  const canView = useMemo(() => can('attendance.reports.view'), [can]);
  const isSiswa = user?.role?.name === 'SISWA';

  const subFeatures = (subscription as unknown as Record<string, unknown>)?.features || 
                      subscription?.Plan?.features_json || 
                      subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  useEffect(() => {
    let isMounted = true;
    const loadDropdowns = async () => {
      const opsi = await dropdownApi.getTahunPelajaranForDropdown();
      if (!isMounted) return;
      setTahunOptions(opsi);
      const active = await dropdownApi.getActiveTahunPelajaran();
      if (!isMounted) return;
      if (active?.id) setTahunPelajaranId(active.id);
      
      if (isSiswa && user?.id) {
        try {
          const resAll = await siswaApi.getAll({ limit: 1000 });
          if (!isMounted) return;
          const myProfile = (resAll.data as StudentResponseItem[])?.find((s) => s.user_id === user.id);
          if (myProfile) {
            setSiswaOptions([{ label: myProfile.nama_siswa, value: myProfile.id }]);
            setSiswaId(myProfile.id);
          }
        } catch (e) {
          console.error("Failed to auto-select siswa", e);
        }
      } else {
        const siswa = await dropdownApi.getSiswaForDropdown();
        if (!isMounted) return;
        setSiswaOptions(siswa);
      }
    };
    loadDropdowns();
    return () => { isMounted = false; };
  }, [isSiswa, user?.id]);

  useEffect(() => {
    if (isSiswa && siswaId && tanggal && tahunPelajaranId) {
       fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siswaId, isSiswa]);

  const fetchData = useCallback(async () => {
    if (isLocked) return;
    if (!siswaId || !tanggal) return;
    setLoading(true);
    try {
      const res = await getRekapHarianSiswa(siswaId, { tanggal, tahun_pelajaran_id: tahunPelajaranId || undefined });
      setData(res.data as RekapHarianResponse);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isLocked, siswaId, tanggal, tahunPelajaranId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  if (!canView) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>Anda tidak memiliki hak untuk melihat halaman ini.</AlertDescription>
      </Alert>
    );
  }

  const columns = useMemo(() => [
    { 
      label: 'Waktu Transaksi', 
      key: 'waktu', 
      sortable: true,
      render: (v: unknown) => (
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {v ? formatDate(String(v), { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}
          </span>
        </div>
      )
    },
    { 
      label: 'Keterangan / Aktivitas', 
      key: 'keterangan',
      sortable: true,
      render: (v: unknown, r: unknown) => {
        const row = r as RekapHarianRincianItem;
        return (
          <span className="text-[11px] font-bold uppercase tracking-tight text-slate-500">
            {v ? String(v) : (row?.status || '-')}
          </span>
        );
      }
    },
    { 
      label: 'Status', 
      key: 'status',
      sortable: true,
      render: (v: unknown) => {
        const statusStr = String(v || '');
        const isHadir = statusStr.toUpperCase().includes('HADIR') || statusStr.toUpperCase().includes('MASUK');
        const isPulang = statusStr.toUpperCase().includes('PULANG');
        return (
          <Badge 
            variant={isHadir ? 'success' : isPulang ? 'info' : 'outline'}
            className="text-[10px] font-black uppercase tracking-widest px-3"
          >
            {statusStr || '-'}
          </Badge>
        );
      }
    }
  ], []);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('waktu');
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
    const list = data?.rincian || [];
    return [...list].sort((a, b) => {
      const aVal = a[sortBy as keyof RekapHarianRincianItem];
      const bVal = b[sortBy as keyof RekapHarianRincianItem];
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
      <SectionCard
        title="Filter Laporan Harian"
        icon={Filter}
        fullWidth
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pilih Siswa</label>
            <SearchableSelect
              value={siswaId}
              onValueChange={setSiswaId}
              options={siswaOptions}
              placeholder="Cari Nama Siswa..."
              searchPlaceholder="Ketik nama siswa..."
              triggerClassName="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold"
              disabled={isSiswa}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tanggal Laporan</label>
            <Input 
              type="date" 
              value={tanggal} 
              onChange={e => setTanggal(e.target.value)} 
              className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tahun Pelajaran</label>
            <SearchableSelect
              value={tahunPelajaranId}
              onValueChange={setTahunPelajaranId}
              options={tahunOptions}
              placeholder="Pilih Tahun..."
              triggerClassName="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold"
            />
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={fetchData} 
            disabled={loading || !siswaId || !tanggal}
            className="h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-widest gap-2 bg-slate-900 dark:bg-blue-600 text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Tampilkan Laporan
          </Button>
        </div>
      </SectionCard>

      {data && (
        <SectionCard
          title="Hasil Rekapitulasi Harian"
          icon={FileText}
          fullWidth
          noPadding
        >
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <User size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{data.nama_siswa}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-slate-200 dark:border-slate-700">NIS: {data.nis || '-'}</Badge>
                    <div className="w-1 h-1 rounded-full bg-slate-300 mx-1" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                      {formatDate(String(data.tanggal), { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Kehadiran</div>
                 <Badge 
                   variant={data.status?.toUpperCase().includes('HADIR') ? 'success' : 'secondary'}
                   className="h-10 px-6 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] shadow-sm"
                 >
                   {data.status || 'BELUM ABSEN'}
                 </Badge>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-950 overflow-hidden">
            <Table
              columns={columns}
              data={paginatedData}
              loading={loading}
              emptyMessage="Tidak ada rincian transaksi absensi untuk tanggal ini."
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
                <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest border-slate-200 dark:border-slate-800">
                  Cetak Rincian
                </Button>
              }
            />
          </div>
        </SectionCard>
      )}
    </div>
  );

  return (
    <AcademicPageLayout
      hardeningModuleKey="rekaphariansiswapage"
      title="Rekap Harian Siswa"
      description="Rincian kehadiran harian siswa beserta status dan waktu pencatatan"
      breadcrumbs={[
        { label: 'Presensi', path: '/attendance' },
        { label: 'Rekap', path: '/attendance/rekap' },
        { label: 'Harian Siswa', path: '/attendance/rekap/siswa-harian' }
      ]}
      instruction={{
        title: "Panduan Rekap Harian",
        description: "Gunakan halaman ini untuk memantau presensi siswa per hari secara spesifik.",
        items: [
          { text: "Pilih tanggal and nama siswa untuk melihat rekap." },
          { text: "Status presensi (Hadir, Izin, Sakit, Alpha) akan ditampilkan beserta jam masuk." }
        ]
      }}
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Loader size="lg" /></div>}>
        <PremiumFeatureGate
          isLocked={isLocked}
          moduleName="ABSENSI"
          featureName="Rekap Presensi Harian"
          description="Dapatkan rincian kehadiran harian siswa secara mendalam, lengkap dengan log waktu dan status kegiatan."
        >
          {pageContent}
        </PremiumFeatureGate>
      </Suspense>
    </AcademicPageLayout>
  );
}
