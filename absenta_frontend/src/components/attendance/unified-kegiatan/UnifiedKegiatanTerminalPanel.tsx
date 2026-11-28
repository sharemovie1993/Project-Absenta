import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan,
  CheckCircle2,
  AlertCircle,
  Zap,
  Volume2,
  VolumeX,
  History,
  ShieldCheck,
  User,
  Radio,
  Camera,
  RefreshCw,
  QrCode,
  Search,
  Users,
  Check,
  Clock,
  Sparkles
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';
import { SmartStudentPicker, type Student } from '@/components/common/SmartStudentPicker';
import toast from 'react-hot-toast';
import {
  getUnifiedTerminalFeed,
  tapUnifiedPendampingRfid,
  type UnifiedRfidTapResponse
} from '@/api/attendance/unifiedKegiatan.api';

export interface UnifiedKegiatanTerminalPanelProps {
  jenisKegiatan: string; // e.g. 'KETARUNAAN', 'DHUHA', 'UPACARA'
  title?: string;
  subtitle?: string;
  sesiId?: string | null;
  jadwalKegiatanId?: string | null;
  onSuccessTap?: (res: UnifiedRfidTapResponse) => void;
  className?: string;
}

export interface RecentUnifiedTapRecord {
  id: string;
  nama: string;
  idNumber?: string; // NIP or NIS
  subLabel?: string; // Role / Jabatan or Kelas
  entityType: 'GURU' | 'SISWA';
  status: string;
  jam: string;
  foto?: string;
  syncedKbm?: boolean;
  kbmCount?: number;
  message?: string;
  metode: 'RFID' | 'QR' | 'MANUAL';
}

type SubInputMode = 'SCANNER' | 'QR_KAMERA' | 'PICKER';

// Zero-asset Web Audio Synthesizer Beep (Selaras dengan Gerbang Satpam + Chord 1-Tap 2-Record)
const playBeep = (type: 'success' | 'kbm' | 'error') => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'kbm') {
      // Dual-tone harmonic chime for KBM sync (D5 -> D6)
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } else if (type === 'success') {
      // High-pitched bright beep (A5 -> E6)
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else {
      // Buzz error sound
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Ignore audio restrictions
  }
};

export const UnifiedKegiatanTerminalPanel: React.FC<UnifiedKegiatanTerminalPanelProps> = ({
  jenisKegiatan,
  title,
  subtitle,
  sesiId,
  jadwalKegiatanId,
  onSuccessTap,
  className = '',
}) => {
  // Mode Sub-Tab Input: 'SCANNER' (Auto-focus RFID/Barcode), 'QR_KAMERA' (Kamera), 'PICKER' (Smart Student/Guru Picker - Lupa Kartu)
  const [inputSubTab, setInputSubTab] = useState<SubInputMode>('SCANNER');
  const [scannerInput, setScannerInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Buffer Refs untuk Hardware RFID/Barcode Keyboard Emulation
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const qc = useQueryClient();

  // Feedback State & Live Persistent Feed dari Database
  const [lastScanned, setLastScanned] = useState<RecentUnifiedTapRecord | null>(null);
  const [lastErrorMsg, setLastErrorMsg] = useState<string | null>(null);
  const [feedTaps, setFeedTaps] = useState<RecentUnifiedTapRecord[]>([]);

  const { data: terminalFeedRes } = useQuery({
    queryKey: ['unified-terminal-feed', jenisKegiatan, jadwalKegiatanId ?? null],
    queryFn: () =>
      getUnifiedTerminalFeed({
        jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
        jenis_kegiatan: jenisKegiatan,
      }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const dbFeed = terminalFeedRes?.data?.feed;
    if (Array.isArray(dbFeed) && dbFeed.length > 0) {
      setFeedTaps((prev) => {
        // Pertahankan tap terbaru yang belum masuk/baru saja di-tap jika id berbeda, lalu gabungkan dengan DB
        const dbIds = new Set(dbFeed.map((item) => item.id));
        const localFresh = prev.filter((item) => item.id.startsWith('tap-kegiatan-') && !dbIds.has(item.id));
        // Jika sudah ada di DB (berdasarkan nama + idNumber yang baru di-tap), pakai data DB agar tidak dobel
        const dbKeys = new Set(dbFeed.map((item) => `${item.entityType}_${item.nama}_${item.idNumber || ''}`));
        const dedupLocal = localFresh.filter(
          (item) => !dbKeys.has(`${item.entityType}_${item.nama}_${item.idNumber || ''}`)
        );
        return [...dedupLocal, ...dbFeed].slice(0, 30);
      });
    }
  }, [terminalFeedRes]);

  // Mini Counter Sesi Ini (Terhubung ke summary DB + local state)
  const miniStats = React.useMemo(() => {
    const dbTotal = terminalFeedRes?.data?.summary?.total_hadir ?? 0;
    const hadir = Math.max(dbTotal, feedTaps.length);
    const kbmOpened = feedTaps.filter((t) => t.syncedKbm).length;
    return { hadir, kbmOpened };
  }, [terminalFeedRes, feedTaps]);

  // Camera QR State
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraList, setCameraList] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [cameraStatus, setCameraStatus] = useState<string>('Memulai kamera...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScannedTokenRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Focus Input Helper
  const focusScannerInput = useCallback(() => {
    if (inputSubTab === 'SCANNER') {
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 50);
    }
  }, [inputSubTab]);

  useEffect(() => {
    focusScannerInput();
  }, [focusScannerInput, inputSubTab]);

  // Eksekusi Tap ke Backend Unified Kegiatan
  const handleProcessScan = useCallback(
    async (codeOrId: string, source: 'RFID' | 'QR' | 'MANUAL' = 'RFID', directInfo?: any) => {
      const trimmed = String(codeOrId || '').trim();
      if (!trimmed || isProcessing) return;

      setIsProcessing(true);
      setLastErrorMsg(null);
      const now = new Date();
      const jamStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      try {
        const res = await tapUnifiedPendampingRfid({
          rfid_token: trimmed,
          sesi_id: sesiId ?? undefined,
          jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
          jenis_kegiatan: jenisKegiatan,
        });

        if (res.success) {
          const isKbm = Boolean(res.synced_kbm);
          const gInfo = res.guru;
          const sInfo = (res as any).siswa;

          let personName = '';
          let personIdNumber = '';
          let personSubLabel = '';
          let personFoto = '';
          let entityType: 'GURU' | 'SISWA' = 'GURU';

          if (gInfo) {
            personName = gInfo.nama_guru || directInfo?.displayName || directInfo?.nama_guru || 'Guru / Pembina';
            personIdNumber = gInfo.nip || directInfo?.nip || trimmed;
            personSubLabel = gInfo.jenis_ptk || 'Pembina / Pendamping';
            personFoto = gInfo.foto || directInfo?.foto;
            entityType = 'GURU';
          } else if (sInfo) {
            personName = sInfo.nama_siswa || directInfo?.nama_siswa || directInfo?.displayName || 'Siswa';
            personIdNumber = sInfo.nisn || sInfo.nis || directInfo?.nis || trimmed;
            personSubLabel = sInfo.nama_kelas || directInfo?.Kelas?.nama_kelas || 'Peserta';
            personFoto = sInfo.foto || directInfo?.foto;
            entityType = 'SISWA';
          } else {
            personName = directInfo?.nama_guru || directInfo?.nama_siswa || directInfo?.displayName || `Personil (${trimmed.slice(-4)})`;
            personIdNumber = directInfo?.nip || directInfo?.nis || trimmed;
            personSubLabel = directInfo?.subLabel || 'Peserta / Panitia';
            personFoto = directInfo?.foto;
            entityType = directInfo?.entityType === 'SISWA' ? 'SISWA' : 'GURU';
          }

          const isLate = Boolean(res.is_terlambat || res.status === 'TERLAMBAT');
          const tapStatus = isLate ? 'TERLAMBAT' : 'HADIR';

          const record: RecentUnifiedTapRecord = {
            id: `tap-kegiatan-${Date.now()}`,
            nama: personName,
            idNumber: personIdNumber,
            subLabel: personSubLabel,
            entityType,
            status: tapStatus,
            jam: jamStr,
            foto: personFoto,
            syncedKbm: isKbm,
            kbmCount: res.jadwal_kbm_opened?.length || (isKbm ? 1 : 0),
            message: res.message || 'Presensi Berhasil Dicatat',
            metode: source,
          };

          setLastScanned(record);
          setFeedTaps((prev) => [record, ...prev.slice(0, 24)]);

          if (!isMuted) {
            playBeep(isLate ? 'error' : (isKbm ? 'kbm' : 'success'));
          }

          if (isLate) {
            toast.error(`TERLAMBAT: ${personName} (${personSubLabel})`, {
              icon: '⚠️',
              position: 'bottom-center',
            });
          } else if (isKbm) {
            toast.success(`PRESENSI + KBM DIBUKA: ${personName}`, {
              icon: '⚡',
              position: 'bottom-center',
            });
          } else {
            toast.success(`HADIR: ${personName} (${personSubLabel})`, {
              icon: '✅',
              position: 'bottom-center',
            });
          }

          qc.invalidateQueries({ queryKey: ['unified-terminal-feed'] });
          onSuccessTap?.(res);
        } else {
          const errMsg = res.message || 'Gagal memproses presensi kegiatan';
          setLastErrorMsg(errMsg);
          if (!isMuted) playBeep('error');
          toast.error(errMsg, { position: 'bottom-center' });
        }
      } catch (err: any) {
        const errMsg =
          err.response?.data?.message || err.message || 'Kartu atau identitas tidak terdaftar di sistem';
        setLastErrorMsg(errMsg);
        if (!isMuted) playBeep('error');
        toast.error(errMsg, { position: 'bottom-center' });
      } finally {
        setIsProcessing(false);
        setScannerInput('');
        focusScannerInput();
      }
    },
    [isProcessing, isMuted, sesiId, jadwalKegiatanId, jenisKegiatan, onSuccessTap, focusScannerInput]
  );

  // Global RFID & Barcode Scanner Keyboard Listener (Keystroke Fast Trap)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (inputSubTab !== 'SCANNER') return;
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && target.id !== 'unified-scanner-input') {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const scanned = bufferRef.current.trim() || scannerInput.trim();
        if (scanned) {
          bufferRef.current = '';
          setScannerInput('');
          handleProcessScan(scanned, 'RFID');
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
        setScannerInput(bufferRef.current);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 1200);
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputSubTab, scannerInput, handleProcessScan]);

  // Camera QR Scanner Lifecycle
  const stopCameraScanner = useCallback(async () => {
    try {
      if (qrScannerRef.current) {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        qrScannerRef.current.clear();
        qrScannerRef.current = null;
      }
    } catch (e) {
      console.warn('Stop QR scanner warning:', e);
    }
  }, []);

  const startCameraScanner = useCallback(
    async (camIndex = 0) => {
      try {
        setCameraError(null);
        setCameraStatus('Meminta izin & mendeteksi sensor kamera...');

        await stopCameraScanner();

        const elem = document.getElementById('unified-camera-qr-reader');
        if (!elem) return;

        // Proactive permission handshake
        let tempStream: MediaStream | null = null;
        try {
          if (navigator?.mediaDevices?.getUserMedia) {
            tempStream = await navigator.mediaDevices
              .getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
              .catch(async () => navigator.mediaDevices.getUserMedia({ video: true }));
          }
        } catch (permErr) {
          console.warn('[UnifiedKegiatanTerminal] Handshake catch:', permErr);
        } finally {
          if (tempStream) {
            tempStream.getTracks().forEach((t) => t.stop());
          }
        }

        let devices: Array<{ id: string; label: string }> = [];
        try {
          devices = await Html5Qrcode.getCameras();
        } catch (camErr) {
          console.warn('[UnifiedKegiatanTerminal] getCameras error:', camErr);
        }

        const html5QrCode = new Html5Qrcode('unified-camera-qr-reader');
        qrScannerRef.current = html5QrCode;

        const onScanSuccess = (decodedText: string) => {
          const now = Date.now();
          if (
            decodedText === lastScannedTokenRef.current &&
            now - lastScannedTimeRef.current < 2500
          ) {
            return;
          }
          lastScannedTokenRef.current = decodedText;
          lastScannedTimeRef.current = now;
          handleProcessScan(decodedText, 'QR');
        };

        const qrConfig = {
          fps: 20,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1.333333,
        };

        if (devices && devices.length > 0) {
          setCameraList(devices);
          const targetDevice = devices[camIndex % devices.length];
          setActiveCameraIndex(camIndex % devices.length);
          setCameraStatus(`Kamera Aktif: ${targetDevice.label || 'Kamera Utama'}`);

          try {
            await html5QrCode.start(targetDevice.id, qrConfig, onScanSuccess, () => {});
          } catch {
            await html5QrCode.start({ facingMode: 'environment' }, qrConfig, onScanSuccess, () => {});
          }
        } else {
          setCameraStatus('Kamera Aktif: Sensor Belakang');
          await html5QrCode.start({ facingMode: 'environment' }, qrConfig, onScanSuccess, () => {});
        }
      } catch (err: any) {
        console.warn('Start QR scanner exception:', err);
        const errMsg = String(err?.message || err || '');
        if (errMsg.toLowerCase().includes('permission') || errMsg.includes('NotAllowedError')) {
          setCameraError(
            'Izin akses kamera ditolak oleh browser/perangkat. Berikan izin di setelan browser atau gunakan kamera sistem.'
          );
        } else {
          setCameraError(errMsg || 'Gagal menyalakan kamera. Pastikan izin kamera telah diberikan.');
        }
      }
    },
    [stopCameraScanner, handleProcessScan]
  );

  useEffect(() => {
    if (inputSubTab === 'QR_KAMERA') {
      const timer = setTimeout(() => {
        startCameraScanner(activeCameraIndex);
      }, 200);
      return () => {
        clearTimeout(timer);
        stopCameraScanner();
      };
    } else {
      stopCameraScanner();
    }
  }, [inputSubTab, activeCameraIndex, startCameraScanner, stopCameraScanner]);

  const handleNativeCameraScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCameraStatus('Memindai QR dari foto kamera sistem...');
      let scanner = qrScannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('unified-camera-qr-reader');
        qrScannerRef.current = scanner;
      }
      const decoded = await scanner.scanFile(file, true);
      if (decoded) {
        handleProcessScan(decoded, 'QR');
      } else {
        toast.error('QR Code tidak terbaca dari foto. Pastikan pencahayaan cukup.');
      }
    } catch {
      toast.error('Gagal mendeteksi QR Code dari foto. Arahkan kamera lebih tegak lurus.');
    } finally {
      if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
    }
  };

  const handleScannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessScan(scannerInput, 'RFID');
  };

  const panelTitle = title || `Terminal Presensi — ${jenisKegiatan.toUpperCase()}`;
  const panelSubtitle =
    subtitle || `Multi-Input Siaga: Tempel Kartu RFID, Barcode Gun HID, Scan QR Kamera atau Cari Nama`;

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col space-y-3 p-3 sm:p-4",
        className
      )}
      onClick={() => {
        if (inputSubTab === 'SCANNER') focusScannerInput();
      }}
    >
      {/* ── TOP CONTROL BAR (RINGKAS & FOKUS INPUT) ────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        {/* Sub-Tab Selector: Scan RFID vs Scan QR vs Lupa Kartu */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => setInputSubTab('SCANNER')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              inputSubTab === 'SCANNER'
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Scan size={13} />
            <span>Scan RFID</span>
          </button>

          <button
            type="button"
            onClick={() => setInputSubTab('QR_KAMERA')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              inputSubTab === 'QR_KAMERA'
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Camera size={13} />
            <span>QR Kamera</span>
          </button>

          <button
            type="button"
            onClick={() => setInputSubTab('PICKER')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              inputSubTab === 'PICKER'
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Search size={13} />
            <span>Lupa Kartu</span>
          </button>
        </div>

        {/* Right Tools: Siaga indicator + Mini Stats + Suara Audio */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mr-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Siaga
          </span>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <span className="text-slate-400">Hadir:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">
              {miniStats.hadir}
            </span>
            {miniStats.kbmOpened > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-0.5">
                  <Zap size={12} className="text-amber-500" />
                  {miniStats.kbmOpened} KBM
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted((prev) => !prev);
            }}
            className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            title={isMuted ? 'Nyalakan Suara Beep' : 'Bisukan Suara Beep'}
            aria-label="Toggle Suara Beep"
          >
            {isMuted ? (
              <VolumeX size={15} />
            ) : (
              <Volume2 size={15} className="text-emerald-600 dark:text-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE GRID: 7 COLS (TERMINAL) & 5 COLS (FEED) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* ── LEFT COLUMN: INPUT MODES & LAST RESULT CARD (7 COLS) ───────── */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3">
            {/* ── SUB-PANEL 1: SCANNER INPUT (FOKUS UTAMA) ── */}
            {inputSubTab === 'SCANNER' && (
              <form
                onSubmit={handleScannerSubmit}
                className="space-y-2.5 animate-in fade-in duration-150"
              >
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Scan
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500"
                      size={18}
                    />
                    <input
                      ref={inputRef}
                      id="unified-scanner-input"
                      type="text"
                      value={scannerInput}
                      onChange={(e) => setScannerInput(e.target.value)}
                      placeholder="Tempel kartu RFID ke reader atau ketik NIP/NIS..."
                      aria-label="Scan kartu atau ketik NIP/NIS"
                      disabled={isProcessing}
                      className="w-full pl-11 pr-3.5 h-12 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 text-slate-900 dark:text-white font-mono text-sm rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isProcessing || !scannerInput.trim()}
                    className="h-12 px-5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-1.5 shrink-0"
                  >
                    {isProcessing ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Zap size={14} />
                    )}
                    <span>Tap Presensi</span>
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Radio size={12} className="text-emerald-500 shrink-0" />
                  <span>Auto-focus aktif — reader RFID/Barcode USB otomatis terbaca tanpa klik mouse.</span>
                </p>
              </form>
            )}

            {/* ── SUB-PANEL 2: SCAN QR KAMERA (WEBRTC & NATIVE HP) ──────── */}
            {inputSubTab === 'QR_KAMERA' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <input
                  ref={nativeCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNativeCameraScan}
                  className="hidden"
                />

                <div className="relative overflow-hidden rounded-2xl bg-slate-950 w-full min-h-[230px] shadow-lg ring-1 ring-slate-800 flex flex-col items-center justify-center">
                  <div
                    id="unified-camera-qr-reader"
                    className="w-full h-full min-h-[230px] overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-2xl"
                  />

                  {cameraError ? (
                    <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-rose-400 z-20 space-y-3">
                      <AlertCircle className="w-9 h-9" />
                      <p className="text-xs sm:text-sm font-bold text-white max-w-md">
                        {cameraError}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startCameraScanner(activeCameraIndex)}
                          className="text-xs font-bold bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Coba Izin Lagi
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => nativeCameraInputRef.current?.click()}
                          className="text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-none shadow-md shadow-emerald-500/20"
                        >
                          <Camera className="w-3.5 h-3.5 mr-1.5" /> Kamera Sistem HP
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute bottom-3 inset-x-3 text-center text-white text-xs font-medium bg-black/60 backdrop-blur-md py-1.5 px-3 rounded-xl pointer-events-none z-10 flex items-center justify-between">
                      <span className="truncate max-w-[200px]">{cameraStatus}</span>
                      <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider shrink-0">
                        Arahkan QR Code
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="text-xs font-bold gap-1.5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Fallback Foto Kamera HP</span>
                  </Button>

                  {cameraList.length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const nextIndex = (activeCameraIndex + 1) % cameraList.length;
                        startCameraScanner(nextIndex);
                      }}
                      className="text-xs font-bold gap-1.5 rounded-xl"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Ganti Kamera ({activeCameraIndex + 1}/
                      {cameraList.length})
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ── SUB-PANEL 3: SMART STUDENT & GURU PICKER (LUPA KARTU) ──── */}
            {inputSubTab === 'PICKER' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="uppercase tracking-wider">
                      Cari Siswa / Guru / Pembina (Universal SSOT)
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400">
                      Pilih dari dropdown untuk langsung presensi
                    </span>
                  </div>

                  {/* Reusable SSOT SmartStudentPicker dengan Mode Universal */}
                  <SmartStudentPicker
                    mode="universal"
                    scope="global"
                    placeholder="Ketik Nama, NIP, NISN, atau No RFID..."
                    className="w-full text-xs"
                    autoFocus
                    onSelect={(student: Student) => {
                      const token = student.no_rfid || student.nip || student.nisn || student.nis || student.id;
                      if (token) {
                        handleProcessScan(token, 'MANUAL', student);
                      }
                    }}
                  />
                  <p className="text-[11px] text-slate-400">
                    Ketik minimal 2 karakter untuk melihat daftar guru atau siswa, lalu klik nama untuk mencatat kehadiran.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── HERO FEEDBACK CARD: HASIL TAP TERAKHIR (GAYA GERBANG SATPAM) ── */}
          <AnimatePresence mode="wait">
            {lastScanned ? (
              <motion.div
                key={lastScanned.id}
                initial={{ opacity: 0, scale: 0.96, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={cn(
                  "p-4 sm:p-5 rounded-3xl border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200",
                  lastScanned.syncedKbm
                    ? "bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 border-indigo-200 dark:border-indigo-800"
                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Foto Profil Avatar dengan Ring Status */}
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 relative shadow-xs">
                    {lastScanned.foto ? (
                      <img
                        src={resolveProfilePhotoUrl(lastScanned.foto)}
                        alt={lastScanned.nama}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        {lastScanned.nama.charAt(0)}
                      </div>
                    )}
                    {lastScanned.syncedKbm && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] text-white">
                        ⚡
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {lastScanned.nama}
                      </h4>
                      <Badge
                        variant="default"
                        className={cn(
                          "text-[10px] font-black uppercase tracking-wider py-0 px-2",
                          lastScanned.status === 'TERLAMBAT'
                            ? "bg-rose-600 text-white"
                            : lastScanned.syncedKbm
                            ? "bg-indigo-600 text-white"
                            : "bg-emerald-600 text-white"
                        )}
                      >
                        {lastScanned.status === 'TERLAMBAT'
                          ? 'Terlambat'
                          : lastScanned.syncedKbm
                          ? '⚡ 1-Tap 2-Record'
                          : 'Hadir Lapangan'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                      {lastScanned.subLabel} • ID:{' '}
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {lastScanned.idNumber || '-'}
                      </span>
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {lastScanned.jam} WIB
                      </span>
                      <span>• Metode: {lastScanned.metode}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <div
                    className={cn(
                      "p-2.5 rounded-2xl border text-xs font-bold shadow-2xs flex items-center gap-1.5",
                      lastScanned.status === 'TERLAMBAT'
                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300"
                        : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    <CheckCircle2
                      size={16}
                      className={
                        lastScanned.status === 'TERLAMBAT'
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }
                    />
                    <span>
                      {lastScanned.status === 'TERLAMBAT' ? 'Terlambat' : 'Presensi Diterima'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : lastErrorMsg ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="p-4 rounded-3xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-3 shadow-xs"
              >
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">Identitas Tidak Dikenali</p>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{lastErrorMsg}</p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ── RIGHT COLUMN: LIVE RECENT TAP FEED (5 COLS - GAYA GERBANG) ── */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col min-h-[220px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History size={15} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Feed Presensi Sesi Ini
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live ({feedTaps.length})
                </span>
                {feedTaps.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFeedTaps([])}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  >
                    Bersihkan
                  </button>
                )}
              </div>
            </div>

            {feedTaps.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-1.5">
                <ShieldCheck size={24} className="mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-medium">Belum ada tap presensi</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto no-scrollbar pr-1">
                {feedTaps.map((item) => {
                  const isLate = item.status === 'TERLAMBAT';
                  const isKbm = Boolean(item.syncedKbm);
                  const isGuru = item.entityType === 'GURU';

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "p-2.5 rounded-2xl border flex items-center justify-between transition-colors text-xs",
                        isLate
                          ? "bg-rose-50/75 dark:bg-rose-950/25 border-rose-200/90 dark:border-rose-800/60"
                          : isKbm
                          ? "bg-indigo-50/70 dark:bg-indigo-950/25 border-indigo-200/90 dark:border-indigo-800/60"
                          : "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/50"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-black text-xs border",
                            isLate
                              ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-700"
                              : isKbm || isGuru
                              ? "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-200 dark:border-indigo-700"
                              : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700"
                          )}
                        >
                          {item.foto ? (
                            <img
                              src={resolveProfilePhotoUrl(item.foto)}
                              alt={item.nama}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            item.nama.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs">
                              {item.nama}
                            </p>
                            <span
                              className={cn(
                                "text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full",
                                isLate
                                  ? "bg-rose-600 text-white"
                                  : isKbm
                                  ? "bg-indigo-600 text-white"
                                  : "bg-emerald-600 text-white"
                              )}
                            >
                              {isLate ? 'Terlambat' : isKbm ? '⚡ KBM' : 'Hadir'}
                            </span>
                            <span
                              className={cn(
                                "text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-md border",
                                isGuru
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                                  : "bg-white/80 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                              )}
                            >
                              {isGuru ? 'Guru' : 'Taruna'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.subLabel} {item.idNumber ? `• ${item.idNumber}` : ''} • {item.metode}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 ml-2">
                        <span
                          className={cn(
                            "text-[10px] font-mono font-bold",
                            isLate
                              ? "text-rose-700 dark:text-rose-300"
                              : "text-slate-600 dark:text-slate-300"
                          )}
                        >
                          {item.jam}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
