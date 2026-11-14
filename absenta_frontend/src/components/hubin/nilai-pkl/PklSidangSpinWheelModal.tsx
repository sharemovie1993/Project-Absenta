import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ScoreRow } from './types';
import { Modal, Button } from '@/components/ui';
import {
  Sparkles,
  RotateCw,
  UserCheck,
  CheckCircle2,
  Trash2,
  Volume2,
  VolumeX,
  Trophy,
  Users,
  Building2,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PklSidangSpinWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: ScoreRow[];
  activePengujiNama?: string;
  onSelectStudentToGrade?: (student: ScoreRow) => void;
}

// 12 Warna ceria khas game wheel of fortune
const WHEEL_COLORS = [
  '#4F46E5', // Indigo
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Violet
  '#84CC16', // Lime
  '#EF4444', // Rose
];

export const PklSidangSpinWheelModal: React.FC<PklSidangSpinWheelModalProps> = ({
  isOpen,
  onClose,
  scores,
  activePengujiNama = '',
  onSelectStudentToGrade,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // State Scope: 'MY_STUDENTS' (Hanya yang diuji saya) vs 'ALL_DISPLAYED' (Seluruh tampilan filter)
  const [scope, setScope] = useState<'MY_STUDENTS' | 'ALL_DISPLAYED'>(() => {
    return activePengujiNama ? 'MY_STUDENTS' : 'ALL_DISPLAYED';
  });

  // State daftar ID siswa yang sudah terpanggil / diuji (Disimpan di Session Storage agar tidak hilang saat reload)
  const [calledIds, setCalledIds] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem('absenta_pkl_sidang_called_ids');
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch {}
    return new Set();
  });

  // Update session storage saat calledIds berubah
  useEffect(() => {
    try {
      sessionStorage.setItem('absenta_pkl_sidang_called_ids', JSON.stringify(Array.from(calledIds)));
    } catch {}
  }, [calledIds]);

  // Filter siswa kandidat berdasarkan Scope
  const scopedCandidateList = useMemo(() => {
    return scores.filter((s) => {
      if (scope === 'MY_STUDENTS' && activePengujiNama) {
        return s.penguji_nama === activePengujiNama;
      }
      return true;
    });
  }, [scores, scope, activePengujiNama]);

  // Daftar siswa yang MASIH AKTIF di roda (Belum Dipanggil)
  const activeWheelCandidates = useMemo(() => {
    return scopedCandidateList.filter((s) => !calledIds.has(s.siswa_pkl_id));
  }, [scopedCandidateList, calledIds]);

  // Daftar siswa yang SUDAH DIPANGGIL
  const calledCandidates = useMemo(() => {
    return scopedCandidateList.filter((s) => calledIds.has(s.siswa_pkl_id));
  }, [scopedCandidateList, calledIds]);

  // State Animasi Roda
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0); // dalam radian
  const [winner, setWinner] = useState<ScoreRow | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio Ticks sintetis dengan Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const playTickSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }, [soundEnabled]);

  const playFanfareSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + idx * 0.1;
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch {}
  }, [soundEnabled]);

  // Gambar Roda pada Canvas
  const drawWheel = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;

    ctx.clearRect(0, 0, width, height);

    const candidates = activeWheelCandidates;
    const count = candidates.length;

    if (count === 0) {
      // Tampilan roda kosong (semua sudah dipanggil)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#f1f5f9';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Semua Siswa Sudah Dipanggil!', centerX, centerY);
      return;
    }

    const arcSize = (Math.PI * 2) / count;

    // Gambar Segmen-segmen
    candidates.forEach((student, i) => {
      const segAngle = angle + i * arcSize;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, segAngle, segAngle + arcSize);
      ctx.closePath();

      // Warna segmen
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Teks Nama Siswa di Segmen
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(segAngle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = count > 20 ? 'bold 10px system-ui, sans-serif' : 'bold 12px system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;

      // Truncate nama jika terlalu panjang
      const maxLen = count > 15 ? 14 : 18;
      const displayName = student.nama_siswa.length > maxLen
        ? student.nama_siswa.slice(0, maxLen - 1) + '…'
        : student.nama_siswa;

      ctx.fillText(displayName, radius - 20, 4);
      ctx.restore();
    });

    // Lingkaran Luar (Ring Chrome)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Pusat Roda (Center Hub Pin)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 6;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#4f46e5';
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [activeWheelCandidates]);

  // Efek gambar ulang saat kandidat atau putaran berubah
  useEffect(() => {
    drawWheel(currentRotation);
  }, [drawWheel, currentRotation]);

  // Logika Pemutaran Roda (Physics Spin Deceleration)
  const spinTimeoutRef = useRef<number | null>(null);
  const spinStartTimeRef = useRef<number>(0);
  const spinDurationRef = useRef<number>(0);
  const startAngleRef = useRef<number>(0);
  const targetAngleRef = useRef<number>(0);
  const lastTickAngleRef = useRef<number>(0);

  const handleStartSpin = () => {
    if (isSpinning || activeWheelCandidates.length === 0) return;

    setWinner(null);
    setIsSpinning(true);

    const candidates = activeWheelCandidates;
    const count = candidates.length;
    const arcSize = (Math.PI * 2) / count;

    // Tentukan secara acak siswa pemenang
    const winnerIndex = Math.floor(Math.random() * count);

    // Hitung sudut rotasi agar segmen pemenang berhenti tepat di penunjuk (Posisi penunjuk di arah JAM 3 / 0 radian)
    // Di canvas arah jarum jam, penunjuk ada di sisi kanan (0 radian)
    // Segmen ke-i terbentang antara angle + i*arcSize s/d angle + (i+1)*arcSize
    // Titik tengah segmen pemenang harus berada di 0 mod 2PI
    const targetSegmentCenter = winnerIndex * arcSize + arcSize / 2;
    // Berapa putaran penuh (min 5 putaran penuh s/d 8 putaran)
    const fullSpins = (5 + Math.floor(Math.random() * 4)) * (Math.PI * 2);
    
    const startAngle = currentRotation % (Math.PI * 2);
    // Kita ingin: (targetAngle + targetSegmentCenter) % 2PI == 0 (atau 2PI)
    // => targetAngle = fullSpins + (2PI - targetSegmentCenter)
    const targetAngle = startAngle + fullSpins + (Math.PI * 2 - (targetSegmentCenter % (Math.PI * 2)));

    spinStartTimeRef.current = performance.now();
    spinDurationRef.current = 4500 + Math.random() * 1000; // 4.5 - 5.5 detik
    startAngleRef.current = startAngle;
    targetAngleRef.current = targetAngle;
    lastTickAngleRef.current = startAngle;

    const animateSpin = (now: number) => {
      const elapsed = now - spinStartTimeRef.current;
      const progress = Math.min(1, elapsed / spinDurationRef.current);

      // Easing out cubic: 1 - (1 - t)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newAngle = startAngleRef.current + (targetAngleRef.current - startAngleRef.current) * easeOut;

      setCurrentRotation(newAngle);
      drawWheel(newAngle);

      // Suara Tick per segmen yang terlewati
      const angleDiff = Math.abs(newAngle - lastTickAngleRef.current);
      if (angleDiff >= arcSize * 0.75) {
        playTickSound();
        lastTickAngleRef.current = newAngle;
      }

      if (progress < 1) {
        spinTimeoutRef.current = requestAnimationFrame(animateSpin);
      } else {
        // Selesai berputar!
        setIsSpinning(false);
        const winningStudent = candidates[winnerIndex];
        setWinner(winningStudent);
        playFanfareSound();

        // Tambahkan ke daftar yang sudah dipanggil agar tidak terpanggil ulang
        setCalledIds((prev) => {
          const next = new Set(prev);
          next.add(winningStudent.siswa_pkl_id);
          return next;
        });
      }
    };

    spinTimeoutRef.current = requestAnimationFrame(animateSpin);
  };

  // Bersihkan animasi saat unmount
  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        cancelAnimationFrame(spinTimeoutRef.current);
      }
    };
  }, []);

  // Handler Hapus dari Daftar Sudah Dipanggil (Kembalikan ke Roda)
  const handleRestoreStudent = (siswaPklId: string) => {
    setCalledIds((prev) => {
      const next = new Set(prev);
      next.delete(siswaPklId);
      return next;
    });
  };

  // Handler Reset Seluruh Putaran
  const handleResetCalledList = () => {
    if (window.confirm('Reset daftar putaran? Seluruh siswa akan kembali masuk ke daftar roda acak.')) {
      setCalledIds(new Set());
      setWinner(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSpinning) onClose();
      }}
      title="Pengacak Siswa Sidang PKL (Spin Wheel)"
      description="Putar roda untuk memanggil giliran siswa yang akan diuji secara acak dan adil."
      size="4xl"
    >
      <div className="space-y-4">
        {/* Top Control Bar: Scope Filter, Suara & Reset */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          {/* Scope Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Scope:</span>
            {activePengujiNama ? (
              <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setScope('MY_STUDENTS');
                    setWinner(null);
                  }}
                  disabled={isSpinning}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-bold transition-all',
                    scope === 'MY_STUDENTS'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  Ujian Saya ({scores.filter(s => s.penguji_nama === activePengujiNama).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScope('ALL_DISPLAYED');
                    setWinner(null);
                  }}
                  disabled={isSpinning}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-bold transition-all',
                    scope === 'ALL_DISPLAYED'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  Semua Siswa ({scores.length})
                </button>
              </div>
            ) : (
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                Semua Siswa Terfilter ({scores.length} Siswa)
              </span>
            )}
          </div>

          {/* Quick Counter & Sound Toggle */}
          <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Sisa: {activeWheelCandidates.length}
              </span>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-200/60 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                Terpanggil: {calledCandidates.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title={soundEnabled ? 'Matikan Suara Roda' : 'Nyalakan Suara Roda'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Main Workspace: Spin Wheel + Winner Banner + History Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Sisi Kiri: Roda Putar Interaktif (7 Kolom) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-950/50 shadow-inner relative overflow-hidden">
            {/* Visual Pointer / Penunjuk Jarum Jam 3 */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={360}
                height={360}
                className="max-w-full drop-shadow-md select-none"
              />
              {/* Penunjuk Panah Segitiga (Arah Jam 3 / Menunjuk ke Tengah Kiri) */}
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 pointer-events-none drop-shadow-md"
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '14px solid transparent',
                  borderBottom: '14px solid transparent',
                  borderRight: '28px solid #EF4444', // Merah tegas
                }}
              />
            </div>

            {/* Tombol Utama SPIN */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <Button
                type="button"
                size="lg"
                onClick={handleStartSpin}
                disabled={isSpinning || activeWheelCandidates.length === 0}
                className={cn(
                  'h-12 px-8 rounded-2xl font-black text-sm tracking-wider uppercase transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2',
                  activeWheelCandidates.length === 0
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/25'
                )}
              >
                {isSpinning ? (
                  <>
                    <RotateCw className="w-5 h-5 animate-spin" />
                    <span>Mengacak Siswa...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>PUTAR RODA SEKARANG ({activeWheelCandidates.length})</span>
                  </>
                )}
              </Button>

              {activeWheelCandidates.length === 0 && (
                <button
                  type="button"
                  onClick={handleResetCalledList}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  <RefreshCw size={12} />
                  <span>Ulangi Putaran (Reset Daftar)</span>
                </button>
              )}
            </div>
          </div>

          {/* Sisi Kanan: Hasil Pemenang & Riwayat Siswa (5 Kolom) */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Banner Siswa Terpanggil (Winner Card) */}
            {winner && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 text-white shadow-xl shadow-indigo-500/20 space-y-3 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between text-indigo-100 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-300 animate-bounce" />
                    <span>GILIRAN BERIKUTNYA</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                    #{calledCandidates.length} Terpanggil
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black tracking-tight leading-tight drop-shadow-xs">
                    {winner.nama_siswa}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-indigo-100 font-medium mt-1">
                    <span>{winner.nama_kelas || 'Kelas'}</span>
                    <span>•</span>
                    <span className="truncate">{winner.mitra_nama || 'DUDI'}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  {onSelectStudentToGrade && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onSelectStudentToGrade(winner);
                        onClose();
                      }}
                      className="flex-1 bg-white hover:bg-slate-100 text-indigo-900 font-bold text-xs h-9 rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Mulai Nilai Siswa Ini</span>
                      <ArrowRight size={14} />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setWinner(null)}
                    className="border-white/30 text-white hover:bg-white/10 font-bold text-xs h-9 px-3 rounded-xl cursor-pointer"
                  >
                    Lanjut
                  </Button>
                </div>
              </div>
            )}

            {/* Riwayat Pemanggilan Siswa PKL */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <UserCheck size={14} className="text-indigo-500" />
                  <span>Sudah Dipanggil ({calledCandidates.length})</span>
                </div>
                {calledCandidates.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetCalledList}
                    className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Kosongkan riwayat pemanggilan"
                  >
                    <Trash2 size={11} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                {calledCandidates.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 italic">
                    Belum ada siswa yang dipanggil. Silakan putar roda di samping.
                  </div>
                ) : (
                  calledCandidates.map((s, idx) => (
                    <div
                      key={s.siswa_pkl_id}
                      className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                          <span className="text-[10px] text-slate-400 font-mono mr-1">#{idx + 1}</span>
                          {s.nama_siswa}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {s.nama_kelas} • {s.mitra_nama}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onSelectStudentToGrade && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectStudentToGrade(s);
                              onClose();
                            }}
                            className="px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer"
                            title="Buka form penilaian siswa ini"
                          >
                            Nilai
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRestoreStudent(s.siswa_pkl_id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Kembalikan siswa ini ke daftar putaran roda"
                        >
                          <RotateCw size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PklSidangSpinWheelModal;
