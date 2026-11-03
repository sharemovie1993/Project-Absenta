import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, RefreshCw, Clock3, Coffee } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Tabular, type TabularColumn } from '@/components/ui/Tabular';
import {
  type ShiftConfig,
  type ShiftItem,
  type BreakItem,
  type TimeSlot,
  parseSlots,
  regenerateSlots,
  getPresetSlotsForJenjang,
} from './JamKBMTypes';

interface JamKBMShiftPanelProps {
  shiftConfig: ShiftConfig;
  activeSelectedShiftId: string;
  jenjang: string;
  cascadeEnabled: boolean;
  onShiftConfigChange: (cfg: ShiftConfig) => void;
  onActiveShiftChange: (id: string) => void;
  onConfirm: (opts: { title: string; description: string; confirmText: string; cancelText: string; style: string }) => Promise<boolean>;
  readOnly?: boolean;
  isSingleShift?: boolean;
}

// ── Item interface for the Tabular representation ──
interface TimelineItemRow {
  id: string;
  type: 'SLOT' | 'BREAK';
  slotNum?: number;
  start: string;
  end: string;
  duration: number;
  breakRef?: BreakItem;
}

export default React.memo(function JamKBMShiftPanel({
  shiftConfig,
  activeSelectedShiftId,
  jenjang,
  cascadeEnabled,
  onShiftConfigChange,
  onActiveShiftChange,
  onConfirm,
  readOnly = false,
  isSingleShift = false,
}: JamKBMShiftPanelProps) {
  // ── Derived data ──
  const currentShift = useMemo<ShiftItem | undefined>(
    () => shiftConfig?.shifts?.find(s => s.id === activeSelectedShiftId),
    [shiftConfig, activeSelectedShiftId]
  );

  // ── Day Pattern state ──
  const [selectedDayPattern, setSelectedDayPattern] = useState<'ALL' | 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU'>('ALL');

  const activePattern = useMemo(() => {
    if (!currentShift) return { start_time: '07:00', slot_duration: 45, breaks: [] as BreakItem[], slots: [] as TimeSlot[] };
    if (selectedDayPattern !== 'ALL' && currentShift.day_patterns?.[selectedDayPattern]) {
      const dp = currentShift.day_patterns[selectedDayPattern];
      return {
        start_time: dp.start_time || currentShift.start_time || '07:00',
        slot_duration: dp.slot_duration ?? currentShift.slot_duration ?? 45,
        breaks: dp.breaks ?? currentShift.breaks ?? [],
        slots: dp.slots && dp.slots.length > 0 ? dp.slots : currentShift.slots || [],
      };
    }
    return {
      start_time: currentShift.start_time || '07:00',
      slot_duration: currentShift.slot_duration || 45,
      breaks: currentShift.breaks || [],
      slots: currentShift.slots || [],
    };
  }, [currentShift, selectedDayPattern]);

  // ── Time utilities ──
  const toMins = useCallback((t: string): number => {
    if (!t) return 0;
    const parts = t.split(':');
    return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  }, []);

  const toTimeStr = useCallback((mins: number): string => {
    const totalMins = (mins + 1440) % 1440;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, []);

  const updateCurrentShiftInConfig = useCallback((updater: (s: ShiftItem) => ShiftItem) => {
    onShiftConfigChange({
      ...shiftConfig,
      shifts: shiftConfig.shifts.map(s => s.id === activeSelectedShiftId ? updater(s) : s),
    });
  }, [shiftConfig, activeSelectedShiftId, onShiftConfigChange]);

  // ── Handlers ──
  const handleTimeChange = useCallback((slotNum: number, field: 'start' | 'end', newValue: string) => {
    if (!currentShift) return;
    const originalSlots = activePattern.slots ?? [];
    let updatedSlots = [...originalSlots];
    const targetIdx = updatedSlots.findIndex(s => s.slot === slotNum);
    if (targetIdx === -1) return;

    if (field === 'start') {
      const oldStart = toMins(originalSlots[targetIdx].start);
      const oldEnd = toMins(originalSlots[targetIdx].end);
      let duration = oldEnd - oldStart;
      if (duration <= 0) {
        const j = (jenjang || '').toUpperCase();
        duration = j === 'SD' || j === 'MI' ? 35 : j === 'SMP' || j === 'MTS' ? 40 : 45;
      }
      const newStartMins = toMins(newValue);
      updatedSlots[targetIdx] = { ...updatedSlots[targetIdx], start: newValue, end: toTimeStr(newStartMins + duration) };

      if (cascadeEnabled) {
        for (let i = targetIdx + 1; i < updatedSlots.length; i++) {
          const gap = toMins(originalSlots[i].start) - toMins(originalSlots[i - 1].end);
          const newStart = toMins(updatedSlots[i - 1].end) + gap;
          let slotDur = toMins(originalSlots[i].end) - toMins(originalSlots[i].start);
          if (slotDur <= 0) {
            const j = (jenjang || '').toUpperCase();
            slotDur = j === 'SD' || j === 'MI' ? 35 : j === 'SMP' || j === 'MTS' ? 40 : 45;
          }
          updatedSlots[i] = { ...updatedSlots[i], start: toTimeStr(newStart), end: toTimeStr(newStart + slotDur) };
        }
      }
    } else {
      updatedSlots[targetIdx] = { ...updatedSlots[targetIdx], end: newValue };
    }

    if (selectedDayPattern === 'ALL') {
      updateCurrentShiftInConfig(s => ({ ...s, slots: updatedSlots }));
    } else {
      updateCurrentShiftInConfig(s => ({
        ...s,
        day_patterns: {
          ...(s.day_patterns || {}),
          [selectedDayPattern]: {
            start_time: activePattern.start_time,
            slot_duration: activePattern.slot_duration,
            breaks: activePattern.breaks,
            slots: updatedSlots,
          },
        },
      }));
    }
  }, [currentShift, activePattern, selectedDayPattern, toMins, toTimeStr, jenjang, cascadeEnabled, updateCurrentShiftInConfig]);

  const handleBaseConfigChange = useCallback((field: 'start_time' | 'slot_duration', val: string | number) => {
    if (!currentShift) return;
    const nextStart = field === 'start_time' ? String(val) : activePattern.start_time;
    const nextDur = field === 'slot_duration' ? Number(val) : activePattern.slot_duration;
    const count = activePattern.slots?.length || 12;
    const newSlots = regenerateSlots(nextStart, nextDur, activePattern.breaks, count);

    if (selectedDayPattern === 'ALL') {
      updateCurrentShiftInConfig(s => ({ ...s, start_time: nextStart, slot_duration: nextDur, breaks: activePattern.breaks, slots: newSlots }));
    } else {
      updateCurrentShiftInConfig(s => ({
        ...s,
        day_patterns: {
          ...(s.day_patterns || {}),
          [selectedDayPattern]: {
            start_time: nextStart,
            slot_duration: nextDur,
            breaks: activePattern.breaks,
            slots: newSlots,
          },
        },
      }));
    }
  }, [currentShift, activePattern, selectedDayPattern, updateCurrentShiftInConfig]);

  const handleAddBreak = useCallback((afterSlotNum: number) => {
    if (!currentShift) return;
    if (activePattern.breaks.length >= 5) { toast.error('Maksimum 5 istirahat per shift.'); return; }
    const newBreak: BreakItem = { id: `break-${Date.now()}`, afterSlot: afterSlotNum, duration: 15 };
    const nextBreaks = [...activePattern.breaks, newBreak];
    const count = activePattern.slots?.length || 12;
    const newSlots = regenerateSlots(activePattern.start_time, activePattern.slot_duration, nextBreaks, count);

    if (selectedDayPattern === 'ALL') {
      updateCurrentShiftInConfig(s => ({ ...s, start_time: activePattern.start_time, slot_duration: activePattern.slot_duration, breaks: nextBreaks, slots: newSlots }));
    } else {
      updateCurrentShiftInConfig(s => ({
        ...s,
        day_patterns: {
          ...(s.day_patterns || {}),
          [selectedDayPattern]: {
            start_time: activePattern.start_time,
            slot_duration: activePattern.slot_duration,
            breaks: nextBreaks,
            slots: newSlots,
          },
        },
      }));
    }
    toast.success(`Istirahat ditambahkan setelah Jam ${afterSlotNum}`);
  }, [currentShift, activePattern, selectedDayPattern, updateCurrentShiftInConfig]);

  const handleDeleteBreak = useCallback((breakId: string) => {
    if (!currentShift) return;
    const nextBreaks = activePattern.breaks.filter(b => b.id !== breakId);
    const count = activePattern.slots?.length || 12;
    const newSlots = regenerateSlots(activePattern.start_time, activePattern.slot_duration, nextBreaks, count);

    if (selectedDayPattern === 'ALL') {
      updateCurrentShiftInConfig(s => ({ ...s, start_time: activePattern.start_time, slot_duration: activePattern.slot_duration, breaks: nextBreaks, slots: newSlots }));
    } else {
      updateCurrentShiftInConfig(s => ({
        ...s,
        day_patterns: {
          ...(s.day_patterns || {}),
          [selectedDayPattern]: {
            start_time: activePattern.start_time,
            slot_duration: activePattern.slot_duration,
            breaks: nextBreaks,
            slots: newSlots,
          },
        },
      }));
    }
    toast.success('Istirahat dihapus.');
  }, [currentShift, activePattern, selectedDayPattern, updateCurrentShiftInConfig]);

  const handleBreakDurationChange = useCallback((breakId: string, newDuration: number) => {
    if (!currentShift) return;
    const nextBreaks = activePattern.breaks.map(b => b.id === breakId ? { ...b, duration: newDuration } : b);
    const count = activePattern.slots?.length || 12;
    const newSlots = regenerateSlots(activePattern.start_time, activePattern.slot_duration, nextBreaks, count);

    if (selectedDayPattern === 'ALL') {
      updateCurrentShiftInConfig(s => ({ ...s, start_time: activePattern.start_time, slot_duration: activePattern.slot_duration, breaks: nextBreaks, slots: newSlots }));
    } else {
      updateCurrentShiftInConfig(s => ({
        ...s,
        day_patterns: {
          ...(s.day_patterns || {}),
          [selectedDayPattern]: {
            start_time: activePattern.start_time,
            slot_duration: activePattern.slot_duration,
            breaks: nextBreaks,
            slots: newSlots,
          },
        },
      }));
    }
  }, [currentShift, activePattern, selectedDayPattern, updateCurrentShiftInConfig]);

  const handleAddShift = useCallback(() => {
    const newId = `shift_${Date.now()}`;
    const newBreaks: BreakItem[] = [
      { id: `brk-${Date.now()}-1`, afterSlot: 3, duration: 15 },
      { id: `brk-${Date.now()}-2`, afterSlot: 6, duration: 15 },
    ];
    const newShift: ShiftItem = {
      id: newId, name: `Shift Siang ${shiftConfig.shifts.length + 1}`,
      start_time: '13:00', slot_duration: 45, breaks: newBreaks,
      slots: regenerateSlots('13:00', 45, newBreaks),
    };
    onShiftConfigChange({ ...shiftConfig, shifts: [...shiftConfig.shifts, newShift] });
    onActiveShiftChange(newId);
    toast.success('Shift baru ditambahkan!');
  }, [shiftConfig, onShiftConfigChange, onActiveShiftChange]);

  const handleDeleteShift = useCallback(() => {
    const nextShifts = shiftConfig.shifts.filter(s => s.id !== activeSelectedShiftId);
    const nextAssignments = { ...shiftConfig.class_assignments };
    Object.keys(nextAssignments).forEach(k => { if (nextAssignments[k] === activeSelectedShiftId) delete nextAssignments[k]; });
    onShiftConfigChange({ shifts: nextShifts, class_assignments: nextAssignments });
    onActiveShiftChange(nextShifts[0].id);
    toast.success('Shift dihapus.');
  }, [shiftConfig, activeSelectedShiftId, onShiftConfigChange, onActiveShiftChange]);

  const handleResetToJenjang = useCallback(async () => {
    const ok = await onConfirm({
      title: `Reset ke Standar ${jenjang || 'Sekolah'}`,
      description: `Slot waktu shift aktif akan direset ke standar KBM ${jenjang || 'sekolah'}. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Reset', cancelText: 'Batal', style: 'warning',
    });
    if (!ok) return;
    const slots = getPresetSlotsForJenjang(jenjang ?? '');
    updateCurrentShiftInConfig(s => ({ ...s, slots, start_time: '07:00', slot_duration: 45, breaks: parseSlots(slots).breaks, day_patterns: undefined }));
    toast.success(`Reset ke standar ${jenjang || 'Sekolah'} berhasil`);
  }, [jenjang, onConfirm, updateCurrentShiftInConfig]);

  const handleAddSlot = useCallback(() => {
    if (!currentShift) return;
    const slots = activePattern.slots ?? [];
    const lastSlot = slots[slots.length - 1];
    const newSlotNum = slots.length + 1;
    let startStr = '17:00';
    let endStr = '17:45';
    if (lastSlot) {
      startStr = lastSlot.end;
      const startMins = toMins(lastSlot.end);
      endStr = toTimeStr(startMins + (activePattern.slot_duration || 45));
    }
    const newSlot: TimeSlot = { slot: newSlotNum, start: startStr, end: endStr };

    if (selectedDayPattern === 'ALL') {
      updateCurrentShiftInConfig(s => ({ ...s, slots: [...(s.slots ?? []), newSlot] }));
    } else {
      updateCurrentShiftInConfig(s => ({
        ...s,
        day_patterns: {
          ...(s.day_patterns || {}),
          [selectedDayPattern]: {
            start_time: activePattern.start_time,
            slot_duration: activePattern.slot_duration,
            breaks: activePattern.breaks,
            slots: [...(activePattern.slots ?? []), newSlot],
          },
        },
      }));
    }
    toast.success(`Slot Jam Pelajaran Ke-${newSlotNum} ditambahkan!`);
  }, [currentShift, activePattern, selectedDayPattern, toMins, toTimeStr, updateCurrentShiftInConfig]);

  const handleRemoveLastSlot = useCallback(() => {
    if (!currentShift) return;
    const slots = activePattern.slots ?? [];
    if (slots.length <= 1) {
      toast.error('Minimal harus ada 1 slot jam pelajaran.');
      return;
    }
    const newSlots = slots.slice(0, -1);

    if (selectedDayPattern === 'ALL') {
      updateCurrentShiftInConfig(s => ({ ...s, slots: newSlots }));
    } else {
      updateCurrentShiftInConfig(s => ({
        ...s,
        day_patterns: {
          ...(s.day_patterns || {}),
          [selectedDayPattern]: {
            start_time: activePattern.start_time,
            slot_duration: activePattern.slot_duration,
            breaks: activePattern.breaks,
            slots: newSlots,
          },
        },
      }));
    }
    toast.success('Slot jam pelajaran terakhir dihapus.');
  }, [currentShift, activePattern, selectedDayPattern, updateCurrentShiftInConfig]);

  // ── Transform timeline slots and breaks to a flat list for Tabular ──
  const tabularData = useMemo<TimelineItemRow[]>(() => {
    if (!currentShift) return [];
    const rows: TimelineItemRow[] = [];
    const slots = activePattern.slots ?? [];
    
    slots.forEach((slot, idx) => {
      rows.push({
        id: `slot-${slot.slot}`,
        type: 'SLOT',
        slotNum: slot.slot,
        start: slot.start,
        end: slot.end,
        duration: activePattern.slot_duration,
      });

      const brk = activePattern.breaks.find(b => b.afterSlot === slot.slot);
      if (brk && idx < slots.length - 1) {
        rows.push({
          id: brk.id,
          type: 'BREAK',
          start: slot.end,
          end: slots[idx + 1]?.start || '',
          duration: brk.duration,
          breakRef: brk,
        });
      }
    });

    return rows;
  }, [currentShift, activePattern]);

  // ── Tabular Column Definitions ──
  const columns = useMemo<TabularColumn<TimelineItemRow>[]>(() => {
    const cols: TabularColumn<TimelineItemRow>[] = [
      {
        key: 'type',
        label: 'Keterangan / Sesi',
        className: 'font-bold text-xs w-44',
        render: (row) => {
          if (row.type === 'SLOT') {
            return (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">
                  {row.slotNum}
                </div>
                <span className="text-slate-800 dark:text-slate-200 font-bold text-xs">JP {row.slotNum}</span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="text-xs">☕</span>
              <span className="font-black tracking-wide uppercase text-[10px]">Istirahat</span>
            </div>
          );
        },
      },
      {
        key: 'start',
        label: 'Jam Mulai',
        className: 'w-32',
        render: (row) => {
          if (row.type === 'SLOT' && row.slotNum !== undefined) {
            return readOnly ? (
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums px-2">{row.start}</span>
            ) : (
              <input
                type="time"
                aria-label={`Jam mulai JP ${row.slotNum}`}
                value={row.start}
                onChange={e => handleTimeChange(row.slotNum!, 'start', e.target.value)}
                className="px-2 py-0.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 tabular-nums w-20 text-center"
              />
            );
          }
          return <span className="text-xs text-slate-400 tabular-nums font-semibold px-2">{row.start}</span>;
        },
      },
      {
        key: 'end',
        label: 'Jam Selesai',
        className: 'w-32',
        render: (row) => {
          if (row.type === 'SLOT' && row.slotNum !== undefined) {
            return readOnly ? (
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums px-2">{row.end}</span>
            ) : (
              <input
                type="time"
                aria-label={`Jam selesai JP ${row.slotNum}`}
                value={row.end}
                onChange={e => handleTimeChange(row.slotNum!, 'end', e.target.value)}
                className="px-2 py-0.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 tabular-nums w-20 text-center"
              />
            );
          }
          return <span className="text-xs text-slate-400 tabular-nums font-semibold px-2">{row.end}</span>;
        },
      },
      {
        key: 'duration',
        label: 'Durasi',
        className: 'w-28',
        render: (row) => {
          if (row.type === 'SLOT') {
            return <span className="text-xs text-slate-500 font-medium tabular-nums">{row.duration} mnt</span>;
          }
          if (row.type === 'BREAK' && row.breakRef) {
            const brk = row.breakRef;
            return readOnly ? (
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-0.5">{brk.duration} mnt</span>
            ) : (
              <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 w-fit">
                <input
                  type="number"
                  aria-label="Durasi istirahat"
                  value={brk.duration}
                  onChange={e => handleBreakDurationChange(brk.id, Number(e.target.value))}
                  min={5} max={120}
                  className="w-8 bg-transparent text-xs font-black text-amber-700 dark:text-amber-400 text-center focus:outline-none tabular-nums"
                />
                <span className="text-[10px] font-bold text-amber-500">mnt</span>
              </div>
            );
          }
          return null;
        },
      },
    ];

    if (!readOnly) {
      cols.push({
        key: 'actions',
        label: 'Aksi Sisipkan / Hapus',
        align: 'right',
        className: 'w-40',
        render: (row) => {
          if (row.type === 'SLOT' && row.slotNum !== undefined) {
            const slots = currentShift.slots ?? [];
            const isLastSlot = row.slotNum >= slots.length;
            const hasBreak = (activePattern.breaks || currentShift.breaks || []).find(b => b.afterSlot === row.slotNum);

            if (!isLastSlot && !hasBreak) {
              return (
                <button
                  type="button"
                  aria-label={`Tambah istirahat setelah JP ${row.slotNum}`}
                  onClick={() => handleAddBreak(row.slotNum!)}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-750 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/40 px-2 py-0.5 rounded-md transition-colors ml-auto cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Sisipkan Istirahat
                </button>
              );
            }
            return null;
          }
          if (row.type === 'BREAK' && row.breakRef) {
            const brk = row.breakRef;
            return (
              <button
                type="button"
                aria-label="Hapus istirahat"
                onClick={() => handleDeleteBreak(brk.id)}
                className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 hover:text-rose-600 transition-colors ml-auto flex items-center cursor-pointer"
                title="Hapus istirahat ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            );
          }
          return null;
        },
      });
    }

    return cols;
  }, [currentShift, activePattern, handleTimeChange, handleBreakDurationChange, handleAddBreak, handleDeleteBreak, readOnly]);

  // ── Computed summary ──
  const timeRange = useMemo(() => {
    const slots = currentShift?.slots ?? [];
    if (slots.length === 0) return '––';
    return `${slots[0]?.start} – ${slots[slots.length - 1]?.end}`;
  }, [currentShift]);

  const totalDurationMin = useMemo(() => {
    const slots = currentShift?.slots ?? [];
    if (slots.length < 2) return 0;
    return toMins(slots[slots.length - 1].end) - toMins(slots[0].start);
  }, [currentShift, toMins]);

  if (!currentShift) return null;

  return (
    <div className="space-y-2.5">
      {/* ── Multi-Shift Bar (Hanya Muncul jika Multi-Shift) ─────────── */}
      {!isSingleShift && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 rounded-xl">
          {/* Shift Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(shiftConfig?.shifts ?? []).map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onActiveShiftChange(s.id)}
                className={`relative px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  s.id === activeSelectedShiftId
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-indigo-600'
                }`}
              >
                {s.name}
                {s.id === activeSelectedShiftId && (
                  <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full ml-1.5 align-middle" />
                )}
              </button>
            ))}
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddShift}
                className="px-2.5 py-1 rounded-lg text-xs font-bold border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Shift Baru
              </button>
            )}
          </div>

          {/* Delete shift action if > 1 shift */}
          {!readOnly && shiftConfig?.shifts?.length > 1 && (
            <button
              type="button"
              onClick={handleDeleteShift}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 transition-all cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Hapus Shift
            </button>
          )}
        </div>
      )}

      {/* ── High-Density Unified Control Panel (Hemat Layar) ─────────── */}
      <div className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 rounded-xl p-2.5 space-y-2">
        {/* Baris 1: Tab Hari (Pola Jam) & Badges Live Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/50 dark:border-slate-800">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Pola Hari:</span>
            {[
              { key: 'ALL', label: 'Semua Hari (Default)' },
              { key: 'SENIN', label: 'Senin' },
              { key: 'SELASA', label: 'Selasa' },
              { key: 'RABU', label: 'Rabu' },
              { key: 'KAMIS', label: 'Kamis' },
              { key: 'JUMAT', label: 'Jumat' },
              { key: 'SABTU', label: 'Sabtu' },
            ].map(pattern => (
              <button
                key={pattern.key}
                type="button"
                onClick={() => setSelectedDayPattern(pattern.key as any)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDayPattern === pattern.key
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                }`}
              >
                {pattern.label}
              </button>
            ))}
          </div>

          {/* Badges Live Ringkasan Bel */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 font-bold text-[11px]">
              <Clock3 className="w-3 h-3 text-indigo-500" />
              <span>{timeRange}</span>
              <span className="text-slate-400 font-normal">({Math.floor(totalDurationMin / 60)}j {totalDurationMin % 60}m)</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-md text-amber-700 dark:text-amber-400 font-bold text-[11px]">
              <Coffee className="w-3 h-3 text-amber-500" />
              <span>{activePattern.breaks.length} Istirahat</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
              <div className={`w-1.5 h-1.5 rounded-full ${cascadeEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {cascadeEnabled ? 'Cascade ON' : 'Cascade OFF'}
              </span>
            </div>
          </div>
        </div>

        {/* Baris 2: Input Parameter Cepat & Tombol Reset Standar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
            {!isSingleShift && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="input-nama-shift" className="text-[11px] font-bold text-slate-500 uppercase shrink-0">
                  Nama Shift:
                </label>
                {readOnly ? (
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{currentShift.name ?? ''}</span>
                ) : (
                  <input
                    id="input-nama-shift"
                    type="text"
                    aria-label="Nama shift KBM"
                    value={currentShift.name ?? ''}
                    onChange={e => updateCurrentShiftInConfig(s => ({ ...s, name: e.target.value }))}
                    placeholder="Nama shift"
                    className="h-7 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-800 dark:text-slate-100 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <label htmlFor="input-jam-mulai" className="text-[11px] font-bold text-slate-500 uppercase shrink-0">
                Jam Bel Masuk (JP 1):
              </label>
              {readOnly ? (
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{activePattern.start_time ?? '07:00'}</span>
              ) : (
                <div className="relative">
                  <input
                    id="input-jam-mulai"
                    type="time"
                    aria-label="Jam mulai KBM jam pertama"
                    value={activePattern.start_time ?? '07:00'}
                    onChange={e => handleBaseConfigChange('start_time', e.target.value)}
                    className="h-7 pl-2 pr-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-800 dark:text-slate-100 w-24 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                  />
                  <Clock3 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="input-durasi-slot" className="text-[11px] font-bold text-slate-500 uppercase shrink-0">
                Durasi per JP:
              </label>
              {readOnly ? (
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{activePattern.slot_duration ?? 45} mnt</span>
              ) : (
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 h-7">
                  <input
                    id="input-durasi-slot"
                    type="number"
                    aria-label="Durasi per jam pelajaran dalam menit"
                    value={activePattern.slot_duration ?? 45}
                    onChange={e => handleBaseConfigChange('slot_duration', e.target.value)}
                    min={20} max={120}
                    className="w-8 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none text-center"
                  />
                  <span className="text-[10px] font-bold text-slate-400">mnt</span>
                </div>
              )}
            </div>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={handleResetToJenjang}
              className="h-7 px-2.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-md flex items-center gap-1 transition-all cursor-pointer ml-auto"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Standar {jenjang || 'Sekolah'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Table Toolbar & Timeline Tabular ───────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Daftar Urutan Jam Pelajaran ({currentShift.slots?.length || 0} JP) &amp; Istirahat
          </h3>
          {!readOnly && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAddSlot}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-all border border-indigo-200/60 dark:border-indigo-800/40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Slot JP
              </button>
              <button
                type="button"
                onClick={handleRemoveLastSlot}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 text-slate-500 hover:text-rose-600 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Slot Terakhir
              </button>
            </div>
          )}
        </div>

        {/* Tabular container with matching compact rounded/borders */}
        <div className="border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xs">
          <Tabular
            columns={columns}
            data={tabularData}
            compact={true}
            emptyMessage="Tidak ada slot jam pelajaran yang dikonfigurasi"
          />
        </div>
      </div>
    </div>
  );
});
