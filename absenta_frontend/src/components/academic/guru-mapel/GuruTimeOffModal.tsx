import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Calendar, Clock, Save, RefreshCw, Check, X, ShieldAlert, Info } from 'lucide-react';
import { getTimeOffByGuru, saveGuruTimeOffs, type GuruTimeOffItem } from '../../../api/kurikulum/guruTimeOff.api';
import toast from 'react-hot-toast';

interface GuruTimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  guruId: string | null;
  guruName?: string;
  onSuccess?: () => void;
}

import { HARI_LIST as ALL_HARI_LIST } from '../../../constants/day.constants';

const HARI_LIST = ALL_HARI_LIST.slice(0, 5);

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const GuruTimeOffModal: React.FC<GuruTimeOffModalProps> = React.memo(({
  isOpen,
  onClose,
  guruId,
  guruName = 'Guru',
  onSuccess
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Grid State: Set of keys formatted as "${HARI}_FULL" or "${HARI}_${SLOT}"
  const [blockedKeys, setBlockedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && guruId) {
      const fetchTimeOffs = async () => {
        try {
          setLoading(true);
          const res = await getTimeOffByGuru(guruId);
          if (res.success && Array.isArray(res.data)) {
            const nextSet = new Set<string>();
            res.data.forEach(item => {
              if (item.slot_index === null || item.slot_index === undefined) {
                nextSet.add(`${item.hari}_FULL`);
              } else {
                nextSet.add(`${item.hari}_${item.slot_index}`);
              }
            });
            setBlockedKeys(nextSet);
          }
        } catch (e) {
          console.error('Failed to load guru time-offs:', e);
          toast.error('Gagal memuat data time-off guru');
        } finally {
          setLoading(false);
        }
      };
      fetchTimeOffs();
    }
  }, [isOpen, guruId]);

  const toggleFullDay = (hari: string) => {
    setBlockedKeys(prev => {
      const next = new Set(prev);
      const key = `${hari}_FULL`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        // Clear individual slots for this day if full day is blocked
        SLOTS.forEach(s => next.delete(`${hari}_${s}`));
      }
      return next;
    });
  };

  const toggleSlot = (hari: string, slotIndex: number) => {
    setBlockedKeys(prev => {
      const next = new Set(prev);
      const fullKey = `${hari}_FULL`;
      // If full day was blocked, unblock full day first and add all slots except this one
      if (next.has(fullKey)) {
        next.delete(fullKey);
        SLOTS.forEach(s => {
          if (s !== slotIndex) next.add(`${hari}_${s}`);
        });
      } else {
        const slotKey = `${hari}_${slotIndex}`;
        if (next.has(slotKey)) {
          next.delete(slotKey);
        } else {
          next.add(slotKey);
        }
      }
      return next;
    });
  };

  const handleResetAll = () => {
    setBlockedKeys(new Set());
    toast('Semua jadwal dikembalikan ke status BISA', { icon: '🔄' });
  };

  const handleSave = async () => {
    if (!guruId) return;

    try {
      setSaving(true);
      const payloadTimeOffs: { hari: any; slot_index: number | null; keterangan?: string }[] = [];

      HARI_LIST.forEach(h => {
        const fullKey = `${h.id}_FULL`;
        if (blockedKeys.has(fullKey)) {
          payloadTimeOffs.push({
            hari: h.id as any,
            slot_index: null,
            keterangan: 'Izin Full Day'
          });
        } else {
          SLOTS.forEach(s => {
            if (blockedKeys.has(`${h.id}_${s}`)) {
              payloadTimeOffs.push({
                hari: h.id as any,
                slot_index: s,
                keterangan: 'Izin Jam Spesifik'
              });
            }
          });
        }
      });

      const res = await saveGuruTimeOffs({
        guru_id: guruId,
        time_offs: payloadTimeOffs
      });

      if (res.success) {
        toast.success(`Preferensi Time-Off untuk ${guruName} berhasil disimpan!`);
        onSuccess?.();
        onClose();
      } else {
        toast.error('Gagal menyimpan preferensi time-off');
      }
    } catch (e: any) {
      console.error('Error saving time-off:', e);
      toast.error(e?.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Preferensi Time-Off / Constraints: ${guruName}`}
      size="6xl"
    >
      <div className="p-5 space-y-4">
        {/* Header Info Banner */}
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-300">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Panduan Pengisian Time-Off / Day Off Guru:</p>
            <p className="text-[11px] leading-relaxed opacity-90">
              Tandai slot jam atau hari di mana <span className="font-extrabold">{guruName}</span> <strong className="text-rose-600 dark:text-rose-400">TIDAK BISA mengajar</strong> (Merah). Mesin <strong>Auto-Generator</strong> tidak akan pernah menempatkan jadwal pada sel bertanda merah.
            </p>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              🟢 Bisa Mengajar (Biasa)
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-800">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              🔴 TIDAK BISA (Time-Off / Lock)
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            className="text-xs rounded-lg px-3"
          >
            Reset Bisa Semua
          </Button>
        </div>

        {/* Interactive Matrix Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <RefreshCw size={24} className="animate-spin text-indigo-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Memuat Data Time-Off Guru...</span>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 text-left w-24">Hari</th>
                  <th className="p-3 w-28 text-center border-l border-slate-200 dark:border-slate-700">Full Day</th>
                  {SLOTS.map(s => (
                    <th key={s} className="p-2 border-l border-slate-200 dark:border-slate-700">
                      Jam {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {HARI_LIST.map(h => {
                  const isFullBlocked = blockedKeys.has(`${h.id}_FULL`);
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      {/* Hari Label */}
                      <td className="p-3 text-left font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/50">
                        {h.label}
                      </td>

                      {/* Full Day Toggle Button */}
                      <td className="p-2 border-l border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                        <button
                          type="button"
                          onClick={() => toggleFullDay(h.id)}
                          className={`w-full py-1.5 px-2 rounded-lg font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1 shadow-sm ${
                            isFullBlocked
                              ? 'bg-rose-600 text-white shadow-rose-200 dark:shadow-none'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {isFullBlocked ? (
                            <>
                              <X className="w-3 h-3" /> Libur Full
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3" /> Full Bisa
                            </>
                          )}
                        </button>
                      </td>

                      {/* Individual Slot Cells */}
                      {SLOTS.map(s => {
                        const isSlotBlocked = isFullBlocked || blockedKeys.has(`${h.id}_${s}`);
                        return (
                          <td key={s} className="p-1.5 border-l border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => toggleSlot(h.id, s)}
                              className={`w-full h-8 rounded-lg font-extrabold text-[11px] transition-all flex items-center justify-center ${
                                isSlotBlocked
                                  ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-400'
                                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-900/50'
                              }`}
                              title={isSlotBlocked ? `Jam ${s} ${h.label}: TIDAK BISA` : `Jam ${s} ${h.label}: BISA`}
                            >
                              {isSlotBlocked ? <X className="w-3.5 h-3.5" /> : s}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-5"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 font-bold"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={14} className="mr-2" />
                Simpan Preferensi
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
});
