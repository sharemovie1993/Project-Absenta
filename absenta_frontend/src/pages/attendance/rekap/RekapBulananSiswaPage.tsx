import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { 
  SectionCard, 
  Button, 
  Input, 
  Badge
} from '../../../components/ui';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { dropdownApi, type DropdownOption } from '../../../api/dropdown.api';
import { getRekapBulananSiswa } from '../../../api/attendanceGerbang.api';
import { siswaApi } from '../../../api/academic.api';
import { formatDate } from '@/utils/date.utils';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { 
  RefreshCw, 
  Calendar, 
  User, 
  FileText, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../../components/academic/shared/MobileAcademicList';

const PremiumFeatureGate = lazy(() => import('../../../components/auth/PremiumFeatureGate'));

// Zod Schema Validation Guard (Pilar 25)
const rekapFilterSchema = z.object({
  tahunPelajaranId: z.string().min(1, 'Pilih tahun pelajaran'),
  bulan: z.string().min(1, 'Pilih bulan rekap'),
  siswaId: z.string().min(1, 'Pilih siswa target')
});

interface RekapDetailItem {
  tanggal?: string;
  waktu?: string;
  status?: string;
  keterangan?: string;
  jam_masuk?: string;
}

export const RekapBulananSiswaPage: React.FC = React.memo(() => {
  const { user } = useAuthStore();
  const { can } = useCapabilities();
  
  const [tahunPelajaranId, setTahunPelajaranId] = useState('');
  const [bulan, setBulan] = useState<string>(new Date().toISOString().slice(0, 7));
  const [siswaId, setSiswaId] = useState('');
  
  const canView = useMemo(() => can('attendance.reports.view'), [can]);
  const isSiswa = Boolean(user?.isStudent || user?.role?.name?.toLowerCase() === 'siswa');

  // Dropdowns Query
  const { data: dropdownsData } = useQuery({
    queryKey: ['rekap-bulanan-siswa-dropdowns', isSiswa, user?.id],
    queryFn: async () => {
      const [opsi, active, siswaRes] = await Promise.all([
        dropdownApi.getTahunPelajaranForDropdown().catch(() => []),
        dropdownApi.getActiveTahunPelajaran().catch(() => null),
        siswaApi.getAll({ limit: 1000 }).catch(() => ({ data: [] }))
      ]);

      const initialTahunId = active?.id || (opsi[0]?.value as string) || '';
      if (!tahunPelajaranId && initialTahunId) {
        setTahunPelajaranId(initialTahunId);
      }

      let sOpts: DropdownOption[] = [];
      let autoSiswaId = '';

      if (isSiswa && user?.id) {
        const found = ((siswaRes.data || []) as Array<{ id: string; user_id?: string; nama_siswa: string }>).find(s => s.user_id === user.id);
        if (found) {
          sOpts = [{ value: found.id, label: found.nama_siswa }];
          autoSiswaId = found.id;
        }
      } else {
        sOpts = ((siswaRes.data || []) as Array<{ id: string; nama_siswa: string }>)?.map(s => ({
          value: s.id,
          label: s.nama_siswa
        }));
      }

      if (!siswaId && autoSiswaId) {
        setSiswaId(autoSiswaId);
      }

      return {
        tahunOptions: opsi as DropdownOption[],
        siswaOptions: sOpts
      };
    },
    staleTime: 5 * 60 * 1000
  });

  const tahunOptions = dropdownsData?.tahunOptions || [];
  const siswaOptions = dropdownsData?.siswaOptions || [];

  // Rekap Data Query
  const { data: rekapData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['rekap-bulanan-siswa-data', tahunPelajaranId, bulan, siswaId],
    queryFn: async () => {
      const parsed = rekapFilterSchema.safeParse({ tahunPelajaranId, bulan, siswaId });
      if (!parsed.success) {
        return null;
      }
      const [tahun, bln] = bulan.split('-');
      const res = await getRekapBulananSiswa({
        tahun_pelajaran_id: tahunPelajaranId,
        bulan: parseInt(bln, 10),
        tahun: parseInt(tahun, 10),
        siswa_id: siswaId
      });
      return res.data;
    },
    enabled: Boolean(tahunPelajaranId && bulan && siswaId)
  });

  const stats = rekapData?.statistik || rekapData?.summary || {};
  const details: RekapDetailItem[] = rekapData?.detail || [];

  const isMobile = useIsMobile();

  const renderMobileCard = useCallback((item: RekapDetailItem, idx: number) => {
    const status = String(item.status || '').toUpperCase();
    const isHadir = status === 'HADIR';
    const isTerlambat = status === 'TERLAMBAT';
    const isIzinSakit = status === 'IZIN' || status === 'SAKIT';

    return (
      <div
        key={idx}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {item.tanggal ? formatDate(new Date(item.tanggal)) : '-'}
            </span>
          </div>
          <Badge
            variant={
              isHadir
                ? 'success'
                : isTerlambat
                ? 'warning'
                : isIzinSakit
                ? 'info'
                : 'danger'
            }
            className="font-bold text-[10px]"
          >
            {status || 'ALPA'}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Jam Masuk: {item.jam_masuk || item.waktu || '-'}</span>
          </div>
          {item.keterangan && (
            <span className="text-[10px] text-slate-400 font-semibold italic">
              {item.keterangan}
            </span>
          )}
        </div>
      </div>
    );
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const headerStats = useMemo(() => [
    {
      title: 'Hadir Tepat Waktu',
      value: stats.HADIR || 0,
      icon: <CheckCircle2 size={16} className="text-white" />,
      gradient: 'from-emerald-600 to-teal-800',
      subtitle: 'Presensi normal'
    },
    {
      title: 'Terlambat',
      value: stats.TERLAMBAT || 0,
      icon: <Clock size={16} className="text-white" />,
      gradient: 'from-amber-600 to-orange-800',
      subtitle: 'Melewati batas masuk'
    },
    {
      title: 'Izin / Sakit',
      value: (stats.IZIN || 0) + (stats.SAKIT || 0),
      icon: <Calendar size={16} className="text-white" />,
      gradient: 'from-blue-600 to-indigo-800',
      subtitle: 'Terkonfirmasi surat'
    },
    {
      title: 'Alpa (Tanpa Ket.)',
      value: stats.ALPA || 0,
      icon: <XCircle size={16} className="text-white" />,
      gradient: 'from-rose-600 to-red-800',
      subtitle: 'Tidak ada keterangan'
    }
  ], [stats]);

  const breadcrumbs = useMemo(() => [
    { label: 'Presensi & Kehadiran' },
    { label: 'Rekapitulasi Bulanan Siswa' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Rekap Bulanan Siswa',
    description: 'Pilih tahun pelajaran, bulan kalender, dan nama siswa untuk memantau ringkasan serta detail presensi harian.',
    items: [
      { text: 'Filter periode bulan dan nama siswa yang ingin dievaluasi.' },
      { text: 'Gunakan tombol Cetak Laporan untuk mencetak berkas rekap presensi resmi.' },
      { text: 'Statistik merangkum akumulasi Hadir, Terlambat, Izin, Sakit, dan Alpa.' }
    ]
  }), []);

  return (
    <InfraErrorBoundary>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat...</div>}>
        <PremiumFeatureGate
          moduleName="ABSENSI"
          featureName="Rekapitulasi Presensi Bulanan"
          description="Pantau akumulasi kehadiran bulanan setiap siswa dengan rincian harian lengkap."
        >
          <AcademicPageLayout
            title="Rekapitulasi Presensi Bulanan Siswa"
            description="Ringkasan kehadiran & kedisiplinan siswa per periode bulan."
            breadcrumbs={breadcrumbs}
            instruction={instruction}
            hardeningModuleKey="attendance_rekap_bulanan_siswa"
            stats={headerStats}
          >
            <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
              <div className="space-y-6 w-full min-w-0 max-w-full">
                {/* Filter Panel */}
                <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 w-full min-w-0 max-w-full">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Parameter Rekapitulasi Presensi
                    </h4>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="toolbarOutline"
                        size="toolbar"
                        onClick={() => refetch()}
                        disabled={isLoading || isRefetching}
                        className="rounded-xl"
                      >
                        <RefreshCw size={12} className={`mr-1 ${isLoading || isRefetching ? 'animate-spin' : ''}`} /> Segarkan
                      </Button>
                      <Button
                        type="button"
                        variant="toolbarPrimary"
                        size="toolbar"
                        onClick={handlePrint}
                        disabled={!rekapData || details.length === 0}
                        className="rounded-xl font-bold"
                      >
                        <Printer size={12} className="mr-1" /> Cetak Rekap
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="filter-tahun" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tahun Pelajaran <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        id="filter-tahun"
                        aria-label="Pilih Tahun Pelajaran"
                        options={tahunOptions}
                        value={tahunPelajaranId}
                        onChange={setTahunPelajaranId}
                        placeholder="Pilih Tahun..."
                      />
                    </div>

                    <div>
                      <label htmlFor="filter-bulan" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Bulan & Tahun <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="filter-bulan"
                        aria-label="Pilih Bulan Rekap"
                        type="month"
                        value={bulan}
                        onChange={(e) => setBulan(e.target.value)}
                        className="rounded-xl h-10 text-xs"
                      />
                    </div>

                    <div>
                      <label htmlFor="filter-siswa" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nama Siswa <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        id="filter-siswa"
                        aria-label="Pilih Nama Siswa"
                        options={siswaOptions}
                        value={siswaId}
                        onChange={setSiswaId}
                        placeholder="Cari nama siswa..."
                        disabled={isSiswa}
                      />
                    </div>
                  </div>
                </div>

                {/* Data Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden w-full min-w-0 max-w-full">
                  {isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                      <p className="text-xs font-bold">Memuat data rekapitulasi siswa...</p>
                    </div>
                  ) : !siswaId ? (
                    <div className="p-16 text-center text-slate-400 space-y-2">
                      <User className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                      <p className="text-xs font-bold">Silakan pilih siswa target untuk menampilkan data rekap.</p>
                    </div>
                  ) : details.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 space-y-2">
                      <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                      <p className="text-xs font-bold">Belum ada catatan presensi pada bulan ini.</p>
                    </div>
                  ) : isMobile ? (
                    <div className="p-4 space-y-4">
                      <MobileAcademicList
                        title="Rincian Presensi Harian Bulan Ini"
                        data={details}
                        loading={isLoading}
                        totalItems={details.length}
                        emptyMessage="Belum ada catatan presensi pada bulan ini."
                        renderCard={renderMobileCard}
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full min-w-0 max-w-full">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4 w-12 text-center">No</th>
                            <th className="py-3 px-4">Tanggal</th>
                            <th className="py-3 px-4">Jam Masuk</th>
                            <th className="py-3 px-4">Status Presensi</th>
                            <th className="py-3 px-4">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {details?.map((item, idx) => {
                            const status = String(item.status || '').toUpperCase();
                            const isHadir = status === 'HADIR';
                            const isTerlambat = status === 'TERLAMBAT';
                            const isIzinSakit = status === 'IZIN' || status === 'SAKIT';

                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                                <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                  {item.tanggal ? formatDate(new Date(item.tanggal)) : '-'}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                                  {item.jam_masuk || item.waktu || '-'}
                                </td>
                                <td className="py-3 px-4">
                                  <Badge
                                    variant={
                                      isHadir
                                        ? 'success'
                                        : isTerlambat
                                        ? 'warning'
                                        : isIzinSakit
                                        ? 'info'
                                        : 'danger'
                                    }
                                    className="font-bold text-[10px]"
                                  >
                                    {status || 'ALPA'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                                  {item.keterangan || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          </AcademicPageLayout>
        </PremiumFeatureGate>
      </Suspense>
    </InfraErrorBoundary>
  );
});

export default RekapBulananSiswaPage;
