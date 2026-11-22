import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Scan, 
  Camera, 
  QrCode, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  Search, 
  UserPlus, 
  ShieldAlert, 
  Check, 
  X, 
  LogIn, 
  LogOut,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { submitTap, bypassLate, type TapPayload } from '@/api/attendanceGerbang.api';
import { siswaApi, guruApi } from '@/api/academic.api';
import { getGerbangDashboardStats } from '@/api/dashboard.api';
import { useDebounce } from '@/hooks/useDebounce';
import { useSocket } from '@/hooks/useSocket';
import { GuestAccessModal } from '@/components/attendance/gerbang/GuestAccessModal';
import type { RecentScanRecord } from '../types';

interface SatpamScanGerbangTabProps {
  initialActivities?: RecentScanRecord[];
  onTapSuccess?: () => void;
  isLoading?: boolean;
}

// Zero-asset Web Audio Synthesizer Beep
const playBeep = (type: 'success' | 'warning' | 'error') => {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'warning') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Ignore audio autoplay restrictions
  }
};

export const SatpamScanGerbangTab: React.FC<SatpamScanGerbangTabProps> = ({
  initialActivities,
  onTapSuccess,
  isLoading = false,
}) => {
  // Mode Arah (Masuk vs Pulang)
  const [arah, setArah] = useState<'GERBANG_DATANG' | 'GERBANG_PULANG'>(() => {
    const h = new Date().getHours();
    return (h >= 11) ? 'GERBANG_PULANG' : 'GERBANG_DATANG';
  });

  // Mode Sub-Tab Input: 'SCANNER' (Hardware Barcode/RFID) vs 'PICKER' (Smart Student/Guru Picker - Lupa Kartu)
  const [inputSubTab, setInputSubTab] = useState<'SCANNER' | 'PICKER'>('SCANNER');

  // Mode Bypass (Anti Keterlambatan)
  const [isBypassMode, setIsBypassMode] = useState<boolean>(false);

  // Modal Tamu Cepat
  const [isGuestModalOpen, setIsGuestModalOpen] = useState<boolean>(false);

  // Audio Mute State
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const activeGate = 'Pos Gerbang Utama 1';

  // State Scanner Hardware
  const [scannerInput, setScannerInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // State Smart Search (Lupa Kartu)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isSearchingCandidates, setIsSearchingCandidates] = useState<boolean>(false);

  // State Live Data & History Feed
  const [feedTaps, setFeedTaps] = useState<RecentScanRecord[]>(initialActivities || []);
  const [lastScanned, setLastScanned] = useState<RecentScanRecord | null>(null);

  // Counter lokal real-time
  const [miniStats, setMiniStats] = useState<{ masuk: number; keluar: number }>({
    masuk: 0,
    keluar: 0,
  });

  // Socket Live Feed Connection
  const { isConnected, subscribe, unsubscribe } = useSocket();

  // Load Initial Gerbang Stats & Live Feed
  const fetchGerbangFeed = useCallback(async () => {
    try {
      const res = await getGerbangDashboardStats();
      if (res?.data) {
        const d = res.data;
        setMiniStats({
          masuk: d.hadir_hari_ini ?? d.total_masuk ?? 0,
          keluar: d.total_keluar ?? 0,
        });

        if (Array.isArray(d.recent_activities) && d.recent_activities.length > 0) {
          const formatted: RecentScanRecord[] = d.recent_activities.map((item: any) => ({
            id: item.id || `tap-${Math.random()}`,
            nama: item.nama || item.siswa || 'Siswa',
            nisn: item.nisn || '-',
            kelas: item.kelas || '-',
            status: item.status || (item.arah === 'GERBANG_PULANG' ? 'PULANG' : 'HADIR'),
            jam: item.jam || new Date(item.waktu || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            gate: item.gate || 'Pos Gerbang Utama 1',
            foto: item.foto || undefined,
          }));
          setFeedTaps(formatted);
          if (!lastScanned && formatted[0]) {
            setLastScanned(formatted[0]);
          }
        }
      }
    } catch {
      // Ignore network fallback
    }
  }, [lastScanned]);

  useEffect(() => {
    fetchGerbangFeed();
  }, [fetchGerbangFeed]);

  // Sync initialActivities jika disediakan dari parent
  useEffect(() => {
    if (initialActivities && initialActivities.length > 0) {
      setFeedTaps(initialActivities);
      if (!lastScanned) {
        setLastScanned(initialActivities[0]);
      }
    }
  }, [initialActivities, lastScanned]);

  // Focus Input Field Helper
  const focusScannerInput = useCallback(() => {
    if (inputSubTab === 'SCANNER') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [inputSubTab]);

  useEffect(() => {
    focusScannerInput();
  }, [focusScannerInput, arah]);

  // Global RFID & Barcode Scanner Keyboard Listener
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (inputSubTab !== 'SCANNER') return;
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && target.id !== 'satpam-scanner-input') {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const scanned = bufferRef.current.trim() || scannerInput.trim();
        if (scanned) {
          bufferRef.current = '';
          setScannerInput('');
          handleProcessScan(scanned);
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
        setScannerInput(bufferRef.current);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 1500);
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputSubTab, scannerInput]);

  // Real-time Socket Event Listener (Korelasi Langsung dengan Petugas Kelas & Server)
  useEffect(() => {
    if (!isConnected) return;

    const handleSocketTap = (payload: any) => {
      // Refresh count dan feed bila ada tap dari gerbang mana pun atau kelas
      fetchGerbangFeed();
      onTapSuccess?.();
    };

    subscribe('gerbang_tap_update', handleSocketTap);
    subscribe('attendance_update', handleSocketTap);

    return () => {
      unsubscribe('gerbang_tap_update', handleSocketTap);
      unsubscribe('attendance_update', handleSocketTap);
    };
  }, [isConnected, fetchGerbangFeed, onTapSuccess, subscribe, unsubscribe]);

  // Query Pencarian Siswa / Guru (Lupa Kartu)
  useEffect(() => {
    const term = debouncedSearch.trim();
    if (term.length < 2) {
      setCandidates([]);
      setIsSearchingCandidates(false);
      return;
    }

    let isCancelled = false;
    setIsSearchingCandidates(true);

    Promise.all([
      siswaApi.getAll({
        search: term,
        limit: 8,
        search_fields: ['nama_siswa', 'nisn', 'nis', 'no_rfid', 'id'],
        elevated_context: 'true',
        context: 'elevated'
      } as any).catch(() => ({ data: [] })),
      guruApi.getAll({
        search: term,
        limit: 4,
        search_fields: ['nama_guru', 'nip', 'nik', 'no_rfid', 'id'],
        elevated_context: 'true',
        context: 'elevated'
      } as any).catch(() => ({ data: [] }))
    ]).then(([resSiswa, resGuru]) => {
      if (isCancelled) return;
      const sList = (resSiswa?.data || []).map((s: any) => ({
        ...s,
        entityType: 'SISWA',
        displayName: s.nama_siswa,
        displayId: s.nisn || s.nis || s.id,
        subLabel: s.Kelas?.nama_kelas || 'Siswa'
      }));
      const gList = (resGuru?.data || []).map((g: any) => ({
        ...g,
        entityType: 'GURU',
        displayName: g.nama_guru,
        displayId: g.nip || g.nik || g.id,
        subLabel: g.jenis_ptk || 'Guru / Pegawai'
      }));
      setCandidates([...sList, ...gList]);
      setIsSearchingCandidates(false);
    }).catch(() => {
      if (!isCancelled) setIsSearchingCandidates(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch]);

  // Eksekusi Tap Riil ke Backend (submitTap / bypassLate)
  const handleProcessScan = useCallback(async (codeOrId: string, directInfo?: any) => {
    const trimmed = String(codeOrId || '').trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    const now = new Date();
    const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    try {
      if (isBypassMode) {
        // Mode Bypass: Force Hadir tanpa status terlambat
        const targetId = directInfo?.id || trimmed;
        const res = await bypassLate({ siswa_id: targetId, note: 'Bypass Gerbang Satpam' });
        
        if (res.success) {
          const sInfo = (res as any).data;
          const nama = sInfo?.nama_siswa || directInfo?.displayName || 'Siswa';
          const kelas = sInfo?.kelas && sInfo.kelas !== '-' ? sInfo.kelas : (directInfo?.subLabel || '-');
          
          const record: RecentScanRecord = {
            id: `tap-bypass-${Date.now()}`,
            nama,
            nisn: sInfo?.nisn || directInfo?.displayId || trimmed,
            kelas,
            status: 'HADIR',
            jam: jamStr,
            gate: activeGate,
            foto: sInfo?.foto || directInfo?.foto,
          };

          setLastScanned(record);
          setFeedTaps((prev) => [record, ...prev.slice(0, 24)]);
          setMiniStats((prev) => ({ ...prev, masuk: prev.masuk + 1 }));

          if (!isMuted) playBeep('success');
          toast.success(`BYPASS BERHASIL: ${nama} (${kelas})`, { icon: '🛡️', position: 'bottom-center' });

          onTapSuccess?.();
          setSearchTerm('');
        } else {
          const errMsg = (res as any).message || 'Gagal memproses bypass gerbang';
          if (!isMuted) playBeep('error');
          toast.error(errMsg, { position: 'bottom-center' });
        }
        return;
      }

      // Mode Presensi Standar: Hubungkan ke endpoint riil submitTap
      const targetId = directInfo?.id || trimmed;
      const tapRes = await submitTap({
        siswa_id: targetId,
        arah,
        device_id: 'POS_GERBANG_1',
        rfid: trimmed,
      });

      if (tapRes.success) {
        const sInfo = (tapRes as any).data?.siswa_info;
        const gInfo = (tapRes as any).data?.guru_info;
        const resStatus = (tapRes as any).data?.status || 'HADIR';
        const isLate = resStatus === 'TERLAMBAT' || (tapRes as any).data?.is_terlambat === true;

        let personName = '';
        let personKelas = '';
        let personNisn = '';
        let personFoto = '';

        if (sInfo) {
          personName = sInfo.nama || directInfo?.displayName || 'Siswa';
          personKelas = sInfo.nama_kelas || directInfo?.subLabel || '-';
          personNisn = sInfo.nis || directInfo?.displayId || trimmed;
          personFoto = sInfo.foto_url || sInfo.foto || directInfo?.foto;
        } else if (gInfo) {
          personName = gInfo.nama || directInfo?.displayName || 'Guru';
          personKelas = gInfo.jenis_ptk || 'Guru / Pegawai';
          personNisn = gInfo.nip || directInfo?.displayId || trimmed;
          personFoto = gInfo.foto_url || gInfo.foto || directInfo?.foto;
        } else {
          personName = directInfo?.displayName || `Siswa (${trimmed.slice(-4)})`;
          personKelas = directInfo?.subLabel || 'Siswa';
          personNisn = directInfo?.displayId || trimmed;
        }

        const record: RecentScanRecord = {
          id: (tapRes as any).data?.id || `tap-${Date.now()}`,
          nama: personName,
          nisn: personNisn,
          kelas: personKelas,
          status: isLate ? 'TERLAMBAT' : (arah === 'GERBANG_PULANG' ? 'PULANG' : 'HADIR'),
          jam: jamStr,
          gate: activeGate,
          foto: personFoto,
        };

        setLastScanned(record);
        setFeedTaps((prev) => [record, ...prev.slice(0, 24)]);
        
        if (arah === 'GERBANG_DATANG') {
          setMiniStats((prev) => ({ ...prev, masuk: prev.masuk + 1 }));
        } else {
          setMiniStats((prev) => ({ ...prev, keluar: prev.keluar + 1 }));
        }

        if (!isMuted) {
          playBeep(isLate ? 'warning' : 'success');
        }

        if (isLate) {
          toast.error(`Terlambat: ${personName} (${jamStr})`, { icon: '⚠️', position: 'bottom-center' });
        } else {
          toast.success(`Hadir: ${personName} (${arah === 'GERBANG_PULANG' ? 'Pulang' : 'Masuk'})`, { icon: '✅', position: 'bottom-center' });
        }

        onTapSuccess?.();
        setSearchTerm('');
      } else {
        const errMsg = (tapRes as any).message || 'Gagal mencatat tap gerbang';
        if (!isMuted) playBeep('error');
        toast.error(errMsg, { position: 'bottom-center' });
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || e.message || 'Kartu atau ID tidak terdaftar di sistem';
      if (!isMuted) playBeep('error');
      toast.error(errMsg, { position: 'bottom-center' });
    } finally {
      setIsProcessing(false);
      setScannerInput('');
      focusScannerInput();
    }
  }, [arah, isBypassMode, isMuted, isProcessing, onTapSuccess, focusScannerInput]);

  const handleScannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessScan(scannerInput);
  };

  return (
    <div className="space-y-4">
      {/* ── TOP CONTROL BAR: ARAH MASUK/PULANG & BYPASS MODE ────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Direction Switcher with Real-time Counters */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto">
          <button
            type="button"
            onClick={() => setArah('GERBANG_DATANG')}
            className={cn(
              "flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              arah === 'GERBANG_DATANG'
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <LogIn size={15} />
            <span>MASUK</span>
            <span className={cn(
              "text-[11px] font-mono font-black px-2 py-0.5 rounded-full",
              arah === 'GERBANG_DATANG'
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            )}>
              {miniStats.masuk}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setArah('GERBANG_PULANG')}
            className={cn(
              "flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              arah === 'GERBANG_PULANG'
                ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <LogOut size={15} />
            <span>PULANG</span>
            <span className={cn(
              "text-[11px] font-mono font-black px-2 py-0.5 rounded-full",
              arah === 'GERBANG_PULANG'
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            )}>
              {miniStats.keluar}
            </span>
          </button>
        </div>

        {/* Right Tools: Mode Bypass + Catat Tamu + Suara Beep */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* Mode Bypass Switch */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors",
            isBypassMode
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
          )}>
            <ShieldAlert size={15} className={isBypassMode ? "text-amber-500 animate-pulse" : "text-slate-400"} />
            <span className="text-[11px] font-bold">Mode Bypass</span>
            <Switch
              checked={isBypassMode}
              onChange={(val: boolean) => setIsBypassMode(val)}
              className="scale-75 origin-right"
            />
          </div>

          {/* Quick Catat Tamu Button */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsGuestModalOpen(true)}
            className="h-9 px-3 rounded-xl border-purple-200 dark:border-purple-800 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold gap-1.5"
          >
            <UserPlus size={14} />
            <span>Catat Tamu</span>
          </Button>

          {/* Audio Beep Switcher */}
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title={isMuted ? 'Nyalakan Suara Beep' : 'Bisukan Suara Beep'}
            aria-label="Toggle Suara Beep"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-emerald-600 dark:text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* ── LEFT: SCAN TERMINAL & SMART PICKER (7 COLS) ────────────── */}
        <div className="lg:col-span-7 space-y-4">
          <div className={cn(
            "bg-white dark:bg-slate-900 border rounded-3xl p-5 sm:p-6 text-slate-900 dark:text-white shadow-xs dark:shadow-xl space-y-4 transition-all duration-200",
            isBypassMode
              ? "border-amber-400 ring-4 ring-amber-400/20"
              : "border-slate-200/80 dark:border-slate-800"
          )}>
            {/* Header Pos Status & Input Mode Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center border",
                  isBypassMode
                    ? "bg-amber-50 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
                    : "bg-rose-50 dark:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30"
                )}>
                  {isBypassMode ? <ShieldAlert size={20} /> : <Camera size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    {isBypassMode ? 'Terminal Bypass Aktif (Force Hadir)' : 'Terminal Scan RFID & Barcode Gerbang'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {inputSubTab === 'SCANNER' ? 'Siap menerima tap kartu fisik & scanner barcode USB' : 'Pencarian cepat siswa atau guru yang lupa membawa kartu'}
                  </p>
                </div>
              </div>

              {/* Input Sub-Tab Switcher: Terminal Scan vs Cari Siswa (Lupa Kartu) */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setInputSubTab('SCANNER')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    inputSubTab === 'SCANNER'
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <Scan size={13} />
                  <span>Scan RFID</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputSubTab('PICKER')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    inputSubTab === 'PICKER'
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <Search size={13} />
                  <span>Lupa Kartu</span>
                </button>
              </div>
            </div>

            {/* ── SUB-PANEL 1: SCANNER VIEWPORT FRAME (AUTO-FOCUS RFID/BARCODE) ── */}
            {inputSubTab === 'SCANNER' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="relative w-full h-48 sm:h-56 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-emerald-300/80 dark:border-emerald-500/30 flex flex-col items-center justify-center text-center p-6 space-y-3 overflow-hidden group select-none">
                  {/* Animated Laser Reticle */}
                  <div className="absolute inset-x-0 h-0.5 bg-emerald-500/80 dark:bg-emerald-400 shadow-[0_0_15px_#10b981] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none" />

                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs dark:shadow-inner group-hover:scale-105 transition-transform">
                    <QrCode size={34} />
                  </div>
                  <div className="space-y-1 relative z-10 max-w-sm">
                    <h4 className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase">
                      Tempelkan Kartu Siswa ke Reader USB
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Alat scanner otomatis membaca kode RFID / Barcode tanpa perlu klik mouse
                    </p>
                  </div>
                </div>

                {/* Input Bar for Hardware Reader & Manual Input */}
                <form onSubmit={handleScannerSubmit} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="uppercase tracking-wider">Input Barcode / NISN Fisik:</span>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">Auto-Focus Ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Scan className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                      <Input
                        ref={inputRef}
                        id="satpam-scanner-input"
                        type="text"
                        value={scannerInput}
                        onChange={(e) => setScannerInput(e.target.value)}
                        placeholder="Scan kartu RFID atau ketik NISN/NIP..."
                        aria-label="Scan kartu atau ketik NISN"
                        className="pl-10 h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs rounded-2xl focus:border-rose-500"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isProcessing || !scannerInput.trim()}
                      className="h-11 px-5 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm dark:shadow-lg dark:shadow-rose-950/40 gap-1.5 shrink-0"
                    >
                      {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                      <span>Tap ({arah === 'GERBANG_DATANG' ? 'Masuk' : 'Pulang'})</span>
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* ── SUB-PANEL 2: SMART STUDENT & GURU PICKER (LUPA KARTU) ────── */}
            {inputSubTab === 'PICKER' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="uppercase tracking-wider">Pencarian Siswa / Guru Lupa Kartu</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400">Tekan Enter untuk kandidat pertama</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && candidates.length > 0) {
                          e.preventDefault();
                          handleProcessScan(candidates[0].id, candidates[0]);
                        }
                      }}
                      placeholder="Ketik Nama Siswa, Guru, NISN, NIP, atau No RFID..."
                      className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Candidate List */}
                {isSearchingCandidates && (
                  <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-blue-500" />
                    <span>Mencari data siswa & guru...</span>
                  </div>
                )}

                {!isSearchingCandidates && debouncedSearch.trim().length >= 2 && candidates.length === 0 && (
                  <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    Tidak ditemukan siswa atau guru dengan kata kunci &quot;{debouncedSearch}&quot;
                  </div>
                )}

                {candidates.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                    {candidates.map((item: any) => (
                      <div
                        key={item.id}
                        onClick={() => handleProcessScan(item.id, item)}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0",
                            item.entityType === 'GURU'
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          )}>
                            {item.entityType === 'GURU' ? 'GURU' : 'SISWA'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors truncate">
                              {item.displayName}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
                              <span className="font-medium">{item.subLabel}</span>
                              {item.displayId && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{item.displayId}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          disabled={isProcessing}
                          className="h-8 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0 group-hover:scale-105 transition-transform"
                        >
                          {isProcessing ? <RefreshCw size={12} className="animate-spin" /> : 'Catat'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── CARD HASIL TAP TERAKHIR (LIVE VISUAL) ────────────────── */}
          {lastScanned && (
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                  {lastScanned.foto ? (
                    <img src={resolveProfilePhotoUrl(lastScanned.foto)} alt={lastScanned.nama} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                      {lastScanned.nama.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {lastScanned.nama}
                    </h4>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      lastScanned.status === 'TERLAMBAT'
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        : lastScanned.status === 'PULANG'
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    )}>
                      {lastScanned.status === 'TERLAMBAT' ? 'Terlambat' : (lastScanned.status === 'PULANG' ? 'Absen Pulang' : 'Tepat Waktu')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                    {lastScanned.kelas} • NISN/ID: <span className="font-mono font-bold">{lastScanned.nisn}</span>
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-0.5">
                    <span className="flex items-center gap-1"><Clock size={12} /> {lastScanned.jam}</span>
                    <span>• {lastScanned.gate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <span className="text-xs font-bold text-slate-400">Status Gerbang:</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs font-bold">
                  <CheckCircle2 size={15} />
                  <span>Terverifikasi</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: LIVE FEED RECENT TAPS (5 COLS) ────────────── */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-teal-600 dark:text-teal-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Feed Presensi Gerbang
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Stream
              </span>
              <button
                type="button"
                onClick={fetchGerbangFeed}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title="Segarkan Feed"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto no-scrollbar pr-1">
            {feedTaps.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShieldCheck size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-medium">Belum ada tap siswa tercatat hari ini</p>
              </div>
            ) : (
              feedTaps.map((item, idx) => {
                const isTerlambat = item.status === 'TERLAMBAT';
                const isPulang = item.status === 'PULANG';
                return (
                  <div
                    key={item.id || idx}
                    className={cn(
                      "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1",
                      idx === 0 ? "ring-2 ring-emerald-500/20" : "",
                      isTerlambat
                        ? "bg-rose-50/40 dark:bg-rose-950/15 border-rose-200/60 dark:border-rose-900/40"
                        : isPulang
                        ? "bg-blue-50/40 dark:bg-blue-950/15 border-blue-200/60 dark:border-blue-900/40"
                        : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                        isTerlambat
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400"
                          : isPulang
                          ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                          : "bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400"
                      )}>
                        {item.nama.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {item.nama}
                        </p>
                        <p className="text-[10.5px] text-slate-400 font-medium truncate">
                          {item.kelas} • {item.nisn}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 block">
                        {item.jam}
                      </span>
                      <span className={cn(
                        "text-[9.5px] font-bold uppercase",
                        isTerlambat
                          ? "text-rose-600 dark:text-rose-400"
                          : isPulang
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {isTerlambat ? 'Terlambat' : (isPulang ? 'Pulang' : 'Hadir')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL CATAT TAMU ────────────────────────────────────────── */}
      <GuestAccessModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onSuccess={async (guest) => {
          const guestName = guest?.nama_tamu || guest?.nama || guest?.nama_snapshot || 'Tamu';
          const guestArah = guest?.arah || 'MASUK';
          toast.success(`Tamu tercatat: ${guestName} (${guestArah})`, { icon: '🧑‍💼' });
          await fetchGerbangFeed();
          onTapSuccess?.();
        }}
      />
    </div>
  );
};
