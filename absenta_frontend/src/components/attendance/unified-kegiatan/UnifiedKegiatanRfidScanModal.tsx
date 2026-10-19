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
  Radio
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
}

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
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    data?: UnifiedRfidTapResponse;
    errorMsg?: string;
  } | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Pastikan input selalu fokus saat modal terbuka untuk membaca ketukan USB RFID reader
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setLastResult(null);
      setTokenInput('');
    }
  }, [isOpen]);

  const handleProcessToken = useCallback(async (token: string) => {
    const trimmed = token.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setTokenInput('');

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
          },
          ...prev.slice(0, 14), // Simpan 15 rekaman terakhir
        ]);

        onSuccessTap?.(res);
      } else {
        if (soundEnabled) playBeep('error');
        setLastResult({
          success: false,
          errorMsg: res.message || 'Gagal memproses kartu RFID',
        });
      }
    } catch (err: unknown) {
      if (soundEnabled) playBeep('error');
      const msg = (err as { message?: string })?.message || 'Kartu RFID tidak terdaftar atau koneksi gagal';
      setLastResult({
        success: false,
        errorMsg: msg,
      });
    } finally {
      setLoading(false);
      // Re-focus input untuk tap berikutnya
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [loading, sesiId, jadwalKegiatanId, jenisKegiatan, soundEnabled, onSuccessTap]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessToken(tokenInput);
    }
  }, [handleProcessToken, tokenInput]);

  const modalTitle = title || `Terminal Scan RFID — ${jenisKegiatan.toUpperCase()}`;
  const modalSubtitle = subtitle || `Tempelkan kartu RFID Guru, Pembina, atau Panitia ke Card Reader`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">{modalTitle}</h3>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/40">
                  Universal Engine
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
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
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

        {/* Hidden / Standby Reader Input */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Active Scanner Status Box */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute inset-0 opacity-75" />
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 relative" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  Scanner RFID Siap Menerima Kartu
                </p>
                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                  Arahkan kartu ke sensor RFID reader atau ketik manual token / NIP di bawah.
                </p>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <input
                ref={inputRef}
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Nomor Kartu / NIP..."
                className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Kartu Feedback Scan Terakhir */}
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
                  Memverifikasi Kartu &amp; Mencatat Dual-Presence...
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
                              src={lastResult.data.guru.foto}
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
                      <p className="text-sm font-black text-rose-800 dark:text-rose-200">Kartu Tidak Dikenali</p>
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
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada kartu guru yang di-tap pada sesi modal ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto pr-1">
                {history.map(item => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.nama}</p>
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
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            Mendukung Card Reader USB HID standar (Auto-Enter)
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="font-bold text-xs">
            Tutup Scanner
          </Button>
        </div>
      </div>
    </div>
  );
};
