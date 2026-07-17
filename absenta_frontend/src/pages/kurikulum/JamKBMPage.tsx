import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent, Button, Label, Input, Badge } from '@/components/ui';
import { Clock, Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { getTenantById, updateTenant, type Tenant } from '@/api/tenants.api';
import { getKelasForDropdown } from '@/api/dropdown.api';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { useJenjang } from '@/hooks/useJenjang';
import { toast } from 'sonner';
import useConfirm from '@/hooks/useConfirm';

const hardeningModuleKey = 'jam_kbm_page';

export default function JamKBMPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { jenjang } = useJenjang();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cascadeEnabled, setCascadeEnabled] = useState<boolean>(true);
  const [dragOverGapId, setDragOverGapId] = useState<number | null>(null);

  // Shift states
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [activeShiftTab, setActiveShiftTab] = useState<'SHIFTS' | 'CLASSES'>('SHIFTS');
  const [activeSelectedShiftId, setActiveSelectedShiftId] = useState<string>('pagi');
  const [shiftConfig, setShiftConfig] = useState<any>({
    shifts: [
      {
        id: 'pagi',
        name: 'Shift Pagi',
        slots: [
          { slot: 1, start: '07:00', end: '07:45' },
          { slot: 2, start: '07:45', end: '08:30' },
          { slot: 3, start: '08:30', end: '09:15' },
          { slot: 4, start: '09:35', end: '10:20' },
          { slot: 5, start: '10:20', end: '11:05' },
          { slot: 6, start: '11:05', end: '11:50' },
          { slot: 7, start: '12:30', end: '13:15' },
          { slot: 8, start: '13:15', end: '14:00' },
          { slot: 9, start: '14:00', end: '14:45' },
          { slot: 10, start: '14:45', end: '15:30' }
        ]
      }
    ],
    class_assignments: {}
  });

  const getPresetSlotsForJenjang = (schoolJenjang: string) => {
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
        { slot: 10, start: '12:35', end: '13:10' }
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
        { slot: 10, start: '13:50', end: '14:30' }
      ];
    } else {
      // SMA / SMK
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
        { slot: 10, start: '14:45', end: '15:30' }
      ];
    }
  };

  const fetchTenant = async () => {
    if (!user?.tenant_id) return;
    try {
      setLoading(true);
      const response = await getTenantById(user.tenant_id);
      
      try {
        const kelasRes = await getKelasForDropdown();
        if (kelasRes) {
          setKelasList(kelasRes);
        }
      } catch (err) {
        console.error('Failed to load kelas:', err);
      }

      if (response.success) {
        const data = response.data;
        setTenant(data);
        
        if (data.shift_jam_pelajaran) {
          setShiftConfig(data.shift_jam_pelajaran);
          if (data.shift_jam_pelajaran.shifts && data.shift_jam_pelajaran.shifts.length > 0) {
            setActiveSelectedShiftId(data.shift_jam_pelajaran.shifts[0].id);
          }
        } else {
          // Dynamic presets based on school jenjang
          const slots = getPresetSlotsForJenjang(data.jenjang);
          setShiftConfig({
            shifts: [
              {
                id: 'pagi',
                name: 'Shift Pagi',
                slots
              }
            ],
            class_assignments: {}
          });
          setActiveSelectedShiftId('pagi');
        }
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast.error('Gagal memuat data konfigurasi KBM');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (slotNum: number, field: 'start' | 'end', newValue: string) => {
    const currentShift = shiftConfig?.shifts?.find((s: any) => s.id === activeSelectedShiftId);
    if (!currentShift) return;

    const originalSlots = currentShift.slots || [];
    
    const toMins = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    
    const toTimeStr = (mins: number) => {
      const totalMins = (mins + 1440) % 1440;
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    let updatedSlots = [...originalSlots];
    const targetIdx = updatedSlots.findIndex(s => s.slot === slotNum);
    if (targetIdx === -1) return;

    if (field === 'start') {
      const oldStart = toMins(originalSlots[targetIdx].start);
      const oldEnd = toMins(originalSlots[targetIdx].end);
      let duration = oldEnd - oldStart;
      if (duration <= 0) {
        const j = (jenjang || '').toUpperCase();
        duration = j === 'SD' || j === 'MI' ? 35 : (j === 'SMP' || j === 'MTS' ? 40 : 45);
      }

      const newStartMins = toMins(newValue);
      const newEndMins = newStartMins + duration;
      updatedSlots[targetIdx] = {
        ...updatedSlots[targetIdx],
        start: newValue,
        end: toTimeStr(newEndMins)
      };

      if (cascadeEnabled) {
        for (let i = targetIdx + 1; i < updatedSlots.length; i++) {
          const prevSlotOldEnd = toMins(originalSlots[i - 1].end);
          const currentSlotOldStart = toMins(originalSlots[i].start);
          const gap = currentSlotOldStart - prevSlotOldEnd;

          const prevSlotNewEnd = toMins(updatedSlots[i - 1].end);
          const newStart = prevSlotNewEnd + gap;

          const slotOldStart = toMins(originalSlots[i].start);
          const slotOldEnd = toMins(originalSlots[i].end);
          let slotDuration = slotOldEnd - slotOldStart;
          if (slotDuration <= 0) {
            const j = (jenjang || '').toUpperCase();
            slotDuration = j === 'SD' || j === 'MI' ? 35 : (j === 'SMP' || j === 'MTS' ? 40 : 45);
          }

          const newEnd = newStart + slotDuration;

          updatedSlots[i] = {
            ...updatedSlots[i],
            start: toTimeStr(newStart),
            end: toTimeStr(newEnd)
          };
        }
      }
    } else {
      updatedSlots[targetIdx] = {
        ...updatedSlots[targetIdx],
        end: newValue
      };
    }

    const nextShifts = shiftConfig.shifts.map((s: any) => {
      if (s.id === activeSelectedShiftId) {
        return { ...s, slots: updatedSlots };
      }
      return s;
    });

    setShiftConfig({ ...shiftConfig, shifts: nextShifts });
  };

  const parseSlots = (slots: any[]) => {
    if (!slots || slots.length === 0) {
      return { start_time: '07:00', slot_duration: 45, breaks: [] };
    }
    const start_time = slots[0].start;
    
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const firstSlotDur = toMins(slots[0].end) - toMins(slots[0].start);
    const slot_duration = firstSlotDur > 0 ? firstSlotDur : 45;

    const breaks: any[] = [];
    for (let i = 1; i < slots.length; i++) {
      const prevEnd = toMins(slots[i - 1].end);
      const currentStart = toMins(slots[i].start);
      const gap = currentStart - prevEnd;
      if (gap > 0) {
        breaks.push({
          id: `break-${Date.now()}-${i}`,
          afterSlot: slots[i - 1].slot,
          duration: gap
        });
      }
    }
    return { start_time, slot_duration, breaks };
  };

  const regenerateSlots = (startTime: string, duration: number, breaksList: any[]) => {
    const slots = [];
    
    const toMins = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    
    const toTimeStr = (mins: number) => {
      const totalMins = (mins + 1440) % 1440;
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    let currentMin = toMins(startTime);
    for (let s = 1; s <= 10; s++) {
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

  const handleBaseConfigChange = (field: 'start_time' | 'slot_duration', val: any) => {
    const currentShift = shiftConfig?.shifts?.find((s: any) => s.id === activeSelectedShiftId);
    if (!currentShift) return;

    const toMins = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const parsed = currentShift.start_time !== undefined 
      ? { start_time: currentShift.start_time, slot_duration: currentShift.slot_duration || 45, breaks: currentShift.breaks || [] }
      : parseSlots(currentShift.slots);

    const nextStart = field === 'start_time' ? val : parsed.start_time;
    const nextDur = field === 'slot_duration' ? Number(val) : parsed.slot_duration;
    
    const newSlots = regenerateSlots(nextStart, nextDur, parsed.breaks);

    const nextShifts = shiftConfig.shifts.map((s: any) => {
      if (s.id === activeSelectedShiftId) {
        return {
          ...s,
          start_time: nextStart,
          slot_duration: nextDur,
          breaks: parsed.breaks,
          slots: newSlots
        };
      }
      return s;
    });

    setShiftConfig({ ...shiftConfig, shifts: nextShifts });
  };

  const handleAddBreak = (afterSlotNum: number) => {
    const currentShift = shiftConfig?.shifts?.find((s: any) => s.id === activeSelectedShiftId);
    if (!currentShift) return;

    const parsed = currentShift.start_time !== undefined 
      ? { start_time: currentShift.start_time, slot_duration: currentShift.slot_duration || 45, breaks: currentShift.breaks || [] }
      : parseSlots(currentShift.slots);

    if (parsed.breaks.length >= 3) {
      toast.error('Maksimum jumlah istirahat dibatasi 3 kali.');
      return;
    }

    const newBreak = {
      id: `break-${Date.now()}`,
      afterSlot: afterSlotNum,
      duration: 15
    };

    const nextBreaks = [...parsed.breaks, newBreak];
    const newSlots = regenerateSlots(parsed.start_time, parsed.slot_duration, nextBreaks);

    const nextShifts = shiftConfig.shifts.map((s: any) => {
      if (s.id === activeSelectedShiftId) {
        return {
          ...s,
          start_time: parsed.start_time,
          slot_duration: parsed.slot_duration,
          breaks: nextBreaks,
          slots: newSlots
        };
      }
      return s;
    });

    setShiftConfig({ ...shiftConfig, shifts: nextShifts });
    toast.success(`Istirahat baru ditambahkan setelah Jam ${afterSlotNum}`);
  };

  const handleDeleteBreak = (breakId: string) => {
    const currentShift = shiftConfig?.shifts?.find((s: any) => s.id === activeSelectedShiftId);
    if (!currentShift) return;

    const parsed = currentShift.start_time !== undefined 
      ? { start_time: currentShift.start_time, slot_duration: currentShift.slot_duration || 45, breaks: currentShift.breaks || [] }
      : parseSlots(currentShift.slots);

    const nextBreaks = parsed.breaks.filter((b: any) => b.id !== breakId);
    const newSlots = regenerateSlots(parsed.start_time, parsed.slot_duration, nextBreaks);

    const nextShifts = shiftConfig.shifts.map((s: any) => {
      if (s.id === activeSelectedShiftId) {
        return {
          ...s,
          start_time: parsed.start_time,
          slot_duration: parsed.slot_duration,
          breaks: nextBreaks,
          slots: newSlots
        };
      }
      return s;
    });

    setShiftConfig({ ...shiftConfig, shifts: nextShifts });
    toast.success('Istirahat berhasil dihapus.');
  };

  const handleBreakDurationChange = (breakId: string, newDuration: number) => {
    const currentShift = shiftConfig?.shifts?.find((s: any) => s.id === activeSelectedShiftId);
    if (!currentShift) return;

    const parsed = currentShift.start_time !== undefined 
      ? { start_time: currentShift.start_time, slot_duration: currentShift.slot_duration || 45, breaks: currentShift.breaks || [] }
      : parseSlots(currentShift.slots);

    const nextBreaks = parsed.breaks.map((b: any) => {
      if (b.id === breakId) {
        return { ...b, duration: newDuration };
      }
      return b;
    });
    const newSlots = regenerateSlots(parsed.start_time, parsed.slot_duration, nextBreaks);

    const nextShifts = shiftConfig.shifts.map((s: any) => {
      if (s.id === activeSelectedShiftId) {
        return {
          ...s,
          start_time: parsed.start_time,
          slot_duration: parsed.slot_duration,
          breaks: nextBreaks,
          slots: newSlots
        };
      }
      return s;
    });

    setShiftConfig({ ...shiftConfig, shifts: nextShifts });
  };

  const handleMoveBreak = (breakId: string, toAfterSlot: number) => {
    const currentShift = shiftConfig?.shifts?.find((s: any) => s.id === activeSelectedShiftId);
    if (!currentShift) return;

    const parsed = currentShift.start_time !== undefined 
      ? { start_time: currentShift.start_time, slot_duration: currentShift.slot_duration || 45, breaks: currentShift.breaks || [] }
      : parseSlots(currentShift.slots);

    const exists = parsed.breaks.find((b: any) => b.afterSlot === toAfterSlot && b.id !== breakId);
    if (exists) {
      toast.error(`Sudah ada istirahat setelah Jam ${toAfterSlot}`);
      return;
    }

    const nextBreaks = parsed.breaks.map((b: any) => {
      if (b.id === breakId) {
        return { ...b, afterSlot: toAfterSlot };
      }
      return b;
    });
    const newSlots = regenerateSlots(parsed.start_time, parsed.slot_duration, nextBreaks);

    const nextShifts = shiftConfig.shifts.map((s: any) => {
      if (s.id === activeSelectedShiftId) {
        return {
          ...s,
          start_time: parsed.start_time,
          slot_duration: parsed.slot_duration,
          breaks: nextBreaks,
          slots: newSlots
        };
      }
      return s;
    });

    setShiftConfig({ ...shiftConfig, shifts: nextShifts });
    toast.success(`Istirahat dipindahkan setelah Jam ${toAfterSlot}`);
  };

  useEffect(() => {
    fetchTenant();
  }, [user?.tenant_id]);

  const handleSave = async () => {
    if (!tenant) return;

    const ok = await confirm({
      title: 'Simpan Konfigurasi Shift KBM',
      description: 'Apakah Anda yakin ingin menyimpan perubahan pada konfigurasi shift dan pembagian kelas ini?',
      confirmText: 'Ya, Simpan',
      cancelText: 'Batal',
      style: 'info',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const payload = {
        shift_jam_pelajaran: shiftConfig,
      };

      const response = await updateTenant(tenant.id, payload);

      if (response.success) {
        toast.success('Konfigurasi Shift & Waktu KBM berhasil disimpan!');
        fetchTenant();
      } else {
        toast.error(response.message || 'Gagal menyimpan konfigurasi');
      }
    } catch (err: any) {
      console.error('Error saving shift config:', err);
      toast.error(err?.message || 'Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AcademicPageLayout
        hardeningModuleKey={hardeningModuleKey}
        title="Pengaturan Jam KBM"
        description="Atur durasi jam pelajaran KBM per shift dan petakan kelas masing-masing."
        breadcrumbs={[
          { label: 'Kurikulum', path: '/kurikulum/dashboard' },
          { label: 'Pengaturan Jam KBM' }
        ]}
      >
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Memuat konfigurasi KBM...</p>
        </div>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      hardeningModuleKey={hardeningModuleKey}
      title="Pengaturan Jam KBM"
      description="Atur durasi jam pelajaran KBM per shift dan petakan kelas masing-masing."
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum/dashboard' },
        { label: 'Pengaturan Jam KBM' }
      ]}
      instruction={{
        title: 'Panduan Pengaturan Jam KBM',
        description: 'Menu ini memungkinkan kurikulum untuk membagi waktu sekolah menjadi beberapa shift (misal Pagi & Siang) agar tidak memicu deteksi bentrok mengajar lintas shift.',
        items: [
          { text: 'Tambahkan shift baru jika sekolah Anda menyelenggarakan shift siang.' },
          { text: 'Sesuaikan jam mulai dan jam selesai untuk masing-masing slot jam pelajaran.' },
          { text: 'Petakan rombongan belajar (kelas) ke shift masing-masing di tab Penugasan Shift Kelas.' },
          { text: 'Klik tombol Simpan Perubahan di kanan atas setelah selesai menyunting.' }
        ]
      }}
      toolbar={
        <Button 
          variant="primary" 
          size="sm" 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Perubahan
        </Button>
      }
    >
      <Card className="shadow-xl shadow-slate-100 dark:shadow-none border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 py-5 px-8 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-black text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Clock className="h-4 w-4" />
            </div>
            Konfigurasi Waktu KBM & Shift
          </CardTitle>
          {jenjang && (
            <Badge variant="outline" className="px-3 py-1 font-bold text-xs uppercase border-indigo-200 text-indigo-650 bg-indigo-50/10">
              Jenjang Terdeteksi: {jenjang}
            </Badge>
          )}
        </CardHeader>
        
        {/* Tab Header */}
        <div className="flex border-b border-slate-150 dark:border-slate-800 px-8 bg-slate-50/20">
          <button
            type="button"
            onClick={() => setActiveShiftTab('SHIFTS')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeShiftTab === 'SHIFTS' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Pengaturan Waktu Shift
          </button>
          <button
            type="button"
            onClick={() => setActiveShiftTab('CLASSES')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeShiftTab === 'CLASSES' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Penugasan Shift Kelas
          </button>
        </div>

        <CardContent className="p-6">
          {activeShiftTab === 'SHIFTS' ? (
            <div className="space-y-8">
              {/* Toolbar & Select Shift */}
              <div className="flex flex-wrap gap-4 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase">Pilih Shift:</span>
                  <select
                    value={activeSelectedShiftId}
                    onChange={(e) => setActiveSelectedShiftId(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black rounded-xl focus:outline-none text-slate-800 dark:text-slate-200"
                  >
                    {(shiftConfig?.shifts || []).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Reset Waktu ke Standar Jenjang ${jenjang || 'Sekolah'}`,
                        description: `Apakah Anda yakin ingin mereset waktu pada shift aktif ini ke standar KBM ${jenjang || 'sekolah'}? Tindakan ini akan menimpa slot waktu yang ada.`,
                        confirmText: 'Ya, Reset',
                        cancelText: 'Batal',
                        style: 'warning'
                      });
                      if (!ok) return;

                      const slots = getPresetSlotsForJenjang(jenjang || '');
                      const nextShifts = shiftConfig.shifts.map((s: any) => {
                        if (s.id === activeSelectedShiftId) {
                          return { ...s, slots, start_time: '07:00', slot_duration: 45, breaks: parseSlots(slots).breaks };
                        }
                        return s;
                      });
                      setShiftConfig({ ...shiftConfig, shifts: nextShifts });
                      toast.success(`Berhasil mereset waktu shift ke standar ${jenjang || 'Sekolah'}`);
                    }}
                    className="text-xs shrink-0 text-amber-600 border-amber-200 hover:bg-amber-50/50 hover:text-amber-700 dark:border-amber-950/20 dark:text-amber-400 dark:border-amber-900/40"
                  >
                    Reset ke Standar Jenjang ({jenjang || 'SMA/SMK'})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newId = `shift_${Date.now()}`;
                      const newShift = {
                        id: newId,
                        name: `Shift Siang ${shiftConfig.shifts.length + 1}`,
                        start_time: '13:00',
                        slot_duration: 45,
                        breaks: [
                          { id: `brk-${Date.now()}-1`, afterSlot: 3, duration: 15 },
                          { id: `brk-${Date.now()}-2`, afterSlot: 6, duration: 15 }
                        ],
                        slots: []
                      };
                      newShift.slots = regenerateSlots(newShift.start_time, newShift.slot_duration, newShift.breaks);
                      
                      setShiftConfig({
                        ...shiftConfig,
                        shifts: [...shiftConfig.shifts, newShift]
                      });
                      setActiveSelectedShiftId(newId);
                      toast.success('Shift baru berhasil ditambahkan! Silakan sesuaikan namanya dan jam pelajarannya.');
                    }}
                    className="text-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Shift Baru
                  </Button>
                  {shiftConfig?.shifts?.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const nextShifts = shiftConfig.shifts.filter((s: any) => s.id !== activeSelectedShiftId);
                        const nextAssignments = { ...shiftConfig.class_assignments };
                        Object.keys(nextAssignments).forEach(classId => {
                          if (nextAssignments[classId] === activeSelectedShiftId) {
                            delete nextAssignments[classId];
                          }
                        });
                        setShiftConfig({
                          shifts: nextShifts,
                          class_assignments: nextAssignments
                        });
                        setActiveSelectedShiftId(nextShifts[0].id);
                        toast.success('Shift berhasil dihapus.');
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50/50 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Shift Ini
                    </Button>
                  )}
                </div>
              </div>

              {/* Base Configuration (Start Time & Duration) */}
              {(() => {
                const currentShift = shiftConfig?.shifts?.find((s: any) => s.id === activeSelectedShiftId);
                if (!currentShift) return null;

                const parsed = currentShift.start_time !== undefined 
                  ? { start_time: currentShift.start_time, slot_duration: currentShift.slot_duration || 45, breaks: currentShift.breaks || [] }
                  : parseSlots(currentShift.slots);

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/30 dark:bg-slate-900/10 p-6 border border-slate-150 dark:border-slate-800/60 rounded-3xl">
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Nama Shift</Label>
                        <Input
                          value={currentShift.name || ''}
                          onChange={(e) => {
                            const nextShifts = shiftConfig.shifts.map((s: any) => {
                              if (s.id === activeSelectedShiftId) {
                                return { ...s, name: e.target.value };
                              }
                              return s;
                            });
                            setShiftConfig({ ...shiftConfig, shifts: nextShifts });
                          }}
                          placeholder="Contoh: Shift Siang"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Jam Mulai KBM (Jam 1)</Label>
                        <Input
                          type="time"
                          value={parsed.start_time || '07:00'}
                          onChange={(e) => handleBaseConfigChange('start_time', e.target.value)}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Durasi per Jam Pelajaran (Menit)</Label>
                        <Input
                          type="number"
                          value={parsed.slot_duration || 45}
                          onChange={(e) => handleBaseConfigChange('slot_duration', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Timeline Builder */}
                    <div className="space-y-4 max-w-xl">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-900">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Timeline Jam Pelajaran & Istirahat</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-indigo-650 bg-indigo-50/10 border-indigo-200">
                          {parsed.breaks.length} Istirahat Aktif
                        </Badge>
                      </div>

                      <div className="space-y-1 relative before:absolute before:left-[21px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-900">
                        {(currentShift.slots || []).map((slot: any, idx: number, arr: any[]) => {
                          const hasBreak = parsed.breaks.find((b: any) => b.afterSlot === slot.slot);

                          return (
                            <React.Fragment key={slot.slot}>
                              {/* SLOT ROW */}
                              <div className="flex items-center gap-4 relative z-10 py-1 bg-white dark:bg-slate-950">
                                <div className="w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs font-black text-slate-700 dark:text-slate-300 shrink-0 shadow-sm">
                                  {slot.slot}
                                </div>
                                <div className="flex-1 flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-250/40 dark:border-slate-800/40 rounded-2xl shadow-sm">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Jam Pelajaran {slot.slot}</span>
                                    <span className="text-[10px] text-slate-400">Durasi KBM</span>
                                  </div>
                                  <span className="text-xs font-black text-slate-700 dark:text-slate-350 font-mono bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-inner">
                                    {slot.start} - {slot.end}
                                  </span>
                                </div>
                              </div>

                              {/* GAP / BREAK SECTION */}
                              {slot.slot < 10 && (
                                <div className="pl-14 py-1">
                                  {hasBreak ? (
                                    /* BREAK CARD (DRAGGABLE) */
                                    <div
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData("text/plain", hasBreak.id);
                                        e.dataTransfer.effectAllowed = "move";
                                      }}
                                      className="flex items-center justify-between p-3.5 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl cursor-grab active:cursor-grabbing shadow-sm hover:shadow transition-shadow group"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 bg-amber-100 dark:bg-amber-950 rounded-xl text-amber-650 dark:text-amber-400">
                                          ☕
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-xs font-black text-amber-800 dark:text-amber-400">Istirahat</span>
                                          <span className="text-[10px] text-amber-600/80 dark:text-amber-500/80 font-medium">({slot.end} - {arr[idx + 1]?.start})</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="number"
                                            value={hasBreak.duration}
                                            onChange={(e) => handleBreakDurationChange(hasBreak.id, Number(e.target.value))}
                                            className="w-14 px-2 py-1 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-xl text-xs font-bold text-center focus:outline-none text-slate-800 dark:text-slate-200"
                                          />
                                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-550">menit</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteBreak(hasBreak.id)}
                                          className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* DROPZONE GAP PLACEHOLDER */
                                    <div
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOverGapId(slot.slot);
                                      }}
                                      onDragLeave={() => setDragOverGapId(null)}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        setDragOverGapId(null);
                                        const breakId = e.dataTransfer.getData("text/plain");
                                        if (breakId) {
                                          handleMoveBreak(breakId, slot.slot);
                                        }
                                      }}
                                      className={`transition-all duration-200 flex items-center justify-center my-1 rounded-xl ${
                                        dragOverGapId === slot.slot
                                          ? 'h-16 border-2 border-dashed border-amber-400 bg-amber-50/20'
                                          : 'h-6 group hover:h-10'
                                      }`}
                                    >
                                      {dragOverGapId === slot.slot ? (
                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider animate-pulse">Lepaskan untuk Pindahkan Istirahat</span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleAddBreak(slot.slot)}
                                          className="hidden group-hover:flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors shadow-sm"
                                        >
                                          <Plus className="w-3 h-3 text-slate-400" /> Sisipkan Istirahat di sini
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                  Petakan kelas-kelas sekolah ke shift jam pelajaran masing-masing. Kelas yang tidak dipetakan akan otomatis menggunakan shift default (Shift Pertama).
                </p>
              </div>

              <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-955 shadow-sm max-w-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-150 dark:border-slate-800">
                      <th className="px-5 py-3">Nama Kelas / Rombel</th>
                      <th className="px-5 py-3">Shift Jam Pelajaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                    {kelasList.map((kelas: any) => {
                      const assignedShiftId = shiftConfig?.class_assignments?.[kelas.value] || 'pagi';
                      return (
                        <tr key={kelas.value} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-colors">
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200">{kelas.label}</td>
                          <td className="px-5 py-3.5">
                            <select
                              value={assignedShiftId}
                              onChange={(e) => {
                                const nextAssignments = { 
                                  ...shiftConfig.class_assignments,
                                  [kelas.value]: e.target.value
                                };
                                setShiftConfig({ ...shiftConfig, class_assignments: nextAssignments });
                              }}
                              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black rounded-xl focus:outline-none text-slate-800 dark:text-slate-200"
                            >
                              {(shiftConfig?.shifts || []).map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                    {kelasList.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-5 py-8 text-center text-xs text-slate-400">
                          Tidak ada data kelas. Silakan buat kelas terlebih dahulu di modul akademik.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AcademicPageLayout>
  );
}
