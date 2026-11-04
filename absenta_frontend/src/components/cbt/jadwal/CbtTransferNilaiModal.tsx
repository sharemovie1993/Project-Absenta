import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  SearchableSelect,
  Badge,
} from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useKelasOptions } from '@/components/common';
import { useAcademicFilter } from '@/components/common/academic-filter';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian, CbtRaporSlot } from '@/types/cbt.types';
import {
  ArrowRightLeft,
  CheckCircle2,
  BookOpen,
  Calendar,
  Layers,
  Users,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CbtTransferNilaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwal: CbtJadwalUjian | null;
  defaultTpId?: string;
  defaultSemesterId?: string;
}

const RAPOR_SLOTS: Array<{
  key: CbtRaporSlot;
  shortLabel: string;
  title: string;
  desc: string;
}> = [
  {
    key: 'sumatif_1',
    shortLabel: 'SUM 1',
    title: 'Sumatif 1 (SUM 1)',
    desc: 'Ujian Harian / Lingkup Materi 1',
  },
  {
    key: 'sumatif_2',
    shortLabel: 'SUM 2',
    title: 'Sumatif 2 (SUM 2)',
    desc: 'Ujian Harian / Tengah Semester (PTS)',
  },
  {
    key: 'sumatif_3',
    shortLabel: 'SUM 3',
    title: 'Sumatif 3 (SUM 3)',
    desc: 'Ujian Harian / Lingkup Materi 3',
  },
  {
    key: 'sumatif_akhir',
    shortLabel: 'SUM AKHIR',
    title: 'Sumatif Akhir (SUM AKHIR)',
    desc: 'Penilaian Akhir Semester (SAS / UAS / PAT)',
  },
];

export const CbtTransferNilaiModal: React.FC<CbtTransferNilaiModalProps> = ({
  isOpen,
  onClose,
  jadwal,
  defaultTpId,
  defaultSemesterId,
}) => {
  const queryClient = useQueryClient();
  const { rawList: rawKelasList } = useKelasOptions();

  // Gunakan Unified Academic Filter Engine agar Tahun Pelajaran & Semester
  // selalu sinkron (cascading) dengan konteks akademik aktif di Buku Nilai e-Rapor
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableMapel: true,
    initialTpId: defaultTpId || '',
    initialSemesterId: defaultSemesterId || '',
  });

  const {
    values: { tahunPelajaranId: tpId, semesterId: semId, mapelId },
    handleTpChange,
    setSemesterId,
    handleMapelChange,
    tpOptions,
    semesterOptions: semOptions,
    mapelOptions,
    activeAcademicYear,
    activeTpYear,
    activeSemester,
  } = academicFilter;

  const [targetSlot, setTargetSlot] = useState<CbtRaporSlot>('sumatif_1');
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [roundInteger, setRoundInteger] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  // Sync defaults when modal opens with a jadwal
  useEffect(() => {
    if (isOpen && jadwal) {
      // Hanya gunakan TP dari jadwal jika TP tersebut berstatus aktif;
      // jika tidak, prioritaskan Tahun Pelajaran Aktif sekolah agar langsung tampil di Buku Nilai Guru
      const jadwalTpIsActive = Boolean((jadwal.TahunPelajaran as any)?.is_active);
      if (defaultTpId) {
        handleTpChange(defaultTpId);
      } else if (jadwalTpIsActive && jadwal.tahun_pelajaran_id) {
        handleTpChange(jadwal.tahun_pelajaran_id);
      } else if (activeAcademicYear?.id) {
        handleTpChange(activeAcademicYear.id);
      }

      if (defaultSemesterId) {
        setSemesterId(defaultSemesterId);
      } else if (jadwalTpIsActive && jadwal.semester_id) {
        setSemesterId(jadwal.semester_id);
      }

      const defaultMapel =
        jadwal.BankSoal?.mapel_id || (jadwal.BankSoal?.Mapel as any)?.id || '';
      if (defaultMapel) {
        handleMapelChange(defaultMapel);
      }

      setSelectedKelasIds(Array.isArray(jadwal.target_kelas_ids) ? jadwal.target_kelas_ids : []);

      // Prioritaskan slot yang sudah dikonfigurasi di jadwal (auto_transfer_rapor), lalu fallback ke deteksi nama sesi
      const configuredSlot = jadwal.setting_keamanan?.target_rapor_slot;
      const lower = (jadwal.nama_sesi || '').toLowerCase();
      if (configuredSlot) {
        setTargetSlot(configuredSlot);
      } else if (lower.includes('akhir') || lower.includes('sas') || lower.includes('uas') || lower.includes('pat') || lower.includes('pas')) {
        setTargetSlot('sumatif_akhir');
      } else if (lower.includes('pts') || lower.includes('sts') || lower.includes('sumatif 2') || lower.includes('uh 2')) {
        setTargetSlot('sumatif_2');
      } else if (lower.includes('sumatif 3') || lower.includes('uh 3')) {
        setTargetSlot('sumatif_3');
      } else {
        setTargetSlot('sumatif_1');
      }
    }
  }, [isOpen, jadwal, defaultTpId, defaultSemesterId, activeAcademicYear?.id]);

  // Fetch participants for preview
  const { data: pesertaList = [], isLoading: isLoadingPeserta } = useQuery({
    queryKey: cbtQueryKeys.pesertaList(jadwal?.id || ''),
    queryFn: () => (jadwal?.id ? cbtApi.getPesertaList(jadwal.id) : Promise.resolve([])),
    enabled: Boolean(isOpen && jadwal?.id),
  });

  // Available classes from target_kelas_ids + participants' classes
  const availableClasses = useMemo(() => {
    const classIds = new Set<string>(Array.isArray(jadwal?.target_kelas_ids) ? jadwal!.target_kelas_ids : []);
    pesertaList.forEach((p) => {
      const kId = p.Siswa?.Kelas?.id || (p.Siswa as any)?.kelas_id;
      if (kId) classIds.add(kId);
    });

    return rawKelasList
      .filter((k: any) => classIds.has(k.id))
      .map((k: any) => ({
        id: k.id,
        nama_kelas: k.nama_kelas || k.nama || 'Kelas',
      }));
  }, [jadwal?.target_kelas_ids, pesertaList, rawKelasList]);

  // Finished participants matching selected classes
  const finishedPeserta = useMemo(() => {
    return pesertaList.filter((p) => {
      if (p.status !== 'FINISHED') return false;
      if (selectedKelasIds.length > 0) {
        const kId = p.Siswa?.Kelas?.id || (p.Siswa as any)?.kelas_id;
        if (kId && !selectedKelasIds.includes(kId)) return false;
      }
      return true;
    });
  }, [pesertaList, selectedKelasIds]);

  const toggleKelas = (kId: string) => {
    setSelectedKelasIds((prev) =>
      prev.includes(kId) ? prev.filter((id) => id !== kId) : [...prev, kId]
    );
  };

  const effectiveTpId = tpId || activeTpYear?.id || activeAcademicYear?.id || '';
  const effectiveSemId = semId || activeSemester?.id || '';

  const transferMutation = useMutation({
    mutationFn: () => {
      if (!jadwal) throw new Error('Jadwal tidak valid');
      return cbtApi.transferToRapor(jadwal.id, {
        target_slot: targetSlot,
        tahun_pelajaran_id: effectiveTpId,
        semester_id: effectiveSemId,
        mapel_id: mapelId || undefined,
        kelas_ids: selectedKelasIds.length > 0 ? selectedKelasIds : undefined,
        overwrite_existing: overwriteExisting,
        round_integer: roundInteger,
      });
    },
    onSuccess: async (res) => {
      const slotMeta = RAPOR_SLOTS.find((s) => s.key === res.target_slot);
      toast.success(
        `Berhasil mentransfer ${res.transferred_count} nilai siswa ke kolom ${slotMeta?.shortLabel || res.target_slot} (${activeTpYear?.tahun || ''} - ${activeSemester?.nama_semester || ''})!`
      );

      // Invalidate all Rapor, Subtab Buku Nilai Guru, & CBT caches reactively
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['grades'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['teacher-progress'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['rapor-teacher-progress'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['rapor-teacher-progress-subtab'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['rapor-leger-list'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['academic-stats'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['class-subject-progress-input'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['class-subject-progress'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' }),
      ]);

      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal mentransfer nilai ke e-Rapor');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveTpId || !effectiveSemId) {
      toast.error('Pilih Tahun Pelajaran dan Semester tujuan terlebih dahulu');
      return;
    }
    if (!mapelId) {
      toast.error('Pilih Mata Pelajaran tujuan di e-Rapor');
      return;
    }
    if (finishedPeserta.length === 0) {
      toast.error('Belum ada siswa berstatus Selesai (FINISHED) untuk ditransfer pada kelas yang dipilih');
      return;
    }
    transferMutation.mutate();
  };

  if (!jadwal) return null;

  const selectedSlotMeta = RAPOR_SLOTS.find((s) => s.key === targetSlot);
  const isTargetActivePeriod = Boolean(activeTpYear?.is_active && activeSemester?.is_active);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Nilai CBT ke Lembar Input Nilai e-Rapor"
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Info Jadwal Sumber & Konteks Akademik */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 dark:from-indigo-950/40 dark:via-violet-950/30 dark:to-purple-950/40 border border-indigo-200/70 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
                Sumber CBT
              </span>
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                {jadwal.BankSoal?.Mapel?.nama_mapel || 'Mata Pelajaran'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                Token: {jadwal.token_ujian}
              </span>
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
              {jadwal.nama_sesi}
            </h4>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-800 text-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Siap Transfer</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {finishedPeserta.length} Siswa
              </span>
            </div>
          </div>
        </div>

        {/* 2. Pilih Slot Kolom Nilai di e-Rapor */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Layers size={14} className="text-indigo-600" />
            <span>Pilih Kolom / Slot Tujuan di Lembar Input Nilai e-Rapor *</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {RAPOR_SLOTS.map((slot) => {
              const active = targetSlot === slot.key;
              return (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => setTargetSlot(slot.key)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5',
                    active
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider',
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {slot.shortLabel}
                    </span>
                    {active && <CheckCircle2 size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                      {slot.title}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {slot.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Konteks Akademik Tujuan (Tahun Pelajaran, Semester, Mapel) */}
        <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600" />
              <span>Konteks Akademik Tujuan (Terhubung ke Buku Nilai e-Rapor)</span>
            </span>

            {isTargetActivePeriod ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <ShieldCheck size={12} />
                <span>Periode Akademik Aktif ({activeTpYear?.tahun} • {activeSemester?.nama_semester})</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (activeAcademicYear?.id) handleTpChange(activeAcademicYear.id);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 cursor-pointer hover:bg-amber-200"
                title="Klik untuk beralih ke Tahun Pelajaran Aktif"
              >
                <AlertCircle size={11} />
                <span>Bukan Periode Aktif — Klik untuk ke TP Aktif ({activeAcademicYear?.tahun})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Tahun Pelajaran Rapor *
              </label>
              <SearchableSelect
                options={tpOptions}
                value={effectiveTpId}
                onChange={handleTpChange}
                placeholder="Pilih Tahun Pelajaran..."
                aria-label="Tahun Pelajaran Tujuan"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Semester Rapor *
              </label>
              <SearchableSelect
                options={semOptions}
                value={effectiveSemId}
                onChange={setSemesterId}
                placeholder="Pilih Semester..."
                aria-label="Semester Tujuan"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                <BookOpen size={11} className="inline mr-1 text-indigo-600" />
                Mata Pelajaran Rapor *
              </label>
              <SearchableSelect
                options={mapelOptions}
                value={mapelId}
                onChange={handleMapelChange}
                placeholder="Pilih Mata Pelajaran..."
                aria-label="Mata Pelajaran Tujuan"
              />
            </div>
          </div>
        </div>

        {/* 4. Filter Kelas Sasaran */}
        {availableClasses.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users size={13} className="text-indigo-600" />
                <span>Filter Rombongan Belajar ({selectedKelasIds.length} dipilih)</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setSelectedKelasIds(
                    selectedKelasIds.length === availableClasses.length
                      ? []
                      : availableClasses.map((k) => k.id)
                  )
                }
                className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                {selectedKelasIds.length === availableClasses.length ? 'Reset Filter' : 'Pilih Semua Kelas'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableClasses.map((k) => {
                const checked = selectedKelasIds.includes(k.id);
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => toggleKelas(k.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                      checked
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    )}
                  >
                    {k.nama_kelas}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Opsi Pembulatan & Penimpaan */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={roundInteger}
              onChange={(e) => setRoundInteger(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Bulatkan ke Bilangan Bulat (0–100)
              </span>
              <span className="text-[11px] text-slate-500">
                Sesuai standar kolom Lembar Input Nilai e-Rapor (contoh: 66.7 → 67).
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Perbarui Nilai jika Kolom {selectedSlotMeta?.shortLabel} Sudah Terisi
              </span>
              <span className="text-[11px] text-slate-500">
                Kolom nilai lain (SUM lainnya &amp; CP) tetap aman dan tidak akan berubah.
              </span>
            </div>
          </label>
        </div>

        {/* 6. Pratinjau Peserta yang Akan Ditransfer */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>
                Pratinjau Nilai Siswa → Kolom{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {selectedSlotMeta?.shortLabel}
                </strong>
              </span>
            </span>
            <span className="text-[11px] text-slate-500">
              Hanya siswa berstatus <strong>Selesai Submit</strong> yang ditransfer
            </span>
          </div>

          <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {isLoadingPeserta ? (
              <div className="p-6 text-center text-xs text-slate-400 font-semibold">
                Memuat daftar nilai peserta ujian...
              </div>
            ) : finishedPeserta.length === 0 ? (
              <div className="p-6 text-center space-y-1">
                <AlertCircle size={20} className="mx-auto text-amber-500" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Belum ada peserta yang menyelesaikan ujian ini
                </p>
                <p className="text-[11px] text-slate-500">
                  Pastikan siswa telah mengklik Kumpulkan Ujian atau waktu ujian telah selesai.
                </p>
              </div>
            ) : (
              finishedPeserta.map((p, idx) => {
                const rawVal = Number(p.nilai_akhir ?? 0);
                const finalVal = roundInteger ? Math.round(rawVal) : Math.round(rawVal * 100) / 100;
                const studentName =
                  p.Siswa?.nama_lengkap || (p.Siswa as any)?.nama_siswa || 'Siswa';

                return (
                  <div
                    key={p.id}
                    className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 text-[11px] font-mono text-slate-400">{idx + 1}.</span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {studentName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {p.Siswa?.Kelas?.nama_kelas || '-'} • Benar: {p.jumlah_benar} / Salah: {p.jumlah_salah}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!roundInteger || rawVal === finalVal ? null : (
                        <span className="text-[11px] text-slate-400 line-through font-mono">
                          {rawVal.toFixed(1)}
                        </span>
                      )}
                      <Badge variant="primary" className="font-mono font-black text-xs px-2.5 py-0.5">
                        {finalVal}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 7. Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={transferMutation.isPending || finishedPeserta.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5"
          >
            <ArrowRightLeft size={15} />
            <span>
              {transferMutation.isPending
                ? 'Mentransfer Nilai...'
                : `Transfer ${finishedPeserta.length} Nilai ke ${selectedSlotMeta?.shortLabel}`}
            </span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
