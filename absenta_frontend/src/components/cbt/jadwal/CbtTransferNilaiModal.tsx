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
  CheckCircle2,
  BookOpen,
  Calendar,
  Layers,
  Users,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  CheckSquare,
  Square,
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
    key: 'sumatif_4',
    shortLabel: 'SUM 4',
    title: 'Sumatif 4 (SUM 4)',
    desc: 'Ujian Harian / Lingkup Materi 4 (atau Unit 4 Kolaborasi)',
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
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [excludeZeroScores, setExcludeZeroScores] = useState<boolean>(true);
  const [roundInteger, setRoundInteger] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(true);

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

      // Prioritaskan slot yang sudah dikonfigurasi di jadwal (auto_transfer_rapor), lalu fallback ke deteksi nama sesi
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
    queryKey: ['rapor-nilai-existing', effectiveTpId, effectiveSemId, mapelId, selectedKelasIds],
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
        rawScore: remAudit.raw_remedial_score ?? remAudit.raw_score ?? null,
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
    let regulerCount = 0;
    let tuntasCount = 0;
    let naikCount = 0;
    let tetapCount = 0;
    let baruCount = 0;
    let zeroCount = 0;

    finishedPeserta.forEach((p) => {
      const rawVal = Number(p.nilai_akhir ?? 0);
      const finalVal = roundInteger ? Math.round(rawVal) : Math.round(rawVal * 100) / 100;
      const { isSusulan, isRemedial } = resolveParticipantType(p);

      if (isSusulan) susulanCount++;
      else if (isRemedial) remedialCount++;
      else regulerCount++;

      if (finalVal >= 75) tuntasCount++;
      if (finalVal === 0) zeroCount++;

      const existVal = existingGradesMap.get(p.siswa_id);
      if (existVal === null || existVal === undefined) {
        baruCount++;
      } else if (finalVal > existVal) {
        naikCount++;
      } else {
        tetapCount++;
      }
    });

    return {
      total: finishedPeserta.length,
      tuntasCount,
      belumTuntasCount: finishedPeserta.length - tuntasCount,
      susulanCount,
      remedialCount,
      regulerCount,
      naikCount,
      tetapCount,
      baruCount,
      zeroCount,
    };
  }, [finishedPeserta, roundInteger, existingGradesMap, resolveParticipantType]);

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
        queryClient.invalidateQueries({ queryKey: ['rapor-nilai-existing'], exact: false, refetchType: 'all' }),
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
    if (selectedSiswaIds.length === 0) {
      toast.error('Pilih minimal 1 siswa yang akan ditransfer nilainya ke e-Rapor');
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
      size="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Info Jadwal Sumber & Konteks Akademik */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Dipilih / Total</span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                {selectedSiswaIds.length} <span className="text-xs text-slate-400 font-semibold">/ {finishedPeserta.length}</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {RAPOR_SLOTS.map((slot) => {
              const active = targetSlot === slot.key;
              return (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => setTargetSlot(slot.key)}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1',
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
                      {slot.shortLabel}
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

        {/* 3. Konteks Akademik Tujuan (Tahun Pelajaran, Semester, Mapel) */}
        <div className="p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600" />
              <span>Konteks Akademik Tujuan (Terhubung ke Buku Nilai e-Rapor)</span>
            </span>

            {isTargetActivePeriod ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <ShieldCheck size={12} />
                <span>Periode Aktif ({activeTpYear?.tahun} • {activeSemester?.nama_semester})</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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

        {/* 4. Filter Rombongan Belajar */}
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
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
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

        {/* 5. Opsi Pembulatan, Penimpaan, & Proteksi Nilai 0 */}
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
                Bulatkan Bilangan Bulat
              </span>
              <span className="text-[11px] text-slate-500">
                Sesuai standar input e-Rapor (misal: 66.7 → 67).
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
                Perbarui Nilai jika Sudah Terisi
              </span>
              <span className="text-[11px] text-slate-500">
                Timpa kolom {selectedSlotMeta?.shortLabel} dengan skor terbaru.
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
                Lewati Siswa Nilai 0
              </span>
              <span className="text-[11px] text-slate-500">
                Proteksi agar lembar rapor tidak terisi skor 0 kosong.
              </span>
            </div>
          </label>
        </div>

        {/* 6. Quick Stats Summary Bar */}
        <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Ringkasan Sesi:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
              {stats.total} Peserta Selesai
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
              {stats.tuntasCount} Tuntas KKTP
            </span>
            {stats.susulanCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold">
                {stats.susulanCount} Susulan
              </span>
            )}
            {stats.remedialCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                {stats.remedialCount} Remedial
              </span>
            )}
            {stats.zeroCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold">
                {stats.zeroCount} Nilai 0
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
            >
              {selectedSiswaIds.length === finishedPeserta.length ? (
                <>
                  <Square size={12} />
                  <span>Batalkan Semua</span>
                </>
              ) : (
                <>
                  <CheckSquare size={12} />
                  <span>Pilih Semua ({finishedPeserta.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 7. Pratinjau Nilai Siswa (Visual Diff: Rapor Eksisting ➔ CBT Baru) */}
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
              {isLoadingExisting ? 'Memuat nilai rapor saat ini...' : `Terpilih ${selectedSiswaIds.length} dari ${finishedPeserta.length} siswa`}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
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
                  (p.Siswa as any)?.nama_siswa || p.Siswa?.nama_lengkap || 'Siswa';
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

                return (
                  <div
                    key={p.id}
                    onClick={() => toggleSelectSiswa(p.siswa_id)}
                    className={cn(
                      'px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer select-none',
                      isSelected
                        ? 'bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-800/40'
                        : 'bg-slate-50/50 hover:bg-slate-100/60 dark:bg-slate-950/40 opacity-60'
                    )}
                  >
                    {/* Kiri: Checkbox, Urutan, Nama, Kelas, Badge Tipe Sesi */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectSiswa(p.siswa_id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="w-5 text-[11px] font-mono text-slate-400 shrink-0">{idx + 1}.</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                            {studentName}
                          </p>

                          {/* PENANDA KHUSUS: SUSULAN VS REMEDIAL */}
                          {isSusulan && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                              <span>✨ Susulan (Murni)</span>
                            </span>
                          )}
                          {isRemedial && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0"
                              title={initialScore !== null ? `Nilai Awal Sesi Utama: ${initialScore}` : undefined}
                            >
                              <span>🔄 Remedial (Max KKTP)</span>
                              {initialScore !== null && (
                                <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400 font-semibold">
                                  (Awal: {initialScore})
                                </span>
                              )}
                            </span>
                          )}
                          {isZero && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 shrink-0">
                              Belum Mengerjakan (0)
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {p.Siswa?.Kelas?.nama_kelas || '-'} • Benar: {p.jumlah_benar} / Salah: {p.jumlah_salah}
                        </p>
                      </div>
                    </div>

                    {/* Kanan: Diff View (Rapor Eksisting ➔ CBT Baru) */}
                    <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Kolom 1: Nilai Rapor Saat Ini */}
                      <div className="text-right">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Rapor Eksisting
                        </span>
                        <span
                          className={cn(
                            'font-mono text-xs font-bold',
                            hasExisting
                              ? 'text-slate-600 dark:text-slate-300'
                              : 'text-slate-400 italic text-[11px]'
                          )}
                        >
                          {hasExisting ? existingVal : '— (Kosong)'}
                        </span>
                      </div>

                      {/* Panah Indikator Transformasi */}
                      <ArrowRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />

                      {/* Kolom 2: Nilai Baru CBT */}
                      <div className="text-right">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Nilai CBT
                        </span>
                        <div className="flex items-center gap-1 justify-end">
                          <span
                            className={cn(
                              'inline-block px-2.5 py-0.5 rounded-lg font-mono font-black text-xs border shadow-2xs',
                              scoreBadgeClass
                            )}
                          >
                            {finalVal}
                          </span>
                          {isImproved && (
                            <TrendingUp size={12} className="text-emerald-500 shrink-0" title="Nilai meningkat dibanding rapor saat ini" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 8. Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
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
      </form>
    </Modal>
  );
};
