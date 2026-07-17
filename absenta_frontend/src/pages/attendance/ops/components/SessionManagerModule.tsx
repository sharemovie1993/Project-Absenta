import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader } from '../../../../components/ui/Loader';
import { Alert, AlertDescription } from '../../../../components/ui/Alert';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../hooks/useAuth';
import { 
  getSesiAbsensiList, 
  createSesiAbsensi, 
  getSesiAbsenSiswa, 
  tapSiswaKeSesi,
  updateAbsenGuru,
  deleteSesiAbsensi,
  generateSesiFromTemplate,
  updateSesiStatus
} from '../../../../api/attendanceGerbang.api';
import { SesiCard } from '../../../../components/attendance/sesi/SesiCard';
import { SesiFilterPanel } from '../../../../components/attendance/sesi/SesiFilterPanel';
import { SesiAttendanceList, type SesiAttendanceRecord, type SesiDetail } from '../../../../components/attendance/sesi/SesiAttendanceList';
import Button from '../../../../components/ui/Button';
import { formatLocalDateTime, formatLocalTimeFromISO, roundTo5, toLocalDate } from '../../../../utils/attendance/time';
import { dropdownApi, type DropdownOption } from '../../../../api/dropdown.api';
import { guruApi, mapelApi } from '../../../../api/academic.api';
import { listGuruMapel } from '../../../../api/kurikulum/guru-mapel.api';
import { jenisKegiatanMasterApi } from '../../../../api/academic/jenisKegiatanMaster.api';
import { useSocket } from '../../../../hooks/useSocket';
import { 
  BookOpen, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';

import { type Student } from '../../../../components/common/SmartStudentPicker';
import { JurnalKbmModal } from '../../../../components/kurikulum/JurnalKbmModal';
import { AnalyticsCard } from '../../../../components/ui/AnalyticsCard';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';
import { AttendanceErrorBoundary } from '../../../../components/attendance/AttendanceErrorBoundary';
import PremiumFeatureGate from '../../../../components/auth/PremiumFeatureGate';

// Import subcomponents
import { SesiCreateModal } from '../../../../components/attendance/sesi/SesiCreateModal';
import { SesiScanningModal } from '../../../../components/attendance/sesi/SesiScanningModal';

interface SessionManagerModuleProps {
  selectedKelasId: string;
  setSelectedKelasId: (id: string) => void;
  kelasOptions: DropdownOption[];
  isPetugasSiswa: boolean;
  userRole?: string;
  canCreateSession: boolean;
}

interface PetugasFormState {
  kelas_id: string;
  guru_id: string;
  mapel_id?: string;
  jenis_kegiatan: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
}

interface SessionData {
  id: string;
  status?: string;
  waktu_mulai?: string;
  waktu_selesai?: string;
  jenis_kegiatan?: string;
  jenis_kegiatan_nama?: string;
  ProgresMateri?: Record<string, unknown> | null;
  kelas_id?: string;
  guru_id?: string;
  guru_nama?: string;
  summary?: Record<string, number>;
  guru_status?: string;
}

interface SocketPayload {
  sesi_id: string;
}

const SessionManagerModuleComponent: React.FC<SessionManagerModuleProps> = ({
  selectedKelasId,
  setSelectedKelasId,
  kelasOptions,
  isPetugasSiswa,
  userRole,
  canCreateSession,
}) => {
  const { subscribe, unsubscribe } = useSocket();
  
  // State
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tanggal, setTanggal] = useState<string>(toLocalDate());
  
  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSesiId, setDeletingSesiId] = useState<string | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  
  // Expanded State (for attendance list)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sessionAttendance, setSessionAttendance] = useState<Record<string, SesiAttendanceRecord[]>>({});
  const expandedRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  // Create Session State
  const [showCreateSessionForm, setShowCreateSessionForm] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const defaultDuration = 60;
  const startDate = roundTo5(new Date());
  const nowLocal = formatLocalDateTime(startDate);
  const endLocal = formatLocalDateTime(new Date(startDate.getTime() + defaultDuration * 60 * 1000));
  const [petugasForm, setPetugasForm] = useState<PetugasFormState>({ 
    kelas_id: selectedKelasId || '', 
    guru_id: '', 
    mapel_id: '', 
    jenis_kegiatan: '', 
    tanggal: toLocalDate(), 
    waktu_mulai: nowLocal, 
    waktu_selesai: endLocal 
  });

  useEffect(() => {
    if (!selectedKelasId) return;
    setPetugasForm((f) => (f.kelas_id ? f : { ...f, kelas_id: selectedKelasId }));
  }, [selectedKelasId]);

  // Dropdowns for Create Session
  const [guruOptions, setGuruOptions] = useState<DropdownOption[]>([]);
  const [mapelOptions, setMapelOptions] = useState<DropdownOption[]>([]);
  const [allMapelOptions, setAllMapelOptions] = useState<DropdownOption[]>([]);
  const [jenisOptions, setJenisOptions] = useState<DropdownOption[]>([]);
  const [jenisTypeByName, setJenisTypeByName] = useState<Record<string, string>>({});

  // Scanning State
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [inputModalSesiId, setInputModalSesiId] = useState<string>('');
  const inputModalOpenRef = useRef(false);
  const inputModalSesiIdRef = useRef('');
  
  useEffect(() => {
    inputModalOpenRef.current = inputModalOpen;
    inputModalSesiIdRef.current = inputModalSesiId;
  }, [inputModalOpen, inputModalSesiId]);

  const [scannerInput, setScannerInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Journal State
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalSesiId, setJournalSesiId] = useState('');
  const [journalInitialData, setJournalInitialData] = useState<unknown>(null);

  const playBeep = useCallback(async () => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {}
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }, []);
  
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const handleGenerateFromTemplate = useCallback(async () => {
    setGeneratingTemplate(true);
    try {
      const res = await generateSesiFromTemplate();
      if (res.success) {
        toast.success(res.message || 'Sesi otomatis berhasil diproses');
        fetchSessions();
      } else {
        const detailMsg = (res as { data?: { errors?: string[] } }).data?.errors && (res as { data?: { errors?: string[] } }).data!.errors!.length > 0 
          ? `\nDetail: ${ (res as { data?: { errors?: string[] } }).data!.errors![0] }`
          : '';
        toast.error((res.message || 'Gagal membuat sesi dari template') + detailMsg);
      }
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = errObj?.response?.data?.message || errObj?.message || 'Gagal memicu pembuatan sesi';
      toast.error(msg);
    } finally {
      setGeneratingTemplate(false);
    }
  }, []);

  // Helper Functions for Labels
  const getKelasLabel = useCallback(
    (id?: string) => kelasOptions.find((k) => k.value === id)?.label || id || 'Semua Kelas',
    [kelasOptions]
  );
  const getGuruLabel = useCallback(
    (id?: string) => guruOptions.find((g) => g.value === id)?.label || 'Semua Guru',
    [guruOptions]
  );
  const getMapelLabel = useCallback(
    (id?: string) => mapelOptions.find((m) => m.value === id)?.label || '-',
    [mapelOptions]
  );

  // Fetch Sessions
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: Record<string, unknown> = { summary: true };
      if (tanggal) params.tanggal = tanggal;
      if (selectedKelasId) params.kelas_id = selectedKelasId;
      
      const res = await getSesiAbsensiList(params);
      setSessions((res.data as SessionData[]) || []);
    } catch (err: unknown) {
      setSessions([]);
      const errObj = err as { response?: { status?: number } };
      const status = errObj?.response?.status;
      if (status === 403) {
        setErrorMsg('Akses ditolak: Anda bukan PetugasAbsensi aktif untuk kelas yang dipilih.');
      } else {
        setErrorMsg('Gagal memuat sesi.');
      }
    } finally {
      setLoading(false);
    }
  }, [tanggal, selectedKelasId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load Dropdowns
  useEffect(() => {
    let isMounted = true;
    async function initDropdowns() {
      try {
        const guruRes = await guruApi.getAll({ limit: 1000 });
        const guruList = (guruRes.data as { id: string; nama_guru: string }[]) || [];
        const mappedGuru = guruList.map((g) => ({ value: g.id, label: g.nama_guru }));
        
        const mapelRes = await mapelApi.getAll({ limit: 1000 } as unknown as Record<string, unknown>);
        const mapelList = (mapelRes.data as { id: string; kode_mapel?: string; nama_mapel?: string; nama?: string }[]) || [];
        const mappedMapel = mapelList.map((m) => ({ value: m.id, label: m.kode_mapel || m.nama_mapel || m.nama || '' }));
        
        const jenisList = await dropdownApi.getJenisKegiatanMasterForDropdown();
        const jenisMetaRes = await jenisKegiatanMasterApi.getAll({ limit: 1000 });
        const jenisMetaList = (jenisMetaRes.data as { id: string; nama: string; tipe: string }[]) || [];
        const typeMap: Record<string, string> = {};
        jenisMetaList.forEach((jk) => { 
          if (jk?.nama && jk?.tipe) typeMap[String(jk.nama)] = String(jk.tipe); 
          if (jk?.id && jk?.tipe) typeMap[String(jk.id)] = String(jk.tipe); 
        });
        
        if (isMounted) {
          setGuruOptions(mappedGuru);
          setMapelOptions(mappedMapel);
          setAllMapelOptions(mappedMapel);
          setJenisOptions(jenisList);
          setJenisTypeByName(typeMap);
        }
      } catch {}
    }
    initDropdowns();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter Mapel based on Guru
  useEffect(() => {
    let isMounted = true;
    async function loadMapelForGuru() {
      try {
        const gid = petugasForm.guru_id;
        if (!gid) {
          if (isMounted) setMapelOptions(allMapelOptions);
          return;
        }
        const res = await listGuruMapel({ guru_id: gid });
        const items = (res.data as { mapel_id: string; Mapel?: { kode_mapel?: string; nama_mapel?: string; nama?: string } }[]) || [];
        if (items.length === 0) {
          if (isMounted) setMapelOptions(allMapelOptions);
          return;
        }
        const filtered = items.map((gm) => {
          const fromRel = gm.Mapel ? (gm.Mapel.kode_mapel || gm.Mapel.nama_mapel || gm.Mapel.nama) : undefined;
          const fallback = allMapelOptions.find((o) => String(o.value) === String(gm.mapel_id))?.label || gm.mapel_id;
          return { value: gm.mapel_id, label: fromRel || fallback };
        });
        if (isMounted) setMapelOptions(filtered);
      } catch {
        if (isMounted) setMapelOptions(allMapelOptions);
      }
    }
    loadMapelForGuru();
    return () => {
      isMounted = false;
    };
  }, [petugasForm.guru_id, allMapelOptions]);

  const normalizeDateTimeWithTanggal = useCallback((tanggalValue: string, dt: string): string => {
    const datePart = String(tanggalValue || '').trim();
    if (!datePart) return dt;
    const raw = String(dt || '').trim();
    const timePart = raw.includes('T') ? raw.split('T')[1] : raw;
    const hhmm = String(timePart || '').slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(hhmm)) return dt;
    return `${datePart}T${hhmm}`;
  }, []);

  // Create Session Handler
  const handleCreateSession = useCallback(async () => {
    const kelasId = petugasForm.kelas_id || selectedKelasId || '';
    const tanggalSesi = petugasForm.tanggal || tanggal || toLocalDate();

    if (!kelasId) {
      toast('Pilih kelas terlebih dahulu', { icon: 'ℹ️' });
      return;
    }
    if (!petugasForm.jenis_kegiatan) {
      toast('Pilih jenis kegiatan terlebih dahulu', { icon: 'ℹ️' });
      return;
    }
    if (!petugasForm.waktu_mulai || !petugasForm.waktu_selesai) {
      toast('Mohon lengkapi waktu mulai dan selesai', { icon: 'ℹ️' });
      return;
    }
    const t = jenisTypeByName[petugasForm.jenis_kegiatan] || '';
    
    setCreatingSession(true);
    try {
      const payload = {
        ...petugasForm,
        kelas_id: kelasId,
        tanggal: tanggalSesi,
        waktu_mulai: normalizeDateTimeWithTanggal(tanggalSesi, petugasForm.waktu_mulai),
        waktu_selesai: normalizeDateTimeWithTanggal(tanggalSesi, petugasForm.waktu_selesai),
      };
      await createSesiAbsensi(payload);
      toast.success('Sesi berhasil dibuat');
      setShowCreateSessionForm(false);
      fetchSessions();
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { message?: string } }; message?: string };
      const m = errObj?.response?.data?.message || errObj?.message || 'Gagal membuat sesi';
      toast.error(String(m));
    } finally {
      setCreatingSession(false);
    }
  }, [petugasForm, selectedKelasId, tanggal, jenisTypeByName, normalizeDateTimeWithTanggal, fetchSessions]);
  
  const handleDeleteSesi = useCallback((sesiId: string) => {
    setDeletingSesiId(sesiId);
    setIsDeleteModalOpen(true);
  }, []);

  const executeDeleteSesi = useCallback(async () => {
    if (!deletingSesiId) return;
    
    setIsDeletingSession(true);
    try {
      const res = await deleteSesiAbsensi(deletingSesiId);
      if (res.success) {
        toast.success('Sesi berhasil dihapus');
        setIsDeleteModalOpen(false);
        setDeletingSesiId(null);
        fetchSessions();
      } else {
        toast.error(res.message || 'Gagal menghapus sesi');
      }
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { message?: string } }; message?: string };
      toast.error(errObj?.response?.data?.message || errObj?.message || 'Gagal menghapus sesi');
    } finally {
      setIsDeletingSession(false);
    }
  }, [deletingSesiId, fetchSessions]);

  // Expand Handler
  const toggleExpand = useCallback(async (sesiId: string) => {
    const isEx = !!expandedRef.current[sesiId];
    setExpanded((p) => ({ ...p, [sesiId]: !isEx }));
    if (!isEx) {
      try {
        const res = await getSesiAbsenSiswa(sesiId);
        setSessionAttendance((p) => ({ ...p, [sesiId]: (res.data as SesiAttendanceRecord[]) || [] }));
      } catch {}
    }
  }, []);

  // Scan Handlers
  const handleOpenScan = useCallback(async (sesiId: string) => {
    toast.dismiss();
    setInputModalSesiId(sesiId);
    setScannerInput('');
    setInputModalOpen(true);
    
    try {
      const res = await getSesiAbsenSiswa(sesiId);
      setSessionAttendance((p) => ({ ...p, [sesiId]: (res.data as SesiAttendanceRecord[]) || [] }));
    } catch {}
  }, []);

  const handleOpenJournal = useCallback((session: SessionData) => {
    setJournalSesiId(session.id);
    setJournalInitialData(session.ProgresMateri || null);
    setJournalModalOpen(true);
  }, []);

  const submitScan = useCallback(async (overrideId?: string, isGuruFromUniversal?: boolean) => {
    const val = overrideId || scannerInput;
    if (!val.trim()) return;
    const token = val.trim();
    setScanLoading(true);
    try {
      const currentSesiId = inputModalSesiIdRef.current;
      const resSessionsList = await getSesiAbsensiList({ summary: true });
      const activeSessions = (resSessionsList.data as SessionData[]) || [];
      const sesi = activeSessions.find((s) => String(s.id) === String(currentSesiId));
      const expectedGuruId = sesi?.guru_id;

      if (isGuruFromUniversal) {
        if (expectedGuruId && token === expectedGuruId) {
          await updateAbsenGuru(currentSesiId, expectedGuruId, { status: 'HADIR' });
          toast.success(`Guru ${sesi?.guru_nama || ''} berhasil dikonfirmasi hadir`, { duration: 8000 });
          await playBeep();
          fetchSessions();
          setScannerInput('');
          scannerInputRef.current?.focus();
        } else {
          toast.error(`Guru yang di-scan tidak sesuai dengan jadwal sesi ini (${sesi?.guru_nama || 'Tanpa Guru'})`, { duration: 8000 });
          setScannerInput('');
          scannerInputRef.current?.focus();
        }
        return;
      }

      if (expectedGuruId && token === expectedGuruId) {
        await updateAbsenGuru(currentSesiId, expectedGuruId, { status: 'HADIR' });
        toast.success(`Guru ${sesi?.guru_nama || ''} berhasil dikonfirmasi hadir`, { duration: 8000 });
        await playBeep();
        fetchSessions();
        setScannerInput('');
        scannerInputRef.current?.focus();
        return;
      }

      const tapRes = await tapSiswaKeSesi(currentSesiId, { siswa_id: token });
      if (tapRes?.success) {
        toast.success('Berhasil dicatat', { duration: 8000 });
        await playBeep();
        const resList = await getSesiAbsenSiswa(currentSesiId);
        setSessionAttendance((p) => ({ ...p, [currentSesiId]: (resList.data as SesiAttendanceRecord[]) || [] }));
        setScannerInput('');
        scannerInputRef.current?.focus();
      } else {
        const msg = String(tapRes?.message || '').toLowerCase();
        if (msg.includes('sudah') || msg.includes('exist')) {
          toast('Siswa sudah terekam', { icon: 'ℹ️', duration: 8000 });
          setScannerInput('');
          scannerInputRef.current?.focus();
        } else {
          toast.error(tapRes?.message || 'Gagal absen siswa', { duration: 8000 });
        }
      }
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { message?: string } }; message?: string };
      const m = errObj?.response?.data?.message || errObj?.message || 'Gagal melakukan scan';
      toast.error(String(m), { duration: 8000 });
    } finally {
      setScanLoading(false);
    }
  }, [scannerInput, playBeep, fetchSessions]);

  const handleFinishSesi = useCallback(async (sesiId: string) => {
    try {
      const res = await updateSesiStatus(sesiId, 'SELESAI');
      if (res.success) {
        toast.success('Sesi berhasil diselesaikan. Absensi ALPA otomatis telah diproses.');
        fetchSessions();
        if (expandedRef.current[sesiId]) {
          const attRes = await getSesiAbsenSiswa(sesiId);
          setSessionAttendance((p) => ({ ...p, [sesiId]: (attRes.data as SesiAttendanceRecord[]) || [] }));
        }
      } else {
        toast.error(res.message || 'Gagal menyelesaikan sesi');
      }
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { message?: string } } };
      toast.error(errObj?.response?.data?.message || 'Gagal menyelesaikan sesi');
    }
  }, [fetchSessions]);

  // Socket
  useEffect(() => {
    const handleSesiUpdate = () => fetchSessions();
    const handleSessionAttendanceUpdate = (payload: SocketPayload) => {
      const isExpanded = expandedRef.current[payload.sesi_id];
      const isModalOpen = inputModalOpenRef.current && inputModalSesiIdRef.current === payload.sesi_id;
      
      if (payload?.sesi_id && (isExpanded || isModalOpen)) {
        getSesiAbsenSiswa(payload.sesi_id).then((res) => {
          setSessionAttendance((p) => ({ ...p, [payload.sesi_id]: (res.data as SesiAttendanceRecord[]) || [] }));
        });
      }
    };

    subscribe('sesi_status_update', handleSesiUpdate);
    subscribe('session_attendance_update', handleSessionAttendanceUpdate);

    return () => {
      unsubscribe('sesi_status_update', handleSesiUpdate);
      unsubscribe('session_attendance_update', handleSessionAttendanceUpdate);
    };
  }, [subscribe, unsubscribe, fetchSessions]);

  // Analytics for Stats Header
  const stats = useMemo(() => {
    const live = sessions.filter((s) => {
      const isFinished = String(s.status || '').toUpperCase() === 'SELESAI';
      const startAt = s.waktu_mulai ? new Date(s.waktu_mulai) : null;
      const endAt = s.waktu_selesai ? new Date(s.waktu_selesai) : null;
      const isLiveByTime = startAt && endAt && new Date() >= startAt && new Date() <= endAt;
      return !isFinished && isLiveByTime;
    }).length;
    
    const pendingJournal = sessions.filter((s) => 
      String(s.status || '').toUpperCase() === 'SELESAI' && 
      (!s.ProgresMateri || !(s.ProgresMateri as { kegiatan?: string }).kegiatan) &&
      (String(s.jenis_kegiatan_nama || '').toUpperCase().includes('KBM') || String(s.jenis_kegiatan || '').toUpperCase().includes('KBM'))
    ).length;

    return { total: sessions.length, live, pendingJournal };
  }, [sessions]);

  return (
    <AttendanceErrorBoundary>
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Operasional Presensi Realtime"
        description="Kelola pencatatan kehadiran siswa di gerbang atau kelas secara langsung dengan validasi otomatis."
      >
        <div className="space-y-12">
          {/* 1. SUPPORTIVE OPERATIONAL HEADER */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnalyticsCard
                title="Sesi Aktif"
                value={stats.live}
                icon={<Activity className="w-5 h-5 text-white" />}
                gradient="from-indigo-500 to-indigo-600"
              />
              <AnalyticsCard
                title="Perlu Jurnal"
                value={stats.pendingJournal}
                icon={<AlertCircle className="w-5 h-5 text-white" />}
                gradient="from-amber-500 to-amber-600"
              />
              <AnalyticsCard
                title="Total Sesi"
                value={stats.total}
                icon={<CheckCircle2 className="w-5 h-5 text-white" />}
                gradient="from-emerald-500 to-emerald-600"
              />
            </div>
          )}

          {/* 2. FILTER & ACTIONS */}
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="flex-1 w-full lg:w-auto">
              <SesiFilterPanel
                tanggal={tanggal}
                onChangeTanggal={setTanggal}
                selectedKelasId={selectedKelasId}
                onChangeKelas={setSelectedKelasId}
                kelasOptions={kelasOptions}
                isGuru={isPetugasSiswa}
                kelasLabel={getKelasLabel}
                onSetToday={() => setTanggal(toLocalDate())}
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              {canCreateSession && tanggal === toLocalDate() && (
                <Button 
                  onClick={handleGenerateFromTemplate} 
                  disabled={generatingTemplate}
                  variant="outline"
                  className="h-12 px-6 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-black text-xs uppercase tracking-widest flex-1 lg:flex-none"
                >
                  {generatingTemplate ? 'Sinkronisasi...' : 'Tarik Sesi Jadwal'}
                </Button>
              )}
              {canCreateSession && (
                <Button 
                  onClick={() => setShowCreateSessionForm(true)}
                  className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 flex-1 lg:flex-none"
                >
                  Buat Sesi Manual
                </Button>
              )}
            </div>
          </div>

          {/* 3. MAIN CONTENT / LIST */}
          <div className="relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <Loader className="mb-6" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Menyiapkan Log Sesi...</p>
              </div>
            ) : errorMsg ? (
              <Alert variant="destructive" className="rounded-xl p-6 border-none bg-red-50 text-red-900 shadow-xl shadow-red-900/5">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="font-bold">{errorMsg}</AlertDescription>
              </Alert>
            ) : sessions.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center p-16 bg-white dark:bg-gray-800/40 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800 text-center space-y-8"
              >
                <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center shadow-inner">
                  <Layers className="w-10 h-10 text-indigo-200 dark:text-indigo-800" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Log Sesi Kosong</h3>
                  <p className="text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                    Sistem belum menemukan sesi tercatat untuk hari ini. Silakan sinkronisasi dari jadwal atau buat sesi manual jika diperlukan.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateSessionForm(true)}
                    className="h-12 px-8 rounded-xl border-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest"
                  >
                    Buat Manual
                  </Button>
                  {canCreateSession && (
                    <Button 
                      onClick={handleGenerateFromTemplate} 
                      disabled={generatingTemplate}
                      className="h-12 px-8 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20"
                    >
                      {generatingTemplate ? 'Memproses...' : 'Tarik dari Jadwal'}
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/20 via-indigo-500/10 to-transparent hidden md:block"></div>
                
                <div className="grid grid-cols-1 gap-6">
                  {sessions?.map((session, idx) => (
                    <motion.div 
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative md:pl-12"
                    >
                      {/* Timeline Node */}
                      <div className="absolute left-3.5 top-8 w-1 h-1 rounded-full bg-indigo-500 hidden md:block ring-8 ring-indigo-500/10"></div>
                      
                      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-xl shadow-black/[0.02] hover:shadow-2xl hover:shadow-indigo-600/5 transition-all">
                        <SesiCard
                          sesi={session}
                          isExpanded={!!expanded[session.id]}
                          counts={session.summary || {}}
                          guruStatusText={String(session.guru_status || '').trim() || 'Belum Hadir'}
                          guruStatusVariant={
                            (() => {
                              const raw = String(session.guru_status || '').trim();
                              const upper = raw.toUpperCase();
                              if (!upper || upper === 'BELUM HADIR' || upper.startsWith('BELUM')) return 'warning';
                              if (upper === 'ALPA') return 'destructive';
                              if (upper === 'HADIR' || upper === 'HADIR / MENGAJAR' || upper.includes('HADIR')) return 'success';
                              return 'warning';
                            })()
                          }
                          canFinish={String(session.status) !== 'SELESAI'}
                          onToggleExpand={() => toggleExpand(session.id)}
                          onFinish={() => handleFinishSesi(session.id)}
                          onDelete={() => handleDeleteSesi(session.id)}
                          onScan={() => handleOpenScan(session.id)}
                          isGuru={isPetugasSiswa}
                          jenisBadgeVariant="secondary"
                          Icon={BookOpen}
                          iconClass="w-4 h-4"
                          mapelLabel={getMapelLabel}
                          guruLabel={getGuruLabel}
                          waktuMulaiText={formatLocalTimeFromISO(session.waktu_mulai) || ''}
                          waktuSelesaiText={formatLocalTimeFromISO(session.waktu_selesai) || ''}
                          showScanGuru={userRole !== 'KEPALA_SEKOLAH' && userRole !== 'KURIKULUM' && userRole !== 'KESISWAAN'}
                          showScanSiswa={userRole !== 'KEPALA_SEKOLAH' && userRole !== 'KURIKULUM' && userRole !== 'KESISWAAN'}
                          canManage={userRole === 'ADMIN' || userRole === 'PETUGAS_KELAS' || (userRole === 'SISWA' && isPetugasSiswa)}
                          onOpenJournal={() => handleOpenJournal(session)}
                        />
                        
                        <AnimatePresence>
                          {expanded[session.id] && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800"
                            >
                              <div className="p-8">
                                <SesiAttendanceList records={sessionAttendance[session.id] || []} sesi={session as unknown as SesiDetail} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sesi Create Modal */}
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

          {/* Sesi Scanning Modal */}
          <SesiScanningModal
            isOpen={inputModalOpen}
            onClose={() => setInputModalOpen(false)}
            scannerInputRef={scannerInputRef}
            scannerInput={scannerInput}
            setScannerInput={setScannerInput}
            scanLoading={scanLoading}
            onSubmitScan={submitScan}
            inputModalSesiId={inputModalSesiId}
            sessionAttendanceRecords={sessionAttendance[inputModalSesiId] || []}
            currentSession={sessions.find((s) => s.id === inputModalSesiId) as unknown as SesiDetail}
            kelasLabel={getKelasLabel(sessions.find((s) => s.id === inputModalSesiId)?.kelas_id)}
          />

          {/* Jurnal KBM Modal */}
          <JurnalKbmModal
            isOpen={journalModalOpen}
            onClose={() => setJournalModalOpen(false)}
            sesiId={journalSesiId}
            initialData={journalInitialData}
            onSuccess={fetchSessions}
            readOnly={userRole === 'SISWA' || userRole === 'KEPALA_SEKOLAH' || userRole === 'KURIKULUM' || userRole === 'KESISWAAN'}
          />

          {/* Delete Confirmation Dialog */}
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
        </div>
      </PremiumFeatureGate>
    </AttendanceErrorBoundary>
  );
};

SessionManagerModuleComponent.displayName = 'SessionManagerModule';
export const SessionManagerModule = React.memo(SessionManagerModuleComponent);
