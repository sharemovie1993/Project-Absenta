import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import type { RecentScanRecord } from '../types';

interface SatpamScanGerbangTabProps {
  recentTaps: RecentScanRecord[];
  onTapSubmit?: (nisnOrRfid: string) => Promise<boolean>;
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
  recentTaps,
  onTapSubmit,
  isLoading = false,
}) => {
  const [nisnInput, setNisnInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [activeGate, setActiveGate] = useState('Pos Gerbang Utama 1');
  const [lastScanned, setLastScanned] = useState<RecentScanRecord | null>(recentTaps[0] || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input focused for physical USB barcode/RFID scanner
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleProcessScan = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsProcessing(true);
    try {
      if (onTapSubmit) {
        await onTapSubmit(trimmed);
      }

      // Mock / local feedback update
      const now = new Date();
      const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const isLate = now.getHours() >= 7 && now.getMinutes() > 0;

      const record: RecentScanRecord = {
        id: `tap-${Date.now()}`,
        nama: trimmed === '0058291824' ? 'Fahrizal Rahmat' : `Siswa (${trimmed.slice(-4)})`,
        nisn: trimmed,
        kelas: 'XI RPL 1',
        jurusan: 'Rekayasa Perangkat Lunak',
        status: isLate ? 'TERLAMBAT' : 'HADIR',
        jam: jamStr,
        gate: activeGate,
        foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      };

      setLastScanned(record);
      if (!isMuted) {
        playBeep(isLate ? 'warning' : 'success');
      }

      if (isLate) {
        toast.error(`Terlambat: ${record.nama} (${jamStr})`, { icon: '⚠️' });
      } else {
        toast.success(`Hadir: ${record.nama} (${jamStr})`, { icon: '✅' });
      }

      setNisnInput('');
    } catch {
      if (!isMuted) playBeep('error');
      toast.error('Gagal mencatat tap gerbang.');
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  }, [activeGate, isMuted, onTapSubmit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessScan(nisnInput);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
      {/* ── LEFT: SCAN TERMINAL (7 COLS) ────────────────────── */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl space-y-5">
          {/* Header Pos Status */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Terminal Scan RFID & Barcode</h3>
                <p className="text-[11px] text-slate-400">Siap menerima tap kartu fisik & kamera QR</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title={isMuted ? 'Nyalakan Suara Beep' : 'Bisukan Suara Beep'}
                aria-label="Toggle Suara Beep"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-emerald-400" />}
              </button>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
          </div>

          {/* Scanner Viewport Frame */}
          <div className="relative w-full h-56 sm:h-64 rounded-2xl bg-slate-950 border border-emerald-500/30 flex flex-col items-center justify-center text-center p-6 space-y-3 overflow-hidden group select-none">
            {/* Animated Laser Reticle */}
            <div className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_#10b981] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-inner group-hover:scale-105 transition-transform">
              <QrCode size={36} />
            </div>
            <div className="space-y-1 relative z-10 max-w-sm">
              <h4 className="text-xs font-mono font-bold text-slate-200 tracking-wide uppercase">
                Tempelkan Kartu Siswa ke Reader USB
              </h4>
              <p className="text-[11px] text-slate-500">
                Alat scanner otomatis membaca kode RFID / NISN tanpa perlu klik mouse
              </p>
            </div>
          </div>

          {/* Input Bar for Hardware Reader & Manual Input */}
          <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="uppercase tracking-wider">Input Barcode / NISN Fisik:</span>
              <span className="text-[10px] text-teal-400 font-mono">Auto-Focus Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Scan className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <Input
                  ref={inputRef}
                  type="text"
                  value={nisnInput}
                  onChange={(e) => setNisnInput(e.target.value)}
                  placeholder="Scan kartu atau ketik NISN..."
                  aria-label="Scan kartu atau ketik NISN"
                  className="pl-10 h-11 bg-slate-950 border-slate-800 text-white font-mono text-xs rounded-2xl focus:border-rose-500"
                />
              </div>
              <Button
                type="submit"
                disabled={isProcessing || !nisnInput.trim()}
                className="h-11 px-5 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-950/40 gap-1.5 shrink-0"
              >
                {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                <span>Tap</span>
              </Button>
            </div>
          </form>
        </div>

        {/* ── CARD HASIL TAP TERAKHIR ────────────────────────── */}
        {lastScanned && (
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                {lastScanned.foto ? (
                  <img src={lastScanned.foto} alt={lastScanned.nama} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User size={24} />
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
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  )}>
                    {lastScanned.status === 'TERLAMBAT' ? 'Terlambat' : 'Tepat Waktu'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {lastScanned.kelas} • NISN: <span className="font-mono font-bold">{lastScanned.nisn}</span>
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
          <span className="text-[10px] font-mono font-bold text-slate-400">
            Realtime Live
          </span>
        </div>

        <div className="space-y-2.5 max-h-[520px] overflow-y-auto no-scrollbar pr-1">
          {recentTaps.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShieldCheck size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-medium">Belum ada tap siswa tercatat di pos ini</p>
            </div>
          ) : (
            recentTaps.map((item, idx) => {
              const isTerlambat = item.status === 'TERLAMBAT';
              return (
                <div
                  key={item.id || idx}
                  className={cn(
                    "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3",
                    isTerlambat
                      ? "bg-rose-50/40 dark:bg-rose-950/15 border-rose-200/60 dark:border-rose-900/40"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                      isTerlambat ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400" : "bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400"
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
                      isTerlambat ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {isTerlambat ? 'Terlambat' : 'Hadir'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
