import React, { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { Wand2, Users, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CbtJadwalUjian } from '@/types/cbt.types';

export type AutoPlotRoomStrategy = 'STAY_ROOM' | 'ROLLING_SESSION' | 'MAX_N_SESSION_PER_ROOM';
export type AutoPlotCandidateScope = 'WHITELIST_ONLY' | 'WHITELIST_PENDIDIK' | 'WHITELIST_TU' | 'ALL_PENDIDIK' | 'ALL_STAFF';

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
  whitelistedCandidateCount: number;
  whitelistedPendidikCount: number;
  whitelistedTuCount: number;
  allPendidikCount: number;
  allTuCount: number;
  onOpenKandidatModal?: () => void;
}

export const CbtAutoPlotConfigModal: React.FC<CbtAutoPlotConfigModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  whitelistedCandidateCount,
  whitelistedPendidikCount,
  whitelistedTuCount,
  allPendidikCount,
  allTuCount,
  onOpenKandidatModal,
}) => {
  const hasWhitelist = whitelistedCandidateCount > 0;

  const [roomStrategy, setRoomStrategy] = useState<AutoPlotRoomStrategy>('STAY_ROOM');
  const [candidateScope, setCandidateScope] = useState<AutoPlotCandidateScope>(
    hasWhitelist ? 'WHITELIST_ONLY' : 'ALL_PENDIDIK'
  );
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
        {/* Banner Whitelist Status */}
        {hasWhitelist ? (
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <UserCheck size={16} />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white block text-[11px]">
                  Tabel Kandidat: {whitelistedCandidateCount} Pegawai Terpilih
                </span>
                <span className="text-[10px] text-slate-500">
                  {whitelistedPendidikCount} Guru Pendidik • {whitelistedTuCount} Staf TU
                </span>
              </div>
            </div>

            {onOpenKandidatModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenKandidatModal();
                }}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer shrink-0"
              >
                Ubah Kandidat
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={18} className="text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200 block text-[11px]">
                  Belum Ada Kandidat Pengawas yang Ditetapkan
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300">
                  Sebaiknya tentukan kandidat terlebih dahulu agar TU/guru non-pengawas tidak ikut terplot.
                </span>
              </div>
            </div>

            {onOpenKandidatModal && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenKandidatModal();
                }}
                className="text-[11px] h-7 font-bold border-amber-300 text-amber-800 dark:text-amber-200 shrink-0"
              >
                Atur Kandidat
              </Button>
            )}
          </div>
        )}

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
              Kandidat Pengawas yang Digunakan
            </label>
            <select
              value={candidateScope}
              onChange={(e) => setCandidateScope(e.target.value as AutoPlotCandidateScope)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              {hasWhitelist && (
                <>
                  <option value="WHITELIST_ONLY">
                    🎯 Seluruh Kandidat Terpilih ({whitelistedCandidateCount})
                  </option>
                  {whitelistedPendidikCount > 0 && (
                    <option value="WHITELIST_PENDIDIK">
                      🎓 Hanya Guru Pendidik dari Kandidat ({whitelistedPendidikCount})
                    </option>
                  )}
                  {whitelistedTuCount > 0 && (
                    <option value="WHITELIST_TU">
                      🏢 Hanya Staf TU dari Kandidat ({whitelistedTuCount})
                    </option>
                  )}
                </>
              )}
              <option value="ALL_PENDIDIK">
                🎓 Semua Guru Pendidik Sekolah ({allPendidikCount})
              </option>
              <option value="ALL_STAFF">
                👥 Seluruh Pegawai Pendidik &amp; TU ({allPendidikCount + allTuCount})
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Ploting Sesi
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
