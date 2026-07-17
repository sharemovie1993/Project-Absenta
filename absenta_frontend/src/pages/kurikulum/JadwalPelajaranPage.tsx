import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useGerbangModeAndRole } from '../../hooks/attendance/useGerbangModeAndRole';
import { 
  Loader,
  Button,
  SectionCard
} from '../../components/ui';
import { 
  FileStack, 
  Clock,
  LayoutGrid,
  List,
  Printer,
  Paintbrush
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { getJadwalTemplate, deleteJadwalTemplate, type JadwalTemplate } from '../../api/attendance/jadwalTemplate.api';
import { getTahunPelajaranList } from '../../api/academic/tahunPelajaran.api';
import { getSemesterList } from '../../api/academic/semester.api';
import { LogService } from '../../utils/LogService';
import useConfirm from '../../hooks/useConfirm';
import { toast } from 'sonner';

// Built-in PDF and API Imports
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { getMyTenant } from '../../api/tenants.api';
import { sekolahApi } from '../../api/academic/sekolah.api';
import { getStrukturList } from '../../api/academic/strukturOrganisasi.api';
import { getBase64ImageFromUrl } from '../../utils/cooperative/coopDocUtils';
import { jenisKegiatanMasterApi } from '../../api/academic/jenisKegiatanMaster.api';
import { getKelasList } from '../../api/academic/kelas.api';
import { getGuruList } from '../../api/academic/guru.api';

// ── Pillar 5: Lazy Loading ──────────────────────────────────────────────────
const JadwalTplList = lazy(() => import('../../components/attendance/jadwal-template/JadwalTemplateList').then(m => ({ default: m.JadwalTemplateList })));
const JadwalGrid = lazy(() => import('../../components/kurikulum/JadwalGrid').then(m => ({ default: m.JadwalGrid })));
const JadwalBuilder = lazy(() => import('../../components/kurikulum/JadwalBuilder').then(m => ({ default: m.JadwalBuilder })));

const hardeningModuleKey = 'jadwal_pelajaran_page';

export default function JadwalPelajaranPage() {
  const { subscription } = useAuthStore();
  const { user, isLoading, can } = useAuth();
  const [searchParams] = useSearchParams();
  const confirm = useConfirm();
  
  // ── 1. Role & Capability Detection ──────────────────────────────────────────
  const roleName = user?.role?.name || '';
  const isSiswa = roleName === 'SISWA';
  const isGuru = roleName === 'GURU';
  const myGuruId = user?.guru_profile?.id;
  const myKelasId = (user?.guru_profile as { wali_kelas_di?: { id: string } })?.wali_kelas_di?.id;
  const isWaliKelas = !!myKelasId;

  const canManage = can('attendance.schedules.create') || can('attendance.schedules.update') || can('attendance.schedules.delete');
  
  // ── 2. View State Logic ─────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'builder'>(isGuru ? 'grid' : 'list');

  // ── 3. Shared Data State (for Grid View) ────────────────────────────────────
  const [jadwal, setJadwal] = useState<JadwalTemplate[]>([]);
  const [loadingJadwal, setLoadingJadwal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedKelasId, setSelectedKelasId] = useState<string>(searchParams.get('kelas_id') || '');
  const [selectedTahunId, setSelectedTahunId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [selectedGuruId, setSelectedGuruId] = useState<string>(searchParams.get('guru_id') || (isGuru ? (myGuruId || '') : ''));

  // Logic: Auto-switch filters based on View Mode for Dual-Role (Guru + Walas)
  React.useEffect(() => {
    if (isGuru && isWaliKelas) {
      if (viewMode === 'grid') {
        setSelectedGuruId(myGuruId || '');
        setSelectedKelasId('');
      } else {
        setSelectedKelasId(myKelasId || '');
        setSelectedGuruId('');
      }
    }
  }, [viewMode, isGuru, isWaliKelas, myGuruId, myKelasId]);

  const { absensiMode, managedKelasIds } = useGerbangModeAndRole({
    user,
    tenantId: user?.tenant_id,
  });

  // For SISWA PETUGAS_KELAS: inject their managed kelas as default if no kelas_id in URL
  const defaultKelasId = useMemo(() => {
    if (isSiswa && managedKelasIds && managedKelasIds.length > 0 && !selectedKelasId) {
      return managedKelasIds[0];
    }
    return selectedKelasId;
  }, [isSiswa, managedKelasIds, selectedKelasId]);

  const features = (subscription as { features?: string[] })?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  // Pillar 4: AbortController for useEffect cleanup
  React.useEffect(() => {
    const controller = new AbortController();

    const loadContext = async () => {
      try {
        const tpRes = await getTahunPelajaranList(1, 10, '', 'ACTIVE');
        const activeTp = tpRes.data?.[0];
        if (activeTp) {
          setSelectedTahunId(activeTp.id);
          const semRes = await getSemesterList(1, 10, '', activeTp.id);
          const activeSem = semRes.data?.find((s: { is_active?: boolean }) => s.is_active) || semRes.data?.[0];
          if (activeSem) setSelectedSemesterId(activeSem.id);
        }

        if (user?.role?.name === 'GURU' && !selectedGuruId) {
            const mId = user?.guru_profile?.id;
            if (mId) setSelectedGuruId(mId);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          LogService.error('Failed to load grid context', err);
        }
      }
    };
    loadContext();

    return () => controller.abort();
  }, [user, selectedGuruId]);

  React.useEffect(() => {
    if (viewMode !== 'grid' || !selectedTahunId || !selectedSemesterId) return;
    
    const targetKelasId = isSiswa ? defaultKelasId : selectedKelasId;
    if (!targetKelasId && !selectedGuruId && user?.role?.name !== 'GURU') return;

    const controller = new AbortController();

    const fetchData = async () => {
      setLoadingJadwal(true);
      try {
        const res = await getJadwalTemplate({
          kelas_id: targetKelasId || undefined,
          guru_id: selectedGuruId || undefined,
          tahun_pelajaran_id: selectedTahunId,
          semester_id: selectedSemesterId
        });
        if (!controller.signal.aborted) {
          setJadwal(res.data || []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          LogService.error('Failed to fetch schedules', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingJadwal(false);
        }
      }
    };
    fetchData();

    return () => controller.abort();
  }, [viewMode, selectedKelasId, defaultKelasId, selectedGuruId, selectedTahunId, selectedSemesterId, refreshKey, isSiswa]);

  // Pillar 2: Memoize callbacks
  const handleEditSlot = useCallback(() => {
    setViewMode('list');
  }, []);

  const handlePrint = useCallback(async () => {
    const toastId = toast.loading('Sedang menyiapkan dokumen PDF...');
    try {
      // 1. Fetch school info
      const sekolah = await sekolahApi.getProfile();

      // 2. Fetch tenant info
      const tenantRes = await getMyTenant();
      const tenantInfo = tenantRes?.success ? tenantRes.data : null;

      // 3. Fetch list of organizational assignments for principal NIP/Name signature
      const strukturRes = await getStrukturList({ page: 1, limit: 100 });
      const strukturList = strukturRes?.success ? strukturRes.data : [];

      // 4. Fetch school and regional logos as base64
      let logoDaerahBase64 = null;
      let logoSekolahBase64 = null;

      if (sekolah?.logo_daerah) {
        logoDaerahBase64 = await getBase64ImageFromUrl(sekolah.logo_daerah).catch(() => null);
      }
      if (sekolah?.logo_sekolah) {
        logoSekolahBase64 = await getBase64ImageFromUrl(sekolah.logo_sekolah).catch(() => null);
      }

      // 5. Fetch master kegiatan for activity name mappings
      const jenisRes = await jenisKegiatanMasterApi.getAll({ page: 1, limit: 100 });
      const jenisKegiatanList = jenisRes?.success ? jenisRes.data : [];

      // 6. Fetch classes and gurus list for label displays in autotable
      const [classesRes, gurusRes] = await Promise.all([
        getKelasList(1, 100),
        getGuruList(1, 100)
      ]);
      const classes = classesRes?.success ? classesRes.data : [];
      const gurus = gurusRes?.success ? gurusRes.data : [];

      const targetKelasId = isSiswa ? defaultKelasId : selectedKelasId;

      // 7. Generate PDF blob
      const blob = await generateGenericPdf({
        module: 'kurikulum',
        printType: selectedGuruId ? 'roster_teacher' : 'roster',
        selectedClassId: targetKelasId || 'all',
        selectedGuruId: selectedGuruId || 'all',
        sekolah,
        tenantInfo,
        strukturList,
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo: true,
        filterData: { 
          jadwalList: jadwal, 
          classes, 
          gurus, 
          jenisKegiatanList 
        }
      });

      // 8. Download the PDF directly
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const docTitle = selectedGuruId ? `Jadwal_Guru_${user?.full_name}` : `Jadwal_Kelas_${selectedKelasId || 'Semua'}`;
      link.setAttribute('download', `${docTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghasilkan PDF', { id: toastId });
    }
  }, [user, selectedGuruId, selectedKelasId, isSiswa, defaultKelasId, selectedTahunId, selectedSemesterId, jadwal]);

  const handleDeleteSlot = useCallback(async (id: string) => {
    if (!canManage) return;
    
    const isConfirmed = await confirm({
      title: 'Hapus Jadwal?',
      description: 'Apakah Anda yakin ingin menghapus jadwal ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });

    if (isConfirmed) {
      try {
        await deleteJadwalTemplate(id);
        setRefreshKey(k => k + 1);
        toast.success('Jadwal berhasil dihapus');
      } catch (err) {
        LogService.error('Delete failed', err);
        toast.error('Gagal menghapus jadwal');
      }
    }
  }, [canManage, confirm]);

  const canViewTpl = can('attendance.schedules.view.list');
  const isAllowed = absensiMode === 'MULTI_SESI' && canViewTpl;

  // Pillar 2: Memoize complex JSX
  const pageContent = useMemo(() => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
            {viewMode === 'grid' && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl px-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all text-slate-600 dark:text-slate-300"
                    onClick={handlePrint}
                    disabled={jadwal.length === 0}
                >
                    <Printer className="w-4 h-4 mr-2 text-indigo-500" />
                    Cetak PDF
                </Button>
            )}
        </div>

        {canManage && (
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <Button 
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'} 
                  size="sm" 
                  className="rounded-lg px-4"
                  onClick={() => setViewMode('grid')}
              >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Visual Grid
              </Button>
              <Button 
                  variant={viewMode === 'builder' ? 'primary' : 'ghost'} 
                  size="sm" 
                  className="rounded-lg px-4"
                  onClick={() => setViewMode('builder')}
              >
                  <Paintbrush className="w-4 h-4 mr-2" />
                  Visual Builder
              </Button>
              <Button 
                  variant={viewMode === 'list' ? 'primary' : 'ghost'} 
                  size="sm" 
                  className="rounded-lg px-4"
                  onClick={() => setViewMode('list')}
              >
                  <List className="w-4 h-4 mr-2" />
                  Daftar Kelola
              </Button>
          </div>
        )}
      </div>

      <SectionCard fullWidth>
        <Suspense fallback={<div className="flex justify-center py-20"><Loader /></div>}>
          {viewMode === 'list' ? (
            <JadwalTplList kelasId={isSiswa ? defaultKelasId : selectedKelasId} />
          ) : viewMode === 'builder' ? (
            <JadwalBuilder 
              tahunPelajaranId={selectedTahunId} 
              semesterId={selectedSemesterId}
              onRefresh={() => setRefreshKey(k => k + 1)}
            />
          ) : (
            <JadwalGrid 
              jadwal={jadwal} 
              onAddSlot={() => canManage && setViewMode('list')}
              onEditSlot={handleEditSlot}
              onDeleteSlot={handleDeleteSlot}
              loading={loadingJadwal}
              readOnly={!canManage}
              selectedKelasId={isSiswa ? defaultKelasId : selectedKelasId}
            />
          )}
        </Suspense>
      </SectionCard>
    </div>
  ), [viewMode, canManage, handlePrint, jadwal, loadingJadwal, selectedKelasId, defaultKelasId, selectedGuruId, selectedTahunId, selectedSemesterId, refreshKey, isSiswa, handleEditSlot, handleDeleteSlot]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader /></div>;
  }

  // 🛡️ Premium Lock Check
  if (isLocked) {
    return (
      <AcademicPageLayout
        title="Jadwal Pelajaran"
        description="Penyusunan jadwal KBM dan pemetaan jam mengajar guru."
        hardeningModuleKey={hardeningModuleKey}
      >
        <PremiumFeatureGate 
          isLocked={isLocked}
          moduleName="ABSENSI"
          featureName="Manajemen Template Jadwal"
          description="Buat template jadwal presensi yang fleksibel untuk berbagai sesi, memudahkan otomatisasi pencatatan kehadiran setiap harinya."
        >
          <div />
        </PremiumFeatureGate>
      </AcademicPageLayout>
    );
  }

  if (!isAllowed) {
    return (
      <AcademicPageLayout
        title="Jadwal Pelajaran"
        description="Penyusunan jadwal KBM dan pemetaan jam mengajar guru."
        hardeningModuleKey={hardeningModuleKey}
      >
        <SectionCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-500 rounded-full mb-4">
              <FileStack className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Mode Absensi Tidak Mendukung</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md">
              Halaman Jadwal Pelajaran hanya aktif pada sekolah yang mengaktifkan mode absensi MULTI_SESI. Silakan hubungi admin untuk mengubah pengaturan mode absensi.
            </p>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      title="Jadwal Pelajaran"
      description="Penyusunan jadwal KBM dan pemetaan jam mengajar guru."
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum/dashboard' },
        { label: 'Jadwal Pelajaran' }
      ]}
      instruction={{
        title: 'Panduan Penyusunan Jadwal',
        description: 'Jadwal pelajaran bertindak sebagai blueprint KBM harian yang menggerakkan generator absensi otomatis.',
        items: [
          { text: 'Visual Grid menampilkan pratinjau jadwal mingguan per kelas atau per guru secara ringkas.' },
          { text: 'Daftar Kelola memungkinkan Wakasek Kurikulum melakukan aksi CRUD (Tambah/Edit/Hapus) per slot jadwal.' },
          { text: 'Anda juga dapat melakukan import data jadwal sekaligus menggunakan template spreadsheet excel.' }
        ]
      }}
      hardeningModuleKey={hardeningModuleKey}
    >
      {pageContent}
    </AcademicPageLayout>
  );
}
