import { z } from 'zod';

// ─── Domain Types (No any) ─────────────────────────────────────────────────────
export interface TimeSlot {
  slot: number;
  start: string;
  end: string;
}

export interface BreakItem {
  id: string;
  afterSlot: number;
  duration: number;
}

export interface ShiftItem {
  id: string;
  name: string;
  start_time?: string;
  slot_duration?: number;
  breaks?: BreakItem[];
  slots: TimeSlot[];
}

export interface ShiftConfig {
  shifts: ShiftItem[];
  class_assignments: Record<string, string>;
}

export interface KelasOption {
  value: string;
  label: string;
  tingkat?: number;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
export const timeSlotSchema = z.object({
  slot: z.number().int().min(1).max(20),
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Format waktu harus HH:MM'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Format waktu harus HH:MM'),
});

export const breakItemSchema = z.object({
  id: z.string().min(1),
  afterSlot: z.number().int().min(1),
  duration: z.number().int().min(5, 'Durasi istirahat minimal 5 menit').max(120, 'Durasi istirahat maksimal 120 menit'),
});

export const shiftItemSchema = z.object({
  id: z.string().min(1, 'ID shift wajib ada'),
  name: z.string().min(1, 'Nama shift wajib diisi').max(50, 'Nama shift terlalu panjang'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  slot_duration: z.number().int().min(20, 'Durasi minimal 20 menit').max(120, 'Durasi maksimal 120 menit').optional(),
  breaks: z.array(breakItemSchema).max(3, 'Maksimum 3 istirahat per shift').optional(),
  slots: z.array(timeSlotSchema).min(1, 'Shift harus memiliki setidaknya 1 slot waktu'),
});

export const shiftConfigSchema = z.object({
  shifts: z.array(shiftItemSchema).min(1, 'Harus ada setidaknya 1 shift'),
  class_assignments: z.record(z.string(), z.string()),
});

export type ShiftConfigInput = z.infer<typeof shiftConfigSchema>;

// ─── Time Utility Functions ────────────────────────────────────────────────────
export const toMins = (t: string): number => {
  if (!t) return 0;
  const parts = t.split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
};

export const toTimeStr = (mins: number): string => {
  const totalMins = (mins + 1440) % 1440;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const getPresetSlotsForJenjang = (schoolJenjang: string): TimeSlot[] => {
  const j = (schoolJenjang || '').toUpperCase();
  if (j === 'SD' || j === 'MI') {
    return [
      { slot: 1, start: '07:00', end: '07:35' },
      { slot: 2, start: '07:35', end: '08:10' },
      { slot: 3, start: '08:10', end: '08:45' },
      { slot: 4, start: '08:45', end: '09:20' },
      { slot: 5, start: '09:40', end: '10:15' },
      { slot: 6, start: '10:15', end: '10:50' },
      { slot: 7, start: '10:50', end: '11:25' },
      { slot: 8, start: '11:25', end: '12:00' },
      { slot: 9, start: '12:00', end: '12:35' },
      { slot: 10, start: '12:35', end: '13:10' },
    ];
  } else if (j === 'SMP' || j === 'MTS') {
    return [
      { slot: 1, start: '07:00', end: '07:40' },
      { slot: 2, start: '07:40', end: '08:20' },
      { slot: 3, start: '08:20', end: '09:00' },
      { slot: 4, start: '09:00', end: '09:40' },
      { slot: 5, start: '10:00', end: '10:40' },
      { slot: 6, start: '10:40', end: '11:20' },
      { slot: 7, start: '11:20', end: '12:00' },
      { slot: 8, start: '12:30', end: '13:10' },
      { slot: 9, start: '13:10', end: '13:50' },
      { slot: 10, start: '13:50', end: '14:30' },
    ];
  } else {
    return [
      { slot: 1, start: '07:00', end: '07:45' },
      { slot: 2, start: '07:45', end: '08:30' },
      { slot: 3, start: '08:30', end: '09:15' },
      { slot: 4, start: '09:35', end: '10:20' },
      { slot: 5, start: '10:20', end: '11:05' },
      { slot: 6, start: '11:05', end: '11:50' },
      { slot: 7, start: '12:30', end: '13:15' },
      { slot: 8, start: '13:15', end: '14:00' },
      { slot: 9, start: '14:00', end: '14:45' },
      { slot: 10, start: '14:45', end: '15:30' },
      { slot: 11, start: '15:30', end: '16:15' },
      { slot: 12, start: '16:15', end: '17:00' },
    ];
  }
};

export const parseSlots = (slots: TimeSlot[]): { start_time: string; slot_duration: number; breaks: BreakItem[] } => {
  if (!slots || slots.length === 0) {
    return { start_time: '07:00', slot_duration: 45, breaks: [] };
  }
  const start_time = slots[0].start;
  const firstSlotDur = toMins(slots[0].end) - toMins(slots[0].start);
  const slot_duration = firstSlotDur > 0 ? firstSlotDur : 45;

  const breaks: BreakItem[] = [];
  for (let i = 1; i < slots.length; i++) {
    const prevEnd = toMins(slots[i - 1].end);
    const currentStart = toMins(slots[i].start);
    const gap = currentStart - prevEnd;
    if (gap > 0) {
      breaks.push({
        id: `break-${Date.now()}-${i}`,
        afterSlot: slots[i - 1].slot,
        duration: gap,
      });
    }
  }
  return { start_time, slot_duration, breaks };
};

export const regenerateSlots = (startTime: string, duration: number, breaksList: BreakItem[], totalSlots: number = 12): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  let currentMin = toMins(startTime);
  for (let s = 1; s <= totalSlots; s++) {
    const start = toTimeStr(currentMin);
    const end = toTimeStr(currentMin + duration);
    slots.push({ slot: s, start, end });
    const brk = (breaksList || []).find(b => b.afterSlot === s);
    if (brk) {
      currentMin += duration + brk.duration;
    } else {
      currentMin += duration;
    }
  }
  return slots;
};
