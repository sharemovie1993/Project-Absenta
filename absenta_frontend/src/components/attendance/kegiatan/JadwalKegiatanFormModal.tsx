import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
import {
  X,
  Info,
  Clock,
  Calendar,
  CheckSquare,
  Square,
  RotateCcw,
  Check,
  Sparkles,
  Layers,
  Copy,
  Sliders,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import { Button, Switch } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Label } from '@/components/ui/Label';
import type { JenisKegiatanMaster } from '@/api/academic/jenisKegiatanMaster.api';
import type { Kelas } from '@/types/academic';
import type { JadwalKegiatanItem } from '@/api/attendance/jadwalKegiatan.api';
import { toLocalDate } from '@/utils/attendance/time';
import {
  HARI_LIST as HARI_OPTION,
  WORKDAYS_HARI_KEYS as WORKDAYS,
  getDayShortLabel,
  getDayOption,
} from '@/constants/day.constants';
import { useJenisKegiatanMaster } from '@/hooks/academic/useJenisKegiatanMaster';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { toast } from 'react-hot-toast';

// ─── Zod Schema & Helpers ────────────────────────────────────────────────────
const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function parseTimeMinutes(value?: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!TIME_24H_REGEX.test(trimmed)) return null;
  const [hh, mm] = trimmed.split(':').map(Number);
  return hh * 60 + mm;
}

export const jadwalKegiatanSchema = z.object({
  nama: z.string().min(1, 'Nama kegiatan wajib diisi').max(120, 'Nama terlalu panjang'),
  jenis_kegiatan: z.string().min(1, 'Pilih kategori kegiatan'),
  hari: z.array(z.string()).min(1, 'Pilih minimal satu hari pelaksanaan'),
  waktu_mulai: z.string().min(1, 'Waktu mulai wajib diisi').regex(TIME_24H_REGEX, 'Format jam mulai tidak valid (HH:mm)'),
  waktu_selesai: z.string().nullable().optional(),
  target_semua_kelas: z.boolean(),
  target_kelas_ids: z.array(z.string()),
  berlaku_mulai: z.string().min(1, 'Tanggal berlaku mulai wajib diisi'),
  berlaku_sampai: z.string().nullable().optional(),
  tahun_pelajaran_id: z.string().optional(),
  termasuk_siklus_ketarunaan: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (!data.target_semua_kelas && data.target_kelas_ids.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 1,
      type: 'array',
      inclusive: true,
      message: 'Pilih minimal satu kelas target jika tidak memilih seluruh kelas',
      path: ['target_kelas_ids'],
    });
  }

  if (data.waktu_selesai && data.waktu_selesai.trim() !== '') {
    const startMins = parseTimeMinutes(data.waktu_mulai);
    const endMins = parseTimeMinutes(data.waktu_selesai);
    if (endMins === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Format jam selesai tidak valid (HH:mm)',
        path: ['waktu_selesai'],
      });
    } else if (startMins !== null && endMins <= startMins) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Jam selesai harus lebih besar dari jam mulai',
        path: ['waktu_selesai'],
      });
    }
  }

  if (data.berlaku_sampai && data.berlaku_sampai.trim() !== '' && data.berlaku_sampai < data.berlaku_mulai) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tanggal selesai berlaku tidak boleh lebih awal dari tanggal mulai berlaku',
      path: ['berlaku_sampai'],
    });
  }
});

export type JadwalKegiatanFormData = z.infer<typeof jadwalKegiatanSchema>;

export interface DayScheduleMatrix {
  waktuMulai: string;
  waktuSelesai: string;
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface JadwalKegiatanFormModalProps {
  editingItem: JadwalKegiatanItem | null;
  editingItems?: JadwalKegiatanItem[];
  masterKegiatans?: JenisKegiatanMaster[];
  classes?: Kelas[];
  activeTahunPelajaranId: string;
  activeTahunPelajaranName: string;
  /** When opening via 'Atur' on a master card, pre-select this master name in the form */
  presetNama?: string;
  presetDay?: string;
  focusDay?: string;
  defaultSiklusKetarunaan?: boolean;
  conflictReferenceKegiatan?: JadwalKegiatanItem[];
  onClose: () => void;
  onSubmit: (payloads: JadwalKegiatanFormData[]) => Promise<void>;
}

const parseArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return val.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
};

function calculateDuration(start: string, end?: string | null): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '';
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours > 0 && minutes > 0) return `${hours} jam ${minutes} mnt`;
  if (hours > 0) return `${hours} jam`;
  if (minutes > 0) return `${minutes} menit`;
  return '';
}

export default React.memo(function JadwalKegiatanFormModal({
  editingItem,
  editingItems = [],
  masterKegiatans: propMasterKegiatans,
  classes: propClasses,
  activeTahunPelajaranId,
  activeTahunPelajaranName,
  presetNama = '',
  presetDay = '',
  focusDay = '',
  defaultSiklusKetarunaan = false,
  conflictReferenceKegiatan = [],
  onClose,
  onSubmit,
}: JadwalKegiatanFormModalProps) {
  const { rawList: fallbackMasterKegiatans } = useJenisKegiatanMaster();
  const { rawList: fallbackClasses } = useKelasOptions();
  const masterKegiatans = propMasterKegiatans && propMasterKegiatans.length > 0 ? propMasterKegiatans : fallbackMasterKegiatans;
  const classes = propClasses && propClasses.length > 0 ? propClasses : fallbackClasses;

  // ── Form State ──
  const [nama, setNama] = useState('');
  const [jenisKegiatan, setJenisKegiatan] = useState('');
  const [hari, setHari] = useState<string[]>([]);
  const [waktuMulai, setWaktuMulai] = useState('07:00');
  const [waktuSelesai, setWaktuSelesai] = useState('07:15');
  const [targetSemuaKelas, setTargetSemuaKelas] = useState(true);
  const [targetKelasIds, setTargetKelasIds] = useState<string[]>([]);
  const [berlakuMulai, setBerlakuMulai] = useState(toLocalDate());
  const [berlakuSampai, setBerlakuSampai] = useState('');
  const [termasukSiklusKetarunaan, setTermasukSiklusKetarunaan] = useState(false);
  const [masaBerlakuOption, setMasaBerlakuOption] = useState<'MANUAL' | 'GANJIL' | 'GENAP' | 'TAHUN_PELAJARAN'>('TAHUN_PELAJARAN');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // ── Matrix State ──
  const [isMatrixMode, setIsMatrixMode] = useState(false);
  const [matrixSchedule, setMatrixSchedule] = useState<Record<string, DayScheduleMatrix>>({});
  const [activeFocusDay, setActiveFocusDay] = useState<string | undefined>(
    focusDay ? focusDay.toUpperCase() : undefined
  );
  const [focusScope, setFocusScope] = useState<'ONLY_THIS_DAY' | 'ALL_DAYS'>('ONLY_THIS_DAY');
  const [showOtherDays, setShowOtherDays] = useState(false);
  const focusInputRef = React.useRef<HTMLInputElement | null>(null);

  // ── Init from editingItem / editingItems or presetNama ──
  useEffect(() => {
    const items = editingItems && editingItems.length > 0 ? editingItems : editingItem ? [editingItem] : [];

    if (items.length > 0) {
      const primary = items[0];
      setNama(primary.nama || '');
      setJenisKegiatan(primary.jenis_kegiatan || '');
      setTargetSemuaKelas(Boolean(primary.target_semua_kelas));
      setTargetKelasIds(parseArray(primary.target_kelas_ids));
      setBerlakuMulai(primary.berlaku_mulai ? String(primary.berlaku_mulai).split('T')[0] : toLocalDate());
      setBerlakuSampai(primary.berlaku_sampai ? String(primary.berlaku_sampai).split('T')[0] : '');
      const isCoreTaruna = /ketarunaan|taruna/i.test(`${primary.nama || ''} ${primary.jenis_kegiatan || ''}`);
      setTermasukSiklusKetarunaan(
        isCoreTaruna || items.some((it) => Boolean(it.termasuk_siklus_ketarunaan))
      );
      setMasaBerlakuOption('MANUAL');

      // Check if multi-item matrix exists
      const initialMatrix: Record<string, DayScheduleMatrix> = {};
      const allDays: string[] = [];
      let hasVaryingTimes = items.length > 1;

      items.forEach((item) => {
        const itemDays = parseArray(item.hari);
        itemDays.forEach((d) => {
          const upper = d.toUpperCase();
          allDays.push(upper);
          initialMatrix[upper] = {
            waktuMulai: item.waktu_mulai || '07:00',
            waktuSelesai: item.waktu_selesai || '',
          };
        });
      });

      const uniqueDays = Array.from(new Set(allDays));
      setHari(uniqueDays);
      setWaktuMulai(primary.waktu_mulai || '07:00');
      setWaktuSelesai(primary.waktu_selesai || '');
      setMatrixSchedule(initialMatrix);
      setIsMatrixMode(hasVaryingTimes || Boolean(focusDay) || (primary.nama || '').toLowerCase().includes('ketarunaan'));

      if (focusDay) {
        const upperFocus = focusDay.toUpperCase();
        setActiveFocusDay(upperFocus);
        setIsMatrixMode(true);
        if (!uniqueDays.includes(upperFocus)) {
          uniqueDays.push(upperFocus);
          setHari(uniqueDays);
        }
        if (!initialMatrix[upperFocus]) {
          const matching = items.find(it => parseArray(it.hari).map(h => h.toUpperCase()).includes(upperFocus));
          initialMatrix[upperFocus] = {
            waktuMulai: matching?.waktu_mulai || primary.waktu_mulai || '07:00',
            waktuSelesai: matching?.waktu_selesai || primary.waktu_selesai || '',
          };
          setMatrixSchedule({ ...initialMatrix });
        }
      }
    } else {
      // New form
      setNama(presetNama);
      setJenisKegiatan(presetNama);
      setHari([]);
      setWaktuMulai('07:00');
      setWaktuSelesai('07:15');
      setTargetSemuaKelas(true);
      setTargetKelasIds([]);
      setBerlakuSampai('');
      setTermasukSiklusKetarunaan(
        Boolean(defaultSiklusKetarunaan) || /ketarunaan|taruna/i.test(presetNama || '')
      );
      setMasaBerlakuOption('TAHUN_PELAJARAN');
      setIsMatrixMode(false);
      setMatrixSchedule(presetDay ? { [presetDay.toUpperCase()]: { waktuMulai: '07:00', waktuSelesai: '07:15' } } : {});
    }
    setErrors({});
  }, [editingItem, editingItems, presetNama, presetDay, focusDay, defaultSiklusKetarunaan]);

  // ── Sync matrixSchedule when days change ──
  const syncMatrixForDay = useCallback((day: string, fallbackMulai?: string, fallbackSelesai?: string) => {
    setMatrixSchedule(prev => {
      if (prev[day]) return prev;
      return {
        ...prev,
        [day]: {
          waktuMulai: fallbackMulai || waktuMulai || '07:00',
          waktuSelesai: fallbackSelesai || waktuSelesai || '07:15',
        }
      };
    });
  }, [waktuMulai, waktuSelesai]);

  // ── Masa berlaku preset ──
  useEffect(() => {
    if (masaBerlakuOption === 'MANUAL') return;

    let startYear = new Date().getFullYear();
    let endYear = startYear + 1;

    if (activeTahunPelajaranName?.includes('/')) {
      const parts = activeTahunPelajaranName.split('/');
      const sY = Number(parts[0]);
      const eY = Number(parts[1]);
      if (Number.isFinite(sY) && Number.isFinite(eY)) {
        startYear = sY;
        endYear = eY;
      }
    }

    if (masaBerlakuOption === 'GANJIL') {
      setBerlakuMulai(`${startYear}-07-01`);
      setBerlakuSampai(`${startYear}-12-31`);
    } else if (masaBerlakuOption === 'GENAP') {
      setBerlakuMulai(`${endYear}-01-01`);
      setBerlakuSampai(`${endYear}-06-30`);
    } else if (masaBerlakuOption === 'TAHUN_PELAJARAN') {
      setBerlakuMulai(`${startYear}-07-01`);
      setBerlakuSampai(`${endYear}-06-30`);
    }
  }, [masaBerlakuOption, activeTahunPelajaranName]);

  // ── Quick Day Selectors ──
  const handleToggleDay = useCallback((day: string) => {
    setHari(prev => {
      const next = prev.includes(day) ? prev.filter(h => h !== day) : [...prev, day];
      if (!prev.includes(day)) {
        syncMatrixForDay(day);
      }
      return next;
    });
  }, [syncMatrixForDay]);

  const handleSelectWorkdays = useCallback(() => {
    setHari(WORKDAYS);
    WORKDAYS.forEach(d => syncMatrixForDay(d));
  }, [syncMatrixForDay]);

  const handleSelectAllDays = useCallback(() => {
    const all = HARI_OPTION.map(h => h.value);
    setHari(all);
    all.forEach(d => syncMatrixForDay(d));
  }, [syncMatrixForDay]);

  const handleResetDays = useCallback(() => {
    setHari([]);
  }, []);

  // ── Toggle Matrix Mode ──
  const handleToggleMatrixMode = useCallback(() => {
    setIsMatrixMode(prev => {
      const next = !prev;
      if (next) {
        // Initialize matrix for all selected days with current uniform times
        const newMatrix: Record<string, DayScheduleMatrix> = { ...matrixSchedule };
        hari.forEach(d => {
          if (!newMatrix[d]) {
            newMatrix[d] = {
              waktuMulai: waktuMulai || '07:00',
              waktuSelesai: waktuSelesai || '07:15',
            };
          }
        });
        setMatrixSchedule(newMatrix);
        toast('Mode Matrix Hari & Jam diaktifkan. Anda dapat mengatur jam berbeda di setiap hari.', {
          icon: '⏱️',
        });
      }
      return next;
    });
  }, [matrixSchedule, hari, waktuMulai, waktuSelesai]);

  const handleUpdateMatrixDay = useCallback((day: string, field: 'waktuMulai' | 'waktuSelesai', value: string) => {
    setMatrixSchedule(prev => ({
      ...prev,
      [day]: {
        waktuMulai: field === 'waktuMulai' ? value : (prev[day]?.waktuMulai || waktuMulai || '07:00'),
        waktuSelesai: field === 'waktuSelesai' ? value : (prev[day]?.waktuSelesai || waktuSelesai || ''),
      }
    }));
  }, [waktuMulai, waktuSelesai]);

  const handleCopyDayTimeToAll = useCallback((sourceDay: string) => {
    const source = matrixSchedule[sourceDay] || { waktuMulai, waktuSelesai };
    setMatrixSchedule(prev => {
      const updated: Record<string, DayScheduleMatrix> = { ...prev };
      hari.forEach(d => {
        updated[d] = { ...source };
      });
      return updated;
    });
    toast.success(`Jam ${getDayShortLabel(sourceDay)} (${source.waktuMulai} - ${source.waktuSelesai || 'Selesai'}) disalin ke seluruh hari terpilih!`);
  }, [matrixSchedule, waktuMulai, waktuSelesai, hari]);

  // ── Auto focus to time input when focus day is set ──
  useEffect(() => {
    if (activeFocusDay) {
      const timer = setTimeout(() => {
        focusInputRef.current?.focus();
        focusInputRef.current?.select?.();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeFocusDay]);

  const currentFocusData = useMemo(() => {
    if (!activeFocusDay) return { waktuMulai, waktuSelesai };
    return matrixSchedule[activeFocusDay] || { waktuMulai, waktuSelesai };
  }, [activeFocusDay, matrixSchedule, waktuMulai, waktuSelesai]);

  const currentFocusDur = useMemo(() => {
    return calculateDuration(currentFocusData.waktuMulai, currentFocusData.waktuSelesai);
  }, [currentFocusData]);

  const handleUpdateFocusDayTime = useCallback((field: 'waktuMulai' | 'waktuSelesai', val: string) => {
    if (!activeFocusDay) {
      if (field === 'waktuMulai') setWaktuMulai(val);
      if (field === 'waktuSelesai') setWaktuSelesai(val);
      return;
    }

    if (focusScope === 'ALL_DAYS') {
      setMatrixSchedule(prev => {
        const next = { ...prev };
        hari.forEach(d => {
          next[d] = {
            ...(next[d] || { waktuMulai, waktuSelesai }),
            [field]: val,
          };
        });
        return next;
      });
      if (field === 'waktuMulai') setWaktuMulai(val);
      if (field === 'waktuSelesai') setWaktuSelesai(val);
    } else {
      setMatrixSchedule(prev => ({
        ...prev,
        [activeFocusDay]: {
          ...(prev[activeFocusDay] || { waktuMulai, waktuSelesai }),
          [field]: val,
        }
      }));
    }
  }, [activeFocusDay, focusScope, hari, waktuMulai, waktuSelesai]);

  const handleApplyFocusDayPreset = useCallback((mulai: string, selesai: string) => {
    if (!activeFocusDay) {
      setWaktuMulai(mulai);
      setWaktuSelesai(selesai);
      return;
    }

    if (focusScope === 'ALL_DAYS') {
      setMatrixSchedule(prev => {
        const next = { ...prev };
        hari.forEach(d => {
          next[d] = { waktuMulai: mulai, waktuSelesai: selesai };
        });
        return next;
      });
      setWaktuMulai(mulai);
      setWaktuSelesai(selesai);
    } else {
      setMatrixSchedule(prev => ({
        ...prev,
        [activeFocusDay]: { waktuMulai: mulai, waktuSelesai: selesai }
      }));
    }
  }, [activeFocusDay, focusScope, hari]);

  const masterTipeMap = useMemo(() => {
    const map = new Map<string, string>();
    masterKegiatans.forEach((m) => {
      map.set(String(m.nama || '').trim().toLowerCase(), String(m.tipe || '').toUpperCase());
    });
    return map;
  }, [masterKegiatans]);

  const isCurrentEskul = useMemo(() => {
    const jUpper = String(jenisKegiatan || '').trim().toUpperCase();
    if (jUpper === 'ESKUL') return true;
    const byJenis = masterTipeMap.get(String(jenisKegiatan || '').trim().toLowerCase());
    if (byJenis) return byJenis === 'ESKUL';
    const byNama = masterTipeMap.get(String(nama || '').trim().toLowerCase());
    if (byNama) return byNama === 'ESKUL';
    return false;
  }, [jenisKegiatan, nama, masterTipeMap]);

  const isCurrentCoreKetarunaan = useMemo(
    () => /ketarunaan|taruna/i.test(`${nama || ''} ${jenisKegiatan || ''}`),
    [nama, jenisKegiatan]
  );

  const editingIdSet = useMemo(() => {
    const ids = new Set<string>();
    if (editingItem?.id) ids.add(editingItem.id);
    editingItems.forEach((it) => {
      if (it?.id) ids.add(it.id);
    });
    return ids;
  }, [editingItem, editingItems]);

  // ── Conflict Check (1 Slot = 1 Agenda Fisik antar-Pembiasaan & Eskul vs Pembiasaan) ──
  const conflictWarning = useMemo(() => {
    if (!conflictReferenceKegiatan || conflictReferenceKegiatan.length === 0 || hari.length === 0) return null;

    const isRefEskul = (ref: JadwalKegiatanItem) => {
      const rUpper = String(ref.jenis_kegiatan || '').trim().toUpperCase();
      if (rUpper === 'ESKUL') return true;
      const byJenis = masterTipeMap.get(String(ref.jenis_kegiatan || '').trim().toLowerCase());
      if (byJenis) return byJenis === 'ESKUL';
      const byNama = masterTipeMap.get(String(ref.nama || '').trim().toLowerCase());
      if (byNama) return byNama === 'ESKUL';
      return false;
    };

    const candClassSet = new Set(targetKelasIds);

    for (const p of conflictReferenceKegiatan) {
      if (editingIdSet.has(p.id)) continue;
      if (p.aktif === false) continue;

      const refIsEskul = isRefEskul(p);
      // Eskul vs Eskul boleh paralel; Pembiasaan tidak diblokir oleh Eskul
      if (refIsEskul) continue;

      const pDays = parseArray(p.hari).map(h => h.toUpperCase());
      const sharedDays = hari.filter(d => pDays.includes(d.toUpperCase()));
      if (sharedDays.length === 0) continue;

      // Cek irisan masa berlaku jika tersedia
      const candStart = berlakuMulai ? berlakuMulai.trim().split('T')[0] : '';
      const candEnd = berlakuSampai && berlakuSampai.trim() !== '' ? berlakuSampai.trim().split('T')[0] : '9999-12-31';
      const refStart = p.berlaku_mulai ? String(p.berlaku_mulai).split('T')[0] : '0000-01-01';
      const refEnd = p.berlaku_sampai ? String(p.berlaku_sampai).split('T')[0] : '9999-12-31';
      if (candStart && !(candStart <= refEnd && candEnd >= refStart)) continue;

      for (const day of sharedDays) {
        const dayTime = isMatrixMode && matrixSchedule[day] ? matrixSchedule[day] : { waktuMulai, waktuSelesai };
        const propMulai = dayTime.waktuMulai ? dayTime.waktuMulai.slice(0, 5) : '07:00';
        const propSelesai = dayTime.waktuSelesai && dayTime.waktuSelesai.trim() !== '' ? dayTime.waktuSelesai.slice(0, 5) : '23:59';

        const pMulai = (p.waktu_mulai || '07:00').slice(0, 5);
        const pSelesai = p.waktu_selesai && p.waktu_selesai.trim() !== '' ? p.waktu_selesai.slice(0, 5) : '23:59';

        const isOverlap = propMulai < pSelesai && propSelesai > pMulai;
        if (!isOverlap) continue;

        if (isCurrentEskul) {
          return {
            type: 'ESKUL_VS_PEMBIASAAN' as const,
            kegiatanNama: p.nama,
            day,
            time: `${pMulai} – ${p.waktu_selesai || 'Selesai'}`,
            proposedTime: `${propMulai} – ${dayTime.waktuSelesai || 'Selesai'}`,
          };
        }

        // Sesama Pembiasaan: cek irisan target rombel (beda rombel diperbolehkan paralel)
        const refClassIds = parseArray(p.target_kelas_ids);
        const isRombelOverlap =
          targetSemuaKelas ||
          Boolean(p.target_semua_kelas) ||
          refClassIds.some((cid) => candClassSet.has(cid));

        if (isRombelOverlap) {
          return {
            type: 'PEMBIASAAN_OVERLAP' as const,
            kegiatanNama: p.nama,
            day,
            time: `${pMulai} – ${p.waktu_selesai || 'Selesai'}`,
            proposedTime: `${propMulai} – ${dayTime.waktuSelesai || 'Selesai'}`,
          };
        }
      }
    }
    return null;
  }, [
    isCurrentEskul,
    masterTipeMap,
    editingIdSet,
    hari,
    isMatrixMode,
    matrixSchedule,
    waktuMulai,
    waktuSelesai,
    targetSemuaKelas,
    targetKelasIds,
    berlakuMulai,
    berlakuSampai,
    conflictReferenceKegiatan,
  ]);

  const otherDays = useMemo(() => {
    if (!activeFocusDay) return [];
    return hari.filter(d => d !== activeFocusDay);
  }, [hari, activeFocusDay]);

  const handleDayButtonClick = useCallback((day: string) => {
    if (isMatrixMode && hari.includes(day) && activeFocusDay !== day) {
      setActiveFocusDay(day);
    } else {
      handleToggleDay(day);
    }
  }, [isMatrixMode, hari, activeFocusDay, handleToggleDay]);

  // ── Quick Class Selectors & Grouping by Tingkat ──
  const groupedClasses = useMemo(() => {
    const map = new Map<string | number, { label: string; items: Kelas[] }>();
    classes.forEach(c => {
      const key = c.tingkat ?? 'Lainnya';
      const label = typeof key === 'number' || !isNaN(Number(key)) ? `Tingkat ${key}` : String(key);
      if (!map.has(key)) {
        map.set(key, { label, items: [] });
      }
      map.get(key)!.items.push(c);
    });

    return Array.from(map.entries()).sort(([a], [b]) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a).localeCompare(String(b));
    });
  }, [classes]);

  const validClassIdSet = useMemo(() => new Set(classes.map(c => c.id)), [classes]);

  // Sanitize & deduplicate targetKelasIds against active classes so stale/deleted IDs never inflate count
  useEffect(() => {
    if (classes.length === 0) return;
    setTargetKelasIds(prev => {
      const cleaned = Array.from(new Set(prev)).filter(id => validClassIdSet.has(id));
      if (cleaned.length === prev.length && cleaned.every((id, idx) => id === prev[idx])) {
        return prev;
      }
      return cleaned;
    });
  }, [classes.length, validClassIdSet]);

  const handleToggleClass = useCallback((classId: string) => {
    setTargetKelasIds(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
  }, []);

  const handleToggleTingkat = useCallback((items: Kelas[]) => {
    const itemIds = items.map(c => c.id);
    setTargetKelasIds(prev => {
      const allSelected = itemIds.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !itemIds.includes(id));
      } else {
        const set = new Set([...prev, ...itemIds]);
        return Array.from(set);
      }
    });
  }, []);

  const handleSelectAllClasses = useCallback(() => {
    setTargetKelasIds(classes.map(c => c.id));
  }, [classes]);

  const handleClearClasses = useCallback(() => {
    setTargetKelasIds([]);
  }, []);

  const handleJenisChange = useCallback((value: string) => {
    setJenisKegiatan(value);
    const selectedMaster = masterKegiatans.find(m => m.id === value || m.nama === value);
    if (selectedMaster) {
      setNama(prev => {
        const isBlank = !prev.trim();
        const isPrevMaster = masterKegiatans.some(m => m.nama === prev);
        return (isBlank || isPrevMaster) ? selectedMaster.nama : prev;
      });
    }
  }, [masterKegiatans]);

  // ── Submit Logic ──
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const failValidation = (fieldErrors: Record<string, string>, toastMsg?: string) => {
      setErrors(fieldErrors);
      const firstMsg = toastMsg || Object.values(fieldErrors)[0];
      if (firstMsg) toast.error(firstMsg);
    };

    const cleanBerlakuMulai = berlakuMulai ? berlakuMulai.trim().split('T')[0] : '';
    const cleanBerlakuSampai = berlakuSampai && berlakuSampai.trim() !== '' ? berlakuSampai.trim().split('T')[0] : null;
    const cleanTpId = (editingItem?.tahun_pelajaran_id || activeTahunPelajaranId || '').trim();
    const cleanTargetKelasIds = classes.length > 0
      ? Array.from(new Set(targetKelasIds)).filter(id => validClassIdSet.has(id))
      : Array.from(new Set(targetKelasIds));

    if (!nama.trim()) {
      failValidation({ nama: 'Nama kegiatan wajib diisi' });
      return;
    }
    if (!jenisKegiatan) {
      failValidation({ jenis_kegiatan: 'Pilih kategori kegiatan' });
      return;
    }
    if (hari.length === 0) {
      failValidation({ hari: 'Pilih minimal satu hari pelaksanaan' });
      return;
    }
    if (!cleanBerlakuMulai) {
      failValidation({ berlaku_mulai: 'Tanggal berlaku mulai wajib diisi' });
      return;
    }
    if (cleanBerlakuSampai && cleanBerlakuSampai < cleanBerlakuMulai) {
      failValidation({ berlaku_sampai: 'Tanggal selesai berlaku tidak boleh lebih awal dari tanggal mulai berlaku' });
      return;
    }
    if (!targetSemuaKelas && cleanTargetKelasIds.length === 0) {
      failValidation({ target_kelas_ids: 'Pilih minimal satu kelas target yang valid' });
      return;
    }
    if (conflictWarning) {
      const dayLabel = getDayOption(conflictWarning.day)?.label || conflictWarning.day;
      const conflictMsg =
        conflictWarning.type === 'PEMBIASAAN_OVERLAP'
          ? `Bentrok 1 Slot = 1 Agenda Fisik pada hari ${dayLabel} (${conflictWarning.proposedTime}) dengan "${conflictWarning.kegiatanNama}" (${conflictWarning.time}) di rombel yang sama.`
          : `Jadwal eskul bentrok pada hari ${dayLabel} (${conflictWarning.proposedTime}) dengan "${conflictWarning.kegiatanNama}" (${conflictWarning.time}).`;
      failValidation({ hari: conflictMsg }, conflictMsg);
      return;
    }

    const effectiveSiklusKetarunaan = isCurrentEskul
      ? false
      : isCurrentCoreKetarunaan
      ? true
      : Boolean(termasukSiklusKetarunaan);

    let payloads: JadwalKegiatanFormData[] = [];

    if (!isMatrixMode) {
      const wMulai = waktuMulai ? waktuMulai.trim() : '';
      const wSelesai = waktuSelesai && waktuSelesai.trim() !== '' ? waktuSelesai.trim() : null;
      const startMins = parseTimeMinutes(wMulai);
      if (startMins === null) {
        failValidation({ waktu_mulai: 'Jam mulai wajib diisi dengan format HH:mm yang valid' });
        return;
      }
      if (wSelesai) {
        const endMins = parseTimeMinutes(wSelesai);
        if (endMins === null || endMins <= startMins) {
          failValidation({ waktu_selesai: 'Jam selesai harus lebih besar dari jam mulai' });
          return;
        }
      }

      // Uniform mode: single payload
      const payload: JadwalKegiatanFormData = {
        nama: nama.trim(),
        jenis_kegiatan: jenisKegiatan,
        hari: hari.map(h => h.toUpperCase()),
        waktu_mulai: wMulai,
        waktu_selesai: wSelesai,
        target_semua_kelas: targetSemuaKelas,
        target_kelas_ids: targetSemuaKelas ? [] : cleanTargetKelasIds,
        berlaku_mulai: cleanBerlakuMulai,
        berlaku_sampai: cleanBerlakuSampai,
        tahun_pelajaran_id: cleanTpId,
        termasuk_siklus_ketarunaan: effectiveSiklusKetarunaan,
      };

      const result = jadwalKegiatanSchema.safeParse(payload);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        const issues = result.error.issues || (result.error as any).errors || [];
        issues.forEach((err: any) => {
          const field = err.path[0] as string;
          if (field && !fieldErrors[field]) fieldErrors[field] = err.message;
        });
        failValidation(fieldErrors);
        return;
      }
      payloads = [result.data];
    } else {
      // Matrix Mode: Validate every selected day before grouping
      const timeGroups = new Map<string, { waktuMulai: string; waktuSelesai: string | null; days: string[] }>();
      
      for (const d of hari) {
        const dSched = matrixSchedule[d] || { waktuMulai, waktuSelesai };
        const wMulai = dSched.waktuMulai ? dSched.waktuMulai.trim() : '';
        const wSelesai = dSched.waktuSelesai && dSched.waktuSelesai.trim() !== '' ? dSched.waktuSelesai.trim() : null;
        const dayLabel = getDayOption(d)?.label || d;

        const startMins = parseTimeMinutes(wMulai);
        if (startMins === null) {
          setActiveFocusDay(d);
          failValidation({ waktu_mulai: `Jam mulai hari ${dayLabel} wajib diisi dengan format HH:mm yang valid` });
          return;
        }
        if (wSelesai) {
          const endMins = parseTimeMinutes(wSelesai);
          if (endMins === null || endMins <= startMins) {
            setActiveFocusDay(d);
            failValidation({ waktu_selesai: `Jam selesai hari ${dayLabel} harus lebih besar dari jam mulai` });
            return;
          }
        }
        
        const key = `${wMulai}___${wSelesai || 'null'}`;
        if (!timeGroups.has(key)) {
          timeGroups.set(key, { waktuMulai: wMulai, waktuSelesai: wSelesai, days: [] });
        }
        timeGroups.get(key)!.days.push(d.toUpperCase());
      }

      for (const group of timeGroups.values()) {
        const payload: JadwalKegiatanFormData = {
          nama: nama.trim(),
          jenis_kegiatan: jenisKegiatan,
          hari: group.days,
          waktu_mulai: group.waktuMulai,
          waktu_selesai: group.waktuSelesai,
          target_semua_kelas: targetSemuaKelas,
          target_kelas_ids: targetSemuaKelas ? [] : cleanTargetKelasIds,
          berlaku_mulai: cleanBerlakuMulai,
          berlaku_sampai: cleanBerlakuSampai,
          tahun_pelajaran_id: cleanTpId,
          termasuk_siklus_ketarunaan: effectiveSiklusKetarunaan,
        };

        const result = jadwalKegiatanSchema.safeParse(payload);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          const issues = result.error.issues || (result.error as any).errors || [];
          issues.forEach((err: any) => {
            const field = err.path[0] as string;
            if (field && !fieldErrors[field]) fieldErrors[field] = err.message;
          });
          failValidation(fieldErrors);
          return;
        }
        payloads.push(result.data);
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(payloads);
    } catch {
      // Handled via toast
    } finally {
      setSubmitting(false);
    }
  }, [
    nama,
    jenisKegiatan,
    hari,
    isMatrixMode,
    matrixSchedule,
    waktuMulai,
    waktuSelesai,
    targetSemuaKelas,
    targetKelasIds,
    classes.length,
    validClassIdSet,
    berlakuMulai,
    berlakuSampai,
    termasukSiklusKetarunaan,
    isCurrentEskul,
    isCurrentCoreKetarunaan,
    conflictWarning,
    editingItem,
    activeTahunPelajaranId,
    onSubmit,
  ]);

  // ── Memoized options ──
  const jenisOptions = useMemo(() =>
    masterKegiatans
      .filter(m => m.nama !== 'KBM' && m.tipe !== 'KBM')
      .map(m => ({ value: m.nama, label: `${m.nama} (${m.tipe})` })),
    [masterKegiatans]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-full sm:max-w-xl md:max-w-2xl xl:max-w-3xl rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] shadow-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex-none px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 backdrop-blur-md flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100">
                  {editingItem ? 'Edit Jadwal Kegiatan' : 'Tambah Jadwal Kegiatan'}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  {editingItem ? (editingItems.length > 1 ? `Matrix (${editingItems.length} Slot)` : 'Edit Mode') : 'Baru'}
                </span>
                {activeFocusDay && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-2xs">
                    <Clock size={11} className="text-amber-600 dark:text-amber-400" />
                    Fokus: Hari {getDayOption(activeFocusDay)?.label || activeFocusDay}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                Jadwal ini di-generate otomatis menjadi sesi absensi harian pada pukul 01:00
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form id="jadwal-kegiatan-form" onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          
          {/* Auto-session info badge */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
              <strong>Sistem Auto-Session Active:</strong> Kegiatan ini akan otomatis dibukakan sesi absensi sekolah setiap hari pelaksanaan yang sesuai.
            </p>
          </div>

          {/* Section 1: Identitas Kegiatan */}
          <div className="space-y-4">
            {/* Conflict Alert (1 Slot = 1 Agenda Fisik / Eskul vs Pembiasaan) */}
            {conflictWarning && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-900/70 flex items-start gap-3 text-rose-900 dark:text-rose-200 animate-in fade-in shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-black text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <span>
                      {conflictWarning.type === 'PEMBIASAAN_OVERLAP'
                        ? 'Bentrok 1 Slot = 1 Agenda Fisik!'
                        : 'Bentrok dengan Kegiatan Kesiswaan Sekolah!'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Hari <strong>{getDayOption(conflictWarning.day)?.label || conflictWarning.day}</strong> pada jam <strong>{conflictWarning.proposedTime}</strong> beririsan dengan kegiatan <strong>{conflictWarning.kegiatanNama} ({conflictWarning.time})</strong>
                    {conflictWarning.type === 'PEMBIASAAN_OVERLAP' ? ' pada rombel yang sama.' : '.'}
                  </p>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold italic">
                    {conflictWarning.type === 'PEMBIASAAN_OVERLAP'
                      ? '*Atur jam berurutan (tidak tumpang tindih), bedakan target rombel, atau cukup gunakan 1 agenda (mis. Upacara/Dhuha) lalu aktifkan "Masuk Siklus Ketarunaan".'
                      : '*Kegiatan kesiswaan/pembiasaan bersifat prioritas. Silakan atur jam latihan eskul di luar waktu kegiatan kesiswaan.'}
                  </p>
                </div>
              </div>
            )}

            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              1. Identitas Kegiatan
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="form-nama-kegiatan" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Nama Kegiatan <span className="text-rose-500">*</span>
                </Label>
                <input
                  id="form-nama-kegiatan"
                  name="nama"
                  type="text"
                  placeholder="Contoh: Apel Pagi, Latihan Ketarunaan, Shalat Duha"
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  className={`mt-1.5 w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm transition-colors ${errors.nama ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'}`}
                />
                {errors.nama && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.nama}</p>}
              </div>

              <div>
                <Label htmlFor="form-jenis-kegiatan" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Kategori Kegiatan <span className="text-rose-500">*</span>
                </Label>
                {jenisOptions.length > 0 ? (
                  <SearchableSelect
                    id="form-jenis-kegiatan"
                    value={jenisKegiatan}
                    onValueChange={handleJenisChange}
                    options={jenisOptions}
                    placeholder="Pilih jenis kegiatan..."
                    searchPlaceholder="Cari jenis kegiatan..."
                    triggerClassName={`mt-1.5 h-10 text-[13px] font-medium bg-white dark:bg-slate-950 rounded-xl w-full ${errors.jenis_kegiatan ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'}`}
                  />
                ) : (
                  <select
                    id="form-jenis-kegiatan"
                    name="jenis_kegiatan"
                    value={jenisKegiatan}
                    onChange={e => setJenisKegiatan(e.target.value)}
                    className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
                  >
                    <option value="">-- Pilih Jenis Kegiatan --</option>
                    <option value="PEMBIASAAN">Pembiasaan (Ketarunaan, Apel, Ibadah)</option>
                    <option value="ESKUL">Ekstrakurikuler (Pramuka, OSIS, Olahraga)</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                )}
                {errors.jenis_kegiatan && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.jenis_kegiatan}</p>}
              </div>
            </div>

            {/* Penanda Siklus Program Ketarunaan (Single Tap, Multi-Credit untuk Pembiasaan non-Eskul) */}
            {!isCurrentEskul && (nama.trim() !== '' || jenisKegiatan !== '') && (
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                      Masuk Siklus Program Ketarunaan
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-snug">
                      {isCurrentCoreKetarunaan
                        ? 'Otomatis aktif untuk kegiatan inti Ketarunaan.'
                        : '1× tap pada agenda ini otomatis terhitung memenuhi siklus Ketarunaan hari tersebut (tanpa jadwal ganda).'}
                    </span>
                  </div>
                </div>
                <Switch
                  checked={isCurrentCoreKetarunaan ? true : termasukSiklusKetarunaan}
                  disabled={isCurrentCoreKetarunaan}
                  onCheckedChange={setTermasukSiklusKetarunaan}
                />
              </div>
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Section 2: Waktu & Pelaksanaan (Dengan Dukungan Dynamic Matrix) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                2. Waktu &amp; Hari Pelaksanaan
              </h3>
              {isMatrixMode && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <Sliders size={12} /> Mode Matrix Aktif
                </span>
              )}
            </div>

            {/* Hari Pelaksanaan */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Hari Pelaksanaan <span className="text-rose-500">*</span>
                </Label>
                
                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectWorkdays}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold"
                  >
                    Sen-Sab
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllDays}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold"
                  >
                    Semua
                  </button>
                  {hari.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetDays}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-500 hover:text-rose-600 transition-colors font-semibold flex items-center gap-1"
                    >
                      <RotateCcw size={10} /> Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label="Pilih hari pelaksanaan kegiatan">
                {HARI_OPTION.map(opt => {
                  const active = hari.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      id={`btn-hari-${opt.value.toLowerCase()}`}
                      aria-pressed={active}
                      onClick={() => handleDayButtonClick(opt.value)}
                      className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 relative ${
                        activeFocusDay === opt.value
                          ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400 dark:ring-amber-300 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-[1.03]'
                          : active
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {activeFocusDay === opt.value && (
                        <span className="text-[8px] font-black uppercase tracking-wider bg-white/25 px-1 rounded-sm">
                          Fokus
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.hari && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.hari}</p>}
            </div>

            {/* 🌟 FOCUSED DAY HIGHLIGHT CARD (Ketika modal dibuka dari hari tertentu di Jadwal Builder) */}
            {activeFocusDay && (
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-300 dark:border-amber-700/80 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/20 shadow-md space-y-4">
                {/* Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-amber-200/80 dark:border-amber-900/50 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm flex items-center justify-center shrink-0">
                      <Clock size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span>Waktu Pelaksanaan Khusus Hari</span>
                          <span className="px-2 py-0.5 rounded-lg bg-amber-200 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200 text-xs font-black uppercase tracking-wider">
                            {getDayOption(activeFocusDay)?.label || activeFocusDay}
                          </span>
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Fokus assignment hari {getDayOption(activeFocusDay)?.label || activeFocusDay} dari Jadwal Builder. Atur jam mulai dan selesai khusus untuk hari ini.
                      </p>
                    </div>
                  </div>

                  {/* Scope Selector */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFocusScope('ONLY_THIS_DAY')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        focusScope === 'ONLY_THIS_DAY'
                          ? 'bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 shadow-xs font-black'
                          : 'text-amber-700 dark:text-amber-400 hover:text-amber-900'
                      }`}
                    >
                      Hanya Hari {getDayOption(activeFocusDay)?.label || activeFocusDay}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFocusScope('ALL_DAYS')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        focusScope === 'ALL_DAYS'
                          ? 'bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 shadow-xs font-black'
                          : 'text-amber-700 dark:text-amber-400 hover:text-amber-900'
                      }`}
                    >
                      Terapkan ke Semua Hari
                    </button>
                  </div>
                </div>

                {/* Input Jam Mulai & Selesai Hari Fokus */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <Label htmlFor="focus-waktu-mulai" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Jam Mulai Hari {getDayOption(activeFocusDay)?.label || activeFocusDay} <span className="text-rose-500">*</span>
                    </Label>
                    <input
                      ref={focusInputRef}
                      id="focus-waktu-mulai"
                      type="time"
                      value={currentFocusData.waktuMulai || '07:00'}
                      onChange={e => handleUpdateFocusDayTime('waktuMulai', e.target.value)}
                      className="mt-1.5 w-full px-4 py-2.5 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-950 text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800 dark:text-slate-100 shadow-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="focus-waktu-selesai" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Jam Selesai Hari {getDayOption(activeFocusDay)?.label || activeFocusDay}
                      </Label>
                      {currentFocusDur && (
                        <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                          Durasi: {currentFocusDur}
                        </span>
                      )}
                    </div>
                    <input
                      id="focus-waktu-selesai"
                      type="time"
                      value={currentFocusData.waktuSelesai || ''}
                      onChange={e => handleUpdateFocusDayTime('waktuSelesai', e.target.value)}
                      className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800 dark:text-slate-100 shadow-xs"
                    />
                  </div>
                </div>

                {/* Preset Cepat */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                    <Sparkles size={11} className="text-amber-500" /> Preset Cepat:
                  </span>
                  {activeFocusDay === 'SABTU' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApplyFocusDayPreset('06:30', '12:00')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-300/80 dark:border-amber-800 text-amber-900 dark:text-amber-200 transition-colors shadow-2xs"
                      >
                        06:30 – 12:00 (Pagi s/d Siang)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyFocusDayPreset('06:30', '11:30')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-300/80 dark:border-amber-800 text-amber-900 dark:text-amber-200 transition-colors shadow-2xs"
                      >
                        06:30 – 11:30
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyFocusDayPreset('07:00', '12:00')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-300/80 dark:border-amber-800 text-amber-900 dark:text-amber-200 transition-colors shadow-2xs"
                      >
                        07:00 – 12:00
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyFocusDayPreset('06:30', '07:30')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-2xs"
                      >
                        06:30 – 07:30 (1 Jam)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApplyFocusDayPreset('06:30', '07:30')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
                      >
                        06:30 – 07:30
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyFocusDayPreset('07:00', '07:50')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
                      >
                        07:00 – 07:50
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyFocusDayPreset('15:30', '16:00')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs"
                      >
                        15:30 – 16:00 (Sore)
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Accordion Hari Lainnya jika activeFocusDay aktif dan ada hari lain */}
            {activeFocusDay && otherDays.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                <button
                  type="button"
                  onClick={() => setShowOtherDays(prev => !prev)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Jadwal Hari Lainnya ({otherDays.length} Hari: {otherDays.map(d => getDayOption(d)?.label || d).join(', ')})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <span>{showOtherDays ? 'Sembunyikan' : 'Lihat & Sesuaikan'}</span>
                    {showOtherDays ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {showOtherDays && (
                  <div className="p-3.5 pt-0 space-y-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <div className="pt-2.5 space-y-2">
                      {otherDays.map(dayKey => {
                        const opt = getDayOption(dayKey);
                        const dayData = matrixSchedule[dayKey] || { waktuMulai, waktuSelesai };
                        const dur = calculateDuration(dayData.waktuMulai, dayData.waktuSelesai);
                        return (
                          <div
                            key={dayKey}
                            className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <button
                                type="button"
                                onClick={() => setActiveFocusDay(dayKey)}
                                title="Klik untuk fokus ke hari ini"
                                className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors"
                              >
                                {opt?.label || dayKey}
                              </button>
                            </div>

                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div>
                                <input
                                  type="time"
                                  value={dayData.waktuMulai}
                                  onChange={e => handleUpdateMatrixDay(dayKey, 'waktuMulai', e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                                />
                              </div>
                              <div>
                                <input
                                  type="time"
                                  value={dayData.waktuSelesai}
                                  onChange={e => handleUpdateMatrixDay(dayKey, 'waktuSelesai', e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 justify-end">
                              {dur && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {dur}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopyDayTimeToAll(dayKey)}
                                title="Salin ke semua hari"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Matrix Mode Switcher Toggle Card (Hanya jika tidak sedang fokus spesifik atau saat ingin beralih mode) */}
            {!activeFocusDay && (
              <>
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-0.5 ${isMatrixMode ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200/60 dark:bg-slate-700 text-slate-500'}`}>
                      <Layers size={17} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Mode Matrix Waktu (Jam Berbeda per Hari)
                        </span>
                        {isMatrixMode && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Aktifkan jika durasi jam berbeda di hari tertentu (contoh: <strong>Sabtu dari pagi s.d siang</strong>, sedangkan hari kerja hanya 1 jam).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isMatrixMode}
                    onClick={handleToggleMatrixMode}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      isMatrixMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isMatrixMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Waktu Pelaksanaan: Mode Seragam vs Mode Matrix */}
                {!isMatrixMode ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <div>
                      <Label htmlFor="form-waktu-mulai" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        Jam Mulai <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative mt-1.5">
                        <input
                          id="form-waktu-mulai"
                          name="waktu_mulai"
                          type="time"
                          value={waktuMulai}
                          onChange={e => setWaktuMulai(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm font-semibold"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="form-waktu-selesai" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Jam Selesai <span className="text-slate-400 text-[10px] normal-case font-normal">(opsional)</span>
                        </Label>
                        {waktuMulai && waktuSelesai && (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                            Durasi: {calculateDuration(waktuMulai, waktuSelesai)}
                          </span>
                        )}
                      </div>
                      <div className="relative mt-1.5">
                        <input
                          id="form-waktu-selesai"
                          name="waktu_selesai"
                          type="time"
                          value={waktuSelesai}
                          onChange={e => setWaktuSelesai(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Matrix Mode: Baris per Hari */
                  <div className="space-y-3">
                    {hari.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                        <AlertCircle size={15} />
                        <span>Silakan pilih minimal satu hari pelaksanaan di atas untuk menyusun matrix jam.</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {hari.map((dayKey) => {
                          const opt = getDayOption(dayKey);
                          const currentDayData = matrixSchedule[dayKey] || { waktuMulai, waktuSelesai };
                          const dur = calculateDuration(currentDayData.waktuMulai, currentDayData.waktuSelesai);
                          const isSabtu = dayKey === 'SABTU';

                          return (
                            <div
                              key={dayKey}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                isSabtu
                                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50 shadow-sm'
                                  : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 sm:min-w-[150px]">
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                                  isSabtu
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
                                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                }`}>
                                  {opt?.label || dayKey}
                                </span>
                                {isSabtu && (
                                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                    (Latihan Lapangan)
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Mulai
                                  </label>
                                  <input
                                    type="time"
                                    value={currentDayData.waktuMulai}
                                    onChange={e => handleUpdateMatrixDay(dayKey, 'waktuMulai', e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-indigo-500/30"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Selesai
                                  </label>
                                  <input
                                    type="time"
                                    value={currentDayData.waktuSelesai}
                                    onChange={e => handleUpdateMatrixDay(dayKey, 'waktuSelesai', e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-indigo-500/30"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                                {dur ? (
                                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {dur}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Hingga selesai</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCopyDayTimeToAll(dayKey)}
                                  title="Salin jam hari ini ke semua hari terpilih"
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors flex items-center gap-1"
                                >
                                  <Copy size={11} />
                                  <span className="hidden sm:inline">Salin ke Semua</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {(errors.waktu_mulai || errors.waktu_selesai) && (
              <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">
                {errors.waktu_mulai || errors.waktu_selesai}
              </p>
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Section 3: Target Kelas Grouped by Tingkat */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                3. Target Peserta / Kelas
              </h3>
              {!targetSemuaKelas && (
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/40">
                  {targetKelasIds.length} dari {classes.length} Kelas Terpilih
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Pilihan target kelas">
              <label 
                htmlFor="radio-semua-kelas" 
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  targetSemuaKelas 
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-medium' 
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <input
                  id="radio-semua-kelas"
                  type="radio"
                  name="target_kelas_type"
                  aria-label="Target seluruh kelas"
                  checked={targetSemuaKelas}
                  onChange={() => setTargetSemuaKelas(true)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs sm:text-sm">Seluruh Kelas (Satu Sekolah)</span>
              </label>

              <label 
                htmlFor="radio-kelas-tertentu" 
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  !targetSemuaKelas 
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-medium' 
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <input
                  id="radio-kelas-tertentu"
                  type="radio"
                  name="target_kelas_type"
                  aria-label="Target kelas tertentu"
                  checked={!targetSemuaKelas}
                  onChange={() => setTargetSemuaKelas(false)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs sm:text-sm">Pilih Kelas Per Tingkat</span>
              </label>
            </div>

            {!targetSemuaKelas && (
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] text-slate-500 font-medium">Dikelompokkan Berdasarkan Tingkat:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllClasses}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <CheckSquare size={12} /> Pilih Semua Kelas
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      type="button"
                      onClick={handleClearClasses}
                      className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Square size={12} /> Kosongkan
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[260px] sm:max-h-[300px] overflow-y-auto pr-1">
                  {groupedClasses.map(([tingkatKey, group]) => {
                    const groupItemIds = group.items.map(c => c.id);
                    const selectedInGroup = groupItemIds.filter(id => targetKelasIds.includes(id));
                    const isAllInGroupSelected = groupItemIds.length > 0 && selectedInGroup.length === groupItemIds.length;

                    return (
                      <div key={String(tingkatKey)} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {group.label}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {selectedInGroup.length} / {group.items.length} Terpilih
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleTingkat(group.items)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                              isAllInGroupSelected
                                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                                : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'
                            }`}
                          >
                            {isAllInGroupSelected ? 'Batalkan Tingkat Ini' : `Pilih Semua ${group.label}`}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                          {group.items.map(cls => {
                            const selected = targetKelasIds.includes(cls.id);
                            return (
                              <button
                                key={cls.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => handleToggleClass(cls.id)}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all truncate flex items-center justify-between gap-1.5 ${
                                  selected
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm scale-[1.01]'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span className="truncate">{cls.nama_kelas}</span>
                                {selected && <Check size={12} className="flex-shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {errors.target_kelas_ids && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.target_kelas_ids}</p>}
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Section 4: Masa Berlaku */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              4. Masa Berlaku Jadwal
            </h3>

            <div>
              <Label htmlFor="form-masa-berlaku" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Preset Masa Berlaku
              </Label>
              <SearchableSelect
                id="form-masa-berlaku"
                value={masaBerlakuOption}
                onValueChange={(val) => setMasaBerlakuOption(val as typeof masaBerlakuOption)}
                options={[
                  { value: 'TAHUN_PELAJARAN', label: `Sepanjang Tahun Pelajaran (${activeTahunPelajaranName || 'Aktif'})` },
                  { value: 'GANJIL', label: 'Semester Ganjil (Juli - Desember)' },
                  { value: 'GENAP', label: 'Semester Genap (Januari - Juni)' },
                  { value: 'MANUAL', label: 'Manual (Pilih Tanggal Sendiri)' },
                ]}
                placeholder="Pilih preset masa berlaku..."
                triggerClassName="mt-1.5 h-10 text-[13px] font-medium bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="form-berlaku-mulai" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Mulai Berlaku <span className="text-rose-500">*</span>
                </Label>
                <input
                  id="form-berlaku-mulai"
                  name="berlaku_mulai"
                  type="date"
                  value={berlakuMulai}
                  onChange={e => setBerlakuMulai(e.target.value)}
                  disabled={masaBerlakuOption !== 'MANUAL'}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
                />
                {errors.berlaku_mulai && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.berlaku_mulai}</p>}
              </div>
              <div>
                <Label htmlFor="form-berlaku-sampai" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Selesai Berlaku <span className="text-slate-400 text-[10px] normal-case font-normal">(opsional)</span>
                </Label>
                <input
                  id="form-berlaku-sampai"
                  name="berlaku_sampai"
                  type="date"
                  value={berlakuSampai}
                  onChange={e => setBerlakuSampai(e.target.value)}
                  disabled={masaBerlakuOption !== 'MANUAL'}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
                />
                {errors.berlaku_sampai && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.berlaku_sampai}</p>}
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex-none px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-3 z-10">
          <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
            {Object.keys(errors).length > 0 ? (
              <span className="text-rose-500 font-medium">Periksa kembali kolom yang bertanda merah.</span>
            ) : (
              <span>Tekan simpan untuk memperbarui jadwal harian.</span>
            )}
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 sm:flex-none h-10 rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="jadwal-kegiatan-form"
              variant="primary"
              disabled={submitting}
              className="flex-1 sm:flex-none h-10 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
            >
              {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Buat Jadwal'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
});
