import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Label, Textarea, Switch, Badge } from '@/components/ui';
import {
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  Sliders,
  UserCheck,
} from 'lucide-react';
import { cbtApi } from '@/api/cbt.api';
import type { CbtEventItem } from '@/types/cbt.types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export interface CbtEventConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CbtEventItem | null;
  defaultTpId?: string;
  tpOptions: Array<{ value: string; label: string; is_active?: boolean }>;
  onSuccess: (savedEvent: CbtEventItem) => void;
}

export const CbtEventConfigModal: React.FC<CbtEventConfigModalProps> = ({
  isOpen,
  onClose,
  event,
  defaultTpId,
  tpOptions,
  onSuccess,
}) => {
  const [tpId, setTpId] = useState(defaultTpId || '');
  const [namaEvent, setNamaEvent] = useState('');
  const [kodeEvent, setKodeEvent] = useState('');
  const [semester, setSemester] = useState<'GANJIL' | 'GENAP'>('GANJIL');
  const [targetTingkat, setTargetTingkat] = useState<number[]>([10, 11, 12]);
  const [tipePelaksanaan, setTipePelaksanaan] = useState<'MASSAL' | 'MANDIRI'>('MASSAL');
  const [keterangan, setKeterangan] = useState('');
  const [lockTeacherScheduling, setLockTeacherScheduling] = useState(true);
  const [tokenRefreshInterval, setTokenRefreshInterval] = useState(15);
  const [strictBrowserGuard, setStrictBrowserGuard] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTpId(event.tahun_pelajaran_id);
      setNamaEvent(event.nama_event);
      setKodeEvent(event.kode_event);
      setSemester(event.semester || 'GANJIL');
      setTargetTingkat(event.target_tingkat || [10, 11, 12]);
      setTipePelaksanaan(event.tipe_pelaksanaan || (event.lock_teacher_scheduling === false ? 'MANDIRI' : 'MASSAL'));
      setKeterangan(event.keterangan || '');
      setLockTeacherScheduling(event.lock_teacher_scheduling ?? true);
      setTokenRefreshInterval(event.token_refresh_interval ?? 15);
      setStrictBrowserGuard(event.strict_browser_guard ?? true);
      setIsActive(event.is_active ?? false);
    } else {
      setTpId(defaultTpId || (tpOptions.find((t) => t.is_active)?.value || tpOptions[0]?.value || ''));
      setNamaEvent('');
      setKodeEvent('');
      setSemester('GANJIL');
      setTargetTingkat([10, 11, 12]);
      setTipePelaksanaan('MASSAL');
      setKeterangan('');
      setLockTeacherScheduling(true);
      setTokenRefreshInterval(15);
      setStrictBrowserGuard(true);
      setIsActive(false);
    }
  }, [event, defaultTpId, tpOptions, isOpen]);

  const toggleTingkat = (tingkat: number) => {
    setTargetTingkat((prev) => {
      if (prev.includes(tingkat)) {
        if (prev.length <= 1) {
          toast.error('Sasaran tingkat minimal harus memilih 1 angkatan!');
          return prev;
        }
        return prev.filter((t) => t !== tingkat);
      } else {
        return [...prev, tingkat].sort((a, b) => a - b);
      }
    });
  };

  const applyPreset = (preset: 'all' | '10_11' | '12' | '11') => {
    if (preset === 'all') setTargetTingkat([10, 11, 12]);
    else if (preset === '10_11') setTargetTingkat([10, 11]);
    else if (preset === '12') setTargetTingkat([12]);
    else if (preset === '11') setTargetTingkat([11]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaEvent.trim()) {
      toast.error('Nama event ujian wajib diisi!');
      return;
    }
    if (!tpId) {
      toast.error('Tahun pelajaran wajib dipilih!');
      return;
    }
    if (targetTingkat.length === 0) {
      toast.error('Pilih minimal 1 sasaran tingkat!');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<CbtEventItem> = {
        id: event?.id,
        tahun_pelajaran_id: tpId,
        nama_event: namaEvent.trim(),
        kode_event: (kodeEvent.trim() || namaEvent.trim().slice(0, 10)).toUpperCase().replace(/\s+/g, '-'),
        semester,
        target_tingkat: targetTingkat,
        tipe_pelaksanaan: tipePelaksanaan,
        keterangan: keterangan.trim(),
        lock_teacher_scheduling: lockTeacherScheduling,
        token_refresh_interval: Number(tokenRefreshInterval),
        strict_browser_guard: strictBrowserGuard,
        is_active: isActive,
      };

      const result = await cbtApi.upsertEvent(payload);
      toast.success(event ? 'Event CBT berhasil diperbarui' : 'Event CBT berhasil ditambahkan');
      onSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Failed to save CBT event:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan event CBT');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={70}
      title={
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
            <Layers size={18} />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {event ? 'Edit Sub-Pengaturan Event CBT' : 'Tambah Sub-Pengaturan Event CBT'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Konfigurasi sasaran tingkat, semester, dan proteksi orkestrasi ujian
            </p>
          </div>
        </div>
      }
      size="lg"
    >
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        {/* Induk Tahun Pelajaran */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Induk Konteks Akademik (Tahun Pelajaran) <span className="text-rose-500">*</span>
          </Label>
          <select
            value={tpId}
            onChange={(e) => setTpId(e.target.value)}
            disabled={saving || !!event}
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {tpOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} {opt.is_active ? '★ (Aktif Berjalan)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Nama & Kode Event */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nama Event Ujian <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={namaEvent}
              onChange={(e) => setNamaEvent(e.target.value)}
              placeholder="Contoh: Penilaian Sumatif Akhir Jenjang (PSAJ)"
              className="text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Kode Singkat
            </Label>
            <Input
              value={kodeEvent}
              onChange={(e) => setKodeEvent(e.target.value)}
              placeholder="PSAJ-GENAP"
              className="text-xs font-mono font-bold"
            />
          </div>
        </div>

        {/* Semester & Target Tingkat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Semester
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSemester('GANJIL')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                  semester === 'GANJIL'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                )}
              >
                Ganjil (1)
              </button>
              <button
                type="button"
                onClick={() => setSemester('GENAP')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                  semester === 'GENAP'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                )}
              >
                Genap (2)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Sasaran Tingkat Kelas <span className="text-rose-500">*</span>
              </Label>
            </div>
            {/* Multi Checkboxes */}
            <div className="grid grid-cols-3 gap-2">
              {[10, 11, 12].map((tingkat) => {
                const isSelected = targetTingkat.includes(tingkat);
                return (
                  <button
                    key={tingkat}
                    type="button"
                    onClick={() => toggleTingkat(tingkat)}
                    className={cn(
                      'px-2 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    )}
                  >
                    <span>Kelas {tingkat}</span>
                    {isSelected && <CheckCircle2 size={13} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Presets for Target Tingkat */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mr-1">
            Preset Cepat:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('all')}
            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-semibold cursor-pointer"
          >
            Semua (10, 11, 12)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('10_11')}
            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-semibold cursor-pointer"
          >
            Tingkat 10 & 11 Saja
          </button>
          <button
            type="button"
            onClick={() => applyPreset('12')}
            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-semibold cursor-pointer"
          >
            Tingkat 12 Saja (PSAJ)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('11')}
            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-semibold cursor-pointer"
          >
            Tingkat 11 Saja (ANBK)
          </button>
        </div>

        {/* Tipe Pelaksanaan: Ujian Massal vs KBM Mandiri */}
        <div className="space-y-1.5 pt-1">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Tipe Pelaksanaan Event <span className="text-rose-500">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTipePelaksanaan('MASSAL');
                setLockTeacherScheduling(true);
              }}
              className={cn(
                'p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5',
                tipePelaksanaan === 'MASSAL'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-600 ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              )}
            >
              <span
                className={cn(
                  'p-2 rounded-lg shrink-0 mt-0.5',
                  tipePelaksanaan === 'MASSAL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                )}
              >
                <Sparkles size={14} />
              </span>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  Ujian Massal (Panitia Terpusat)
                  {tipePelaksanaan === 'MASSAL' && (
                    <CheckCircle2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                  )}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Diorkestrasi panitia sekolah (PSAJ, ASAS, ASTS). Plotting ruang, sesi, dan pengawas serentak.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTipePelaksanaan('MANDIRI');
                setLockTeacherScheduling(false);
              }}
              className={cn(
                'p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5',
                tipePelaksanaan === 'MANDIRI'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              )}
            >
              <span
                className={cn(
                  'p-2 rounded-lg shrink-0 mt-0.5',
                  tipePelaksanaan === 'MANDIRI'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                )}
              >
                <UserCheck size={14} />
              </span>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  KBM Mandiri (Guru Mapel)
                  {tipePelaksanaan === 'MANDIRI' && (
                    <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                  )}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Fleksibel untuk Ulangan Harian atau Kuis Bab guru di kelasnya tanpa pengawas panitia serentak.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Policy & Security Guards */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Kebijakan & Keamanan Orkestrasi
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Lock size={13} className="text-indigo-500" />
                  Kunci Jadwal Guru Mandiri
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Guru dilarang mengedit / membuat jadwal ujian terpisah selama event aktif.
                </p>
              </div>
              <input
                type="checkbox"
                checked={lockTeacherScheduling}
                onChange={(e) => setLockTeacherScheduling(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  Strict Browser / Anti-Curang
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Blokir switch tab dan fullscreen guard saat siswa mengerjakan ujian.
                </p>
              </div>
              <input
                type="checkbox"
                checked={strictBrowserGuard}
                onChange={(e) => setStrictBrowserGuard(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock size={13} className="text-amber-500" />
                Interval Refresh Token Ujian
              </Label>
              <select
                value={tokenRefreshInterval}
                onChange={(e) => setTokenRefreshInterval(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={15}>Otomatis Berganti Tiap 15 Menit (Rekomendasi)</option>
                <option value={30}>Otomatis Berganti Tiap 30 Menit</option>
                <option value={60}>Otomatis Berganti Tiap 60 Menit</option>
                <option value={0}>Manual / Token Statis Sepanjang Sesi</option>
              </select>
            </div>

            <div className="p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-start justify-between gap-3 self-end">
              <div>
                <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-indigo-600" />
                  Jadikan Event Aktif Meja Kerja
                </p>
                <p className="text-[10px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                  Meja Kerja Panitia akan langsung menyinkronkan rombel ke event ini.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Keterangan Tambahan */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Keterangan / Catatan Panitia (Opsional)
          </Label>
          <Textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Catatan pelaksanaan, instruksi panitia, atau dispensasi rombel..."
            rows={2}
            className="text-xs"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saving ? 'Menyimpan...' : event ? 'Simpan Perubahan' : 'Buat Event Ujian'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
