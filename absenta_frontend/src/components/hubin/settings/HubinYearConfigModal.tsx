import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Save,
  CheckCircle2,
  Sparkles,
  X,
  RotateCcw,
  Camera,
  FileCheck,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Button, Input } from '@/components/ui';
import { hubinApi } from '@/api/hubin.api';
import { cn } from '@/lib/utils';
import type { HubinSettingSummaryRow } from './HubinSettingsRekapTable';
import { CYCLE_OPTIONS } from './HubinSiklusRekapTable';

const sertifikatSettingsSchema = z.object({
  nomorSurat: z.string().min(3, 'Nomor surat minimal 3 karakter'),
  tempatTerbit: z.string().min(2, 'Tempat terbit minimal 2 karakter'),
  durasiJp: z.string().min(1, 'Durasi JP wajib diisi'),
});

export interface HubinYearConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearRow: HubinSettingSummaryRow | null;
  onSuccess?: () => void;
}

export const HubinYearConfigModal: React.FC<HubinYearConfigModalProps> = React.memo(({
  isOpen,
  onClose,
  yearRow,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [modalTab, setModalTab] = useState<'sertifikat' | 'siklus'>('sertifikat');

  const [nomorSurat, setNomorSurat] = useState('');
  const [tempatTerbit, setTempatTerbit] = useState('Purwakarta');
  const [tanggalTerbit, setTanggalTerbit] = useState('');
  const [durasiJp, setDurasiJp] = useState('792');
  const [penandatanganNama, setPenandatanganNama] = useState('');
  const [penandatanganNip, setPenandatanganNip] = useState('');

  const [cycleMode, setCycleMode] = useState<'THREE_CYCLE' | 'FOUR_CYCLE' | 'CUSTOM'>('THREE_CYCLE');
  const [cycleTarget, setCycleTarget] = useState<number>(3);
  const [requirePhoto, setRequirePhoto] = useState<boolean>(true);
  const [requireSignature, setRequireSignature] = useState<boolean>(true);
  const [requireJournal, setRequireJournal] = useState<boolean>(true);

  useEffect(() => {
    if (yearRow && isOpen) {
      setNomorSurat(yearRow.nomorSuratSertifikat || '425.1/0630/SMKN1PLD-KCD Wil.IV');
      setTempatTerbit(yearRow.tempatTerbit || 'Purwakarta');
      setTanggalTerbit(yearRow.tanggalTerbitSertifikat || '');
      setDurasiJp(String(yearRow.durasiJp || '792'));
      setPenandatanganNama(yearRow.penandatanganNama || '');
      setPenandatanganNip(yearRow.penandatanganNip || '');

      const m = yearRow.visitCycleMode || 'THREE_CYCLE';
      setCycleMode(m);
      setCycleTarget(yearRow.visitCycleTarget || (m === 'FOUR_CYCLE' ? 4 : 3));
      setRequirePhoto(yearRow.visitRequirePhoto !== false);
      setRequireSignature(yearRow.visitRequireSignature !== false);
      setRequireJournal(yearRow.visitRequireJournal !== false);
      setModalTab('sertifikat');
    }
  }, [yearRow, isOpen]);

  const handleSelectCycleMode = (m: 'THREE_CYCLE' | 'FOUR_CYCLE' | 'CUSTOM') => {
    setCycleMode(m);
    if (m === 'THREE_CYCLE') setCycleTarget(3);
    else if (m === 'FOUR_CYCLE') setCycleTarget(4);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: any) => hubinApi.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-settings-summary'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      toast.success(`Pengaturan slot ${yearRow?.tahun_ajaran} berhasil disimpan!`);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan pengaturan Hubin');
    },
  });

  const handleSave = useCallback(() => {
    if (!yearRow) return;

    const parseResult = sertifikatSettingsSchema.safeParse({
      nomorSurat: nomorSurat.trim(),
      tempatTerbit: tempatTerbit.trim(),
      durasiJp: durasiJp.trim(),
    });

    if (!parseResult.success) {
      toast.error(parseResult.error.errors[0]?.message || 'Data sertifikat tidak valid');
      setModalTab('sertifikat');
      return;
    }

    if (cycleTarget < 1) {
      toast.error('Target kunjungan minimal 1 kali per industri');
      setModalTab('siklus');
      return;
    }

    saveMutation.mutate({
      tahun_pelajaran_id: yearRow.tahun_pelajaran_id,
      nomorSuratSertifikat: nomorSurat.trim(),
      tempatTerbit: tempatTerbit.trim(),
      tanggalTerbitSertifikat: tanggalTerbit.trim(),
      durasiJp: durasiJp.trim(),
      penandatanganNama: penandatanganNama.trim(),
      penandatanganNip: penandatanganNip.trim(),
      visitCycleMode: cycleMode,
      visitCycleTarget: Number(cycleTarget),
      visitRequirePhoto: requirePhoto,
      visitRequireSignature: requireSignature,
      visitRequireJournal: requireJournal,
    });
  }, [
    yearRow,
    nomorSurat,
    tempatTerbit,
    tanggalTerbit,
    durasiJp,
    penandatanganNama,
    penandatanganNip,
    cycleMode,
    cycleTarget,
    requirePhoto,
    requireSignature,
    requireJournal,
    saveMutation,
  ]);

  const formattedPreviewDate = useMemo(() => {
    if (!tanggalTerbit) return 'Tanggal belum diatur';
    try {
      const d = new Date(tanggalTerbit);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return tanggalTerbit;
    }
  }, [tanggalTerbit]);

  if (!isOpen || !yearRow) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" className="p-0 overflow-hidden rounded-2xl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="text-indigo-600 dark:text-indigo-400" size={18} />
              Konfigurasi Slot Angkatan — {yearRow.tahun_ajaran}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Slot referensi resmi nomor surat TU, titimangsa sertifikat, dan pola siklus kunjungan industri.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Modal Sub-Tab Selector */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setModalTab('sertifikat')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              modalTab === 'sertifikat' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <FileText size={14} />
            <span>1. Nomor Surat & Sertifikat</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('siklus')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              modalTab === 'siklus' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <RotateCcw size={14} />
            <span>2. Pola Siklus Kunjungan Industri</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {modalTab === 'sertifikat' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Kolom Kiri: Form Input */}
              <div className="lg:col-span-7 space-y-3.5">
                <div className="bg-slate-50/70 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <Sparkles size={15} className="text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Data Referensi Sertifikat Resmi (Source of Truth)
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Nomor Surat Sertifikat Resmi dari TU (1 Angkatan) <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={nomorSurat}
                      onChange={(e) => setNomorSurat(e.target.value)}
                      placeholder="Contoh: 425.1/0630/SMKN1PLD-KCD Wil.IV"
                      className="font-mono text-xs rounded-xl"
                    />
                    <p className="text-[10.5px] text-slate-400 mt-1">
                      Nomor surat Buku Agenda Surat Keluar TU, berlaku otomatis untuk seluruh sertifikat siswa di TP ini.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Tempat / Kota Penerbitan <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={tempatTerbit}
                        onChange={(e) => setTempatTerbit(e.target.value)}
                        placeholder="Purwakarta"
                        className="text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Tanggal Terbit Resmi Sertifikat <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={tanggalTerbit}
                        onChange={(e) => setTanggalTerbit(e.target.value)}
                        className="text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Total Jam Pelajaran (Durasi JP PKL) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={durasiJp}
                        onChange={(e) => setDurasiJp(e.target.value)}
                        placeholder="792"
                        className="text-xs rounded-xl pr-20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                        Jam Pelajaran (JP)
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Pejabat Penandatangan Sertifikat
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Nama Kepala Sekolah / Pejabat
                        </label>
                        <Input
                          type="text"
                          value={penandatanganNama}
                          onChange={(e) => setPenandatanganNama(e.target.value)}
                          placeholder="Wahyu Demo, M.Pd"
                          className="text-xs rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          NIP Pejabat Penandatangan
                        </label>
                        <Input
                          type="text"
                          value={penandatanganNip}
                          onChange={(e) => setPenandatanganNip(e.target.value)}
                          placeholder="198801292010011128"
                          className="text-xs rounded-xl font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Live Preview Card */}
              <div className="lg:col-span-5 space-y-3">
                <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 space-y-3.5">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles size={14} />
                    <span>Pratinjau Kop &amp; Nomor Surat</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                      Sertifikat Praktik Kerja Lapangan
                    </span>
                    <div className="text-sm font-mono font-bold text-amber-300 bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/20 break-all">
                      Nomor : {nomorSurat || '(belum di set)'}
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      {tempatTerbit || 'Purwakarta'}, {formattedPreviewDate}
                    </div>
                    <div className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold">
                      Durasi Resmi: {durasiJp || 792} Jam Pelajaran
                    </div>
                    {penandatanganNama && (
                      <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <span className="block font-bold text-white">{penandatanganNama}</span>
                        <span>NIP. {penandatanganNip || '-'}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>Otomatis diterapkan ke seluruh sertifikat siswa pada tahun ajaran ini.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>Tersimpan permanen sebagai arsip resmi di database sekolah.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: POLA SIKLUS KUNJUNGAN INDUSTRI */
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-start gap-2">
                <RotateCcw size={15} className="text-indigo-600 mt-0.5 shrink-0" />
                <p className="text-xs text-indigo-950 dark:text-indigo-200">
                  Tentukan pola siklus monitoring untuk angkatan <span className="font-bold">TP {yearRow.tahun_ajaran}</span> sebagai standar penerbitan SPPD dan berita acara kunjungan guru pembimbing.
                </p>
              </div>

              {/* 1. Pilih Pola Siklus */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pola Standar Siklus Kunjungan:
                </label>
                <div className="space-y-2">
                  {CYCLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => handleSelectCycleMode(opt.mode)}
                      className={cn(
                        'w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5',
                        cycleMode === opt.mode
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <div className={cn(
                        'w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center shrink-0',
                        cycleMode === opt.mode ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      )}>
                        {cycleMode === opt.mode && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{opt.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Target Kunjungan */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Frekuensi Kunjungan per Pembimbing:
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={cycleTarget}
                    onChange={(e) => setCycleTarget(Number(e.target.value) || 1)}
                    className="w-24 font-bold text-center text-xs"
                  />
                  <span className="text-xs font-bold text-slate-500">Kali Kunjungan / Periode PKL</span>
                </div>
              </div>

              {/* 3. Instrumen Validasi Wajib */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Instrumen Bukti Wajib:
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={requirePhoto}
                      onChange={(e) => setRequirePhoto(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <Camera size={15} className="text-blue-500 shrink-0" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Wajib Foto Bersama Pembimbing Industri (Geotagging GPS Real-Time)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={requireSignature}
                      onChange={(e) => setRequireSignature(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <FileCheck size={15} className="text-emerald-500 shrink-0" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Wajib Tanda Tangan Elektronik / Foto Lembar TTD & Cap DUDI
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={requireJournal}
                      onChange={(e) => setRequireJournal(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <BookOpen size={15} className="text-amber-500 shrink-0" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Wajib Checklist Verifikasi Jurnal PKL Siswa di Tempat
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-2.5 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-[11px] text-slate-400">
            {modalTab === 'sertifikat' ? 'Bagian 1: Sertifikat' : 'Bagian 2: Siklus Kunjungan'}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs font-bold rounded-xl h-9">
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="text-xs font-bold rounded-xl h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <Save size={14} />
              <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan Slot'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
});

HubinYearConfigModal.displayName = 'HubinYearConfigModal';
export default HubinYearConfigModal;
