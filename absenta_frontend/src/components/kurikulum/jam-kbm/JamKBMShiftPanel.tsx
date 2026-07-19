import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, RefreshCw, Clock3, Coffee } from 'lucide-react';
import { toast } from 'sonner';
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

export default function JamKBMShiftPanel({
  shiftConfig,
  activeSelectedShiftId,
  jenjang,
  cascadeEnabled,
  onShiftConfigChange,
  onActiveShiftChange,
  onConfirm,
}: JamKBMShiftPanelProps) {
  // ── Derived data ──
  const currentShift = useMemo<ShiftItem | undefined>(
    () => shiftConfig?.shifts?.find(s => s.id === activeSelectedShiftId),
    [shiftConfig, activeSelectedShiftId]
  );

  const parsed = useMemo(() => {
    if (!currentShift) return { start_time: '07:00', slot_duration: 45, breaks: [] as BreakItem[] };
    return currentShift.start_time !== undefined
      ? { start_time: currentShift.start_time, slot_duration: currentShift.slot_duration ?? 45, breaks: currentShift.breaks ?? [] }
      : parseSlots(currentShift.slots);
  }, [currentShift]);

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
    const originalSlots = currentShift.slots ?? [];
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
    updateCurrentShiftInConfig(s => ({ ...s, slots: updatedSlots }));
  }, [currentShift, toMins, toTimeStr, jenjang, cascadeEnabled, updateCurrentShiftInConfig]);

  const handleBaseConfigChange = useCallback((field: 'start_time' | 'slot_duration', val: string | number) => {
    const nextStart = field === 'start_time' ? String(val) : parsed.start_time;
    const nextDur = field === 'slot_duration' ? Number(val) : parsed.slot_duration;
    const newSlots = regenerateSlots(nextStart, nextDur, parsed.breaks);
    updateCurrentShiftInConfig(s => ({ ...s, start_time: nextStart, slot_duration: nextDur, breaks: parsed.breaks, slots: newSlots }));
  }, [parsed, updateCurrentShiftInConfig]);

  const handleAddBreak = useCallback((afterSlotNum: number) => {
    if (parsed.breaks.length >= 3) { toast.error('Maksimum 3 istirahat per shift.'); return; }
    const newBreak: BreakItem = { id: `break-${Date.now()}`, afterSlot: afterSlotNum, duration: 15 };
    const nextBreaks = [...parsed.breaks, newBreak];
    const newSlots = regenerateSlots(parsed.start_time, parsed.slot_duration, nextBreaks);
    updateCurrentShiftInConfig(s => ({ ...s, start_time: parsed.start_time, slot_duration: parsed.slot_duration, breaks: nextBreaks, slots: newSlots }));
    toast.success(`Istirahat ditambahkan setelah Jam ${afterSlotNum}`);
  }, [parsed, updateCurrentShiftInConfig]);

  const handleDeleteBreak = useCallback((breakId: string) => {
    const nextBreaks = parsed.breaks.filter(b => b.id !== breakId);
    const newSlots = regenerateSlots(parsed.start_time, parsed.slot_duration, nextBreaks);
    updateCurrentShiftInConfig(s => ({ ...s, start_time: parsed.start_time, slot_duration: parsed.slot_duration, breaks: nextBreaks, slots: newSlots }));
    toast.success('Istirahat dihapus.');
  }, [parsed, updateCurrentShiftInConfig]);

  const handleBreakDurationChange = useCallback((breakId: string, newDuration: number) => {
    const nextBreaks = parsed.breaks.map(b => b.id === breakId ? { ...b, duration: newDuration } : b);
    const newSlots = regenerateSlots(parsed.start_time, parsed.slot_duration, nextBreaks);
    updateCurrentShiftInConfig(s => ({ ...s, start_time: parsed.start_time, slot_duration: parsed.slot_duration, breaks: nextBreaks, slots: newSlots }));
  }, [parsed, updateCurrentShiftInConfig]);

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
    updateCurrentShiftInConfig(s => ({ ...s, slots, start_time: '07:00', slot_duration: 45, breaks: parseSlots(slots).breaks }));
    toast.success(`Reset ke standar ${jenjang || 'Sekolah'} berhasil`);
  }, [jenjang, onConfirm, updateCurrentShiftInConfig]);

  // ── Transform timeline slots and breaks to a flat list for Tabular ──
  const tabularData = useMemo<TimelineItemRow[]>(() => {
    if (!currentShift) return [];
    const rows: TimelineItemRow[] = [];
    const slots = currentShift.slots ?? [];
    
    slots.forEach((slot, idx) => {
      rows.push({
        id: `slot-${slot.slot}`,
        type: 'SLOT',
        slotNum: slot.slot,
        start: slot.start,
        end: slot.end,
        duration: parsed.slot_duration,
      });

      const brk = parsed.breaks.find(b => b.afterSlot === slot.slot);
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
  }, [currentShift, parsed]);

  // ── Tabular Column Definitions ──
  const columns = useMemo<TabularColumn<TimelineItemRow>[]>(() => [
    {
      key: 'type',
      label: 'Keterangan / Sesi',
      className: 'font-bold text-xs w-48',
      render: (row) => {
        if (row.type === 'SLOT') {
          return (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 flex items-center justify-center text-[11px] font-black">
                {row.slotNum}
              </div>
              <span className="text-slate-800 dark:text-slate-200">Jam Pelajaran {row.slotNum}</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <span className="text-sm">☕</span>
            <span className="font-bold tracking-wide uppercase text-[10px]">Istirahat</span>
          </div>
        );
      },
    },
    {
      key: 'start',
      label: 'Jam Mulai',
      className: 'w-40',
      render: (row) => {
        if (row.type === 'SLOT' && row.slotNum !== undefined) {
          return (
            <input
              type="time"
              aria-label={`Jam mulai JP ${row.slotNum}`}
              value={row.start}
              onChange={e => handleTimeChange(row.slotNum!, 'start', e.target.value)}
              className="px-2.5 py-1 text-xs font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-750 focus:outline-none focus:ring-1 focus:ring-indigo-500 tabular-nums w-24"
            />
          );
        }
        return <span className="text-xs text-slate-400 tabular-nums font-semibold px-2.5">{row.start}</span>;
      },
    },
    {
      key: 'end',
      label: 'Jam Selesai',
      className: 'w-40',
      render: (row) => {
        if (row.type === 'SLOT' && row.slotNum !== undefined) {
          return (
            <input
              type="time"
              aria-label={`Jam selesai JP ${row.slotNum}`}
              value={row.end}
              onChange={e => handleTimeChange(row.slotNum!, 'end', e.target.value)}
              className="px-2.5 py-1 text-xs font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-750 focus:outline-none focus:ring-1 focus:ring-indigo-500 tabular-nums w-24"
            />
          );
        }
        return <span className="text-xs text-slate-400 tabular-nums font-semibold px-2.5">{row.end}</span>;
      },
    },
    {
      key: 'duration',
      label: 'Durasi',
      className: 'w-44',
      render: (row) => {
        if (row.type === 'SLOT') {
          return <span className="text-xs text-slate-500 font-medium">{row.duration} menit</span>;
        }
        if (row.type === 'BREAK' && row.breakRef) {
          const brk = row.breakRef;
          return (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-0.5 w-fit">
              <input
                type="number"
                aria-label="Durasi istirahat"
                value={brk.duration}
                onChange={e => handleBreakDurationChange(brk.id, Number(e.target.value))}
                min={5} max={120}
                className="w-10 bg-transparent text-xs font-black text-amber-700 dark:text-amber-400 text-center focus:outline-none tabular-nums"
              />
              <span className="text-[10px] font-bold text-amber-500">menit</span>
            </div>
          );
        }
        return null;
      },
    },
    {
      key: 'actions',
      label: 'Aksi Sisipkan / Hapus',
      align: 'right',
      className: 'w-44',
      render: (row) => {
        if (row.type === 'SLOT' && row.slotNum !== undefined) {
          const slots = currentShift.slots ?? [];
          const isLastSlot = row.slotNum >= slots.length;
          const hasBreak = parsed.breaks.find(b => b.afterSlot === row.slotNum);

          if (!isLastSlot && !hasBreak) {
            return (
              <button
                type="button"
                aria-label={`Tambah istirahat setelah JP ${row.slotNum}`}
                onClick={() => handleAddBreak(row.slotNum!)}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-750 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/40 px-2.5 py-1 rounded-lg transition-colors ml-auto"
              >
                <Plus className="w-3.5 h-3.5" /> Sisipkan Istirahat
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
              className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 hover:text-red-600 transition-colors ml-auto flex items-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          );
        }
        return null;
      },
    },
  ], [currentShift, parsed, handleTimeChange, handleBreakDurationChange, handleAddBreak, handleDeleteBreak]);

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
    <div className="space-y-0">
      {/* ── Hero Shift Selector ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Left: Shift Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(shiftConfig?.shifts ?? []).map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => onActiveShiftChange(s.id)}
              className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                s.id === activeSelectedShiftId
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 hover:text-indigo-600'
              }`}
            >
              {s.name}
              {s.id === activeSelectedShiftId && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900" />
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAddShift}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Shift Baru
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToJenjang}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Reset {jenjang || 'SMA/SMK'}
          </button>
          {shiftConfig?.shifts?.length > 1 && (
            <button
              type="button"
              onClick={handleDeleteShift}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 transition-all"
            >
              <Trash2 className="w-3 h-3" /> Hapus
            </button>
          )}
        </div>
      </div>

      {/* ── Shift Summary Card ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50 via-white to-violet-50/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-violet-950/20 p-5 mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/40 dark:bg-indigo-900/20 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-16 w-16 h-16 bg-violet-100/40 dark:bg-violet-900/10 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Nama Shift */}
          <div>
            <label htmlFor="input-nama-shift" className="block text-[10px] font-black text-indigo-500/70 dark:text-indigo-400/60 uppercase tracking-widest mb-2">
              Nama Shift
            </label>
            <input
              id="input-nama-shift"
              type="text"
              aria-label="Nama shift KBM"
              value={currentShift.name ?? ''}
              onChange={e => updateCurrentShiftInConfig(s => ({ ...s, name: e.target.value }))}
              placeholder="Contoh: Shift Siang"
              className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 backdrop-blur-sm"
            />
          </div>

          {/* Jam Mulai */}
          <div>
            <label htmlFor="input-jam-mulai" className="block text-[10px] font-black text-indigo-500/70 dark:text-indigo-400/60 uppercase tracking-widest mb-2">
              Jam Mulai (JP ke-1)
            </label>
            <div className="relative">
              <input
                id="input-jam-mulai"
                type="time"
                aria-label="Jam mulai KBM jam pertama"
                value={parsed.start_time ?? '07:00'}
                onChange={e => handleBaseConfigChange('start_time', e.target.value)}
                className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 backdrop-blur-sm"
              />
              <Clock3 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/60 pointer-events-none" />
            </div>
          </div>

          {/* Durasi */}
          <div>
            <label htmlFor="input-durasi-slot" className="block text-[10px] font-black text-indigo-500/70 dark:text-indigo-400/60 uppercase tracking-widest mb-2">
              Durasi per JP (Menit)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="input-durasi-slot"
                type="number"
                aria-label="Durasi per jam pelajaran dalam menit"
                value={parsed.slot_duration ?? 45}
                onChange={e => handleBaseConfigChange('slot_duration', e.target.value)}
                min={20} max={120}
                className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 backdrop-blur-sm"
              />
              <span className="text-xs font-bold text-indigo-400/70 shrink-0">mnt</span>
            </div>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-indigo-100/60 dark:border-indigo-900/30">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-100/60 dark:bg-indigo-900/30 rounded-full">
            <Clock3 className="w-3 h-3 text-indigo-500" />
            <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">{timeRange}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-full">
            <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">{Math.floor(totalDurationMin / 60)}j {totalDurationMin % 60}m total</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/20 rounded-full">
            <Coffee className="w-3 h-3 text-amber-500" />
            <span className="text-[11px] font-black text-amber-700 dark:text-amber-400">{parsed.breaks.length} istirahat</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className={`w-1.5 h-1.5 rounded-full ${cascadeEnabled ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {cascadeEnabled ? 'Cascade ON' : 'Cascade OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Timeline Tabular ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
            Daftar Urutan Jam Pelajaran & Istirahat
          </h3>
        </div>

        {/* Tabular container with matching rounded/borders */}
        <div className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm">
          <Tabular
            columns={columns}
            data={tabularData}
            emptyMessage="Tidak ada slot jam pelajaran yang dikonfigurasi"
          />
        </div>
      </div>
    </div>
  );
}
