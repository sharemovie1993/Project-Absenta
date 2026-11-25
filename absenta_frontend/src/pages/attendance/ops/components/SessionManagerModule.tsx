import React, { useState, useRef, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader } from '../../../../components/ui/Loader';
import toast from 'react-hot-toast';
import { useCapabilities } from '../../../../hooks/useCapabilities';
import { useAuthStore } from '../../../../store/authStore';
import { 
  createSesiAbsensi, 
  tapSiswaKeSesi,
  updateAbsenGuru,
  deleteSesiAbsensi,
  generateSesiFromTemplate,
  updateSesiStatus
} from '../../../../api/attendanceGerbang.api';
import { SesiFilterPanel } from '../../../../components/attendance/sesi/SesiFilterPanel';
import type { SesiDetail } from '../../../../components/attendance/sesi/SesiAttendanceList';
import { toLocalDate } from '../../../../utils/attendance/time';
import { type DropdownOption } from '../../../../api/dropdown.api';
import { guruApi, mapelApi } from '../../../../api/academic.api';
import { jenisKegiatanMasterApi } from '../../../../api/academic/jenisKegiatanMaster.api';
import { useUnifiedKbmSessions } from '../../../../hooks/attendance/useUnifiedKbmSessions';
import { formatDate } from '@/utils/date.utils';
import { BookOpen, Activity, Layers } from 'lucide-react';
import { type Student } from '../../../../components/common/SmartStudentPicker';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';
import { AttendanceErrorBoundary } from '../../../../components/attendance/AttendanceErrorBoundary';
import PremiumFeatureGate from '../../../../components/auth/PremiumFeatureGate';
import { useAudioFeedback } from '../../../../hooks/useAudioFeedback';
// Lazy Loaded Modals & Lists (Pilar 13)
const SessionTimelineList = lazy(() => import('./SessionTimelineList'));
const SesiCreateModal = lazy(() => import('../../../../components/attendance/sesi/SesiCreateModal').then(m => ({ default: m.SesiCreateModal })));
const SesiScanningModal = lazy(() => import('../../../../components/attendance/sesi/SesiScanningModal').then(m => ({ default: m.SesiScanningModal })));
const BukaSesiFotoModal = lazy(() => import('../../../../components/dashboard/staff/modals/BukaSesiFotoModal').then(m => ({ default: m.BukaSesiFotoModal })));
const PhotoPreviewModal = lazy(() => import('../../../../components/dashboard/shared/kbm/PhotoPreviewModal').then(m => ({ default: m.PhotoPreviewModal })));
const JurnalKbmModal = lazy(() => import('../../../../components/kurikulum/JurnalKbmModal').then(m => ({ default: m.JurnalKbmModal })));
export interface SessionManagerModuleProps {
  selectedKelasId: string;
  setSelectedKelasId?: (id: string) => void;
  kelasOptions?: DropdownOption[];
  isPetugasSiswa?: boolean;
  userRole?: string;
  canCreateSession?: boolean;
  managedKelasIds?: string[];
  user?: Record<string, unknown>;
  hideLayout?: boolean;
  hideKelas?: boolean;
  isModal?: boolean;
  onClose?: () => void;
  defaultTab?: 'ALL' | 'KBM' | 'KEGIATAN';
  readOnly?: boolean;
}
export const SessionManagerModule: React.FC<SessionManagerModuleProps> = React.memo(({
  selectedKelasId,
  setSelectedKelasId,
  kelasOptions,
  isPetugasSiswa,
  canCreateSession,
  managedKelasIds,
  user: userProp,
  hideLayout = false,
  hideKelas = false,
  isModal = false,
  onClose,
  defaultTab,
  readOnly = false,
}) => {
  const authUser = useAuthStore((s) => s.user);
  const user = userProp || (authUser as unknown as Record<string, unknown>);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isStudent, isKepalaSekolah, isKurikulum, isKesiswaan, can } = useCapabilities();
  const { playBeep } = useAudioFeedback();
  const isReadOnlyExecutive = isKepalaSekolah || isKurikulum || isKesiswaan || readOnly;
  const invalidateAllKbmQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['unified-kbm-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'kurikulum', 'monitoring-global'] });
    queryClient.invalidateQueries({ queryKey: ['sesi-detail-attendance'] });
  }, [queryClient]);
  const [filterDate, setFilterDate] = useState<string>(toLocalDate(new Date()));
  const [filterGuruId, setFilterGuruId] = useState<string>('');
  const subtabParam = (searchParams.get('subtab') || '').toLowerCase();
  const [activeTab, setActiveTab] = useState<'ALL' | 'KBM' | 'KEGIATAN'>(
    defaultTab || (subtabParam === 'kegiatan' ? 'KEGIATAN' : subtabParam === 'kbm' ? 'KBM' : 'ALL')
  );

  useEffect(() => {
    if (defaultTab && hideLayout) return;
    if (subtabParam === 'kegiatan') {
      setActiveTab('KEGIATAN');
    } else if (subtabParam === 'kbm') {
      setActiveTab('KBM');
    } else if (subtabParam === 'all') {
      setActiveTab('ALL');
    }
  }, [subtabParam, defaultTab, hideLayout]);

  const handleTabChange = useCallback((nextTab: 'ALL' | 'KBM' | 'KEGIATAN') => {
    setActiveTab(nextTab);
    if (!hideLayout) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('subtab', nextTab === 'KEGIATAN' ? 'kegiatan' : nextTab === 'KBM' ? 'kbm' : 'all');
        return next;
      }, { replace: true });
    }
  }, [setSearchParams, hideLayout]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSesiId, setDeletingSesiId] = useState<string | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [inputModalSesiId, setInputModalSesiId] = useState<string>('');
  const [scannerInput, setScannerInput] = useState<string>('');
  const [scanLoading, setScanLoading] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [showCreateSessionForm, setShowCreateSessionForm] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [photoGuruModalOpen, setPhotoGuruModalOpen] = useState(false);
  const [photoGuruTarget, setPhotoGuruTarget] = useState<{
    sesiId: string;
    kelasNama: string;
    mapelNama: string;
    guruNama: string;
    jenisKegiatan?: string;
    activityName?: string;
  } | null>(null);
  const [previewPhotoData, setPreviewPhotoData] = useState<{ photoUrl: string; guruNama: string; kelasNama: string; mapelNama: string; timestamp: string } | null>(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalSesiId, setJournalSesiId] = useState<string>('');
  const [journalInitialData, setJournalInitialData] = useState<Record<string, unknown> | null>(null);

  const normalizeDateTimeWithTanggal = useCallback((timeStr: string, baseTanggal: string): string => {
    if (!timeStr) return '';
    if (timeStr.includes('T')) return timeStr;
    const cleanTime = timeStr.trim();
    const parts = cleanTime.split(':');
    return `${baseTanggal}T${String(parts[0] || '00').padStart(2, '0')}:${String(parts[1] || '00').padStart(2, '0')}:${String(parts[2] || '00').padStart(2, '0')}`;
  }, []);
  const [petugasForm, setPetugasForm] = useState({
    kelas_id: selectedKelasId || '',
    guru_id: '',
    mapel_id: '',
    jenis_kegiatan: 'KBM',
    tanggal: toLocalDate(new Date()),
    waktu_mulai: '',
    waktu_selesai: '',
  });
  const { data: gurus = [] } = useQuery({
    queryKey: ['dropdown-guru'],
    queryFn: async () => {
      const res = await guruApi.getAll({ limit: 500, is_active: true });
      return (res.data || []) as Array<{ id: string; nama?: string; nama_guru?: string }>;
    }
  });
  const { data: mapels = [] } = useQuery({
    queryKey: ['dropdown-mapel'],
    queryFn: async () => {
      const res = await mapelApi.getAll({ limit: 500, is_active: true });
      return (res.data || []) as Array<{ id: string; nama?: string; nama_mapel?: string }>;
    }
  });

  const { data: jenisKegiatanList = [] } = useQuery({
    queryKey: ['dropdown-jenis-kegiatan'],
    queryFn: async () => {
      const res = await jenisKegiatanMasterApi.getAll();
      return (res.data || []) as Array<{ id: string; nama?: string; kode?: string }>;
    }
  });
  const { sessions = [], isLoading: loading, refetch: fetchSessions } = useUnifiedKbmSessions({
    tanggal: filterDate,
    kelas_id: selectedKelasId,
    guru_id: filterGuruId,
    allowedKelasIds: managedKelasIds,
  });
  const getGuruLabel = useCallback((id?: string) => {
    if (!id) return '-';
    const g = (gurus ?? []).find(x => x.id === id);
    return g?.nama || g?.nama_guru || id;
  }, [gurus]);
  const getMapelLabel = useCallback((id?: string) => {
    if (!id) return '-';
    const m = (mapels ?? []).find(x => x.id === id);
    return m?.nama || m?.nama_mapel || id;
  }, [mapels]);

  const getKelasLabel = useCallback((id?: string) => {
    if (!id) return '-';
    const k = (kelasOptions ?? []).find(x => x.value === id);
    return k?.label || id;
  }, [kelasOptions]);
  const allSessionsSorted = useMemo(() => {
    const list = [...(sessions ?? [])];
    const toMinutes = (s: any) => {
      const raw = String(s?.jam_mulai || s?.waktu_mulai || '');
      const m = raw.match(/(\d{1,2}):(\d{2})/);
      return m ? Number(m[1]) * 60 + Number(m[2]) : 9999;
    };
    list.sort((a, b) => toMinutes(a) - toMinutes(b));
    return list;
  }, [sessions]);
  const kbmSessions = useMemo(() => allSessionsSorted.filter(s => (s.jenis_kegiatan || 'KBM') === 'KBM'), [allSessionsSorted]);
  const kegiatanSessions = useMemo(() => allSessionsSorted.filter(s => s.jenis_kegiatan && s.jenis_kegiatan !== 'KBM'), [allSessionsSorted]);
  const activeSessionsList = useMemo(
    () => (activeTab === 'ALL' ? allSessionsSorted : activeTab === 'KBM' ? kbmSessions : kegiatanSessions) as unknown as Array<Record<string, unknown>>,
    [activeTab, allSessionsSorted, kbmSessions, kegiatanSessions]
  );
  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const handleFinishSesi = useCallback(async (id: string) => {
    try {
      await updateSesiStatus(id, 'SELESAI');
      toast.success('Sesi KBM berhasil diselesaikan');
      invalidateAllKbmQueries();
    } catch {
      toast.error('Gagal menyelesaikan sesi');
    }
  }, [invalidateAllKbmQueries]);
  const handleDeleteSesi = useCallback((id: string) => {
    setDeletingSesiId(id);
    setIsDeleteModalOpen(true);
  }, []);

  const executeDeleteSesi = useCallback(async () => {
    if (!deletingSesiId) return;
    try {
      setIsDeletingSession(true);
      await deleteSesiAbsensi(deletingSesiId);
      toast.success('Sesi berhasil dihapus');
      setIsDeleteModalOpen(false);
      setDeletingSesiId(null);
      invalidateAllKbmQueries();
    } catch {
      toast.error('Gagal menghapus sesi');
    } finally {
      setIsDeletingSession(false);
    }
  }, [deletingSesiId, invalidateAllKbmQueries]);
  const handleOpenScan = useCallback((id: string) => {
    const targetSession = activeSessionsList.find(s => s.id === id);
    if (targetSession) {
      const isKegiatan = Boolean(targetSession.jenis_kegiatan && String(targetSession.jenis_kegiatan).toUpperCase() !== 'KBM');
      const isSessionActive = Boolean(
        targetSession.foto_kegiatan ||
        targetSession.foto_masuk ||
        targetSession.status === 'BERLANGSUNG' ||
        targetSession.isLive ||
        (targetSession.guru_status && !['BELUM_TAP', 'BELUM_HADIR', 'ALPA', 'MENDATANG'].includes(targetSession.guru_status as string))
      );
      if (!isKegiatan && !isSessionActive) {
        toast.error('Sesi KBM belum dibuka. Silakan buka sesi terlebih dahulu (Bisa dengan atau tanpa foto) sebelum membuka Terminal Scan RFID.', { duration: 3500 });
        return;
      }
    }
    setInputModalSesiId(id);
    setInputModalOpen(true);
  }, [activeSessionsList]);
  const handleOpenJournal = useCallback((session: Record<string, unknown>) => {
    setJournalSesiId(session.id as string);
    setJournalInitialData((session.ProgresMateri as Record<string, unknown>) || null);
    setJournalModalOpen(true);
  }, []);
  const handleOpenPhotoGuruModal = useCallback((item: Record<string, unknown>) => {
    // 🛡️ RBAC / ABAC Guard: Cegah guru lain / wali kelas membuka sesi guru pengajar lain
    const currentGuruId = (user as any)?.guru_profile?.id || (user as any)?.guru_id || (user as any)?.Guru?.id;
    const isSessionTeacher = Boolean(
      currentGuruId && (
        String(item.guru_id) === String(currentGuruId) ||
        String(item.guru_pelaksana_id) === String(currentGuruId)
      )
    );
    const isClassOfficer = Boolean(
      isPetugasSiswa && (
        managedKelasIds?.includes(String(item.kelas_id)) ||
        String((user as any)?.kelas_id) === String(item.kelas_id) ||
        String((user as any)?.siswa_profile?.kelas_id) === String(item.kelas_id)
      )
    );

    if (!isAdmin && !isSessionTeacher && !isClassOfficer) {
      toast.error('Pelanggaran Otorisasi: Anda bukan guru pengajar pada sesi ini dan tidak memiliki hak membuka sesi kelas guru lain.');
      return;
    }

    const isKegiatan = Boolean(item.jenis_kegiatan && String(item.jenis_kegiatan).toUpperCase() !== 'KBM');
    const kegiatanLabel = (item.kegiatan as string) || (item.nama_kegiatan as string) || (item.nama as string) || (item.jenis_kegiatan as string) || 'Kegiatan';
    setPhotoGuruTarget({
      sesiId: (item.id as string) || (item.session_id as string),
      kelasNama: (item.kelas_nama as string) || getKelasLabel(item.kelas_id as string) || (isKegiatan ? 'Peleton / Seluruh Peserta' : ''),
      mapelNama: (item.mapel_nama as string) || (isKegiatan ? kegiatanLabel : getMapelLabel(item.mapel_id as string)),
      guruNama: (item.guru_nama as string) || getGuruLabel(item.guru_id as string),
      jenisKegiatan: (item.jenis_kegiatan as string) || 'KBM',
      activityName: isKegiatan ? kegiatanLabel : undefined,
    });
    setPhotoGuruModalOpen(true);
  }, [getKelasLabel, getMapelLabel, getGuruLabel, user, isPetugasSiswa, managedKelasIds, isAdmin]);

  // Jalur 1: Buka Sesi Langsung Tanpa Foto (Khusus Petugas Kelas)
  const handleOpenSessionWithoutPhoto = useCallback(async () => {
    if (!photoGuruTarget?.sesiId) return;
    setScanLoading(true);
    try {
      await updateSesiStatus(photoGuruTarget.sesiId, 'BERLANGSUNG');
      toast.success('Sesi KBM berhasil dibuka oleh Petugas Kelas! Anda dapat langsung mengabsenkan siswa.', { duration: 4000 });
      setPhotoGuruModalOpen(false);
      setPhotoGuruTarget(null);
      invalidateAllKbmQueries();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err.response?.data?.message || err.message || 'Gagal membuka sesi');
    } finally {
      setScanLoading(false);
    }
  }, [photoGuruTarget, invalidateAllKbmQueries]);

  // Jalur 2: Buka Sesi dengan Foto / Ambil Foto Guru
  const handleConfirmPhotoGuru = useCallback(async (base64Photo: string) => {
    if (!photoGuruTarget?.sesiId) return;
    setScanLoading(true);
    try {
      if (isPetugasSiswa) {
        // Petugas kelas mengambil foto bukti awal suasana kelas:
        // Simpan foto bukti kelas dan ubah status sesi ke BERLANGSUNG,
        // Status guru tetap BELUM_HADIR sampai guru sendiri yang hadir/verifikasi
        await updateSesiAbsensi(photoGuruTarget.sesiId, {
          foto_kegiatan: base64Photo,
          status: 'BERLANGSUNG',
        } as any);
        toast.success('Bukti awal kelas tersimpan & sesi KBM aktif!');
      } else {
        await updateAbsenGuru(photoGuruTarget.sesiId, {
          foto_masuk: base64Photo,
          status: 'HADIR',
        });
        toast.success('Foto bukti guru berhasil disimpan & sesi dimulai!');
      }
      setPhotoGuruModalOpen(false);
      setPhotoGuruTarget(null);
      invalidateAllKbmQueries();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan foto absensi');
    } finally {
      setScanLoading(false);
    }
  }, [photoGuruTarget, isPetugasSiswa, invalidateAllKbmQueries]);
  const submitScan = useCallback(async (
    token?: string, 
    isGuruOrMode?: boolean | 'HADIR' | 'MASUK' | 'PULANG' | 'TERLAMBAT', 
    directStudentData?: Student | null
  ) => {
    const rawToken = token || scannerInput;
    if (!inputModalSesiId || !rawToken) return;
    setScanLoading(true);
    try {
      const isGuru = typeof isGuruOrMode === 'boolean' ? isGuruOrMode : false;
      let finalStatus: 'HADIR' | 'TERLAMBAT' = 'HADIR';
      if (typeof isGuruOrMode === 'string' && (isGuruOrMode === 'HADIR' || isGuruOrMode === 'TERLAMBAT')) {
        finalStatus = isGuruOrMode;
      }

      if (isGuru) {
        const targetGuruId = directStudentData?.id || rawToken;
        await updateAbsenGuru(inputModalSesiId, targetGuruId, {
          status: 'HADIR',
          waktu_tap: new Date().toISOString()
        });
        toast.success('Kehadiran guru berhasil dicatat', { id: 'sesi-tap-toast', duration: 1500 });
      } else {
        const targetSiswaId = directStudentData?.id || rawToken;
        const res = await tapSiswaKeSesi(inputModalSesiId, {
          siswa_id: targetSiswaId,
          status: finalStatus,
          rfid: rawToken,
        });
        toast.success(res.message || 'Presensi siswa berhasil dicatat', { id: 'sesi-tap-toast', duration: 1500 });
      }

      playBeep('success').catch(() => {});
      setScannerInput('');
      invalidateAllKbmQueries();
    } catch (e: unknown) {
      playBeep('error').catch(() => {});
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || 'Gagal scan kehadiran';
      toast.error(msg, { id: 'sesi-tap-toast', duration: 2500 });
    } finally {
      setScanLoading(false);
    }
  }, [inputModalSesiId, scannerInput, invalidateAllKbmQueries, playBeep]);
  const handleGenerateFromTemplate = useCallback(async () => {
    try {
      setGeneratingTemplate(true);
      await generateSesiFromTemplate({ tanggal: filterDate, kelas_id: selectedKelasId || undefined });
      toast.success('Sesi KBM berhasil disinkronkan dari jadwal');
      invalidateAllKbmQueries();
    } catch {
      toast.error('Gagal sinkronisasi sesi dari jadwal');
    } finally {
      setGeneratingTemplate(false);
    }
  }, [filterDate, selectedKelasId, invalidateAllKbmQueries]);
  const handleCreateSession = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingSession(true);
      await createSesiAbsensi({
        ...petugasForm,
        waktu_mulai: normalizeDateTimeWithTanggal(petugasForm.waktu_mulai, petugasForm.tanggal),
        waktu_selesai: normalizeDateTimeWithTanggal(petugasForm.waktu_selesai, petugasForm.tanggal),
      });
      toast.success('Sesi baru berhasil dibuat');
      setShowCreateSessionForm(false);
      invalidateAllKbmQueries();
    } catch {
      toast.error('Gagal membuat sesi');
    } finally {
      setCreatingSession(false);
    }
  }, [petugasForm, normalizeDateTimeWithTanggal, invalidateAllKbmQueries]);
  const jenisOptions = useMemo(() => [
    { label: 'KBM Reguler', value: 'KBM' },
    ...((jenisKegiatanList ?? [])?.map(j => ({ label: j.nama || j.kode || '', value: j.kode || j.id })) || [])
  ], [jenisKegiatanList]);
  const guruOptions = useMemo(() => (gurus ?? [])?.map(g => ({ label: g.nama || g.nama_guru || '', value: g.id })), [gurus]);
  const mapelOptions = useMemo(() => (mapels ?? [])?.map(m => ({ label: m.nama || m.nama_mapel || '', value: m.id })), [mapels]);
  return (
    <AttendanceErrorBoundary>
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Manajemen Sesi Presensi KBM"
        description="Pantau sesi KBM real-time, aktivitas mengajar guru, dan validasi tap siswa."
      >
        <div className="space-y-6 w-full min-w-0 max-w-full">
          {/* Header Controls & Filter */}
          <SesiFilterPanel
            filterDate={filterDate}
            setFilterDate={setFilterDate}
            selectedKelasId={selectedKelasId}
            setSelectedKelasId={setSelectedKelasId}
            filterGuruId={filterGuruId}
            setFilterGuruId={setFilterGuruId}
            kelasOptions={kelasOptions || []}
            guruOptions={guruOptions}
            onRefresh={fetchSessions}
            loading={loading}
            onOpenCreateModal={isReadOnlyExecutive ? undefined : () => setShowCreateSessionForm(true)}
            onSyncSchedule={isReadOnlyExecutive ? undefined : handleGenerateFromTemplate}
            syncLoading={generatingTemplate}
            canCreateSession={isReadOnlyExecutive ? false : canCreateSession}
            hideKelas={hideKelas}
            isPetugasSiswa={isPetugasSiswa}
          />
          {/* Filter Pill Switcher (Default: Semua Terurut Kronologis) */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap">
            <button
              type="button"
              onClick={() => handleTabChange('ALL')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Layers size={14} />
              <span>Semua Sesi</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20">
                {allSessionsSorted.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('KBM')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'KBM'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <BookOpen size={14} />
              <span>Sesi KBM Reguler</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20">
                {kbmSessions.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('KEGIATAN')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'KEGIATAN'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Activity size={14} />
              <span>Kegiatan &amp; Pembiasaan</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20">
                {kegiatanSessions.length}
              </span>
            </button>
          </div>
          {/* Timeline View */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400">
              <Loader className="mb-4 animate-spin text-indigo-600" />
              <p className="text-xs font-bold uppercase tracking-wider">Menyiapkan Log Sesi...</p>
            </div>
          ) : activeSessionsList.length === 0 ? (
            <div className="p-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
              <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {activeTab === 'ALL' ? 'Tidak Ada Sesi Hari Ini' : activeTab === 'KBM' ? 'Tidak Ada Sesi KBM' : 'Tidak Ada Sesi Kegiatan'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {activeTab === 'ALL' ? 'Belum ada sesi KBM maupun kegiatan tercatat untuk tanggal ini.' : activeTab === 'KBM' ? 'Belum ada sesi KBM tercatat untuk tanggal ini.' : 'Tidak ada sesi kegiatan tercatat untuk tanggal ini.'}
              </p>
            </div>
          ) : (
            <Suspense fallback={<div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
              <SessionTimelineList
                activeSessionsList={activeSessionsList}
                expanded={expanded}
                toggleExpand={toggleExpand}
                handleFinishSesi={handleFinishSesi}
                handleDeleteSesi={handleDeleteSesi}
                handleOpenScan={handleOpenScan}
                handleOpenJournal={handleOpenJournal}
                handleOpenPhotoGuruModal={handleOpenPhotoGuruModal}
                setPreviewPhotoData={setPreviewPhotoData}
                getMapelLabel={getMapelLabel}
                getGuruLabel={getGuruLabel}
                getKelasLabel={getKelasLabel}
                isPetugasSiswa={isPetugasSiswa}
                isAdmin={isAdmin}
                isStudent={isStudent}
                isReadOnlyExecutive={isReadOnlyExecutive}
                can={can}
                managedKelasIds={managedKelasIds}
                user={user}
              />
            </Suspense>
          )}
          {/* Lazy Modals */}
          {showCreateSessionForm && (
            <Suspense fallback={null}>
              <SesiCreateModal
                isOpen={showCreateSessionForm}
                onClose={() => setShowCreateSessionForm(false)}
                petugasForm={petugasForm}
                setPetugasForm={setPetugasForm}
                kelasOptions={kelasOptions}
                jenisOptions={jenisOptions}
                guruOptions={guruOptions}
                mapelOptions={mapelOptions}
                onSave={handleCreateSession}
                creatingSession={creatingSession}
                normalizeDateTimeWithTanggal={normalizeDateTimeWithTanggal}
              />
            </Suspense>
          )}
          {inputModalOpen && (
            <Suspense fallback={null}>
              <SesiScanningModal
                isOpen={inputModalOpen}
                onClose={() => setInputModalOpen(false)}
                scannerInputRef={scannerInputRef}
                scannerInput={scannerInput}
                setScannerInput={setScannerInput}
                scanLoading={scanLoading}
                onSubmitScan={submitScan}
                inputModalSesiId={inputModalSesiId}
                sessionAttendanceRecords={[]}
                currentSession={sessions.find((s) => s.id === inputModalSesiId) as unknown as SesiDetail}
                kelasLabel={getKelasLabel(sessions.find((s) => s.id === inputModalSesiId)?.kelas_id)}
              />
            </Suspense>
          )}
          {photoGuruTarget && (
            <Suspense fallback={null}>
              <BukaSesiFotoModal
                isOpen={photoGuruModalOpen}
                onClose={() => {
                  setPhotoGuruModalOpen(false);
                  setPhotoGuruTarget(null);
                }}
                onConfirm={handleConfirmPhotoGuru}
                onOpenWithoutPhoto={handleOpenSessionWithoutPhoto}
                isPetugasSiswa={isPetugasSiswa}
                kelasNama={photoGuruTarget.kelasNama}
                mapelNama={photoGuruTarget.mapelNama}
                guruNama={photoGuruTarget.guruNama}
                jenisKegiatan={photoGuruTarget.jenisKegiatan}
                activityName={photoGuruTarget.activityName}
                isLoading={scanLoading}
              />
            </Suspense>
          )}
          {previewPhotoData && (
            <Suspense fallback={null}>
              <PhotoPreviewModal
                isOpen={Boolean(previewPhotoData)}
                onClose={() => setPreviewPhotoData(null)}
                photoUrl={previewPhotoData.photoUrl}
                guruNama={previewPhotoData.guruNama}
                kelasNama={previewPhotoData.kelasNama}
                mapelNama={previewPhotoData.mapelNama}
                timestamp={previewPhotoData.timestamp}
              />
            </Suspense>
          )}
          {journalModalOpen && (
            <Suspense fallback={null}>
              <JurnalKbmModal
                isOpen={journalModalOpen}
                onClose={() => setJournalModalOpen(false)}
                sesiId={journalSesiId}
                initialData={journalInitialData}
                onSuccess={fetchSessions}
                readOnly={!isAdmin && !can('attendance.sessions.update.journal')}
              />
            </Suspense>
          )}
          {isDeleteModalOpen && (
            <ConfirmDialog
              isOpen={isDeleteModalOpen}
              title="Hapus Sesi Absensi?"
              description="Apakah Anda yakin ingin menghapus sesi ini? Seluruh data kehadiran di dalam sesi ini akan hilang permanen dari sistem."
              confirmText="Ya, Hapus Sesi"
              cancelText="Batal"
              style="danger"
              onConfirm={executeDeleteSesi}
              onCancel={() => {
                setIsDeleteModalOpen(false);
                setDeletingSesiId(null);
              }}
              loading={isDeletingSession}
            />
          )}
        </div>
      </PremiumFeatureGate>
    </AttendanceErrorBoundary>
  );
});
export default SessionManagerModule;