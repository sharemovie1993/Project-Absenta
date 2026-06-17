import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { Loader } from '../../../../components/ui/Loader';
import { Alert, AlertDescription } from '../../../../components/ui/Alert';
import { Modal, ModalFooter } from '../../../../components/ui/Modal';
import { Input } from '../../../../components/ui/Input';
import { Badge } from '../../../../components/ui';

import { ToastContainer } from '../../../../components/ui/Toast';
import { useToast } from '../../../../hooks/useToast';
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
import { SesiAttendanceList } from '../../../../components/attendance/sesi/SesiAttendanceList';
import { formatLocalDateTime, formatLocalTimeFromISO, roundTo5, toLocalDate } from '../../../../utils/attendance/time';
import { dropdownApi, type DropdownOption } from '../../../../api/dropdown.api';
import { guruApi, mapelApi, siswaApi } from '../../../../api/academic.api';
import { listGuruMapel } from '../../../../api/academic/guru-mapel.api';
import { jenisKegiatanMasterApi } from '../../../../api/academic/jenisKegiatanMaster.api';
import { useSocket } from '../../../../hooks/useSocket';
import { 
  BookOpen, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Users 
} from 'lucide-react';

import { SmartStudentPicker, type Student } from '../../../../components/common/SmartStudentPicker';
import { JurnalKbmModal } from '../../../../components/kurikulum/JurnalKbmModal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';

interface SessionManagerModuleProps {
  selectedKelasId: string;
  setSelectedKelasId: (id: string) => void;
  kelasOptions: DropdownOption[];
  isPetugasSiswa: boolean;
  userRole?: string;
  canCreateSession: boolean;
}

export const SessionManagerModule: React.FC<SessionManagerModuleProps> = ({
  selectedKelasId,
  setSelectedKelasId,
  kelasOptions,
  isPetugasSiswa,
  userRole,
  canCreateSession,
}) => {
  const { user, token: authToken, refreshAccessToken, isTokenValid } = useAuth();
  const { toasts, removeToast, clearAllToasts, success, error, notice } = useToast();
  const { subscribe, unsubscribe } = useSocket();
  
  // State
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tanggal, setTanggal] = useState<string>(toLocalDate());
  
  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSesiId, setDeletingSesiId] = useState<string | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  
  // Expanded State (for attendance list)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sessionAttendance, setSessionAttendance] = useState<Record<string, any[]>>({});
  const [rowUpdating, setRowUpdating] = useState<Record<string, boolean>>({});
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
  const [petugasForm, setPetugasForm] = useState<{ 
    kelas_id: string; 
    guru_id: string; 
    mapel_id?: string; 
    jenis_kegiatan: string; 
    tanggal: string; 
    waktu_mulai: string; 
    waktu_selesai: string 
  }>({ 
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
  const audioCtxRef = useRef<any>(null);

  // Journal State
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalSesiId, setJournalSesiId] = useState('');
  const [journalInitialData, setJournalInitialData] = useState<any>(null);

  const playBeep = async () => {
    try {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current as AudioContext;
      if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
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
  };
  
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const handleGenerateFromTemplate = async () => {
    setGeneratingTemplate(true);
    try {
      const res = await generateSesiFromTemplate();
      if (res.success) {
        success(res.message || 'Sesi otomatis berhasil diproses');
        fetchSessions();
      } else {
        // Jika ada detail error dari Job (individual errors)
        const detailMsg = (res as any).data?.errors?.length > 0 
          ? `\nDetail: ${ (res as any).data.errors[0] }`
          : '';
        error((res.message || 'Gagal membuat sesi dari template') + detailMsg);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Gagal memicu pembuatan sesi';
      error(msg);
    } finally {
      setGeneratingTemplate(false);
    }
  };

  // Focus scanner input when modal opens
  useEffect(() => {
    if (inputModalOpen && scannerInputRef.current) {
      setTimeout(() => scannerInputRef.current?.focus(), 100);
    }
  }, [inputModalOpen]);

  // Helper Functions for Labels
  const getKelasLabel = (id?: string) => kelasOptions.find(k => k.value === id)?.label || id || 'Semua Kelas';
  const getGuruLabel = (id?: string) => guruOptions.find(g => g.value === id)?.label || 'Semua Guru';
  const getMapelLabel = (id?: string) => mapelOptions.find(m => m.value === id)?.label || '-';

  // Fetch Sessions
  const fetchSessions = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: any = { summary: true };
      if (tanggal) params.tanggal = tanggal;
      if (selectedKelasId) params.kelas_id = selectedKelasId;
      
      const res = await getSesiAbsensiList(params);
      setSessions(res.data || []);
    } catch (err: any) {
      setSessions([]);
      const status = err?.response?.status;
      if (status === 403) {
        setErrorMsg('Akses ditolak: Anda bukan PetugasAbsensi aktif untuk kelas yang dipilih.');
      } else {
        setErrorMsg('Gagal memuat sesi.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [selectedKelasId, tanggal]);

  // Load Dropdowns
  useEffect(() => {
    async function initDropdowns() {
      try {
        const guruRes = await guruApi.getAll({ limit: 1000 });
        const guruList: any[] = guruRes.data || [];
        const mappedGuru = guruList.map((g: any) => ({ value: g.id, label: g.nama_guru }));
        
        const mapelRes = await mapelApi.getAll({ limit: 1000 } as any);
        const mapelList: any[] = mapelRes.data || [];
        const mappedMapel = mapelList.map((m: any) => ({ value: m.id, label: m.kode_mapel || m.nama_mapel || m.nama }));
        
        const jenisList = await dropdownApi.getJenisKegiatanMasterForDropdown();
        const jenisMetaRes = await jenisKegiatanMasterApi.getAll({ limit: 1000 });
        const jenisMetaList: any[] = jenisMetaRes.data || [];
        const typeMap: Record<string, string> = {};
        jenisMetaList.forEach((jk: any) => { 
          if (jk?.nama && jk?.tipe) typeMap[String(jk.nama)] = String(jk.tipe); 
          if (jk?.id && jk?.tipe) typeMap[String(jk.id)] = String(jk.tipe); 
        });
        
        setGuruOptions(mappedGuru);
        setMapelOptions(mappedMapel);
        setAllMapelOptions(mappedMapel);
        setJenisOptions(jenisList);
        setJenisTypeByName(typeMap);
      } catch {}
    }
    initDropdowns();
  }, []);

  // Filter Mapel based on Guru
  useEffect(() => {
    async function loadMapelForGuru() {
      try {
        const gid = petugasForm.guru_id;
        if (!gid) { setMapelOptions(allMapelOptions); return; }
        const res = await listGuruMapel({ guru_id: gid });
        const items = res.data || [];
        if (items.length === 0) { setMapelOptions(allMapelOptions); return; }
        const filtered = items.map((gm: any) => {
          const fromRel = gm.Mapel ? (gm.Mapel.kode_mapel || gm.Mapel.nama_mapel || gm.Mapel.nama) : undefined;
          const fallback = allMapelOptions.find((o: any) => String(o.value) === String(gm.mapel_id))?.label || gm.mapel_id;
          return { value: gm.mapel_id, label: fromRel || fallback };
        });
        setMapelOptions(filtered);
      } catch {
        setMapelOptions(allMapelOptions);
      }
    }
    loadMapelForGuru();
  }, [petugasForm.guru_id, allMapelOptions]);

  const normalizeDateTimeWithTanggal = (tanggalValue: string, dt: string): string => {
    const datePart = String(tanggalValue || '').trim();
    if (!datePart) return dt;
    const raw = String(dt || '').trim();
    const timePart = raw.includes('T') ? raw.split('T')[1] : raw;
    const hhmm = String(timePart || '').slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(hhmm)) return dt;
    return `${datePart}T${hhmm}`;
  };

  // Create Session Handler
  const handleCreateSession = async () => {
    const kelasId = petugasForm.kelas_id || selectedKelasId || '';
    const tanggalSesi = petugasForm.tanggal || tanggal || toLocalDate();

    if (!kelasId) {
      notice('Pilih kelas terlebih dahulu');
      return;
    }
    if (!petugasForm.jenis_kegiatan) {
      notice('Pilih jenis kegiatan terlebih dahulu');
      return;
    }
    if (!petugasForm.waktu_mulai || !petugasForm.waktu_selesai) {
      notice('Mohon lengkapi waktu mulai dan selesai');
      return;
    }
    const t = jenisTypeByName[petugasForm.jenis_kegiatan] || '';
    if ((t === 'KBM' || t === 'ESKUL') && !petugasForm.guru_id) {
      notice('Pilih guru untuk kegiatan KBM/Eskul');
      return;
    }
    if (t === 'KBM' && !petugasForm.mapel_id) {
      notice('Pilih mata pelajaran untuk kegiatan KBM');
      return;
    }
    
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
      success('Sesi berhasil dibuat');
      setShowCreateSessionForm(false);
      fetchSessions();
    } catch (e: any) {
      const m = e?.response?.data?.message || e?.message || 'Gagal membuat sesi';
      error(String(m));
    } finally {
      setCreatingSession(false);
    }
  };
  
  const handleDeleteSesi = (sesiId: string) => {
    setDeletingSesiId(sesiId);
    setIsDeleteModalOpen(true);
  };

  const executeDeleteSesi = async () => {
    if (!deletingSesiId) return;
    
    setIsDeletingSession(true);
    try {
      const res = await deleteSesiAbsensi(deletingSesiId);
      if (res.success) {
        success('Sesi berhasil dihapus');
        setIsDeleteModalOpen(false);
        setDeletingSesiId(null);
        fetchSessions();
      } else {
        error(res.message || 'Gagal menghapus sesi');
      }
    } catch (e: any) {
      error(e?.response?.data?.message || e?.message || 'Gagal menghapus sesi');
    } finally {
      setIsDeletingSession(false);
    }
  };

  // Expand Handler
  const toggleExpand = async (sesiId: string) => {
    const isEx = !!expanded[sesiId];
    setExpanded(p => ({ ...p, [sesiId]: !isEx }));
    if (!isEx) {
      try {
        const res = await getSesiAbsenSiswa(sesiId);
        setSessionAttendance(p => ({ ...p, [sesiId]: res.data || [] }));
      } catch {}
    }
  };

  // Scan Handlers
  const handleOpenScan = async (sesiId: string) => {
    clearAllToasts();
    setInputModalSesiId(sesiId);
    setScannerInput('');
    setInputModalOpen(true);
    
    // Pre-fetch attendance list for the modal
    try {
      const res = await getSesiAbsenSiswa(sesiId);
      setSessionAttendance(p => ({ ...p, [sesiId]: res.data || [] }));
    } catch {}
  };

  const handleOpenJournal = (session: any) => {
    setJournalSesiId(session.id);
    setJournalInitialData(session.ProgresMateri || null);
    setJournalModalOpen(true);
  };

  const submitScan = async (overrideId?: string, isGuruFromUniversal?: boolean) => {
    const val = overrideId || scannerInput;
    if (!val.trim()) return;
    const token = val.trim();
    setScanLoading(true);
    try {
      // Determine if we should process as Guru or Siswa
      // In universal mode, we use the isGuruFromUniversal flag or detect from the token
      const sesi = sessions.find(s => String(s.id) === String(inputModalSesiId));
      const expectedGuruId = sesi?.guru_id;

      // Logic: Strict Identification
      // 1. If the scanned entity is identified as a GURU
      if (isGuruFromUniversal) {
        if (expectedGuruId && token === expectedGuruId) {
          await updateAbsenGuru(inputModalSesiId, expectedGuruId!, { status: 'HADIR' });
          success(`Guru ${sesi?.guru_nama || ''} berhasil dikonfirmasi hadir`, { duration: 8000 });
          await playBeep();
          fetchSessions();
          setScannerInput('');
          scannerInputRef.current?.focus();
        } else {
          // Scanned a guru, but not the one assigned to this session
          error(`Guru yang di-scan tidak sesuai dengan jadwal sesi ini (${sesi?.guru_nama || 'Tanpa Guru'})`, { duration: 8000 });
          setScannerInput('');
          scannerInputRef.current?.focus();
        }
        return;
      }

      // 2. If it matches the expectedGuruId directly (fallback for HID direct scan without _type mark)
      if (expectedGuruId && token === expectedGuruId) {
        await updateAbsenGuru(inputModalSesiId, expectedGuruId!, { status: 'HADIR' });
        success(`Guru ${sesi?.guru_nama || ''} berhasil dikonfirmasi hadir`, { duration: 8000 });
        await playBeep();
        fetchSessions();
        setScannerInput('');
        scannerInputRef.current?.focus();
        return;
      }

      // 3. Default: Process as Siswa
      const tapRes = await tapSiswaKeSesi(inputModalSesiId, { siswa_id: token });
      if (tapRes?.success) {
        success('Berhasil dicatat', { duration: 8000 });
        await playBeep();
        const resList = await getSesiAbsenSiswa(inputModalSesiId);
        setSessionAttendance(p => ({ ...p, [inputModalSesiId]: resList.data || [] }));
        setScannerInput('');
        scannerInputRef.current?.focus();
      } else {
        const msg = String(tapRes?.message || '').toLowerCase();
        if (msg.includes('sudah') || msg.includes('exist')) {
          notice(`Siswa sudah terekam`, { duration: 8000 });
          setScannerInput('');
          scannerInputRef.current?.focus();
        } else {
          error(tapRes?.message || 'Gagal absen siswa', { duration: 8000 });
        }
      }
    } catch (e: any) {
      const m = e?.response?.data?.message || e?.message || 'Gagal melakukan scan';
      error(String(m), { duration: 8000 });
    } finally {
      setScanLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        submitScan();
    }
  };

  // Manual Tap (Simulate Tap from list) - Not currently used by SesiAttendanceList but kept for logic
  const handleManualTap = async (sesiId: string, siswaId: string, status: string) => {
    setRowUpdating(p => ({ ...p, [`${sesiId}_${siswaId}`]: true }));
    try {
      await tapSiswaKeSesi(sesiId, {
        siswa_id: siswaId,
        status: status as any
      });
      success(`Status ${status} berhasil dicatat`);
      // Refresh list
      const res = await getSesiAbsenSiswa(sesiId);
      setSessionAttendance(p => ({ ...p, [sesiId]: res.data || [] }));
    } catch (e: any) {
      error(e?.response?.data?.message || 'Gagal update status');
    } finally {
      setRowUpdating(p => ({ ...p, [`${sesiId}_${siswaId}`]: false }));
    }
  };

  const handleFinishSesi = async (sesiId: string) => {
    try {
      const res = await updateSesiStatus(sesiId, 'SELESAI');
      if (res.success) {
        success('Sesi berhasil diselesaikan. Absensi ALPA otomatis telah diproses.');
        fetchSessions();
        // If expanded, refresh the attendance list too
        if (expanded[sesiId]) {
          const attRes = await getSesiAbsenSiswa(sesiId);
          setSessionAttendance(p => ({ ...p, [sesiId]: attRes.data || [] }));
        }
      } else {
        error(res.message || 'Gagal menyelesaikan sesi');
      }
    } catch (e: any) {
      error(e?.response?.data?.message || 'Gagal menyelesaikan sesi');
    }
  };

  // Socket
  useEffect(() => {
    const handleSesiUpdate = () => fetchSessions();
    const handleSessionAttendanceUpdate = (payload: any) => {
      const isExpanded = expandedRef.current[payload.sesi_id];
      const isModalOpen = inputModalOpenRef.current && inputModalSesiIdRef.current === payload.sesi_id;
      
      if (payload?.sesi_id && (isExpanded || isModalOpen)) {
        getSesiAbsenSiswa(payload.sesi_id).then((res) => {
          setSessionAttendance((p) => ({ ...p, [payload.sesi_id]: res.data || [] }));
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
    const live = sessions.filter(s => {
      const isFinished = String(s.status || '').toUpperCase() === 'SELESAI';
      const startAt = s.waktu_mulai ? new Date(s.waktu_mulai) : null;
      const endAt = s.waktu_selesai ? new Date(s.waktu_selesai) : null;
      const isLiveByTime = startAt && endAt && new Date() >= startAt && new Date() <= endAt;
      return !isFinished && isLiveByTime;
    }).length;
    
    const pendingJournal = sessions.filter(s => 
      String(s.status || '').toUpperCase() === 'SELESAI' && 
      (!s.ProgresMateri || !s.ProgresMateri.kegiatan) &&
      (String(s.jenis_kegiatan_nama || '').toUpperCase().includes('KBM') || String(s.jenis_kegiatan || '').toUpperCase().includes('KBM'))
    ).length;

    return { total: sessions.length, live, pendingJournal };
  }, [sessions]);

  return (
    <div className="space-y-12">
      {/* 1. SUPPORTIVE OPERATIONAL HEADER */}
      {sessions.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-6 shadow-xl shadow-black/[0.02]"
            >
               <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center">
                  <Activity className="w-7 h-7 text-indigo-600" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sesi Aktif</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.live}</p>
               </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-6 shadow-xl shadow-black/[0.02]"
            >
               <div className="w-14 h-14 rounded-xl bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-amber-500" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Perlu Jurnal</p>
                  <p className="text-2xl font-black text-amber-600">{stats.pendingJournal}</p>
               </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-6 shadow-xl shadow-black/[0.02]"
            >
               <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Sesi</p>
                  <p className="text-2xl font-black text-emerald-600">{stats.total}</p>
               </div>
            </motion.div>
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
               <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-6"></div>
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
                  {sessions.map((session, idx) => (
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
                                       <SesiAttendanceList records={sessionAttendance[session.id] || []} sesi={session} />
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

      {/* Create Session Modal */}
      <Modal isOpen={showCreateSessionForm} onClose={() => setShowCreateSessionForm(false)} title="Buat Sesi Absensi Manual">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Kelas</label>
            <SearchableSelect
              value={petugasForm.kelas_id}
              onValueChange={v => setPetugasForm(f => ({ ...f, kelas_id: v }))}
              options={kelasOptions}
              placeholder="Pilih Kelas"
              triggerClassName="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-sm font-medium">Jenis Kegiatan</label>
               <SearchableSelect
                 value={petugasForm.jenis_kegiatan}
                 onValueChange={v => setPetugasForm(f => ({ ...f, jenis_kegiatan: v }))}
                 options={jenisOptions}
                 placeholder="Pilih Jenis"
               />
             </div>
             <div className="space-y-1">
               <label className="text-sm font-medium">Tanggal</label>
               <Input
                 type="date"
                 value={petugasForm.tanggal}
                 onChange={e => {
                   const nextDate = e.target.value;
                   setPetugasForm(f => ({
                     ...f,
                     tanggal: nextDate,
                     waktu_mulai: normalizeDateTimeWithTanggal(nextDate, f.waktu_mulai),
                     waktu_selesai: normalizeDateTimeWithTanggal(nextDate, f.waktu_selesai),
                   }));
                 }}
               />
             </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Guru (Opsional/Wajib KBM)</label>
            <SearchableSelect
              value={petugasForm.guru_id}
              onValueChange={v => setPetugasForm(f => ({ ...f, guru_id: v }))}
              options={guruOptions}
              placeholder="Pilih Guru"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Mata Pelajaran (Opsional)</label>
            <SearchableSelect
              value={petugasForm.mapel_id}
              onValueChange={v => setPetugasForm(f => ({ ...f, mapel_id: v }))}
              options={mapelOptions}
              placeholder="Pilih Mapel"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-sm font-medium">Waktu Mulai</label>
               <Input type="datetime-local" value={petugasForm.waktu_mulai} onChange={e => setPetugasForm(f => ({ ...f, waktu_mulai: e.target.value }))} />
             </div>
             <div className="space-y-1">
               <label className="text-sm font-medium">Waktu Selesai</label>
               <Input type="datetime-local" value={petugasForm.waktu_selesai} onChange={e => setPetugasForm(f => ({ ...f, waktu_selesai: e.target.value }))} />
             </div>
          </div>
        </div>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setShowCreateSessionForm(false)}>Batal</Button>
          <Button type="button" onClick={handleCreateSession} disabled={creatingSession}>{creatingSession ? 'Menyimpan...' : 'Simpan'}</Button>
        </ModalFooter>
      </Modal>

      {/* Scanning Modal */}
      <Modal
        isOpen={inputModalOpen}
        onClose={() => setInputModalOpen(false)}
        title="Input Presensi Sesi (Universal)"
        size="2xl"
        className="max-h-[96vh]"
        contentClassName="max-h-[88vh]"
      >
         <div className="space-y-6">
            <Alert className="rounded-xl border-none bg-indigo-50/50 dark:bg-indigo-900/20">
              <AlertDescription className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                 Silakan scan kartu/QR atau ketik Nama/ID/RFID. Sistem akan otomatis mengenali Guru atau Siswa.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
               <div className="bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <SmartStudentPicker 
                    ref={scannerInputRef}
                    value={scannerInput}
                    onChange={setScannerInput}
                    placeholder="Scan/Ketik Nama, NIS, NIP, atau RFID..."
                    disabled={scanLoading}
                    mode="universal"
                    onSelect={(item: Student) => submitScan(item.id, (item as any)._type === 'guru')}
                    scope="global"
                  />
               </div>
               
               <div className="flex justify-end">
                 <Button 
                   onClick={() => submitScan()} 
                   disabled={scanLoading || !scannerInput.trim()}
                   className="h-10 px-6 rounded-xl bg-indigo-600 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20"
                 >
                    {scanLoading ? 'Memproses...' : 'Submit Manual'}
                 </Button>
               </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
               <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <Users size={14} className="text-indigo-500" />
                     Daftar Hadir Sesi
                  </h4>
                  <Badge variant="outline" className="text-[9px] font-black uppercase">
                     {getKelasLabel(sessions.find(s => s.id === inputModalSesiId)?.kelas_id)}
                  </Badge>
               </div>
               
               <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  <SesiAttendanceList 
                    records={sessionAttendance[inputModalSesiId] || []} 
                    sesi={sessions.find(s => s.id === inputModalSesiId)} 
                  />
               </div>
            </div>

            <ToastContainer toasts={toasts} onRemove={removeToast} className="space-y-2 w-full" />
         </div>
      </Modal>

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
  );
};
