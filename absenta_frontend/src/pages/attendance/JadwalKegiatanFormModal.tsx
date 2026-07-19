import React, { useEffect } from 'react';
import { z } from 'zod';
import { X, Info } from 'lucide-react';
import { Button } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Label } from '@/components/ui/Label';
import type { JenisKegiatanMaster } from '@/api/academic/jenisKegiatanMaster.api';
import type { Kelas } from '@/types/academic';
import type { JadwalKegiatanItem } from '@/api/attendance/jadwalKegiatan.api';

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

// ─── Constants ───────────────────────────────────────────────────────────────
const HARI_OPTION = [
  { value: 'SENIN', label: 'Senin' },
  { value: 'SELASA', label: 'Selasa' },
  { value: 'RABU', label: 'Rabu' },
  { value: 'KAMIS', label: 'Kamis' },
  { value: 'JUMAT', label: 'Jumat' },
  { value: 'SABTU', label: 'Sabtu' },
  { value: 'MINGGU', label: 'Minggu' },
] as const;

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
  const [berlakuMulai, setBerlakuMulai] = React.useState(new Date().toISOString().split('T')[0]);
  const [berlakuSampai, setBerlakuSampai] = React.useState('');
  const [masaBerlakuOption, setMasaBerlakuOption] = React.useState<'MANUAL' | 'GANJIL' | 'GENAP' | 'TAHUN_PELAJARAN'>('TAHUN_PELAJARAN');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  // ── Init from editingItem or presetNama ──
  useEffect(() => {
    if (editingItem) {
      setNama(editingItem.nama);
      setJenisKegiatan(editingItem.jenis_kegiatan);
      setHari(editingItem.hari ?? []);
      setWaktuMulai(editingItem.waktu_mulai);
      setWaktuSelesai(editingItem.waktu_selesai ?? '');
      setTargetSemuaKelas(editingItem.target_semua_kelas);
      setTargetKelasIds(editingItem.target_kelas_ids ?? []);
      setBerlakuMulai(editingItem.berlaku_mulai.split('T')[0]);
      setBerlakuSampai(editingItem.berlaku_sampai ? editingItem.berlaku_sampai.split('T')[0] : '');
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

  const handleToggleDay = React.useCallback((day: string) => {
    setHari(prev => prev.includes(day) ? prev.filter(h => h !== day) : [...prev, day]);
  }, []);

  const handleToggleClass = React.useCallback((classId: string) => {
    setTargetKelasIds(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
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
      result.error.errors.forEach(err => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
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

  const kelasOptions = React.useMemo(() =>
    classes.map(c => ({ value: c.id, label: c.nama_kelas })),
    [classes]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-base text-slate-800 dark:text-slate-100">
              {editingItem ? 'Edit Jadwal Kegiatan' : 'Tambah Jadwal Kegiatan'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Jadwal akan di-generate menjadi sesi absensi otomatis setiap hari</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Auto-session info */}
          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              <strong>Sistem Auto-Session:</strong> Jadwal ini akan otomatis di-generate menjadi sesi kehadiran setiap hari sekolah pada pukul 01:00.
            </p>
          </div>

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

          {/* Jenis Kegiatan */}
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

          {/* Hari Pelaksanaan */}
          <div>
            <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Hari Pelaksanaan <span className="text-rose-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-2 mt-1.5" role="group" aria-label="Pilih hari pelaksanaan kegiatan">
              {HARI_OPTION.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  id={`btn-hari-${opt.value.toLowerCase()}`}
                  aria-pressed={hari.includes(opt.value)}
                  onClick={() => handleToggleDay(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    hari.includes(opt.value)
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.hari && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.hari}</p>}
          </div>

          {/* Waktu Pelaksanaan */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="form-waktu-mulai" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Jam Mulai <span className="text-rose-500">*</span>
              </Label>
              <input
                id="form-waktu-mulai"
                name="waktu_mulai"
                type="time"
                aria-label="Jam mulai kegiatan"
                aria-required="true"
                value={waktuMulai}
                onChange={e => setWaktuMulai(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="form-waktu-selesai" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Jam Selesai
              </Label>
              <input
                id="form-waktu-selesai"
                name="waktu_selesai"
                type="time"
                aria-label="Jam selesai kegiatan (opsional)"
                value={waktuSelesai}
                onChange={e => setWaktuSelesai(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
              />
            </div>
          </div>

          {/* Target Kelas */}
          <div>
            <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Target Kelas
            </Label>
            <div className="flex items-center gap-4 mt-1.5" role="radiogroup" aria-label="Pilihan target kelas">
              <label htmlFor="radio-semua-kelas" className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  id="radio-semua-kelas"
                  type="radio"
                  name="target_kelas_type"
                  aria-label="Target seluruh kelas"
                  checked={targetSemuaKelas}
                  onChange={() => setTargetSemuaKelas(true)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>Seluruh Kelas</span>
              </label>
              <label htmlFor="radio-kelas-tertentu" className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  id="radio-kelas-tertentu"
                  type="radio"
                  name="target_kelas_type"
                  aria-label="Target kelas tertentu"
                  checked={!targetSemuaKelas}
                  onChange={() => setTargetSemuaKelas(false)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>Pilih Kelas Tertentu</span>
              </label>
            </div>

            {!targetSemuaKelas && (
              <div className="mt-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto bg-slate-50/30 dark:bg-slate-800/20">
                {kelasOptions.map(cls => (
                  <button
                    key={cls.value}
                    type="button"
                    aria-pressed={targetKelasIds.includes(cls.value)}
                    onClick={() => handleToggleClass(cls.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-left border transition-all truncate ${
                      targetKelasIds.includes(cls.value)
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-400 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cls.label}
                  </button>
                ))}
              </div>
            )}
            {errors.target_kelas_ids && <p role="alert" className="mt-1 text-[11px] text-rose-500 font-medium">{errors.target_kelas_ids}</p>}
          </div>

          {/* Masa Berlaku Preset */}
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

          <div className="grid grid-cols-2 gap-4">
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
                Selesai Berlaku <span className="text-slate-400 text-[9px] normal-case font-normal">(opsional)</span>
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

          {/* Submit */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" variant="primary" className="px-6" disabled={submitting}>
              {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Buat Jadwal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
