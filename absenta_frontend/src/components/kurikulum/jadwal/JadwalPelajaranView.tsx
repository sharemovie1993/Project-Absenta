import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { useSearchParams } from 'react-router-dom';
import { useGerbangModeAndRole } from '../../../hooks/attendance/useGerbangModeAndRole';
import { 
  Loader,
  Button,
  SectionCard,
} from '../../ui';
import { 
  FileStack, 
  LayoutGrid,
  Printer,
  Paintbrush,
  Sparkles,
  Trash2,
  Users,
  FileUp,
  Lock,
  AlertCircle
} from 'lucide-react';
import { AutoJadwalWizardModal } from '../AutoJadwalWizardModal';
import { BebanGuruSummaryModal } from '../jadwal-builder/BebanGuruSummaryModal';
import { AscImportWizardModal } from '../jadwal-builder/AscImportWizardModal';
import { TabSwitcher } from '../../ui/TabSwitcher';
import { AcademicPageLayout } from '../../academic/AcademicPageLayout';
import { getJadwalKBM, deleteJadwalKBM, clearJadwalKBM, type JadwalKBM } from '../../../api/attendance/jadwalKBM.api';
import { getTahunPelajaranList } from '../../../api/academic/tahunPelajaran.api';
import { getSemesterList } from '../../../api/academic/semester.api';
import { LogService } from '../../../utils/LogService';
import useConfirm from '../../../hooks/useConfirm';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { JadwalPelajaranPrintModal } from './JadwalPelajaranPrintModal';

// Pillar 5: Lazy Loading
const JadwalGrid = lazy(() => import('../JadwalGrid').then(m => ({ default: m.JadwalGrid })));
const JadwalBuilder = lazy(() => import('../JadwalBuilder'));
const CetakBerkasKurikulumPage = lazy(() => import('../../../pages/kurikulum/CetakBerkasKurikulumPage').then(m => ({ default: m.CetakBerkasKurikulumPage })));

const hardeningModuleKey = 'jadwal_pelajaran_page';

export interface UniversalJadwalPelajaranViewProps {
  hideLayout?: boolean;
  isModal?: boolean;
  readOnly?: boolean;
  tahunPelajaranId?: string;
  semesterId?: string;
  propKelasId?: string;
  propGuruId?: string;
  propHari?: string;
}

export const JadwalPelajaranView: React.FC<UniversalJadwalPelajaranViewProps> = ({
  hideLayout = false,
  isModal = false,
  readOnly = false,
  tahunPelajaranId,
  semesterId,
  propKelasId,
  propGuruId,
  propHari,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const confirm = useConfirm();

  const { isKurikulum, isWaliKelas, isAdmin, can } = useCapabilities();

  // Role & Capability Detection
  const isSiswa = !!user?.isStudent;
  const isGuru = !!user?.isTeacher;
  const myGuruId = user?.guru_profile?.id;
  const myKelasId = (user?.guru_profile as { wali_kelas_di?: { id: string } })?.wali_kelas_di?.id;

  const canManage = !readOnly && (
    isAdmin || isKurikulum ||
    can('academic.schedules.create') || can('academic.schedules.update') || can('academic.schedules.delete') ||
    can('attendance.schedules.create') || can('attendance.schedules.update') || can('attendance.schedules.delete')
  );

  // View State Logic: Kurikulum & Admin default langsung mendarat di Workspace Visual Builder
  const [viewMode, setViewMode] = useState<'grid' | 'builder' | 'preview'>(() => {
    return canManage ? 'builder' : 'grid';
  });
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Otomatis arahkan pengelola Kurikulum langsung ke Builder jika tidak di preview
  useEffect(() => {
    if (canManage && viewMode === 'grid') {
      setViewMode('builder');
    }
  }, [canManage, viewMode]);

  // Shared Data State
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedKelasId, setSelectedKelasId] = useState<string>(
    propKelasId || searchParams.get('kelas_id') || ''
  );
  const [selectedTahunId, setSelectedTahunId] = useState<string>(tahunPelajaranId || '');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(semesterId || '');

  useEffect(() => {
    if (tahunPelajaranId) {
      setSelectedTahunId(tahunPelajaranId);
    }
  }, [tahunPelajaranId]);

  useEffect(() => {
    if (semesterId) {
      setSelectedSemesterId(semesterId);
    }
  }, [semesterId]);
  const [autoWizardOpen, setAutoWizardOpen] = useState(false);
  const [bebanModalOpen, setBebanModalOpen] = useState(false);
  const [ascWizardOpen, setAscWizardOpen] = useState(false);
  const [selectedGuruId, setSelectedGuruId] = useState<string>(
    propGuruId || searchParams.get('guru_id') || (isGuru ? (myGuruId || '') : '')
  );

  // Print Preview Isolated Context State
  const [previewPrintType, setPreviewPrintType] = useState<'roster' | 'roster_teacher'>('roster');
  const [previewTargetClassId, setPreviewTargetClassId] = useState<string>('');
  const [previewTargetGuruId, setPreviewTargetGuruId] = useState<string>('');

  const triggerPrintPreview = useCallback((printType?: 'roster' | 'roster_teacher', targetId?: string) => {
    let type: 'roster' | 'roster_teacher' = printType || 'roster';
    const activeGuruId = (printType === 'roster_teacher' && targetId) ? targetId : selectedGuruId;
    const activeKelasId = (printType === 'roster' && targetId) ? targetId : selectedKelasId;

    if (!printType) {
      if (activeGuruId && !selectedKelasId) {
        type = 'roster_teacher';
      } else if (selectedKelasId && !activeGuruId) {
        type = 'roster';
      } else {
        type = activeGuruId ? 'roster_teacher' : 'roster';
      }
    }

    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-all'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-grid'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-all-builder'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-pelajaran-grid'] });

    setPreviewPrintType(type);
    if (type === 'roster_teacher') {
      setPreviewTargetGuruId(activeGuruId || '');
      setPreviewTargetClassId('');
    } else {
      setPreviewTargetClassId(activeKelasId || '');
      setPreviewTargetGuruId('');
    }
    setViewMode('preview');
  }, [selectedGuruId, selectedKelasId, queryClient]);

  // Logic: Auto-switch filters based on View Mode for Dual-Role
  useEffect(() => {
    if (isGuru && isWaliKelas && !propKelasId && !propGuruId) {
      if (viewMode === 'grid') {
        setSelectedGuruId(myGuruId || '');
        setSelectedKelasId('');
      } else {
        setSelectedKelasId(myKelasId || '');
        setSelectedGuruId('');
      }
    }
  }, [viewMode, isGuru, isWaliKelas, myGuruId, myKelasId, propKelasId, propGuruId]);

  // Security Lock
  useEffect(() => {
    if (!canManage && viewMode === 'builder') {
      setViewMode('grid');
    }
    if (isSiswa && viewMode === 'preview') {
      setViewMode('grid');
    }
  }, [canManage, isSiswa, viewMode]);

  const { absensiMode, managedKelasIds } = useGerbangModeAndRole({
    user,
    tenantId: user?.tenant_id,
  });

  const defaultKelasId = useMemo(() => {
    if (isSiswa && managedKelasIds && managedKelasIds.length > 0 && !selectedKelasId) {
      return managedKelasIds[0];
    }
    return selectedKelasId;
  }, [isSiswa, managedKelasIds, selectedKelasId]);

  // Academic Context
  const { data: activeTpRes } = useQuery({
    queryKey: ['active-tahun-pelajaran'],
    queryFn: () => getTahunPelajaranList(1, 10).catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
  const activeTp = activeTpRes?.data?.find((t: { is_active?: boolean }) => t.is_active) || activeTpRes?.data?.[0];

  useEffect(() => {
    if (activeTp?.id && !selectedTahunId) {
      setSelectedTahunId(activeTp.id);
    }
  }, [activeTp, selectedTahunId]);

  // 🛡️ Academic Context Guard: Deteksi apakah user sedang melihat jadwal tahun pelajaran non-aktif (arsip)
  const isViewingArchiveYear = Boolean(
    activeTp?.id &&
    selectedTahunId &&
    activeTp.id !== selectedTahunId
  );

  const { data: semesterRes } = useQuery({
    queryKey: ['semesters-by-tp', selectedTahunId],
    queryFn: () => getSemesterList(1, 10, selectedTahunId).catch(() => null),
    enabled: !!selectedTahunId,
    staleTime: 10 * 60 * 1000,
  });
  const activeSemester = semesterRes?.data?.find((s: { is_active?: boolean }) => s.is_active) || semesterRes?.data?.[0];

  useEffect(() => {
    if (activeSemester?.id && !selectedSemesterId) {
      setSelectedSemesterId(activeSemester.id);
    }
  }, [activeSemester, selectedSemesterId]);

  // Fetch Schedules for Grid View
  const targetKelasQuery = isSiswa ? defaultKelasId : selectedKelasId;
  const targetGuruQuery = selectedGuruId;

  const { data: jadwalRes, isLoading: loadingJadwal, refetch: refetchJadwal } = useQuery({
    queryKey: ['jadwal-pelajaran-grid', selectedSemesterId, targetKelasQuery, targetGuruQuery, refreshKey],
    queryFn: () => getJadwalKBM({
      semester_id: selectedSemesterId || undefined,
      kelas_id: targetKelasQuery || undefined,
      guru_id: targetGuruQuery || undefined,
    }),
    enabled: !!selectedSemesterId,
    staleTime: 30 * 1000,
  });

  const jadwal: JadwalKBM[] = useMemo(() => {
    if (!jadwalRes) return [];
    if (Array.isArray(jadwalRes)) return jadwalRes;
    if (Array.isArray(jadwalRes.data)) return jadwalRes.data;
    return [];
  }, [jadwalRes]);

  const invalidateAllJadwalCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jadwal-pelajaran-grid'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-all'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-all-builder'] });
    queryClient.invalidateQueries({ queryKey: ['unified-jadwal-kbm-all'] });
  }, [queryClient]);

  const handleEditSlot = useCallback((_slot: JadwalKBM) => {
    if (canManage) {
      setViewMode('builder');
    }
  }, [canManage]);

  const handleDeleteSlot = useCallback(async (id: string) => {
    if (!canManage) return;

    const isConfirmed = await confirm({
      title: 'Hapus Sesi Jadwal',
      description: 'Apakah Anda yakin ingin menghapus sesi pelajaran ini dari jadwal?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });

    if (isConfirmed) {
      try {
        await deleteJadwalKBM(id);
        invalidateAllJadwalCaches();
        setRefreshKey(k => k + 1);
        refetchJadwal();
        toast.success('Jadwal berhasil dihapus');
      } catch (err) {
        LogService.error('Delete failed', err);
        toast.error('Gagal menghapus jadwal');
      }
    }
  }, [canManage, confirm, invalidateAllJadwalCaches, refetchJadwal]);

  const handleClearSchedule = useCallback(async () => {
    const targetKelasId = isSiswa ? defaultKelasId : selectedKelasId;
    const targetGuruId = selectedGuruId;

    let scopeLabel = 'SELURUH jadwal KBM sekolah';
    if (targetKelasId) scopeLabel = 'seluruh slot jadwal KBM untuk KELAS yang dipilih';
    else if (targetGuruId) scopeLabel = 'seluruh slot jadwal KBM untuk GURU yang dipilih';

    const desc = `Apakah Anda yakin ingin mengosongkan/menghapus ${scopeLabel}? Tindakan ini tidak dapat dibatalkan.`;
    
    const ok = await confirm({
      title: 'Kosongkan / Reset Jadwal KBM',
      description: desc,
      confirmText: 'Ya, Kosongkan Jadwal',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;

    try {
      const res = await clearJadwalKBM({
        kelas_id: targetKelasId || undefined,
        guru_id: targetGuruId || undefined,
        tahun_pelajaran_id: selectedTahunId || undefined,
        semester_id: selectedSemesterId || undefined,
      });

      if (res && res.success !== false) {
        toast.success(res.message || 'Berhasil mengosongkan jadwal KBM.');
        try {
          invalidateAllJadwalCaches();
          setRefreshKey(k => k + 1);
          refetchJadwal();
        } catch (postErr) {
          console.warn('[JadwalPelajaranView] Post-clear refresh warning:', postErr);
        }
      } else {
        toast.error(res?.message || 'Gagal mengosongkan jadwal');
      }
    } catch (err: unknown) {
      console.error('Failed to clear schedules', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal mengosongkan jadwal KBM';
      toast.error(errMsg);
    }
  }, [confirm, isSiswa, defaultKelasId, selectedKelasId, selectedGuruId, selectedTahunId, selectedSemesterId, invalidateAllJadwalCaches, refetchJadwal]);

  const canViewTpl = can('academic.schedules.view.list') || can('attendance.schedules.view.list');
  const isAllowed = absensiMode === 'MULTI_SESI' && canViewTpl;

  const content = (
    <div className="space-y-3">
      <SectionCard fullWidth>
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl px-3 py-1.5 border-emerald-300 dark:border-emerald-800 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-extrabold flex items-center gap-1.5 text-xs shadow-xs"
              onClick={() => setIsPrintModalOpen(true)}
              title="Cetak Jadwal Pelajaran (Roster KBM)"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Cetak Roster KBM
            </Button>

            {canManage && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl px-3 py-1.5 border-amber-200 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/10 shadow-xs hover:shadow-md transition-all text-amber-700 dark:text-amber-400 font-extrabold flex items-center gap-1.5 text-xs"
                  onClick={() => setAutoWizardOpen(true)}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  Generate Otomatis
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl px-3 py-1.5 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xs hover:bg-indigo-100/50 hover:shadow-md transition-all text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1.5 text-xs"
                  onClick={() => setBebanModalOpen(true)}
                  title="Statistik Beban Mengajar Guru"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  Beban JP Guru
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl px-3 py-1.5 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs hover:bg-emerald-100/50 hover:shadow-md transition-all text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center gap-1.5 text-xs"
                  onClick={() => setAscWizardOpen(true)}
                  title="Impor Jadwal KBM dari File aSc Timetables (.XML)"
                >
                  <FileUp className="w-3.5 h-3.5 text-emerald-500" />
                  Impor XML aSc
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl px-3 py-1.5 border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 shadow-xs hover:bg-rose-100/50 hover:shadow-md transition-all text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-1.5 text-xs"
                  onClick={handleClearSchedule}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  Kosongkan Jadwal
                </Button>
              </>
            )}
          </div>

          {canManage ? (
            <TabSwitcher
              options={[
                { id: 'builder', label: 'Visual Builder', icon: Paintbrush, colorClass: 'text-purple-600 dark:text-purple-400' },
                { id: 'preview', label: 'Pratinjau PDF', icon: Printer, colorClass: 'text-blue-600 dark:text-blue-400' }
              ]}
              activeTab={viewMode}
              onChange={(id) => id === 'preview' ? triggerPrintPreview() : setViewMode(id as 'builder' | 'preview')}
            />
          ) : !isSiswa ? (
            <TabSwitcher
              options={[
                { id: 'grid', label: 'Visual Grid', icon: LayoutGrid, colorClass: 'text-indigo-600 dark:text-indigo-400' },
                { id: 'preview', label: 'Pratinjau PDF', icon: Printer, colorClass: 'text-blue-600 dark:text-blue-400' }
              ]}
              activeTab={viewMode}
              onChange={(id) => id === 'preview' ? triggerPrintPreview() : setViewMode(id as 'grid' | 'builder' | 'preview')}
            />
          ) : null}
        </div>

        {/* 🛡️ Mode Arsip Historis Alert Banner */}
        {isViewingArchiveYear && (
          <div className="flex items-center gap-2.5 p-3.5 mb-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium shadow-xs">
            <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Mode Arsip Terkunci:</strong> Anda sedang melihat jadwal untuk Tahun Pelajaran Non-Aktif. Mode perubahan jadwal dinonaktifkan demi melindungi integritas arsip riwayat jadwal KBM.
            </span>
          </div>
        )}

        <Suspense fallback={<div className="flex justify-center py-20"><Loader /></div>}>
          {canManage && viewMode !== 'preview' ? (
            <JadwalBuilder 
              tahunPelajaranId={selectedTahunId} 
              semesterId={selectedSemesterId}
              readOnly={readOnly || isViewingArchiveYear}
              selectedGuruId={selectedGuruId}
              setSelectedGuruId={setSelectedGuruId}
              selectedKelasId={selectedKelasId}
              setSelectedKelasId={setSelectedKelasId}
              onRefresh={() => setRefreshKey(k => k + 1)}
              onOpenPrintPreview={(pType, targetId) => triggerPrintPreview(pType, targetId)}
            />
          ) : viewMode === 'preview' && !isSiswa ? (
            <CetakBerkasKurikulumPage 
              key={`${previewPrintType}-${previewTargetClassId}-${previewTargetGuruId}`}
              initialPrintType={previewPrintType}
              initialClassId={previewPrintType === 'roster' ? previewTargetClassId : ''}
              initialGuruId={previewPrintType === 'roster_teacher' ? previewTargetGuruId : ''}
              hideHeader={true}
            />
          ) : (
            <JadwalGrid 
              jadwal={jadwal} 
              onAddSlot={() => canManage && setViewMode('builder')}
              onEditSlot={handleEditSlot}
              onDeleteSlot={handleDeleteSlot}
              loading={loadingJadwal}
              readOnly={!canManage}
              selectedKelasId={isSiswa ? defaultKelasId : selectedKelasId}
            />
          )}
        </Suspense>
      </SectionCard>

      <AutoJadwalWizardModal
        isOpen={autoWizardOpen}
        onClose={() => setAutoWizardOpen(false)}
        tahunPelajaranId={selectedTahunId}
        semesterId={selectedSemesterId}
        onSuccess={() => setRefreshKey(k => k + 1)}
      />

      <BebanGuruSummaryModal
        isOpen={bebanModalOpen}
        onClose={() => setBebanModalOpen(false)}
        tahunPelajaranId={selectedTahunId}
        semesterId={selectedSemesterId}
      />

      <AscImportWizardModal
        isOpen={ascWizardOpen}
        onClose={() => setAscWizardOpen(false)}
        tahunPelajaranId={selectedTahunId}
        semesterId={selectedSemesterId}
        onSuccessImport={() => {
          setRefreshKey(k => k + 1);
          queryClient.invalidateQueries({ queryKey: ['jadwal-kbm'] });
          queryClient.invalidateQueries({ queryKey: ['jadwal-pelajaran-grid'] });
          queryClient.invalidateQueries({ queryKey: ['unified-jadwal-kbm-all'] });
        }}
      />

      <JadwalPelajaranPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        semesterId={selectedSemesterId}
        tahunPelajaranId={selectedTahunId}
        tahunPelajaranNama={activeTp?.tahun || '2026/2027'}
        semesterNama={activeSemester?.nama || 'Ganjil'}
        defaultKelasId={selectedKelasId}
        defaultGuruId={selectedGuruId}
      />
    </div>
  );

  if (hideLayout) {
    return content;
  }

  if (!isAllowed) {
    return (
      <AcademicPageLayout
        title="Jadwal KBM & Visual Builder"
        description="Workspace Operasional Penyusunan & Mapping Jadwal Pelajaran"
        hardeningModuleKey={hardeningModuleKey}
      >
        <SectionCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-500 rounded-full mb-4">
              <FileStack className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Mode Absensi Tidak Mendukung</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md">
              Halaman Jadwal KBM hanya aktif pada sekolah yang mengaktifkan mode absensi MULTI_SESI. Silakan hubungi admin untuk mengubah pengaturan mode absensi.
            </p>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      title="Jadwal KBM & Visual Builder"
      description="Workspace Operasional Penyusunan & Mapping Jadwal Pelajaran"
      instruction={{
        title: 'Panduan Penyusunan Jadwal (Full Screen Workspace)',
        description: 'Jadwal pelajaran bertindak sebagai blueprint KBM harian yang menggerakkan generator absensi otomatis.',
        items: [
          { text: 'Visual Grid menampilkan pratinjau jadwal mingguan per kelas atau per guru secara ringkas.' },
          { text: 'Visual Builder & Daftar Kelola memungkinkan Wakasek Kurikulum melakukan penyusunan interaktif (Drag-and-Drop & CRUD).' },
          { text: 'Tombol Cetak Roster KBM memungkinkan pencetakan jadwal resmi per kelas atau per guru berstandar institusi.' },
          { text: 'Anda juga dapat melakukan import data jadwal sekaligus menggunakan template aSc Timetables XML.' }
        ]
      }}
      hardeningModuleKey={hardeningModuleKey}
    >
      {content}
    </AcademicPageLayout>
  );
};
