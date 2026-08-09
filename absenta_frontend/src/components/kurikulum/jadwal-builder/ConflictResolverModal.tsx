import React from 'react';
import { AlertTriangle, UserCheck, ArrowRightLeft, Trash2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';

export interface ConflictDetails {
  day: string;
  slotIndex: number;
  targetKelasId: string;
  targetKelasName: string;
  guruId: string;
  guruName: string;
  mapelId: string;
  mapelName: string;
  conflictKelasName: string;
  ruanganName?: string;
  waktu: string;
  message: string;
}

interface TeacherOption {
  id: string;
  nama_guru: string;
  isAvailable: boolean;
}

interface SlotOption {
  slotIndex: number;
  jamLabel: string;
  isAvailable: boolean;
}

interface ConflictResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: ConflictDetails | null;
  alternativeTeachers: TeacherOption[];
  availableSlots: SlotOption[];
  onSelectAlternativeTeacher: (newGuruId: string) => void;
  onMoveToSlot: (newSlotIndex: number) => void;
  onDeleteConflictSlot?: () => void;
}

export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = React.memo(({
  isOpen,
  onClose,
  conflict,
  alternativeTeachers,
  availableSlots,
  onSelectAlternativeTeacher,
  onMoveToSlot,
  onDeleteConflictSlot,
}) => {
  if (!conflict) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      contentClassName="p-0 overflow-hidden rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-2xl"
    >
      {/* Header Alert */}
      <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 p-5 text-white relative">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
            <AlertTriangle className="w-6 h-6 text-amber-200 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-white">
              Resolusi Bentrok Jadwal Guru
            </h3>
            <p className="text-xs text-rose-100 font-medium">
              {conflict.day}, Jam Ke-{conflict.slotIndex} ({conflict.waktu})
            </p>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 space-y-5 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Summary Box */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-rose-100 dark:border-rose-900/40 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500 dark:text-slate-400">Guru Terbentrok:</span>
            <span className="text-rose-600 dark:text-rose-400 font-black">{conflict.guruName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Kelas Saat Ini:</span>
            <span className="font-extrabold text-slate-800 dark:text-slate-200">{conflict.targetKelasName} ({conflict.mapelName})</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Bentrok Mengajar Di:</span>
            <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/40">
              {conflict.conflictKelasName} {conflict.ruanganName ? `(${conflict.ruanganName})` : ''}
            </span>
          </div>
        </div>

        {/* Action Option 1: Ganti Guru Alternative */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>Opsi 1: Ganti Guru Pengampu (Kosong Jam {conflict.slotIndex})</span>
          </div>
          {alternativeTeachers.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
              {alternativeTeachers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectAlternativeTeacher(t.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-left group"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    {t.nama_guru}
                  </span>
                  <span className="inline-flex items-center text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> KOSONG
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic p-2 bg-white dark:bg-slate-900 rounded-lg border text-center">
              Tidak ada guru pengganti lain yang kosong pada slot ini.
            </p>
          )}
        </div>

        {/* Action Option 2: Pindahkan Jam Pelajaran */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
            <span>Opsi 2: Pindahkan ke Slot Jam Kosong ({conflict.guruName})</span>
          </div>
          {availableSlots.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {availableSlots.map((s) => (
                <button
                  key={s.slotIndex}
                  onClick={() => onMoveToSlot(s.slotIndex)}
                  className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 transition-all text-xs font-black"
                >
                  Jam Ke-{s.slotIndex} ({s.jamLabel})
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic p-2 bg-white dark:bg-slate-900 rounded-lg border text-center">
              {conflict.guruName} tidak memiliki jam kosong lain pada hari ini.
            </p>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        {onDeleteConflictSlot ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteConflictSlot}
            className="text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900 dark:hover:bg-rose-950/50"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Kosongkan Slot Ini
          </Button>
        ) : <div />}
        <Button variant="ghost" size="sm" onClick={onClose}>
          Tutup
        </Button>
      </div>
    </Modal>
  );
});
