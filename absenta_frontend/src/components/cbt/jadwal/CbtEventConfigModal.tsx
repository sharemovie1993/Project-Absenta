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
  const [nonKbmExtraTingkat, setNonKbmExtraTingkat] = useState<number[]>([]);
  const [suspendKbmDuringExam, setSuspendKbmDuringExam] = useState(true);
  const [tipePelaksanaan, setTipePelaksanaan] = useState<'MASSAL' | 'MANDIRI'>('MASSAL');
  const [keterangan, setKeterangan] = useState('');
  const [lockTeacherScheduling, setLockTeacherScheduling] = useState(true);
  const [tokenRefreshInterval, setTokenRefreshInterval] = useState(0);
  const [strictBrowserGuard, setStrictBrowserGuard] = useState(true);
  const [enableProctor, setEnableProctor] = useState(false);
  const [tokenless, setTokenless] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTpId(event.tahun_pelajaran_id);
      setNamaEvent(event.nama_event);
      setKodeEvent(event.kode_event);
      setSemester(event.semester || 'GANJIL');
      setTargetTingkat(event.target_tingkat || [10, 11, 12]);
      setNonKbmExtraTingkat(Array.isArray(event.non_kbm_extra_tingkat) ? event.non_kbm_extra_tingkat.map(Number) : []);
      setSuspendKbmDuringExam(event.suspend_kbm_during_exam !== false);
      setTipePelaksanaan(event.tipe_pelaksanaan || (event.lock_teacher_scheduling === false ? 'MANDIRI' : 'MASSAL'));
      setKeterangan(event.keterangan || '');
      setLockTeacherScheduling(event.lock_teacher_scheduling ?? true);
      setTokenRefreshInterval(event.token_refresh_interval ?? 0);
      setStrictBrowserGuard(event.strict_browser_guard ?? true);
      setEnableProctor(event.enable_proctor ?? false);
      setTokenless(event.tokenless ?? false);
      setCustomToken(event.custom_token || '');
      setIsActive(event.is_active ?? false);
    } else {
      setTpId(defaultTpId || (tpOptions.find((t) => t.is_active)?.value || tpOptions[0]?.value || ''));
      setNamaEvent('');
      setKodeEvent('');
      setSemester('GANJIL');
      setTargetTingkat([10, 11, 12]);
      setNonKbmExtraTingkat([]);
      setSuspendKbmDuringExam(true);
      setTipePelaksanaan('MASSAL');
      setKeterangan('');
      setLockTeacherScheduling(true);
      setTokenRefreshInterval(0);
      setStrictBrowserGuard(true);
      setEnableProctor(false);
      setTokenless(false);
      setCustomToken('');
      setIsActive(false);
    }
  }, [event, defaultTpId, tpOptions, isOpen]);

  const toggleTingkat = (tingkat: number) => {
    setTargetTingkat((prev) => {
      let next: number[];
      if (prev.includes(tingkat)) {
        if (prev.length <= 1) {
          toast.error('Sasaran tingkat minimal harus memilih 1 angkatan!');
          return prev;
        }
        next = prev.filter((t) => t !== tingkat);
      } else {
        next = [...prev, tingkat].sort((a, b) => a - b);
      }
      setNonKbmExtraTingkat((extra) => extra.filter((t) => !next.includes(t)));
      return next;
    });
  };

  const applyPreset = (preset: 'all' | '10_11' | '12' | '11') => {
    const next =
      preset === 'all'
        ? [10, 11, 12]
        : preset === '10_11'
        ? [10, 11]
        : preset === '12'
        ? [12]
        : [11];
    setTargetTingkat(next);
    setNonKbmExtraTingkat((prev) => prev.filter((t) => !next.includes(t)));
  };

  const toggleExtraNonKbmTingkat = (tingkat: number) => {
    setNonKbmExtraTingkat((prev) =>
      prev.includes(tingkat) ? prev.filter((t) => t !== tingkat) : [...prev, tingkat].sort((a, b) => a - b)
    );
  };

  const unselectedTingkats = [10, 11, 12].filter((t) => !targetTingkat.includes(t));

  const applyEventTemplate = (
    nama: string,
    kode: string,
    sem: 'GANJIL' | 'GENAP',
    tingkat: number[]
  ) => {
    setNamaEvent(nama);
    setKodeEvent(kode);
    setSemester(sem);
    setTargetTingkat(tingkat);
    setNonKbmExtraTingkat((prev) => prev.filter((t) => !tingkat.includes(t)));
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
        non_kbm_extra_tingkat:
          tipePelaksanaan === 'MASSAL' && suspendKbmDuringExam
            ? nonKbmExtraTingkat.filter((t) => !targetTingkat.includes(t))
            : [],
        suspend_kbm_during_exam: tipePelaksanaan === 'MASSAL' ? suspendKbmDuringExam : false,
        tipe_pelaksanaan: tipePelaksanaan,
        keterangan: keterangan.trim(),
        lock_teacher_scheduling: lockTeacherScheduling,
        token_refresh_interval: Number(tokenRefreshInterval),
        strict_browser_guard: strictBrowserGuard,
        enable_proctor: enableProctor,
        tokenless,
        custom_token: !tokenless && customToken.trim() ? customToken.trim().toUpperCase() : null,
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

        {/* Preset Standar SSOT Kurikulum / Asesmen */}
        <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>🎯</span>
              <span>Template Standar Ujian (SSOT)</span>
            </span>
            <span className="text-[10px] text-slate-500">Klik untuk auto-fill nama & kode</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {[
              { label: 'PSAS Ganjil', nama: 'Penilaian Sumatif Akhir Semester (PSAS) Ganjil', kode: 'PSAS-GANJIL', sem: 'GANJIL' as const, tingkat: [10, 11, 12] },
              { label: 'PSAT Genap', nama: 'Penilaian Sumatif Akhir Tahun (PSAT) Genap', kode: 'PSAT-GENAP', sem: 'GENAP' as const, tingkat: [10, 11] },
              { label: 'PSTS Ganjil', nama: 'Penilaian Sumatif Tengah Semester (PSTS) Ganjil', kode: 'PSTS-GANJIL', sem: 'GANJIL' as const, tingkat: [10, 11, 12] },
              { label: 'PSTS Genap', nama: 'Penilaian Sumatif Tengah Semester (PSTS) Genap', kode: 'PSTS-GENAP', sem: 'GENAP' as const, tingkat: [10, 11, 12] },
              { label: 'PSAJ (Kls XII)', nama: 'Penilaian Sumatif Akhir Jenjang (PSAJ)', kode: 'PSAJ', sem: 'GENAP' as const, tingkat: [12] },
              { label: 'UKK', nama: 'Uji Kompetensi Keahlian (UKK)', kode: 'UKK', sem: 'GENAP' as const, tingkat: [12] },
            ].map((tmpl) => (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => applyEventTemplate(tmpl.nama, tmpl.kode, tmpl.sem, tmpl.tingkat)}
                className={cn(
                  'text-[10.5px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer',
                  namaEvent === tmpl.nama
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                )}
              >
                {tmpl.label}
              </button>
            ))}
          </div>
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

        {/* Integrasi Otomatis Agenda Non-KBM & Tawaran Tingkat Non-Peserta */}
        {tipePelaksanaan === 'MASSAL' && (
          <div className="p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                  Otomatis Masuk Agenda Non-KBM Saat Hari Ujian
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-snug">
                  Sembunyikan kartu KBM reguler &amp; bebaskan guru dari alpa selama tanggal hari ujian CBT berlangsung (otomatis berakhir saat jadwal ujian selesai).
                </span>
              </div>
              <Switch checked={suspendKbmDuringExam} onCheckedChange={setSuspendKbmDuringExam} />
            </div>

            {suspendKbmDuringExam && unselectedTingkats.length > 0 && (
              <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50 space-y-1.5">
                <span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 block">
                  Kelas {unselectedTingkats.join(' & ')} tidak ikut ujian ini — ikut bebaskan KBM regulernya selama hari ujian?
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {unselectedTingkats.map((t) => {
                    const checked = nonKbmExtraTingkat.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleExtraNonKbmTingkat(t)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer',
                          checked
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                        )}
                      >
                        <span>Ikut Non-KBM Kelas {t}</span>
                        {checked && <CheckCircle2 size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

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

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <UserCheck size={13} className="text-indigo-500" />
                  Gunakan Proktor / Pengawas 2
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Bawaan nonaktif (hanya Pengawas 1). Aktifkan jika ruangan butuh penugasan Proktor atau Pengawas ke-2.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableProctor}
                onChange={(e) => setEnableProctor(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
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
                <option value={0}>Manual / Token Statis Sepanjang Sesi (Default)</option>
                <option value={15}>Otomatis Berganti Tiap 15 Menit</option>
                <option value={30}>Otomatis Berganti Tiap 30 Menit</option>
                <option value={60}>Otomatis Berganti Tiap 60 Menit</option>
              </select>
            </div>

            <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start justify-between gap-3 self-end">
              <div>
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Bebas Token (Tokenless / Simulasi)
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Siswa langsung masuk ujian tanpa perlu mengetik token dari pengawas.
                </p>
              </div>
              <input
                type="checkbox"
                checked={tokenless}
                onChange={(e) => setTokenless(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
              />
            </div>

            {!tokenless && (
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock size={13} className="text-indigo-500" />
                  Token Khusus Seragam — Semua Ruang Sama (Opsional)
                </Label>
                <Input
                  value={customToken}
                  onChange={(e) =>
                    setCustomToken(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))
                  }
                  placeholder="Kosongkan untuk token acak tiap ruang, atau isi misal: SIMULASI"
                  className="text-xs font-mono font-bold tracking-wider uppercase rounded-xl"
                  maxLength={10}
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Cocok untuk simulasi di lapangan: seluruh ruang & sesi dalam event ini akan memakai token yang sama persis.
                </p>
              </div>
            )}

            <div className="sm:col-span-2 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-start justify-between gap-3">
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
