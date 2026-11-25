import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  Button,
  SearchableSelect,
} from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useKelasOptions } from '@/components/common';
import { useAcademicFilter } from '@/components/common/academic-filter';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { raporApi } from '@/api/rapor.api';
import type { CbtJadwalUjian, CbtRaporSlot } from '@/types/cbt.types';
import {
  ArrowRightLeft,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  CheckSquare,
  Square,
  Layers,
  Calendar,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
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
    title: 'Sumatif 1',
    desc: 'Ujian Harian / Lingkup Materi 1',
  },
  {
    key: 'sumatif_2',
    shortLabel: 'SUM 2',
    title: 'Sumatif 2',
    desc: 'Ujian Harian / Tengah Semester (PTS)',
  },
  {
    key: 'sumatif_3',
    shortLabel: 'SUM 3',
    title: 'Sumatif 3',
    desc: 'Ujian Harian / Lingkup Materi 3',
  },
  {
    key: 'sumatif_4',
    shortLabel: 'SUM 4',
    title: 'Sumatif 4',
    desc: 'Ujian Harian / Lingkup Materi 4',
  },
  {
    key: 'sumatif_akhir',
    shortLabel: 'SUM AKHIR',
    title: 'Sumatif Akhir',
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

  // ── WIZARD STEP: 1 = KONFIGURASI TARGET, 2 = TABEL DAFTAR NILAI ──
  const [step, setStep] = useState<1 | 2>(1);

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

  const [targetSlot, setTargetSlot] = useState<CbtRaporSlot>('sumatif_akhir');
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [excludeZeroScores, setExcludeZeroScores] = useState<boolean>(true);
  const [roundInteger, setRoundInteger] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  // Reset to Step 1 whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  // Sync defaults when modal opens with a jadwal
  useEffect(() => {
    if (isOpen && jadwal) {
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

      // Auto-detect target slot from configured security setting or session name
      const configuredSlot = jadwal.setting_keamanan?.target_rapor_slot;
      const lower = (jadwal.nama_sesi || '').toLowerCase();
      if (configuredSlot) {
        setTargetSlot(configuredSlot);
      } else if (
        lower.includes('akhir') ||
        lower.includes('sas') ||
        lower.includes('uas') ||
        lower.includes('pat') ||
        lower.includes('pas') ||
        lower.includes('psas') ||
        lower.includes('psaj') ||
        lower.includes('kelulusan') ||
        lower.includes('ujian sekolah')
      ) {
        setTargetSlot('sumatif_akhir');
      } else if (lower.includes('pts') || lower.includes('sts') || lower.includes('sumatif 2') || lower.includes('uh 2')) {
        setTargetSlot('sumatif_2');
      } else if (lower.includes('sumatif 3') || lower.includes('uh 3')) {
        setTargetSlot('sumatif_3');
      } else if (lower.includes('sumatif 4') || lower.includes('uh 4')) {
        setTargetSlot('sumatif_4');
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

  const effectiveTpId = tpId || activeTpYear?.id || activeAcademicYear?.id || '';
  const effectiveSemId = semId || activeSemester?.id || '';

  // ── FETCH NILAI EKSISTING DI E-RAPOR (VISUAL DIFF BEFORE ➔ AFTER) ──
  const { data: existingGradesRes = [], isLoading: isLoadingExisting } = useQuery({
    queryKey: ['rapor-nilai-existing', effectiveTpId, effectiveSemId, mapelId],
    queryFn: async () => {
      if (!effectiveTpId || !effectiveSemId || !mapelId) return [];
      try {
        const res = await raporApi.getNilai({
          tahun_pelajaran_id: effectiveTpId,
          semester_id: effectiveSemId,
          mapel_id: mapelId,
        });
        return (res?.data || res || []) as any[];
      } catch {
        return [];
      }
    },
    enabled: Boolean(isOpen && effectiveTpId && effectiveSemId && mapelId),
    staleTime: 15000,
  });

  const existingGradesMap = useMemo(() => {
    const map = new Map<string, number | null>();
    if (!Array.isArray(existingGradesRes)) return map;

    existingGradesRes.forEach((item: any) => {
      if (!item?.siswa_id) return;
      let val: number | null = null;
      if (targetSlot === 'sumatif_1') val = item.sumatif_1 ?? null;
      else if (targetSlot === 'sumatif_2') val = item.sumatif_2 ?? null;
      else if (targetSlot === 'sumatif_3') val = item.sumatif_3 ?? null;
      else if (targetSlot === 'sumatif_4') val = item.sumatif_4 ?? null;
      else if (targetSlot === 'sumatif_akhir') val = item.nilai_akhir_sumatif ?? null;

      map.set(item.siswa_id, val);
    });

    return map;
  }, [existingGradesRes, targetSlot]);

  // ── RESOLUSI KLASIFIKASI PESERTA (SUSULAN VS REMEDIAL VS REGULER) ──
  const resolveParticipantType = useCallback(
    (p: any) => {
      const pMeta = (p.metadata_perangkat as any) || {};
      const remAudit = pMeta.remedial_audit || {};
      const isSusulan = Boolean(
        remAudit.is_susulan ||
        remAudit.tipe_peserta === 'SUSULAN' ||
        p.tipe_peserta === 'SUSULAN' ||
        ((jadwal?.nama_sesi || '').toUpperCase().includes('SUSULAN') && !remAudit.is_remedial)
      );
      const isRemedial =
        !isSusulan &&
        Boolean(
          remAudit.is_remedial ||
          remAudit.tipe_peserta === 'REMEDIAL' ||
          p.tipe_peserta === 'REMEDIAL' ||
          jadwal?.is_remedial ||
          (jadwal?.nama_sesi || '').toUpperCase().includes('[REMEDIAL')
        );

      return {
        isSusulan,
        isRemedial,
        initialScore: remAudit.initial_score ?? null,
      };
    },
    [jadwal]
  );

  // Auto-initialize selected student IDs when finishedPeserta or excludeZeroScores changes
  useEffect(() => {
    const ids = finishedPeserta
      .filter((p) => {
        if (excludeZeroScores && Number(p.nilai_akhir ?? 0) === 0) return false;
        return true;
      })
      .map((p) => p.siswa_id);
    setSelectedSiswaIds(ids);
  }, [finishedPeserta, excludeZeroScores]);

  const toggleKelas = (kId: string) => {
    setSelectedKelasIds((prev) =>
      prev.includes(kId) ? prev.filter((id) => id !== kId) : [...prev, kId]
    );
  };

  const toggleSelectSiswa = (siswaId: string) => {
    setSelectedSiswaIds((prev) =>
      prev.includes(siswaId) ? prev.filter((id) => id !== siswaId) : [...prev, siswaId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSiswaIds.length === finishedPeserta.length) {
      setSelectedSiswaIds([]);
    } else {
      setSelectedSiswaIds(finishedPeserta.map((p) => p.siswa_id));
    }
  };

  // ── QUICK STATS SUMMARY ──
  const stats = useMemo(() => {
    let susulanCount = 0;
    let remedialCount = 0;
    let zeroCount = 0;

    finishedPeserta.forEach((p) => {
      const rawVal = Number(p.nilai_akhir ?? 0);
      const finalVal = roundInteger ? Math.round(rawVal) : Math.round(rawVal * 100) / 100;
      const { isSusulan, isRemedial } = resolveParticipantType(p);

      if (isSusulan) susulanCount++;
      else if (isRemedial) remedialCount++;

      if (finalVal === 0) zeroCount++;
    });

    return {
      total: finishedPeserta.length,
      susulanCount,
      remedialCount,
      zeroCount,
    };
  }, [finishedPeserta, roundInteger, resolveParticipantType]);

  const selectedMapelName = useMemo(() => {
    const found = mapelOptions.find((m) => m.value === mapelId);
    return found?.label || jadwal?.BankSoal?.Mapel?.nama_mapel || 'Mata Pelajaran';
  }, [mapelOptions, mapelId, jadwal]);

  const isTargetActivePeriod = Boolean(activeTpYear?.is_active && activeSemester?.is_active);

  const transferMutation = useMutation({
    mutationFn: () => {
      if (!jadwal) throw new Error('Jadwal tidak valid');
      return cbtApi.transferToRapor(jadwal.id, {
        target_slot: targetSlot,
        tahun_pelajaran_id: effectiveTpId,
        semester_id: effectiveSemId,
        mapel_id: mapelId || undefined,
        kelas_ids: selectedKelasIds.length > 0 ? selectedKelasIds : undefined,
        siswa_ids: selectedSiswaIds.length > 0 ? selectedSiswaIds : undefined,
        overwrite_existing: overwriteExisting,
        round_integer: roundInteger,
      });
    },
    onSuccess: async (res) => {
      const slotMeta = RAPOR_SLOTS.find((s) => s.key === res.target_slot);
      toast.success(
        `Berhasil mentransfer ${res.transferred_count} nilai siswa ke kolom ${slotMeta?.shortLabel || res.target_slot} e-Rapor!`
      );

      // Invalidate relevant caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['grades'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['teacher-progress'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['rapor-teacher-progress'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['academic-stats'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['rapor-nilai-existing'], exact: false, refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' }),
      ]);

      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal mentransfer nilai ke e-Rapor');
    },
  });

  const handleNextToStep2 = () => {
    if (!effectiveTpId || !effectiveSemId) {
      toast.error('Pilih Tahun Pelajaran dan Semester tujuan terlebih dahulu');
      return;
    }
    if (!mapelId) {
      toast.error('Pilih Mata Pelajaran tujuan di e-Rapor');
      return;
    }
    if (finishedPeserta.length === 0) {
      toast.error('Belum ada siswa berstatus Selesai (FINISHED) untuk ditransfer');
      return;
    }
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSiswaIds.length === 0) {
      toast.error('Pilih minimal 1 siswa yang akan ditransfer nilainya ke e-Rapor');
      return;
    }
    transferMutation.mutate();
  };

  if (!jadwal) return null;

  const selectedSlotMeta = RAPOR_SLOTS.find((s) => s.key === targetSlot);
  const classNamesText = availableClasses.map((k) => k.nama_kelas).join(', ') || '-';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 1 ? 'Transfer Nilai CBT: Konfigurasi Target' : 'Transfer Nilai CBT: Pratinjau Nilai Siswa'}
      size={step === 1 ? '2xl' : '4xl'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── STEPPER WIZARD INDICATOR (2 STEPS) ── */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {/* Step 1 Pill */}
            <div
              onClick={() => setStep(1)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer',
                step === 1
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              )}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              <span>Konfigurasi Target</span>
              {step === 2 && <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />}
            </div>

            <ArrowRight size={13} className="text-slate-300 dark:text-slate-600" />

            {/* Step 2 Pill */}
            <div
              onClick={() => {
                if (finishedPeserta.length > 0 && effectiveTpId && effectiveSemId && mapelId) {
                  setStep(2);
                }
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all',
                step === 2
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
              <span>Pratinjau Nilai Siswa</span>
            </div>
          </div>

          <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[200px] hidden sm:inline">
            {jadwal.nama_sesi}
          </span>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            STEP 1: MENENTUKAN MAU DIKIRIM KE KOLOM NILAI APA & KONTEKS RAPOR
           ════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">
            {/* 1. Pilih Kolom Nilai Rapor Tujuan */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-600" />
                <span>Pilih Kolom / Slot Nilai Tujuan di e-Rapor *</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {RAPOR_SLOTS.map((slot) => {
                  const active = targetSlot === slot.key;
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => setTargetSlot(slot.key)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1',
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
                        {active && <CheckCircle2 size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {slot.title}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {slot.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Konteks Akademik Rapor (Tahun Pelajaran, Semester, Mata Pelajaran) */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600" />
                  <span>Konteks Akademik e-Rapor Tujuan</span>
                </span>

                {isTargetActivePeriod && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck size={12} />
                    <span>Periode Aktif ({activeTpYear?.tahun} • {activeSemester?.nama_semester})</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Tahun Pelajaran *
                  </label>
                  <SearchableSelect
                    options={tpOptions}
                    value={effectiveTpId}
                    onChange={handleTpChange}
                    placeholder="Pilih TP..."
                    aria-label="Tahun Pelajaran Tujuan"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Semester *
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
                    Mata Pelajaran *
                  </label>
                  <SearchableSelect
                    options={mapelOptions}
                    value={mapelId}
                    onChange={handleMapelChange}
                    placeholder="Pilih Mapel..."
                    aria-label="Mata Pelajaran Tujuan"
                  />
                </div>
              </div>

              {/* Filter Rombel jika jadwal mencakup > 1 rombel */}
              {availableClasses.length > 1 && (
                <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0">Filter Kelas:</span>
                  <div className="flex flex-wrap gap-1">
                    {availableClasses.map((k) => {
                      const checked = selectedKelasIds.includes(k.id);
                      return (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => toggleKelas(k.id)}
                          className={cn(
                            'px-2.5 py-0.5 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                            checked
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          )}
                        >
                          {k.nama_kelas}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Aturan Nilai & Opsi Proteksi */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roundInteger}
                  onChange={(e) => setRoundInteger(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Bulatkan ke Bilangan Bulat
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Sesuai format lembar input e-Rapor (contoh: 66.7 → 67).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Timpa Nilai jika Sudah Terisi
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Perbarui kolom {selectedSlotMeta?.shortLabel} dengan nilai CBT terbaru.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeZeroScores}
                  onChange={(e) => setExcludeZeroScores(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Lewati Siswa Bernilai 0
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Proteksi agar rapor tidak tertimpa 0 bagi yang belum mengerjakan.
                  </span>
                </div>
              </label>
            </div>

            {/* Footer Step 1 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium">
                {finishedPeserta.length} peserta telah menyelesaikan ujian ini
              </span>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNextToStep2}
                  disabled={finishedPeserta.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5"
                >
                  <span>Lanjut ke Pratinjau Nilai</span>
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 2: TABEL DAFTAR NILAI SISWA DENGAN KOLOM NILAI EXISTING
           ════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-3">
            {/* Header Ringkas Target Pengiriman */}
            <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-600 text-white">
                  Target: {selectedSlotMeta?.shortLabel}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedMapelName}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {activeTpYear?.tahun || 'TP Aktif'} ({activeSemester?.nama_semester || 'Semester'})
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 dark:text-slate-400">
                  Kelas: {classNamesText}
                </span>
              </div>

              {/* Quick Status Pill */}
              <div className="flex items-center gap-1.5 text-[10px]">
                {stats.susulanCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200">
                    ✨ {stats.susulanCount} Susulan
                  </span>
                )}
                {stats.remedialCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200">
                    🔄 {stats.remedialCount} Remedial
                  </span>
                )}
                {stats.zeroCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200">
                    {stats.zeroCount} Nilai 0 (Dilewati)
                  </span>
                )}
              </div>
            </div>

            {/* TABEL PRATINJAU DAFTAR NILAI (TRUE TABULAR GRID, ZERO REDUNDANCY) */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
              <div className="max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 select-none">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="cursor-pointer text-slate-500 hover:text-indigo-600 inline-flex items-center justify-center"
                          title="Pilih / Batalkan Semua"
                        >
                          {selectedSiswaIds.length === finishedPeserta.length && finishedPeserta.length > 0 ? (
                            <CheckSquare size={15} className="text-indigo-600" />
                          ) : (
                            <Square size={15} className="text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-2 w-10 text-center font-mono text-[11px] text-slate-400">
                        No
                      </th>
                      <th className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                        Nama Siswa
                      </th>
                      <th className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                        Status Sesi
                      </th>
                      <th className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        Akurasi (B/S)
                      </th>
                      <th className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">
                        Nilai Eksisting Rapor
                      </th>
                      <th className="py-2.5 px-2 text-center text-slate-400 w-8">
                        ➔
                      </th>
                      <th className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">
                        Nilai Baru CBT
                      </th>
                      <th className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {isLoadingPeserta ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold">
                          Memuat data peserta ujian...
                        </td>
                      </tr>
                    ) : finishedPeserta.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 space-y-1">
                          <AlertCircle size={20} className="mx-auto text-amber-500" />
                          <p className="font-bold text-slate-700 dark:text-slate-300">Belum ada siswa yang selesai ujian</p>
                        </td>
                      </tr>
                    ) : (
                      finishedPeserta.map((p, idx) => {
                        const rawVal = Number(p.nilai_akhir ?? 0);
                        const finalVal = roundInteger ? Math.round(rawVal) : Math.round(rawVal * 100) / 100;
                        const studentName = (p.Siswa as any)?.nama_siswa || p.Siswa?.nama_lengkap || 'Siswa';
                        const { isSusulan, isRemedial, initialScore } = resolveParticipantType(p);
                        const existingVal = existingGradesMap.get(p.siswa_id);
                        const hasExisting = existingVal !== null && existingVal !== undefined;
                        const isSelected = selectedSiswaIds.includes(p.siswa_id);
                        const isZero = finalVal === 0;

                        // Semantic badge style for CBT score
                        const scoreBadgeClass = isZero
                          ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          : finalVal >= 75
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';

                        const isImproved = hasExisting && finalVal > existingVal;
                        const isUnchanged = hasExisting && finalVal === existingVal;

                        return (
                          <tr
                            key={p.id}
                            onClick={() => toggleSelectSiswa(p.siswa_id)}
                            className={cn(
                              'transition-colors cursor-pointer select-none',
                              isSelected
                                ? 'bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-800/40'
                                : 'bg-slate-50/50 hover:bg-slate-100/60 dark:bg-slate-950/40 opacity-50'
                            )}
                          >
                            {/* Checkbox */}
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectSiswa(p.siswa_id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>

                            {/* No */}
                            <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-400">
                              {idx + 1}
                            </td>

                            {/* Nama Siswa & Kelas */}
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {studentName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {p.Siswa?.Kelas?.nama_kelas || classNamesText}
                              </p>
                            </td>

                            {/* Status Sesi (Susulan / Remedial / Reguler) */}
                            <td className="py-2.5 px-3">
                              {isSusulan ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  ✨ Susulan (Murni)
                                </span>
                              ) : isRemedial ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  title={initialScore !== null ? `Nilai Awal Sesi Utama: ${initialScore}` : undefined}
                                >
                                  <span>🔄 Remedial</span>
                                  {initialScore !== null && (
                                    <span className="text-[9px] text-emerald-600 font-semibold">
                                      (Awal: {initialScore})
                                    </span>
                                  )}
                                  {(p.metadata_perangkat as any)?.remedial_audit?.raw_remedial_score !== undefined && (
                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
                                      (Murni: {Number((p.metadata_perangkat as any).remedial_audit.raw_remedial_score).toFixed(1)})
                                    </span>
                                  )}
                                </span>
                              ) : isZero ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                                  0 Soal
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Reguler</span>
                              )}
                            </td>

                            {/* Akurasi Benar / Salah */}
                            <td className="py-2.5 px-3 text-center text-[11px] font-medium text-slate-600 dark:text-slate-400">
                              <span className="text-emerald-600 font-semibold">{p.jumlah_benar}</span>
                              <span className="text-slate-300 mx-1">/</span>
                              <span className="text-rose-500 font-semibold">{p.jumlah_salah}</span>
                            </td>

                            {/* Kolom Nilai Eksisting Rapor */}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-600 dark:text-slate-300">
                              {hasExisting ? (
                                <span>{existingVal}</span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px] font-normal">— (Kosong)</span>
                              )}
                            </td>

                            {/* Panah Transformasi */}
                            <td className="py-2.5 px-2 text-center text-slate-300 dark:text-slate-600">
                              <ArrowRight size={13} className="mx-auto" />
                            </td>

                            {/* Kolom Nilai Baru CBT */}
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={cn(
                                  'inline-block px-2.5 py-0.5 rounded-lg font-mono font-black text-xs border shadow-2xs',
                                  scoreBadgeClass
                                )}
                              >
                                {finalVal}
                              </span>
                            </td>

                            {/* Kolom Keterangan / Diff Status */}
                            <td className="py-2.5 px-3 text-center">
                              {isImproved ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                  <TrendingUp size={11} />
                                  <span>+{Math.round((finalVal - (existingVal || 0)) * 10) / 10}</span>
                                </span>
                              ) : isUnchanged ? (
                                <span className="text-slate-400 font-medium text-[11px]">Tetap</span>
                              ) : !hasExisting ? (
                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">Baru</span>
                              ) : isZero ? (
                                <span className="text-rose-500 font-semibold text-[11px]">Dilewati</span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Step 2 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                <ArrowLeft size={13} />
                <span>Kembali ke Konfigurasi</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={transferMutation.isPending || selectedSiswaIds.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5"
                >
                  <ArrowRightLeft size={15} />
                  <span>
                    {transferMutation.isPending
                      ? 'Mentransfer Nilai...'
                      : `Transfer ${selectedSiswaIds.length} Nilai ke ${selectedSlotMeta?.shortLabel}`}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
