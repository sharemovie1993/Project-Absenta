import React, { useState, useMemo } from 'react';
import { Modal, Button, Badge } from '@/components/ui';
import {
  Wand2,
  Building2,
  RotateCw,
  Clock,
  Users,
  CheckCircle2,
  Sliders,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CbtJadwalUjian } from '@/types/cbt.types';

export type AutoPlotRoomStrategy = 'STAY_ROOM' | 'ROLLING_SESSION' | 'MAX_N_SESSION_PER_ROOM';
export type AutoPlotCandidateScope = 'PENDIDIK_ONLY' | 'ALL_STAFF';

export interface AutoPlotConfigOptions {
  roomStrategy: AutoPlotRoomStrategy;
  maxSessionsPerRoom: number;
  maxSessionsPerDay: number; // 0 = tidak dibatasi
  candidateScope: AutoPlotCandidateScope;
  onlyUnassigned: boolean;
}

interface CbtAutoPlotConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: AutoPlotConfigOptions) => void;
  jadwalList: CbtJadwalUjian[];
  pendidikCount: number;
  tenagaKependidikanCount: number;
  alreadyPlottedCount: number;
}

export const CbtAutoPlotConfigModal: React.FC<CbtAutoPlotConfigModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  jadwalList,
  pendidikCount,
  tenagaKependidikanCount,
  alreadyPlottedCount,
}) => {
  // Config state
  const [roomStrategy, setRoomStrategy] = useState<AutoPlotRoomStrategy>('STAY_ROOM');
  const [maxSessionsPerRoom, setMaxSessionsPerRoom] = useState<number>(2);
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState<number>(0); // 0 = ikuti hari
  const [candidateScope, setCandidateScope] = useState<AutoPlotCandidateScope>('PENDIDIK_ONLY');
  const [onlyUnassigned, setOnlyUnassigned] = useState<boolean>(true);

  // Quick stats
  const totalSchedules = jadwalList.length;
  const unassignedCount = Math.max(0, totalSchedules - alreadyPlottedCount);

  // Distinct rooms & days
  const { distinctRoomsCount, distinctDaysCount } = useMemo(() => {
    const rooms = new Set<string>();
    const days = new Set<string>();
    jadwalList.forEach((j) => {
      const r = (j.setting_keamanan?.ruang_ujian || '').trim();
      if (r) rooms.add(r);
      const d = j.tanggal_mulai ? j.tanggal_mulai.split('T')[0] : '';
      if (d) days.add(d);
    });
    return {
      distinctRoomsCount: rooms.size || 1,
      distinctDaysCount: days.size || 1,
    };
  }, [jadwalList]);

  const candidateCount = candidateScope === 'PENDIDIK_ONLY'
    ? pendidikCount
    : pendidikCount + tenagaKependidikanCount;

  const targetSessionCount = onlyUnassigned ? unassignedCount : totalSchedules;
  const avgLoadPerTeacher = candidateCount > 0
    ? (targetSessionCount / candidateCount).toFixed(1)
    : '0';

  const handleApply = () => {
    onConfirm({
      roomStrategy,
      maxSessionsPerRoom,
      maxSessionsPerDay,
      candidateScope,
      onlyUnassigned,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfigurasi Distribusi Otomatis Pengawas"
      size="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Banner Statistik Sesi & Guru */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Target Sesi</span>
            <p className="text-base font-black text-slate-800 dark:text-slate-100 font-mono">
              {targetSessionCount} <span className="text-xs font-semibold text-slate-400">/ {totalSchedules}</span>
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total Ruang Fisik</span>
            <p className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {distinctRoomsCount} <span className="text-xs font-semibold text-slate-400">Ruang</span>
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Kandidat Guru</span>
            <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {candidateCount} <span className="text-xs font-semibold text-slate-400">Orang</span>
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Rata-rata Beban</span>
            <p className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
              ~{avgLoadPerTeacher} <span className="text-xs font-semibold text-slate-400">Sesi/Guru</span>
            </p>
          </div>
        </div>

        {/* ── 1. STRATEGI ALOKASI RUANG ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
            <Building2 size={14} className="text-indigo-600" />
            <span>1. Pola Alokasi Ruang Kelas (SOP Sekolah)</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* Opsi A: Stay in Room Full Day */}
            <label
              className={cn(
                'p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3',
                roomStrategy === 'STAY_ROOM'
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              )}
            >
              <input
                type="radio"
                name="roomStrategy"
                value="STAY_ROOM"
                checked={roomStrategy === 'STAY_ROOM'}
                onChange={() => setRoomStrategy('STAY_ROOM')}
                className="mt-1 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Tetap di 1 Ruang Seharian (Full Day per Ruang)
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                    Sangat Dianjurkan
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Guru yang mengawas di Ruang R.01 akan memegang seluruh sesi di ruang tersebut dari pagi hingga selesai pada hari itu. Guru tidak perlu lelah berpindah ruangan.
                </p>
              </div>
            </label>

            {/* Opsi B: Max N Sessions per Room */}
            <label
              className={cn(
                'p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3',
                roomStrategy === 'MAX_N_SESSION_PER_ROOM'
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              )}
            >
              <input
                type="radio"
                name="roomStrategy"
                value="MAX_N_SESSION_PER_ROOM"
                checked={roomStrategy === 'MAX_N_SESSION_PER_ROOM'}
                onChange={() => setRoomStrategy('MAX_N_SESSION_PER_ROOM')}
                className="mt-1 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Maksimal N Sesi di Ruang yang Sama (Lalu Rotasi)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Guru mengawas hingga batas sesi tertentu di satu kelas (misal 2 sesi), kemudian sesi berikutnya dirotasi ke kelas lain agar tetap ada penyegaran.
                </p>

                {roomStrategy === 'MAX_N_SESSION_PER_ROOM' && (
                  <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/60">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Batas Sesi per Ruang:
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setMaxSessionsPerRoom(num)}
                          className={cn(
                            'w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer',
                            maxSessionsPerRoom === num
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400">Sesi per ruang</span>
                  </div>
                )}
              </div>
            </label>

            {/* Opsi C: Rolling per Session */}
            <label
              className={cn(
                'p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3',
                roomStrategy === 'ROLLING_SESSION'
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              )}
            >
              <input
                type="radio"
                name="roomStrategy"
                value="ROLLING_SESSION"
                checked={roomStrategy === 'ROLLING_SESSION'}
                onChange={() => setRoomStrategy('ROLLING_SESSION')}
                className="mt-1 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Rotasi Tiap Sesi (Rolling Antar Ruang Bebas)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Pengawasan silang ketat. Guru akan berpindah ruangan di setiap sesi berikutnya dan tidak mengawas kelas yang sama dua kali berturut-turut.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* ── 2. BATAS BEBAN HARIAN GURU ── */}
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
            <Clock size={14} className="text-amber-600" />
            <span>2. Batasan Beban Mengawas Harian (Load Balancer)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { val: 0, label: 'Tanpa Batas', desc: 'Sesuai sesi ruang' },
              { val: 1, label: 'Maks 1 Sesi', desc: '1 sesi per hari' },
              { val: 2, label: 'Maks 2 Sesi', desc: '2 sesi per hari' },
              { val: 3, label: 'Maks 3 Sesi', desc: '3 sesi per hari' },
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => setMaxSessionsPerDay(item.val)}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                  maxSessionsPerDay === item.val
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                )}
              >
                <div className="font-bold text-slate-900 dark:text-slate-100">{item.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. KELOMPOK KANDIDAT & TARGET SESI ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
              <Users size={14} className="text-emerald-600" />
              <span>3. Target Kandidat</span>
            </label>
            <select
              value={candidateScope}
              onChange={(e) => setCandidateScope(e.target.value as AutoPlotCandidateScope)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="PENDIDIK_ONLY">
                🎓 Hanya Guru Pendidik ({pendidikCount} Guru)
              </option>
              <option value="ALL_STAFF">
                🏢 Guru Pendidik + Staf TU ({pendidikCount + tenagaKependidikanCount} Orang)
              </option>
            </select>
            <p className="text-[10px] text-slate-400">
              {candidateScope === 'PENDIDIK_ONLY'
                ? 'Staf TU tetap bisa diplot secara manual di tabel jika sewaktu-waktu dibutuhkan.'
                : 'Staf TU ikut disertakan dalam pengacakan otomatis.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
              <Sliders size={14} className="text-blue-600" />
              <span>4. Lingkup Distribusi</span>
            </label>
            <select
              value={onlyUnassigned ? 'UNASSIGNED_ONLY' : 'OVERWRITE_ALL'}
              onChange={(e) => setOnlyUnassigned(e.target.value === 'UNASSIGNED_ONLY')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="UNASSIGNED_ONLY">
                Isi Sesi yang Belum Terplot ({unassignedCount} Sesi)
              </option>
              <option value="OVERWRITE_ALL">
                Kocok Ulang Seluruh Sesi ({totalSchedules} Sesi)
              </option>
            </select>
            <p className="text-[10px] text-slate-400">
              {onlyUnassigned
                ? 'Pengawas yang sudah diplot manual tidak akan diubah.'
                : 'Seluruh ploting sebelumnya akan ditimpa dengan hasil distribusi baru.'}
            </p>
          </div>
        </div>

        {/* Tip Informatif */}
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-2 text-blue-900 dark:text-blue-200">
          <Info size={14} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <p className="text-[11px] leading-relaxed">
            <strong>Algoritma Idempoten &amp; Anti-Bentrok:</strong> Sistem secara ketat memeriksa jadwal agar tidak ada guru yang mengawas 2 ruang berbeda pada jam yang sama, serta melakukan pemerataan beban agar total sesi terbagi adil.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApply}
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
          >
            <Wand2 size={14} />
            <span>Terapkan Distribusi Otomatis</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
