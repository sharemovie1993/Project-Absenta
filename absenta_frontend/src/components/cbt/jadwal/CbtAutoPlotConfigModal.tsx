import React, { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CbtJadwalUjian } from '@/types/cbt.types';

export type AutoPlotRoomStrategy = 'STAY_ROOM' | 'ROLLING_SESSION' | 'MAX_N_SESSION_PER_ROOM';
export type AutoPlotCandidateScope = 'PENDIDIK_ONLY' | 'ALL_STAFF';

export interface AutoPlotConfigOptions {
  roomStrategy: AutoPlotRoomStrategy;
  maxSessionsPerRoom: number;
  maxSessionsPerDay: number;
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
  pendidikCount,
  tenagaKependidikanCount,
}) => {
  const [roomStrategy, setRoomStrategy] = useState<AutoPlotRoomStrategy>('STAY_ROOM');
  const [candidateScope, setCandidateScope] = useState<AutoPlotCandidateScope>('PENDIDIK_ONLY');
  const [onlyUnassigned, setOnlyUnassigned] = useState<boolean>(true);

  const handleApply = () => {
    onConfirm({
      roomStrategy,
      maxSessionsPerRoom: 2,
      maxSessionsPerDay: 0,
      candidateScope,
      onlyUnassigned,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ploting Otomatis Pengawas"
      size="md"
    >
      <div className="space-y-4 py-1 text-xs">
        {/* Pola Alokasi Ruang (Pill Segments) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Pola Alokasi Ruang
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRoomStrategy('STAY_ROOM')}
              className={cn(
                'px-3 py-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer',
                roomStrategy === 'STAY_ROOM'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              )}
            >
              1 Ruang Seharian
            </button>
            <button
              type="button"
              onClick={() => setRoomStrategy('MAX_N_SESSION_PER_ROOM')}
              className={cn(
                'px-3 py-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer',
                roomStrategy === 'MAX_N_SESSION_PER_ROOM'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              )}
            >
              Maks 2 Sesi / Ruang
            </button>
            <button
              type="button"
              onClick={() => setRoomStrategy('ROLLING_SESSION')}
              className={cn(
                'px-3 py-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer',
                roomStrategy === 'ROLLING_SESSION'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              )}
            >
              Rotasi Tiap Sesi
            </button>
          </div>
        </div>

        {/* 2 Dropdown Bersih: Kandidat & Lingkup Sesi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Kandidat Pengawas
            </label>
            <select
              value={candidateScope}
              onChange={(e) => setCandidateScope(e.target.value as AutoPlotCandidateScope)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <option value="PENDIDIK_ONLY">
                Guru Pendidik ({pendidikCount})
              </option>
              <option value="ALL_STAFF">
                Pendidik + Staf TU ({pendidikCount + tenagaKependidikanCount})
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Ploting
            </label>
            <select
              value={onlyUnassigned ? 'UNASSIGNED' : 'ALL'}
              onChange={(e) => setOnlyUnassigned(e.target.value === 'UNASSIGNED')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <option value="UNASSIGNED">Sesi yang Belum Terplot Saja</option>
              <option value="ALL">Kocok Ulang Seluruh Sesi</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs px-4 flex items-center gap-1.5"
          >
            <Wand2 size={13} />
            <span>Jalankan Ploting</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
