import React, { useEffect } from 'react';
import { z } from 'zod';
import { X, Info, Clock, Calendar, CheckSquare, Square, RotateCcw, Check, Sparkles, Layers } from 'lucide-react';
import { Button } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Label } from '@/components/ui/Label';
import type { JenisKegiatanMaster } from '@/api/academic/jenisKegiatanMaster.api';
import type { Kelas } from '@/types/academic';
import type { JadwalKegiatanItem } from '@/api/attendance/jadwalKegiatan.api';
import { toLocalDate } from '@/utils/attendance/time';

// ─── Zod Schema ──────────────────────────────────────────────────────────────
export const jadwalKegiatanSchema = z.object({
  nama: z.string().min(1, 'Nama kegiatan wajib diisi').max(120, 'Nama terlalu panjang'),
  jenis_kegiatan: z.string().min(1, 'Pilih kategori kegiatan'),
  hari: z.array(z.string()).min(1, 'Pilih minimal satu hari pelaksanaan'),
  waktu_mulai: z.string().min(1, 'Waktu mulai wajib diisi'),
  waktu_selesai: z.string().nullable().optional(),
  target_semua_kelas: z.boolean(),
  target_kelas_ids: z.array(z.string()),
  berlaku_mulai: z.string().min(1, 'Tanggal berlaku mulai wajib diisi'),
  berlaku_sampai: z.string().nullable().optional(),
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran aktif tidak ditemukan'),
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
});

export type JadwalKegiatanFormData = z.infer<typeof jadwalKegiatanSchema>;

import { HARI_LIST as HARI_OPTION, WORKDAYS_HARI_KEYS as WORKDAYS } from '../../constants/day.constants';

// ─── Props ───────────────────────────────────────────────────────────────────
interface JadwalKegiatanFormModalProps {
  editingItem: JadwalKegiatanItem | null;
  masterKegiatans: JenisKegiatanMaster[];
  classes: Kelas[];
  activeTahunPelajaranId: string;
  activeTahunPelajaranName: string;
  /** When opening via 'Atur' on a master card, pre-select this master name in the form */
  presetNama?: string;
  onClose: () => void;
  onSubmit: (payload: JadwalKegiatanFormData) => Promise<void>;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function JadwalKegiatanFormModal({
  editingItem,
  masterKegiatans,
  classes,
  activeTahunPelajaranId,
  activeTahunPelajaranName,
  presetNama = '',
  onClose,
  onSubmit,
}: JadwalKegiatanFormModalProps) {
  // ── Form State ──
  const [nama, setNama] = React.useState('');
  const [jenisKegiatan, setJenisKegiatan] = React.useState('');
  const [hari, setHari] = React.useState<string[]>([]);
  const [waktuMulai, setWaktuMulai] = React.useState('07:00');
  const [waktuSelesai, setWaktuSelesai] = React.useState('07:15');
  const [targetSemuaKelas, setTargetSemuaKelas] = React.useState(true);
  const [targetKelasIds, setTargetKelasIds] = React.useState<string[]>([]);
  const [berlakuMulai, setBerlakuMulai] = React.useState(toLocalDate());
  const [berlakuSampai, setBerlakuSampai] = React.useState('');
  const [masaBerlakuOption, setMasaBerlakuOption] = React.useState<'MANUAL' | 'GANJIL' | 'GENAP' | 'TAHUN_PELAJARAN'>('TAHUN_PELAJARAN');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  // ── Init from editingItem or presetNama ──
  useEffect(() => {
    const parseArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
      return [];
    };

    if (editingItem) {
      setNama(editingItem.nama || '');
      setJenisKegiatan(editingItem.jenis_kegiatan || '');
      setHari(parseArray(editingItem.hari));
      setWaktuMulai(editingItem.waktu_mulai || '07:00');
      setWaktuSelesai(editingItem.waktu_selesai || '');
      setTargetSemuaKelas(Boolean(editingItem.target_semua_kelas));
      setTargetKelasIds(parseArray(editingItem.target_kelas_ids));
      setBerlakuMulai(editingItem.berlaku_mulai ? String(editingItem.berlaku_mulai).split('T')[0] : toLocalDate());
      setBerlakuSampai(editingItem.berlaku_sampai ? String(editingItem.berlaku_sampai).split('T')[0] : '');
      setMasaBerlakuOption('MANUAL');
    } else {
      // New form — apply preset from master card if provided
      setNama(presetNama);
      setJenisKegiatan(presetNama); // matches option value (master.nama)
      setHari([]);
      setWaktuMulai('07:00');
      setWaktuSelesai('07:15');
      setTargetSemuaKelas(true);
      setTargetKelasIds([]);
      setBerlakuSampai('');
      setMasaBerlakuOption('TAHUN_PELAJARAN');
    }
    setErrors({});
  }, [editingItem, presetNama]);

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
  const handleToggleDay = React.useCallback((day: string) => {
    setHari(prev => prev.includes(day) ? prev.filter(h => h !== day) : [...prev, day]);
  }, []);

  const handleSelectWorkdays = React.useCallback(() => {
    setHari(WORKDAYS);
  }, []);

  const handleSelectAllDays = React.useCallback(() => {
    setHari(HARI_OPTION.map(h => h.value));
  }, []);

  const handleResetDays = React.useCallback(() => {
    setHari([]);
  }, []);

  // ── Quick Class Selectors & Grouping by Tingkat ──
  const groupedClasses = React.useMemo(() => {
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

  const handleToggleClass = React.useCallback((classId: string) => {
    setTargetKelasIds(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
  }, []);

  const handleToggleTingkat = React.useCallback((items: Kelas[]) => {
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

  const handleSelectAllClasses = React.useCallback(() => {
    setTargetKelasIds(classes.map(c => c.id));
  }, [classes]);

  const handleClearClasses = React.useCallback(() => {
    setTargetKelasIds([]);
  }, []);

  const handleJenisChange = React.useCallback((value: string) => {
    setJenisKegiatan(value);
    // Auto-populate nama if blank or matches a previous master
    const selectedMaster = masterKegiatans.find(m => m.id === value || m.nama === value);
    if (selectedMaster) {
      setNama(prev => {
        const isBlank = !prev.trim();
        const isPrevMaster = masterKegiatans.some(m => m.nama === prev);
        return (isBlank || isPrevMaster) ? selectedMaster.nama : prev;
      });
    }
  }, [masterKegiatans]);

  // ── Submit with Zod validation ──
  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData: JadwalKegiatanFormData = {
      nama: nama.trim(),
      jenis_kegiatan: jenisKegiatan,
      hari,
      waktu_mulai: waktuMulai,
      waktu_selesai: waktuSelesai || null,
      target_semua_kelas: targetSemuaKelas,
      target_kelas_ids: targetSemuaKelas ? [] : targetKelasIds,
      berlaku_mulai: berlakuMulai,
      berlaku_sampai: berlakuSampai || null,
      tahun_pelajaran_id: editingItem ? editingItem.tahun_pelajaran_id : activeTahunPelajaranId,
    };

    const result = jadwalKegiatanSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      const issues = result.error.issues || (result.error as any).errors || [];
      issues.forEach(err => {
        const field = err.path[0] as string;
        if (field && !fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(result.data);
    } finally {
      setSubmitting(false);
    }
  }, [nama, jenisKegiatan, hari, waktuMulai, waktuSelesai, targetSemuaKelas, targetKelasIds, berlakuMulai, berlakuSampai, editingItem, activeTahunPelajaranId, onSubmit]);

  // ── Memoized options ──
  const jenisOptions = React.useMemo(() =>
    masterKegiatans
      .filter(m => m.nama !== 'KBM' && m.tipe !== 'KBM')
      .map(m => ({ value: m.nama, label: `${m.nama} (${m.tipe})` })),
    [masterKegiatans]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-full sm:max-w-xl md:max-w-2xl xl:max-w-3xl rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] shadow-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 overflow-hidden">
        
        {/* Modal Header (Fixed at top) */}
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
                  {editingItem ? 'Edit Mode' : 'Baru'}
                </span>
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

        {/* Modal Form Body (Scrollable area) */}
        <form id="jadwal-kegiatan-form" onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          
          {/* Auto-session info badge */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
              <strong>Sistem Auto-Session Active:</strong> Kegiatan ini akan otomatis dibukakan sesi absensi sekolah setiap hari pelaksanaan yang sesuai.
            </p>
          </div>

          {/* Section 1: Informasi Utama Kegiatan */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              1. Identitas Kegiatan
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Kegiatan */}
              <div>
                <Label htmlFor="form-nama-kegiatan" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Nama Kegiatan <span className="text-rose-500">*</span>
                </Label>
                <input
                  id="form-nama-kegiatan"
                  name="nama"
                  type="text"
                  aria-label="Nama kegiatan rutin"
                  aria-required="true"
                  aria-describedby={errors.nama ? 'error-nama' : undefined}
                  placeholder="Contoh: Apel Pagi, Latihan Ketarunaan, Shalat Duha"
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  className={`mt-1.5 w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm transition-colors ${errors.nama ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'}`}
                />
                {errors.nama && <p id="error-nama" role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.nama}</p>}
              </div>

              {/* Kategori Kegiatan */}
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
                    aria-label="Kategori kegiatan rutin"
                    aria-required="true"
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
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Section 2: Waktu & Hari Pelaksanaan */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              2. Waktu & Pelaksanaan
            </h3>

            {/* Hari Pelaksanaan */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Hari Pelaksanaan <span className="text-rose-500">*</span>
                </Label>
                
                {/* Quick Presets for Days */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectWorkdays}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold"
                  >
                    Sen-Jum
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

              {/* Responsive Day Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label="Pilih hari pelaksanaan kegiatan">
                {HARI_OPTION.map(opt => {
                  const active = hari.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      id={`btn-hari-${opt.value.toLowerCase()}`}
                      aria-pressed={active}
                      onClick={() => handleToggleDay(opt.value)}
                      className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                        active
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              {errors.hari && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.hari}</p>}
            </div>

            {/* Waktu Pelaksanaan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="form-waktu-mulai" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Jam Mulai <span className="text-rose-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <input
                    id="form-waktu-mulai"
                    name="waktu_mulai"
                    type="time"
                    aria-label="Jam mulai kegiatan"
                    aria-required="true"
                    value={waktuMulai}
                    onChange={e => setWaktuMulai(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="form-waktu-selesai" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Jam Selesai <span className="text-slate-400 text-[10px] normal-case font-normal">(opsional)</span>
                </Label>
                <div className="relative mt-1.5">
                  <input
                    id="form-waktu-selesai"
                    name="waktu_selesai"
                    type="time"
                    aria-label="Jam selesai kegiatan (opsional)"
                    value={waktuSelesai}
                    onChange={e => setWaktuSelesai(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
                  />
                </div>
              </div>
            </div>
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
                {/* Global Class Action Bar */}
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

                {/* Grouped Classes List by Tingkat */}
                <div className="space-y-3 max-h-[260px] sm:max-h-[300px] overflow-y-auto pr-1">
                  {groupedClasses.map(([tingkatKey, group]) => {
                    const groupItemIds = group.items.map(c => c.id);
                    const selectedInGroup = groupItemIds.filter(id => targetKelasIds.includes(id));
                    const isAllInGroupSelected = groupItemIds.length > 0 && selectedInGroup.length === groupItemIds.length;

                    return (
                      <div key={String(tingkatKey)} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                        {/* Tingkat Header */}
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

                        {/* Class Grid inside this Tingkat */}
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
                  aria-label="Tanggal mulai berlaku"
                  aria-required="true"
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
                  aria-label="Tanggal selesai berlaku (opsional)"
                  value={berlakuSampai}
                  onChange={e => setBerlakuSampai(e.target.value)}
                  disabled={masaBerlakuOption !== 'MANUAL'}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer (Sticky / Fixed at bottom) */}
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
}
