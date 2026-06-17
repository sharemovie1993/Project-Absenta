import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useGerbangModeAndRole } from '../../../hooks/attendance/useGerbangModeAndRole';
import { 
  Loader,
  Button,
  SectionCard
} from '../../../components/ui';
import { 
  FileStack, 
  Clock,
  LayoutGrid,
  List,
  Printer
} from 'lucide-react';

import { useAuthStore } from '../../../store/authStore';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';
import PageLayout from '../../../components/common/PageLayout';
import { getJadwalTemplate, deleteJadwalTemplate, type JadwalTemplate } from '../../../api/attendance/jadwalTemplate.api';
import { getTahunPelajaranList } from '../../../api/academic/tahunPelajaran.api';
import { getSemesterList } from '../../../api/academic/semester.api';
import { LogService } from '../../../utils/LogService';
import useConfirm from '../../../hooks/useConfirm';
import { useToast } from '../../../hooks/useToast';

// ── Pillar 5: Lazy Loading ──────────────────────────────────────────────────
const JadwalTemplateList = lazy(() => import('../../../components/attendance/jadwal-template/JadwalTemplateList').then(m => ({ default: m.JadwalTemplateList })));
const JadwalGrid = lazy(() => import('../../../components/kurikulum/JadwalGrid').then(m => ({ default: m.JadwalGrid })));
const JadwalPrintLayout = lazy(() => import('../../../components/attendance/jadwal-template/JadwalPrintLayout').then(m => ({ default: m.JadwalPrintLayout })));

export default function JadwalTemplatePage() {
  const { subscription } = useAuthStore();
  const { user, isLoading, can } = useAuth();
  const [searchParams] = useSearchParams();
  const confirm = useConfirm();
  const { success, error } = useToast();
  
  // ── 1. Role & Capability Detection ──────────────────────────────────────────
  const isGuru = user?.role?.name === 'GURU';
  const myGuruId = user?.guru_profile?.id;
  const myKelasId = (user?.guru_profile as { wali_kelas_di?: { id: string } })?.wali_kelas_di?.id;
  const isWaliKelas = !!myKelasId;

  const canManage = can('attendance.schedules.create') || can('attendance.schedules.update') || can('attendance.schedules.delete');
  
  // ── 2. View State Logic ─────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(isGuru ? 'grid' : 'list');

  // ── 3. Shared Data State (for Grid View) ────────────────────────────────────
  const [jadwal, setJadwal] = useState<JadwalTemplate[]>([]);
  const [loadingJadwal, setLoadingJadwal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);

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

  const { absensiMode, petugasChecked } = useGerbangModeAndRole({
    user,
    tenantId: user?.tenant_id,
  });

  const features = (subscription as { features?: string[] })?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');
  const roleName = user?.role?.name || '';
  const isSiswa = roleName === 'SISWA';

  // Pillar 4: AbortController for useEffect cleanup
  React.useEffect(() => {
    if (viewMode !== 'grid') return;
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
  }, [viewMode, user, selectedGuruId]);

  React.useEffect(() => {
    if (viewMode !== 'grid' || !selectedTahunId || !selectedSemesterId) return;
    if (!selectedKelasId && !selectedGuruId && user?.role?.name !== 'GURU') return;

    const controller = new AbortController();

    const fetchData = async () => {
      setLoadingJadwal(true);
      try {
        const res = await getJadwalTemplate({
          kelas_id: selectedKelasId || undefined,
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
  }, [viewMode, selectedKelasId, selectedGuruId, selectedTahunId, selectedSemesterId, refreshKey]);

  // Pillar 2: Memoize callbacks
  const handleEditSlot = useCallback((item: JadwalTemplate) => {
    setViewMode('list');
  }, []);

  const handlePrint = useCallback(() => {
    const originalTitle = document.title;
    const guruName = user?.full_name || 'Guru';
    const cleanName = guruName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    document.title = `jadwal_pelajaran_${cleanName}`;
    
    setIsPrinting(true);
    const timer = setTimeout(() => {
      window.print();
      setIsPrinting(false);
      document.title = originalTitle;
    }, 500);

    return () => clearTimeout(timer);
  }, [user?.full_name]);

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
        success('Jadwal berhasil dihapus');
      } catch (err) {
        LogService.error('Delete failed', err);
        error('Gagal menghapus jadwal');
      }
    }
  }, [canManage, confirm]);

  const canViewTemplate = can('attendance.schedules.view.list');
  const isAllowed = absensiMode === 'MULTI_SESI' && canViewTemplate;

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

        {isGuru && canManage && (
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

      <SectionCard>
        <Suspense fallback={<div className="flex justify-center py-20"><Loader /></div>}>
          {(viewMode === 'list' && canManage) ? (
              <JadwalTemplateList kelasId={selectedKelasId} />
          ) : (
              <div className="space-y-6">
                  {loadingJadwal ? (
                      <div className="flex justify-center py-20"><Loader /></div>
                  ) : (
                      <JadwalGrid 
                          jadwal={jadwal} 
                          onAddSlot={() => canManage && setViewMode('list')}
                          onEditSlot={handleEditSlot}
                          onDeleteSlot={handleDeleteSlot}
                      />
                  )}
              </div>
          )}
        </Suspense>
      </SectionCard>
    </div>
  ), [viewMode, canManage, selectedKelasId, loadingJadwal, jadwal, handlePrint, handleEditSlot, handleDeleteSlot]);

  if (isLoading || ((isSiswa && !petugasChecked && !absensiMode) || (!isSiswa && !absensiMode))) {
    return <div className="flex justify-center py-20"><Loader size="lg" /></div>;
  }

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PageLayout
      title="Jadwal Pelajaran"
      description="Lihat dan kelola jadwal KBM sekolah dalam satu tempat yang terpadu."
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Presensi', path: '/attendance' },
        { label: 'Jadwal Pelajaran', path: '/attendance/jadwal-template' }
      ]}
      hardeningModuleKey="attendance.jadwal-template"
      instruction={{
        title: "Panduan Jadwal Template",
        description: "Gunakan template ini untuk mengatur sesi presensi otomatis harian.",
        items: [
          { text: "Pilih mode 'Visual Grid' untuk melihat jadwal mingguan secara ringkas." },
          { text: "Pilih mode 'Daftar Kelola' untuk menambah, mengubah, atau menghapus slot jadwal." },
          { text: "Pastikan jam KBM tidak tumpang tindih untuk menghindari error presensi." }
        ]
      }}
    >
      <PremiumFeatureGate
        isLocked={isLocked}
        moduleName="ABSENSI"
        featureName="Manajemen Template Jadwal"
        description="Buat template jadwal presensi yang fleksibel untuk berbagai sesi, memudahkan otomatisasi pencatatan kehadiran setiap harinya."
      >
        {pageContent}
      </PremiumFeatureGate>

      {/* Print Overlay */}
      <Suspense fallback={null}>
        <JadwalPrintLayout 
          isPrinting={isPrinting}
          jadwal={jadwal}
          guruName={user?.full_name}
        />
      </Suspense>
    </PageLayout>
  );
}
