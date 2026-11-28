import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
import {
  X,
  Clock,
  Calendar,
  RotateCcw,
  Check,
  Minus,
  Copy,
  AlertCircle,
  Shield,
  ChevronDown,
  ChevronUp,
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
  const [expandedTingkatKey, setExpandedTingkatKey] = useState<string | null>(null);
  const [berlakuMulai, setBerlakuMulai] = useState(toLocalDate());
  const [berlakuSampai, setBerlakuSampai] = useState('');
  const [termasukSiklusKetarunaan, setTermasukSiklusKetarunaan] = useState(false);
  const [masaBerlakuOption, setMasaBerlakuOption] = useState<'MANUAL' | 'GANJIL' | 'GENAP' | 'TAHUN_PELAJARAN'>('TAHUN_PELAJARAN');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // ── Per-Day Time Schedule State ──
  const [isMatrixMode, setIsMatrixMode] = useState(false);
  const [matrixSchedule, setMatrixSchedule] = useState<Record<string, DayScheduleMatrix>>({});
  const [activeFocusDay, setActiveFocusDay] = useState<string | undefined>(
    focusDay ? focusDay.toUpperCase() : undefined
  );
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
      setIsMatrixMode(hasVaryingTimes);

      if (focusDay) {
        const upperFocus = focusDay.toUpperCase();
        setActiveFocusDay(upperFocus);
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
      } else {
        setActiveFocusDay(undefined);
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
      setActiveFocusDay(presetDay ? presetDay.toUpperCase() : undefined);
      setHari(presetDay ? [presetDay.toUpperCase()] : []);
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
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeFocusDay]);

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

  const orderedSelectedDays = useMemo(() => {
    const order = HARI_OPTION.map(h => h.value);
    return [...hari].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [hari]);

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4 transition-opacity animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-full sm:max-w-xl md:max-w-2xl rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150 overflow-hidden">

        {/* Header Ringkas */}
        <div className="flex-none px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight truncate">
                {editingItem ? 'Edit Jadwal Kegiatan' : 'Tambah Jadwal Kegiatan'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Sesi absensi akan dibuka otomatis sesuai hari dan jam yang dipilih.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form id="jadwal-kegiatan-form" onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Alert Bentrok (Hanya tampil jika bentrok) */}
          {conflictWarning && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/70 flex items-start gap-2.5 text-rose-900 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-rose-800 dark:text-rose-200">
                  {conflictWarning.type === 'PEMBIASAAN_OVERLAP'
                    ? `Bentrok jadwal pada hari ${getDayOption(conflictWarning.day)?.label || conflictWarning.day}`
                    : `Bentrok dengan kegiatan utama pada hari ${getDayOption(conflictWarning.day)?.label || conflictWarning.day}`}
                </p>
                <p className="text-[11px] text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
                  Jam <strong>{conflictWarning.proposedTime}</strong> beririsan dengan <strong>{conflictWarning.kegiatanNama} ({conflictWarning.time})</strong>
                  {conflictWarning.type === 'PEMBIASAAN_OVERLAP'
                    ? ' pada kelas yang sama. Bedakan jamnya, bedakan kelasnya, atau cukup pakai 1 kegiatan saja.'
                    : '. Atur jam eskul di luar waktu kegiatan pembiasaan.'}
                </p>
              </div>
            </div>
          )}

          {/* 1. Nama & Jenis Kegiatan */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label htmlFor="form-nama-kegiatan" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Nama Kegiatan <span className="text-rose-500">*</span>
                </Label>
                <input
                  id="form-nama-kegiatan"
                  name="nama"
                  type="text"
                  placeholder="Mis. Ketarunaan, Upacara, Apel Pagi"
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  className={`mt-1.5 w-full px-3.5 py-2 rounded-xl border bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-sm transition-colors ${errors.nama ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'}`}
                />
                {errors.nama && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.nama}</p>}
              </div>

              <div>
                <Label htmlFor="form-jenis-kegiatan" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Jenis Kegiatan <span className="text-rose-500">*</span>
                </Label>
                {jenisOptions.length > 0 ? (
                  <SearchableSelect
                    id="form-jenis-kegiatan"
                    value={jenisKegiatan}
                    onValueChange={handleJenisChange}
                    options={jenisOptions}
                    placeholder="Pilih jenis kegiatan..."
                    searchPlaceholder="Cari jenis kegiatan..."
                    triggerClassName={`mt-1.5 h-[38px] text-sm font-normal bg-white dark:bg-slate-950 rounded-xl w-full ${errors.jenis_kegiatan ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'}`}
                  />
                ) : (
                  <select
                    id="form-jenis-kegiatan"
                    name="jenis_kegiatan"
                    value={jenisKegiatan}
                    onChange={e => setJenisKegiatan(e.target.value)}
                    className="mt-1.5 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-sm"
                  >
                    <option value="">Pilih jenis kegiatan...</option>
                    <option value="PEMBIASAAN">Pembiasaan (Ketarunaan, Apel, Dhuha)</option>
                    <option value="ESKUL">Ekstrakurikuler</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                )}
                {errors.jenis_kegiatan && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.jenis_kegiatan}</p>}
              </div>
            </div>

            {/* Toggle Ikut Siklus Ketarunaan (Ringkas, hanya untuk non-Eskul) */}
            {!isCurrentEskul && (nama.trim() !== '' || jenisKegiatan !== '') && (
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block leading-tight">
                      Ikut Siklus Ketarunaan
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-snug">
                      {isCurrentCoreKetarunaan
                        ? 'Otomatis aktif untuk kegiatan Ketarunaan.'
                        : 'Kehadiran di kegiatan ini otomatis masuk rekap Ketarunaan.'}
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

          {/* 2. Hari & Jam Pelaksanaan */}
          <div className="space-y-4">
            {/* Pilih Hari */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Hari Pelaksanaan <span className="text-rose-500">*</span>
                </Label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectWorkdays}
                    className="px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
                  >
                    Sen–Sab
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllDays}
                    className="px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
                  >
                    Semua
                  </button>
                  {hari.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetDays}
                      className="px-2 py-0.5 rounded-md text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={10} /> Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5" role="group" aria-label="Pilih hari pelaksanaan kegiatan">
                {HARI_OPTION.map(opt => {
                  const active = hari.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      id={`btn-hari-${opt.value.toLowerCase()}`}
                      aria-pressed={active}
                      onClick={() => handleToggleDay(opt.value)}
                      className={`h-9 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {errors.hari && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.hari}</p>}
            </div>

            {/* Jam Pelaksanaan */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Jam Pelaksanaan</span>
                </Label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Beda jam per hari
                  </span>
                  <Switch checked={isMatrixMode} onCheckedChange={handleToggleMatrixMode} />
                </label>
              </div>

              {!isMatrixMode ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="form-waktu-mulai" className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Mulai <span className="text-rose-500">*</span>
                    </Label>
                    <input
                      ref={focusInputRef}
                      id="form-waktu-mulai"
                      name="waktu_mulai"
                      type="time"
                      value={waktuMulai}
                      onChange={e => setWaktuMulai(e.target.value)}
                      className="mt-1 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="form-waktu-selesai" className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Selesai
                      </Label>
                      {waktuMulai && waktuSelesai && (
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                          {calculateDuration(waktuMulai, waktuSelesai)}
                        </span>
                      )}
                    </div>
                    <input
                      id="form-waktu-selesai"
                      name="waktu_selesai"
                      type="time"
                      value={waktuSelesai}
                      onChange={e => setWaktuSelesai(e.target.value)}
                      className="mt-1 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-sm font-semibold"
                    />
                  </div>
                </div>
              ) : orderedSelectedDays.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-3 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
                  Pilih minimal satu hari di atas untuk mengatur jam per hari.
                </p>
              ) : (
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                  {orderedSelectedDays.map((dayKey) => {
                    const opt = getDayOption(dayKey);
                    const currentDayData = matrixSchedule[dayKey] || { waktuMulai, waktuSelesai };
                    const dur = calculateDuration(currentDayData.waktuMulai, currentDayData.waktuSelesai);
                    const isFocused = activeFocusDay === dayKey;

                    return (
                      <div
                        key={dayKey}
                        className={`px-3 py-2 flex items-center gap-2.5 flex-wrap sm:flex-nowrap ${
                          isFocused
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/25'
                            : 'bg-white dark:bg-slate-950'
                        }`}
                      >
                        <span className={`w-16 text-xs font-bold shrink-0 ${
                          isFocused ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'
                        }`}>
                          {opt?.label || dayKey}
                        </span>

                        <div className="flex items-center gap-2 flex-1 min-w-[190px]">
                          <input
                            ref={isFocused ? focusInputRef : undefined}
                            type="time"
                            value={currentDayData.waktuMulai}
                            onChange={e => handleUpdateMatrixDay(dayKey, 'waktuMulai', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                          />
                          <span className="text-xs text-slate-400">–</span>
                          <input
                            type="time"
                            value={currentDayData.waktuSelesai}
                            onChange={e => handleUpdateMatrixDay(dayKey, 'waktuSelesai', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          {dur && (
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 w-14 text-right hidden sm:inline">
                              {dur}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyDayTimeToAll(dayKey)}
                            title="Samakan jam ini ke semua hari"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {(errors.waktu_mulai || errors.waktu_selesai) && (
                <p role="alert" className="text-[11px] text-rose-500 font-medium">
                  {errors.waktu_mulai || errors.waktu_selesai}
                </p>
              )}
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* 3. Peserta Kelas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Peserta Kelas
              </Label>
              {!targetSemuaKelas && (
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {targetKelasIds.length} / {classes.length} kelas dipilih
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60" role="radiogroup" aria-label="Pilihan target kelas">
              <button
                id="radio-semua-kelas"
                type="button"
                role="radio"
                aria-checked={targetSemuaKelas}
                onClick={() => setTargetSemuaKelas(true)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  targetSemuaKelas
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Seluruh Kelas
              </button>
              <button
                id="radio-kelas-tertentu"
                type="button"
                role="radio"
                aria-checked={!targetSemuaKelas}
                onClick={() => setTargetSemuaKelas(false)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !targetSemuaKelas
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Pilih per Tingkat / Kelas
              </button>
            </div>

            {!targetSemuaKelas && (
              <div className="space-y-2.5">
                {/* Tier 1: Checkbox Tingkat (Anti Human Error — 1 klik per tingkat) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Centang tingkat kelas yang mengikuti kegiatan:
                  </span>
                  <div className="flex items-center gap-2 text-[11px] shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllClasses}
                      className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Semua
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      type="button"
                      onClick={handleClearClasses}
                      className="font-semibold text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {groupedClasses.map(([tingkatKey, group]) => {
                    const keyStr = String(tingkatKey);
                    const groupItemIds = group.items.map(c => c.id);
                    const selectedCount = groupItemIds.filter(id => targetKelasIds.includes(id)).length;
                    const isAllSelected = groupItemIds.length > 0 && selectedCount === groupItemIds.length;
                    const isPartial = selectedCount > 0 && selectedCount < groupItemIds.length;
                    const isExpanded = expandedTingkatKey === keyStr;

                    return (
                      <div
                        key={keyStr}
                        className={`rounded-xl border transition-all flex items-center justify-between gap-1.5 px-3 py-2.5 ${
                          isAllSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/35 border-indigo-400 dark:border-indigo-700'
                            : isPartial
                            ? 'bg-indigo-50/30 dark:bg-indigo-950/15 border-indigo-200 dark:border-indigo-800/80'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isAllSelected ? true : isPartial ? 'mixed' : false}
                          onClick={() => handleToggleTingkat(group.items)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <span
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              isAllSelected || isPartial
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isAllSelected ? <Check size={11} strokeWidth={3} /> : isPartial ? <Minus size={11} strokeWidth={3} /> : null}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block leading-tight truncate">
                              {group.label}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                              {selectedCount}/{group.items.length} kelas
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedTingkatKey(prev => (prev === keyStr ? null : keyStr))}
                          title={`Atur rincian kelas ${group.label}`}
                          className={`p-1 rounded-lg text-[10px] font-semibold flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer ${
                            isExpanded
                              ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-[10px]">Rinci</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Tier 2: Rincian Kelas (Opsional — hanya tampil untuk tingkat yang dibuka) */}
                {expandedTingkatKey && (() => {
                  const found = groupedClasses.find(([k]) => String(k) === expandedTingkatKey);
                  if (!found) return null;
                  const [, group] = found;
                  const groupItemIds = group.items.map(c => c.id);
                  const selectedInGroup = groupItemIds.filter(id => targetKelasIds.includes(id));
                  const isAllInGroupSelected = groupItemIds.length > 0 && selectedInGroup.length === groupItemIds.length;

                  return (
                    <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Rincian {group.label}{' '}
                          <span className="font-normal text-slate-400">
                            ({selectedInGroup.length}/{group.items.length})
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleTingkat(group.items)}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                              isAllInGroupSelected
                                ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                            }`}
                          >
                            {isAllInGroupSelected ? 'Batal Semua' : 'Pilih Semua'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedTingkatKey(null)}
                            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            Tutup
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[180px] overflow-y-auto pr-0.5">
                        {group.items.map(cls => {
                          const selected = targetKelasIds.includes(cls.id);
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => handleToggleClass(cls.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all truncate flex items-center justify-between gap-1 cursor-pointer ${
                                selected
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="truncate">{cls.nama_kelas}</span>
                              {selected && <Check size={11} className="shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            {errors.target_kelas_ids && <p role="alert" className="text-[11px] text-rose-500 font-medium">{errors.target_kelas_ids}</p>}
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* 4. Masa Berlaku */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="form-masa-berlaku" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Masa Berlaku
              </Label>
              <SearchableSelect
                id="form-masa-berlaku"
                value={masaBerlakuOption}
                onValueChange={(val) => setMasaBerlakuOption(val as typeof masaBerlakuOption)}
                options={[
                  { value: 'TAHUN_PELAJARAN', label: `Sepanjang Tahun Pelajaran (${activeTahunPelajaranName || 'Aktif'})` },
                  { value: 'GANJIL', label: 'Semester Ganjil (Jul – Des)' },
                  { value: 'GENAP', label: 'Semester Genap (Jan – Jun)' },
                  { value: 'MANUAL', label: 'Tanggal Kustom' },
                ]}
                placeholder="Pilih masa berlaku..."
                triggerClassName="mt-1.5 h-[38px] text-sm font-normal bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl w-full"
              />
              {masaBerlakuOption !== 'MANUAL' && berlakuMulai && (
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Berlaku: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{berlakuMulai}</span>
                  {berlakuSampai ? <> s/d <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{berlakuSampai}</span></> : ' – seterusnya'}
                </p>
              )}
            </div>

            {masaBerlakuOption === 'MANUAL' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="form-berlaku-mulai" className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Mulai Berlaku <span className="text-rose-500">*</span>
                  </Label>
                  <input
                    id="form-berlaku-mulai"
                    name="berlaku_mulai"
                    type="date"
                    value={berlakuMulai}
                    onChange={e => setBerlakuMulai(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-sm"
                  />
                  {errors.berlaku_mulai && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.berlaku_mulai}</p>}
                </div>
                <div>
                  <Label htmlFor="form-berlaku-sampai" className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Selesai Berlaku <span className="text-slate-400">(opsional)</span>
                  </Label>
                  <input
                    id="form-berlaku-sampai"
                    name="berlaku_sampai"
                    type="date"
                    value={berlakuSampai}
                    onChange={e => setBerlakuSampai(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-sm"
                  />
                  {errors.berlaku_sampai && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.berlaku_sampai}</p>}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Ringkas */}
        <div className="flex-none px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
          <div className="hidden sm:block text-xs min-w-0 truncate">
            {Object.keys(errors).length > 0 && (
              <span className="text-rose-500 font-medium">Periksa kembali kolom yang bertanda merah.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 sm:flex-none h-9 px-4 rounded-xl text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="jadwal-kegiatan-form"
              variant="primary"
              disabled={submitting}
              className="flex-1 sm:flex-none h-9 px-5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Buat Jadwal'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
});
