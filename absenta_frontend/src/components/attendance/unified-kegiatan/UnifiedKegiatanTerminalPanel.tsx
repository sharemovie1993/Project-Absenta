import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan,
  CheckCircle2,
  AlertCircle,
  Zap,
  Loader2,
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
import toast from 'react-hot-toast';
import {
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

export const UnifiedKegiatanTerminalPanel: React.FC<UnifiedKegiatanTerminalPanelProps> = ({
  jenisKegiatan,
  title,
  subtitle,
  sesiId,
  jadwalKegiatanId,
  onSuccessTap,
  className = '',
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
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraList, setCameraList] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [cameraStatus, setCameraStatus] = useState<string>('Memulai kamera...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScannedTokenRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Fallback scan via foto kamera sistem OS
  const handleNativeCameraScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCameraStatus('Memindai QR dari foto kamera sistem...');
      let scanner = qrScannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('pos-panel-camera-qr-reader');
        qrScannerRef.current = scanner;
      }
      const decoded = await scanner.scanFile(file, true);
      if (decoded) {
        handleProcessToken(decoded, 'QR');
      } else {
        toast.error('QR Code tidak terbaca dari foto. Pastikan pencahayaan cukup dan foto tegak lurus.');
      }
    } catch {
      toast.error('Gagal mendeteksi QR Code dari foto. Silakan coba arahkan kamera lebih dekat.');
    } finally {
      if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
    }
  };

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

  useEffect(() => {
    focusHidInput();
  }, [focusHidInput]);

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
    if (activeTab !== 'RFID') return;

    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Jangan trap jika pengguna sedang aktif mengetik di input pencarian lain
      if (target && target.tagName === 'INPUT' && target.id !== 'pos-panel-hid-input') return;

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
  }, [activeTab, tokenInput, handleProcessToken]);

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
      setCameraStatus('Meminta izin & mendeteksi sensor kamera...');

      await stopCameraScanner();

      const elem = document.getElementById('pos-panel-camera-qr-reader');
      if (!elem) return;

      // 1. Proactive WebRTC permission handshake agar browser membuka sensor kamera & label lengkap
      let tempStream: MediaStream | null = null;
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          tempStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } }
          }).catch(async () => {
            return await navigator.mediaDevices.getUserMedia({ video: true });
          });
        }
      } catch (permErr: unknown) {
        console.warn('[UnifiedKegiatanTerminal] Permission handshake catch:', permErr);
      } finally {
        if (tempStream) {
          tempStream.getTracks().forEach((t) => t.stop());
        }
      }

      // 2. Enumerate cameras
      let devices: Array<{ id: string; label: string }> = [];
      try {
        devices = await Html5Qrcode.getCameras();
      } catch (camErr) {
        console.warn('[UnifiedKegiatanTerminal] getCameras error:', camErr);
      }

      const html5QrCode = new Html5Qrcode('pos-panel-camera-qr-reader');
      qrScannerRef.current = html5QrCode;

      const onScanSuccess = (decodedText: string) => {
        const now = Date.now();
        if (decodedText === lastScannedTokenRef.current && now - lastScannedTimeRef.current < 2500) {
          return; // Debounce scan token yang sama 2.5 detik
        }
        lastScannedTokenRef.current = decodedText;
        lastScannedTimeRef.current = now;
        handleProcessToken(decodedText, 'QR');
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
          // Fallback ke facingMode environment jika start by ID gagal
          await html5QrCode.start({ facingMode: 'environment' }, qrConfig, onScanSuccess, () => {});
        }
      } else {
        // Fallback langsung menggunakan facingMode environment
        setCameraStatus('Kamera Aktif: Sensor Belakang');
        await html5QrCode.start({ facingMode: 'environment' }, qrConfig, onScanSuccess, () => {});
      }
    } catch (err: unknown) {
      console.warn('Start QR scanner exception:', err);
      const errMsg = String((err as { message?: string })?.message || err || '');
      if (errMsg.toLowerCase().includes('permission') || errMsg.includes('NotAllowedError')) {
        setCameraError('Izin akses kamera ditolak oleh browser/perangkat. Berikan izin kamera di setelan browser atau gunakan kamera sistem.');
      } else {
        setCameraError(errMsg || 'Gagal menyalakan kamera. Pastikan izin kamera telah diberikan di browser.');
      }
    }
  }, [stopCameraScanner, handleProcessToken]);

  // Handle Tab Switch & Camera Mount
  useEffect(() => {
    if (activeTab === 'QR') {
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
  }, [activeTab, activeCameraIndex, startCameraScanner, stopCameraScanner]);

  const handleSwitchCamera = useCallback(() => {
    if (cameraList.length > 1) {
      const nextIndex = (activeCameraIndex + 1) % cameraList.length;
      startCameraScanner(nextIndex);
    }
  }, [cameraList, activeCameraIndex, startCameraScanner]);

  const panelTitle = title || `Terminal Presensi Multi-Input — ${jenisKegiatan.toUpperCase()}`;
  const panelSubtitle = subtitle || `Mode Kiosk Cepat: Tempel RFID, Barcode Gun, Scan QR Kamera atau Cari Nama`;

  return (
    <div 
      className={`bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col ${className}`}
      onClick={() => {
        if (activeTab === 'RFID') focusHidInput();
      }}
    >
      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Scan className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black tracking-tight">{panelTitle}</h3>
              <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-300 border-amber-500/40 py-0">
                Universal Terminal
              </Badge>
            </div>
            <p className="text-[11px] text-slate-300/80 mt-0.5">{panelSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSoundEnabled(prev => !prev);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors text-xs font-semibold"
            title={soundEnabled ? 'Matikan Suara Beep' : 'Nyalakan Suara Beep'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-300" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline text-[11px]">{soundEnabled ? 'Suara ON' : 'Mute'}</span>
          </button>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="px-5 pt-3 pb-2 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-2xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('RFID')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'MANUAL'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Cari / Ketik</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Siaga Menerima Input</span>
        </div>
      </div>

      {/* Main Terminal Grid: Scanner & History Feed */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Input Active Mode & Last Result Feedback */}
        <div className="lg:col-span-7 space-y-4">
          {/* TAB 1: RFID & Barcode HID */}
          {activeTab === 'RFID' && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 border border-indigo-200/70 dark:border-indigo-800/60 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 text-center sm:text-left">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center justify-center sm:justify-start gap-2">
                      Scanner Hardware Siap
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                        Auto-Listen Active
                      </Badge>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Tempelkan kartu RFID atau tembak dengan barcode scanner 2D.
                    </p>
                  </div>
                </div>

                {/* Input Cepat HID */}
                <div className="w-full sm:w-60">
                  <input
                    ref={inputRef}
                    id="pos-panel-hid-input"
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
          )}

          {/* TAB 2: Scan QR Kamera */}
          {activeTab === 'QR' && (
            <div className="space-y-3">
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleNativeCameraScan}
                className="hidden"
              />

              <div className="relative overflow-hidden rounded-3xl bg-slate-950 w-full min-h-[260px] shadow-2xl ring-1 ring-slate-800 flex flex-col items-center justify-center">
                <div id="pos-panel-camera-qr-reader" className="w-full h-full min-h-[260px] overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-3xl" />
                
                {cameraError ? (
                  <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-rose-400 z-20">
                    <AlertCircle className="w-10 h-10 mb-2" />
                    <p className="text-sm font-bold text-white max-w-md">{cameraError}</p>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
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
                        className="text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-none shadow-lg shadow-emerald-500/20"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1.5" /> Buka Kamera Sistem HP
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute bottom-3 inset-x-3 text-center text-white text-xs font-medium bg-black/60 backdrop-blur-md py-1.5 px-4 rounded-xl pointer-events-none z-10 flex items-center justify-between">
                    <span>{cameraStatus}</span>
                    <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">Arahkan QR Code</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="text-xs font-bold gap-1.5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Fallback Kamera Sistem HP</span>
                </Button>

                {cameraList.length > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSwitchCamera}
                    className="text-xs font-bold gap-1.5 rounded-xl"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Ganti Kamera ({activeCameraIndex + 1}/{cameraList.length})
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Cari / Ketik Manual */}
          {activeTab === 'MANUAL' && (
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
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
                  Ketik nama atau NIP, lalu klik nama guru untuk langsung presensi.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
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
          )}

          {/* Feedback Hasil Scan Terakhir */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 rounded-3xl border border-dashed border-indigo-200 dark:border-indigo-800 text-center space-y-3 bg-indigo-50/20"
              >
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                  Memverifikasi Identitas &amp; Sinkronisasi Dual-Presence...
                </p>
              </motion.div>
            ) : lastResult ? (
              <motion.div
                key={lastResult.success ? 'success' : 'error'}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-3xl border shadow-sm ${
                  lastResult.success
                    ? 'bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-emerald-200 dark:border-emerald-800/80'
                    : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {lastResult.success && lastResult.data ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/80 dark:border-emerald-700/50">
                          {lastResult.data.guru?.foto ? (
                            <img
                              src={resolveProfilePhotoUrl(lastResult.data.guru.foto)}
                              alt={lastResult.data.guru.nama_guru}
                              className="w-full h-full rounded-2xl object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Presensi Diterima
                            </span>
                            {lastResult.data.synced_kbm && (
                              <Badge variant="default" className="text-[9px] font-bold bg-indigo-600 text-white gap-1 py-0">
                                <Zap className="w-3 h-3 text-amber-300" /> 1 Tap 2 Record
                              </Badge>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">
                            {lastResult.data.guru?.nama_guru}
                          </h4>
                          {lastResult.data.guru?.nip && (
                            <p className="text-[11px] text-slate-400 font-mono">
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

                    <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span className="font-medium">{lastResult.data.message}</span>
                      {lastResult.data.synced_kbm && (
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> KBM Terbuka
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-black text-rose-800 dark:text-rose-200">Identitas Tidak Dikenali</p>
                      <p className="text-[11px] text-rose-600 dark:text-rose-300 mt-0.5">{lastResult.errorMsg}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Right Column (5 cols): Live Recent Tap History Feed */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50/60 dark:bg-slate-800/30 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 min-h-[300px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-500" /> Riwayat Tap Sesi Ini ({history.length})
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
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada kartu atau tap presensi pada sesi terminal ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1 space-y-1">
                {history.map(item => (
                  <div key={item.id} className="py-2 flex items-center justify-between text-xs hover:bg-white/80 dark:hover:bg-slate-800/60 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">{item.nama}</p>
                          <Badge variant="outline" className="text-[8px] py-0 px-1">
                            {item.metode}
                          </Badge>
                        </div>
                        {item.nip && <p className="text-[9px] text-slate-400 font-mono">NIP: {item.nip}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.syncedKbm && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                          ⚡ KBM
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">{item.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Mendukung Reader USB HID, Barcode Gun, Kamera QR &amp; Pencarian Nama</span>
          </div>
        </div>
      </div>
    </div>
  );
};
