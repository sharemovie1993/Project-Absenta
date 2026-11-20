import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan,
  CheckCircle2,
  AlertCircle,
  Zap,
  Loader2,
  X,
  Volume2,
  VolumeX,
  History,
  ShieldCheck,
  User,
  Radio,
  Camera,
  Keyboard,
  CreditCard,
  RefreshCw,
  Send,
  Sparkles
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import { SmartStudentPicker, type Student } from '@/components/common/SmartStudentPicker';
import {
  tapUnifiedPendampingRfid,
  type UnifiedRfidTapResponse
} from '@/api/attendance/unifiedKegiatan.api';

interface UnifiedKegiatanRfidScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  jenisKegiatan: string; // e.g. 'KETARUNAAN', 'DHUHA', 'UPACARA'
  title?: string;
  subtitle?: string;
  sesiId?: string | null;
  jadwalKegiatanId?: string | null;
  onSuccessTap?: (res: UnifiedRfidTapResponse) => void;
}

interface ScanHistoryItem {
  id: string;
  timestamp: string;
  nama: string;
  nip?: string | null;
  syncedKbm: boolean;
  message: string;
  metode: 'RFID' | 'QR' | 'MANUAL';
}

type InputTab = 'RFID' | 'QR' | 'MANUAL';

// Audio Feedback Menggunakan Synthetic Web Audio API (Bebas Dependency File Eksternal)
function playBeep(type: 'success' | 'error' | 'kbm') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success' || type === 'kbm') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'kbm' ? 880 : 587.33, ctx.currentTime);
      if (type === 'kbm') {
        osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15);
      }
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Ignore audio error jika browser memblokir autoplay
  }
}

export const UnifiedKegiatanRfidScanModal: React.FC<UnifiedKegiatanRfidScanModalProps> = ({
  isOpen,
  onClose,
  jenisKegiatan,
  title,
  subtitle,
  sesiId,
  jadwalKegiatanId,
  onSuccessTap,
}) => {
  // Input Tab State
  const [activeTab, setActiveTab] = useState<InputTab>('RFID');
  const [tokenInput, setTokenInput] = useState('');
  const [manualText, setManualText] = useState('');
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Result & History State
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    data?: UnifiedRfidTapResponse;
    errorMsg?: string;
  } | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  // Camera QR State
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraList, setCameraList] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [cameraStatus, setCameraStatus] = useState<string>('Memulai kamera...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScannedTokenRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Hardware Buffer Refs (HID)
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Focus helper untuk mode RFID
  const focusHidInput = useCallback(() => {
    if (activeTab === 'RFID') {
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 50);
    }
  }, [activeTab]);

  // Clean-up & Reset saat modal buka/tutup
  useEffect(() => {
    if (isOpen) {
      focusHidInput();
    } else {
      setLastResult(null);
      setTokenInput('');
      setManualText('');
      bufferRef.current = '';
    }
  }, [isOpen, focusHidInput]);

  // Core Processing Engine
  const handleProcessToken = useCallback(async (token: string, source: 'RFID' | 'QR' | 'MANUAL' = activeTab) => {
    const trimmed = token.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setTokenInput('');
    setManualText('');

    try {
      const res = await tapUnifiedPendampingRfid({
        rfid_token: trimmed,
        sesi_id: sesiId ?? undefined,
        jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
        jenis_kegiatan: jenisKegiatan,
      });

      if (res.success) {
        if (soundEnabled) {
          playBeep(res.synced_kbm ? 'kbm' : 'success');
        }

        setLastResult({
          success: true,
          data: res,
        });

        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setHistory(prev => [
          {
            id: `${Date.now()}_${trimmed}`,
            timestamp: timeStr,
            nama: res.guru?.nama_guru || 'Guru / Pembina',
            nip: res.guru?.nip,
            syncedKbm: Boolean(res.synced_kbm),
            message: res.message || 'Presensi Berhasil',
            metode: source,
          },
          ...prev.slice(0, 14), // Simpan 15 rekaman terakhir
        ]);

        onSuccessTap?.(res);
      } else {
        if (soundEnabled) playBeep('error');
        setLastResult({
          success: false,
          errorMsg: res.message || 'Gagal memproses presensi',
        });
      }
    } catch (err: unknown) {
      if (soundEnabled) playBeep('error');
      const msg = (err as { message?: string })?.message || 'Kartu atau identitas tidak terdaftar di sistem';
      setLastResult({
        success: false,
        errorMsg: msg,
      });
    } finally {
      setLoading(false);
      focusHidInput();
    }
  }, [loading, sesiId, jadwalKegiatanId, jenisKegiatan, soundEnabled, onSuccessTap, activeTab, focusHidInput]);

  // Global Keydown Trap untuk RFID & Barcode Gun HID (Keyboard Emulation)
  useEffect(() => {
    if (!isOpen || activeTab !== 'RFID') return;

    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Jangan trap jika pengguna sedang aktif mengetik di input pencarian lain
      if (target && target.tagName === 'INPUT' && target.id !== 'pos-hid-input') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const scanned = bufferRef.current.trim() || tokenInput.trim();
        if (scanned) {
          bufferRef.current = '';
          setTokenInput('');
          handleProcessToken(scanned, 'RFID');
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
        setTokenInput(bufferRef.current);
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
  }, [isOpen, activeTab, tokenInput, handleProcessToken]);

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

  const startCameraScanner = useCallback(async (camIndex = 0) => {
    try {
      setCameraError(null);
      setCameraStatus('Mempersiapkan kamera pemindai...');

      await stopCameraScanner();

      const elem = document.getElementById('pos-camera-qr-reader');
      if (!elem) return;

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('Tidak ada kamera yang terdeteksi di perangkat ini.');
        return;
      }

      setCameraList(devices);
      const targetDevice = devices[camIndex % devices.length];
      setActiveCameraIndex(camIndex % devices.length);
      setCameraStatus(`Kamera Aktif: ${targetDevice.label || 'Kamera Utama'}`);

      const html5QrCode = new Html5Qrcode('pos-camera-qr-reader');
      qrScannerRef.current = html5QrCode;

      await html5QrCode.start(
        targetDevice.id,
        {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScannedTokenRef.current && now - lastScannedTimeRef.current < 2500) {
            return; // Debounce scan token yang sama 2.5 detik
          }
          lastScannedTokenRef.current = decodedText;
          lastScannedTimeRef.current = now;
          handleProcessToken(decodedText, 'QR');
        },
        () => {
          // Frame scanner ignore
        }
      );
    } catch (err: any) {
      console.warn('Start QR scanner exception:', err);
      setCameraError(err?.message || 'Gagal menyalakan kamera. Pastikan izin kamera telah diberikan di browser.');
    }
  }, [stopCameraScanner, handleProcessToken]);

  // Handle Tab Switch & Camera Mount
  useEffect(() => {
    if (isOpen && activeTab === 'QR') {
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
  }, [isOpen, activeTab, activeCameraIndex, startCameraScanner, stopCameraScanner]);

  const handleSwitchCamera = useCallback(() => {
    if (cameraList.length > 1) {
      const nextIndex = (activeCameraIndex + 1) % cameraList.length;
      startCameraScanner(nextIndex);
    }
  }, [cameraList, activeCameraIndex, startCameraScanner]);

  const modalTitle = title || `Terminal Presensi Multi-Input — ${jenisKegiatan.toUpperCase()}`;
  const modalSubtitle = subtitle || `Mode Kiosk Cepat: Dukungan RFID Reader, Barcode Gun, Scan QR Kamera & Pencarian Manual`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={() => {
          if (activeTab === 'RFID') focusHidInput();
        }}
      >
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">{modalTitle}</h3>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/40">
                  Universal POS
                </Badge>
              </div>
              <p className="text-xs text-slate-300/80 mt-0.5">{modalSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSoundEnabled(prev => !prev);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
              title={soundEnabled ? 'Matikan Suara Beep' : 'Nyalakan Suara Beep'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigator */}
        <div className="px-6 pt-3 pb-2 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('RFID')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'RFID'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>RFID / Barcode HID</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('QR')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'QR'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan QR Kamera</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MANUAL')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'MANUAL'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Cari / Ketik</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Terminal Siaga</span>
          </div>
        </div>

        {/* Modal Body / Active Tab Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* TAB 1: RFID & Barcode HID */}
          {activeTab === 'RFID' && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 border border-indigo-200/70 dark:border-indigo-800/60 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Radio className="w-6 h-6 animate-pulse" />
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center justify-center sm:justify-start gap-2">
                        Scanner Hardware HID Siap
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                          Auto-Listen Active
                        </Badge>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Tempelkan kartu RFID ke reader USB atau tembak dengan barcode scanner 2D.
                      </p>
                    </div>
                  </div>

                  {/* Input Cepat HID */}
                  <div className="w-full sm:w-64">
                    <input
                      ref={inputRef}
                      id="pos-hid-input"
                      type="text"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleProcessToken(tokenInput, 'RFID');
                        }
                      }}
                      disabled={loading}
                      placeholder="Buffer Kartu / Scan..."
                      className="w-full text-xs font-mono px-3.5 py-2.5 rounded-2xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Scan QR Kamera */}
          {activeTab === 'QR' && (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-3xl bg-slate-950 w-full min-h-[280px] shadow-2xl ring-1 ring-slate-800 flex flex-col items-center justify-center">
                <div id="pos-camera-qr-reader" className="w-full h-full min-h-[280px] overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-3xl" />
                
                {cameraError ? (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-rose-400">
                    <AlertCircle className="w-10 h-10 mb-2" />
                    <p className="text-sm font-bold">{cameraError}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startCameraScanner(activeCameraIndex)}
                      className="mt-4 text-xs font-bold"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Coba Lagi
                    </Button>
                  </div>
                ) : (
                  <div className="absolute bottom-3 inset-x-3 text-center text-white text-xs font-medium bg-black/60 backdrop-blur-md py-1.5 px-4 rounded-xl pointer-events-none z-10 flex items-center justify-between">
                    <span>{cameraStatus}</span>
                    <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">Arahkan QR Code</span>
                  </div>
                )}
              </div>

              {cameraList.length > 1 && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSwitchCamera}
                    className="text-xs font-bold gap-1.5 rounded-xl"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Ganti Kamera ({activeCameraIndex + 1}/{cameraList.length})
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Cari / Ketik Manual */}
          {activeTab === 'MANUAL' && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    1. Pencarian Cepat Guru / Pembina
                  </label>
                  <SmartStudentPicker
                    mode="guru"
                    scope="global"
                    placeholder="Ketik Nama atau NIP Guru..."
                    className="w-full text-xs"
                    onSelect={(student: Student) => {
                      const token = student.nip || student.id;
                      if (token) {
                        handleProcessToken(token, 'MANUAL');
                      }
                    }}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cari berdasarkan nama atau NIP, lalu klik nama guru untuk langsung presensi.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    2. Atau Ketik Manual NIP / UID Kartu
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualText.trim()) {
                          e.preventDefault();
                          handleProcessToken(manualText.trim(), 'MANUAL');
                        }
                      }}
                      placeholder="Masukkan NIP atau nomor kartu..."
                      className="flex-1 text-xs font-mono px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                    <Button
                      onClick={() => {
                        if (manualText.trim()) {
                          handleProcessToken(manualText.trim(), 'MANUAL');
                        }
                      }}
                      disabled={!manualText.trim() || loading}
                      className="rounded-2xl text-xs font-bold gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Presensikan
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Hasil Scan Terakhir */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 rounded-3xl border border-dashed border-indigo-200 dark:border-indigo-800 text-center space-y-3 bg-indigo-50/20"
              >
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Memverifikasi Identitas &amp; Sinkronisasi Dual-Presence...
                </p>
              </motion.div>
            ) : lastResult ? (
              <motion.div
                key={lastResult.success ? 'success' : 'error'}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-5 rounded-3xl border shadow-sm ${
                  lastResult.success
                    ? 'bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-emerald-200 dark:border-emerald-800/80'
                    : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {lastResult.success && lastResult.data ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/80 dark:border-emerald-700/50">
                          {lastResult.data.guru?.foto ? (
                            <img
                              src={resolveProfilePhotoUrl(lastResult.data.guru.foto)}
                              alt={lastResult.data.guru.nama_guru}
                              className="w-full h-full rounded-2xl object-cover"
                            />
                          ) : (
                            <User className="w-7 h-7" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Presensi Diterima
                            </span>
                            {lastResult.data.synced_kbm && (
                              <Badge variant="default" className="text-[10px] font-bold bg-indigo-600 text-white gap-1 py-0">
                                <Zap className="w-3 h-3 text-amber-300" /> 1 Tap 2 Record
                              </Badge>
                            )}
                          </div>
                          <h4 className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">
                            {lastResult.data.guru?.nama_guru}
                          </h4>
                          {lastResult.data.guru?.nip && (
                            <p className="text-xs text-slate-400 font-mono">
                              NIP: {lastResult.data.guru.nip}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span className="font-medium">{lastResult.data.message}</span>
                      {lastResult.data.synced_kbm && (
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" /> KBM Reguler Berlangsung
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-rose-800 dark:text-rose-200">Identitas Tidak Dikenali</p>
                      <p className="text-xs text-rose-600 dark:text-rose-300 mt-0.5">{lastResult.errorMsg}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Riwayat Scan Sesi Ini */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Riwayat Tap Sesi Ini ({history.length})
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Bersihkan
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Belum ada kartu atau data presensi yang masuk pada sesi ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto pr-1">
                {history.map(item => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.nama}</p>
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                            {item.metode}
                          </Badge>
                        </div>
                        {item.nip && <p className="text-[10px] text-slate-400 font-mono">NIP: {item.nip}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.syncedKbm && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                          ⚡ KBM Dibuka
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400">{item.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Mendukung Reader RFID USB, Barcode Gun HID, Kamera QR, dan Pencarian Cepat</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="font-bold text-xs rounded-xl">
            Tutup Terminal
          </Button>
        </div>
      </div>
    </div>
  );
};
