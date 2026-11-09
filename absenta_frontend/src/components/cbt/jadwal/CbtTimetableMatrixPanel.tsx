import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui';
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Layers,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtBankSoal, CbtJadwalUjian, CbtEventItem } from '@/types/cbt.types';
import { useJenjang } from '@/hooks/useJenjang';
import { useAuthStore } from '@/store/authStore';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { resolveBankTingkatNumber } from './cbtJadwalHelper';
import {
  ExamDayConfig,
  KelasRoomMapping,
  TimetableMatrixState,
  buildMassSchedulePayloads,
  createDefaultExamDays,
  groupMappingsByTingkat,
  loadPersistedMatrixState,
  savePersistedMatrixState,
  reconstructMatrixFromExistingSchedules,
} from './cbtOrchestratorHelper';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CbtTimetableMatrixPanelProps {
  topFlightDeck?: React.ReactNode;
  bankList: CbtBankSoal[];
  roomMappings: KelasRoomMapping[];
  activeTpId?: string;
  activeSemId?: string;
  defaultTodayStr: string;
  existingSchedules?: CbtJadwalUjian[];
  onSuccessGenerate?: () => void;
  onProceedToNextPhase?: () => void;
  activeEvent?: CbtEventItem | null;
  eventName?: string;
  targetTingkat?: number[];
  subMode?: 'matrix' | 'table';
  onChangeSubMode?: (mode: 'matrix' | 'table') => void;
}

const getTingkatTheme = (tingkat: number) => {
  switch (tingkat) {
    case 10:
      return {
        badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-700',
        headerBg: 'bg-sky-50/70 dark:bg-sky-950/30 border-r border-sky-100 dark:border-sky-900/40',
        cellBg: 'bg-sky-50/20 dark:bg-sky-950/10 border-r border-sky-100/70 dark:border-sky-900/30',
        selectBorder: 'border-sky-200 dark:border-sky-800 hover:border-sky-400',
        activeSelect: 'bg-sky-50/90 text-sky-950 border-sky-400 dark:bg-sky-950/70 dark:text-sky-100 dark:border-sky-600',
        dot: 'bg-sky-500',
        rombelText: 'text-sky-700 dark:text-sky-300',
      };
    case 11:
      return {
        badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        headerBg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-r border-emerald-100 dark:border-emerald-900/40',
        cellBg: 'bg-emerald-50/20 dark:bg-emerald-950/10 border-r border-emerald-100/70 dark:border-emerald-900/30',
        selectBorder: 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400',
        activeSelect: 'bg-emerald-50/90 text-emerald-950 border-emerald-400 dark:bg-emerald-950/70 dark:text-emerald-100 dark:border-emerald-600',
        dot: 'bg-emerald-500',
        rombelText: 'text-emerald-700 dark:text-emerald-300',
      };
    case 12:
      return {
        badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        headerBg: 'bg-amber-50/70 dark:bg-amber-950/30 border-r border-amber-100 dark:border-amber-900/40',
        cellBg: 'bg-amber-50/20 dark:bg-amber-950/10 border-r border-amber-100/70 dark:border-amber-900/30',
        selectBorder: 'border-amber-200 dark:border-amber-800 hover:border-amber-400',
        activeSelect: 'bg-amber-50/90 text-amber-950 border-amber-400 dark:bg-amber-950/70 dark:text-amber-100 dark:border-amber-600',
        dot: 'bg-amber-500',
        rombelText: 'text-amber-700 dark:text-amber-300',
      };
    default:
      return {
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
        headerBg: 'bg-purple-50/70 border-r border-purple-100',
        cellBg: 'bg-purple-50/20 border-r border-purple-100/70',
        selectBorder: 'border-purple-200 hover:border-purple-400',
        activeSelect: 'bg-purple-50 text-purple-950 border-purple-400',
        dot: 'bg-purple-500',
        rombelText: 'text-purple-700',
      };
  }
};

export const CbtTimetableMatrixPanel: React.FC<CbtTimetableMatrixPanelProps> = ({
  topFlightDeck,
  bankList,
  roomMappings,
  activeTpId,
  activeSemId,
  defaultTodayStr,
  existingSchedules,
  onSuccessGenerate,
  onProceedToNextPhase,
  activeEvent,
  eventName,
  targetTingkat,
  subMode = 'matrix',
  onChangeSubMode,
}) => {
  const queryClient = useQueryClient();
  const { jenjang } = useJenjang();

  const [eventPrefix, setEventPrefix] = useState(() => activeEvent?.nama_event || eventName || 'PSAS Ganjil');
  const [generationMode, setGenerationMode] = useState<'per_rombel_ruang' | 'per_tingkat'>('per_rombel_ruang');
  const [days, setDays] = useState<ExamDayConfig[]>(() => createDefaultExamDays(defaultTodayStr, 5));
  const [matrix, setMatrix] = useState<TimetableMatrixState>({});
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const { user } = useAuthStore();
  const tenantId = user?.tenant_id || 'default';

  // 1. Muat state draft matriks yang tersimpan di localStorage (SSoT Persisten)
  useEffect(() => {
    const persisted = loadPersistedMatrixState(tenantId, activeTpId, activeSemId);
    if (persisted) {
      if (persisted.matrix && Object.keys(persisted.matrix).length > 0) {
        setMatrix(persisted.matrix);
      }
      if (persisted.days && persisted.days.length > 0) {
        setDays(persisted.days);
      }
      if (persisted.eventPrefix) {
        setEventPrefix(persisted.eventPrefix);
      }
      if (persisted.generationMode) {
        setGenerationMode(persisted.generationMode);
      }
      if (persisted.savedAt) {
        setLastSavedTime(new Date(persisted.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }
    }
  }, [tenantId, activeTpId, activeSemId]);

  // 2. Rekonstruksi & Sinkronisasi Otomatis dari Jadwal Database (Existing Published Schedules)
  useEffect(() => {
    if (existingSchedules && existingSchedules.length > 0 && bankList.length > 0) {
      const reconstructed = reconstructMatrixFromExistingSchedules(existingSchedules, days, bankList);
      if (Object.keys(reconstructed).length > 0) {
        setMatrix((prev) => {
          let hasDiff = false;
          const merged = { ...prev };
          Object.entries(reconstructed).forEach(([k, bankId]) => {
            if (!merged[k]) {
              merged[k] = bankId;
              hasDiff = true;
            }
          });
          return hasDiff ? merged : prev;
        });
      }
    }
  }, [existingSchedules, bankList, days]);

  // 3. Auto-save ke localStorage setiap kali ada perubahan pada matrix, days, prefix, atau mode
  useEffect(() => {
    if (!activeTpId) return;
    savePersistedMatrixState(
      { matrix, days, eventPrefix, generationMode },
      tenantId,
      activeTpId,
      activeSemId
    );
    setLastSavedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  }, [matrix, days, eventPrefix, generationMode, tenantId, activeTpId, activeSemId]);

  const handleResetMatrix = useCallback(() => {
    if (window.confirm('Kosongkan semua pilihan mapel pada matriks?')) {
      setMatrix({});
      savePersistedMatrixState(
        { matrix: {}, days, eventPrefix, generationMode },
        tenantId,
        activeTpId,
        activeSemId
      );
      toast.success('Pilihan mapel pada matriks berhasil dikosongkan.');
    }
  }, [days, eventPrefix, generationMode, tenantId, activeTpId, activeSemId]);

  // Grouped room mappings by tingkat
  const groupedRoomsByTingkat = useMemo(() => {
    return groupMappingsByTingkat(roomMappings);
  }, [roomMappings]);

  const activeTingkatList = useMemo(() => {
    if (targetTingkat && targetTingkat.length > 0) {
      return [...targetTingkat].sort((a, b) => a - b);
    }
    return Array.from(groupedRoomsByTingkat.keys()).sort((a, b) => a - b);
  }, [targetTingkat, groupedRoomsByTingkat]);

  // Group bank soals by tingkat
  const banksByTingkat = useMemo(() => {
    const map = new Map<number, CbtBankSoal[]>();
    bankList.forEach((b) => {
      const num = resolveBankTingkatNumber(b);
      if (num !== undefined) {
        if (!map.has(num)) map.set(num, []);
        map.get(num)!.push(b);
      }
    });
    return map;
  }, [bankList]);

  // Map bank_soal_id ke daftar sesi ujian yang sudah ada di database (untuk Idempotensi & On-Demand)
  const publishedSessionsByBankId = useMemo(() => {
    const map = new Map<string, CbtJadwalUjian[]>();
    if (!existingSchedules) return map;
    existingSchedules.forEach((j) => {
      if (j.bank_soal_id) {
        if (!map.has(j.bank_soal_id)) map.set(j.bank_soal_id, []);
        map.get(j.bank_soal_id)!.push(j);
      }
    });
    return map;
  }, [existingSchedules]);

  // Kumpulan ID bank soal yang sedang terpasang di dalam slot matriks
  const usedBankIdsInMatrix = useMemo(() => {
    const set = new Set<string>();
    Object.values(matrix).forEach((bankId) => {
      if (bankId) set.add(bankId);
    });
    return set;
  }, [matrix]);

  const handleSelectBankSoal = (dayIdx: number, sessIdx: number, tingkat: number, bankId: string) => {
    const key = `${dayIdx}_${sessIdx}_${tingkat}`;
    setMatrix((prev) => {
      if (!bankId) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: bankId };
    });
  };

  const handleUpdateDayDate = (dayIdx: number, newDate: string) => {
    setDays((prev) =>
      prev.map((d) => (d.day_index === dayIdx ? { ...d, tanggal: newDate } : d))
    );
  };

  const handleAddDay = () => {
    setDays((prev) => {
      const last = prev[prev.length - 1];
      const nextDate = last
        ? new Date(new Date(last.tanggal).getTime() + 86400000 * (new Date(last.tanggal).getDay() === 5 ? 3 : 1))
        : new Date();
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dt = String(nextDate.getDate()).padStart(2, '0');

      return [
        ...prev,
        {
          day_index: prev.length + 1,
          nama_hari: `Hari ke-${prev.length + 1}`,
          tanggal: `${y}-${m}-${dt}`,
          sessions: last?.sessions || [
            { session_index: 1, nama_sesi: 'Sesi 1', jam_mulai: '07:30', jam_selesai: '09:00', durasi_menit: 90 },
            { session_index: 2, nama_sesi: 'Sesi 2', jam_mulai: '09:30', jam_selesai: '11:00', durasi_menit: 90 },
          ],
        },
      ];
    });
  };

  const handleRemoveDay = (dayIdx: number) => {
    if (days.length <= 1) {
      toast.error('Minimal harus ada 1 hari pelaksanaan ujian');
      return;
    }
    setDays((prev) => prev.filter((d) => d.day_index !== dayIdx));
  };

  // Hitung perkiraan jadwal yang akan di-generate
  const totalSlotsFilled = useMemo(() => Object.keys(matrix).length, [matrix]);

  // Hitung jadwal baru vs jadwal yang sudah pernah diterbitkan (Idempotensi)
  const { newGeneratedCount, alreadyPublishedCount } = useMemo(() => {
    let newCount = 0;
    let publishedCount = 0;

    Object.entries(matrix).forEach(([key, bankId]) => {
      if (!bankId) return;
      const parts = key.split('_');
      const tingkat = Number(parts[2]);
      const rombelCount = generationMode === 'per_tingkat' ? 1 : (groupedRoomsByTingkat.get(tingkat)?.length || 0);

      const isPublished = (publishedSessionsByBankId.get(bankId)?.length || 0) > 0;
      if (isPublished) {
        publishedCount += rombelCount;
      } else {
        newCount += rombelCount;
      }
    });

    return { newGeneratedCount: newCount, alreadyPublishedCount: publishedCount };
  }, [matrix, generationMode, groupedRoomsByTingkat, publishedSessionsByBankId]);

  const estimatedGeneratedCount = useMemo(() => {
    return newGeneratedCount + alreadyPublishedCount;
  }, [newGeneratedCount, alreadyPublishedCount]);

  // Bulk Create Mutation (Idempoten & Aman Dipanggil Berkali-kali)
  const bulkCreateMutation = useMutation({
    mutationFn: async () => {
      if (!activeTpId || !activeSemId) {
        throw new Error('Tahun Pelajaran atau Semester aktif tidak ditemukan');
      }
      if (totalSlotsFilled === 0) {
        throw new Error('Belum ada mata pelajaran/bank soal yang dipilih di dalam matriks hari ujian');
      }

      const payloads = buildMassSchedulePayloads({
        eventPrefix,
        days,
        matrix,
        bankList,
        roomMappings,
        activeTpId,
        activeSemId,
        generationMode,
        tokenRefreshInterval: activeEvent?.token_refresh_interval ?? 15,
        strictBrowserGuard: activeEvent?.strict_browser_guard ?? true,
        eventId: activeEvent?.id,
      });

      if (payloads.length === 0) {
        throw new Error('Tidak ada jadwal ujian yang berhasil dirangkai');
      }

      return cbtApi.bulkCreateJadwal(payloads);
    },
    onSuccess: async (res) => {
      if (res?.created_count === 0 && (res?.skipped_count || 0) > 0) {
        toast.success(res.message || 'Semua jadwal yang dipilih sudah pernah diterbitkan sebelumnya (aman & idempoten).');
      } else {
        const skippedText = res?.skipped_count ? ` (${res.skipped_count} jadwal lama sudah terbit & dilewati)` : '';
        toast.success(`Berhasil menerbitkan ${res?.created_count} jadwal ujian baru!${skippedText}`);
      }
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      if (onSuccessGenerate) onSuccessGenerate();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menerbitkan jadwal ujian massal');
    },
  });

  return (
    <div className="space-y-3 w-full max-w-full min-w-0">
      {/* ── 1 RUANG SEAMLESS FLIGHT DECK + TOOLBAR ── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
        {topFlightDeck}

        {/* ── Single-Row Unified Master Filter & Action Toolbar (1 Ruang, Zero Waste Vertical) ── */}
        <div className="p-2 sm:p-2.5 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col xl:flex-row xl:items-center justify-between gap-2">
          {/* Left: Sub-mode Switcher + Mode Rangkaian + Autosave Status */}
          <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
            {/* SubMode: Matriks vs Terbit */}
            {onChangeSubMode && (
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => onChangeSubMode('matrix')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1',
                    subMode === 'matrix'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  )}
                >
                  <Sparkles size={11} />
                  <span>Matriks</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSubMode('table')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1',
                    subMode === 'table'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  )}
                >
                  <span>Daftar Sesi</span>
                </button>
              </div>
            )}

            {/* Autosave Status */}
            {lastSavedTime && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60 shrink-0">
                <CheckCircle2 size={11} />
                <span>Tersimpan ({lastSavedTime})</span>
              </span>
            )}
          </div>

          {/* Right: Actions (Tambah Hari, Kosongkan, Terbitkan, Lanjut) */}
          <div className="flex items-center gap-1.5 flex-wrap xl:flex-nowrap justify-between xl:justify-end shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDay}
              className="text-xs h-7 px-2 font-bold text-indigo-700 border-indigo-300 bg-white hover:bg-indigo-50 cursor-pointer shadow-2xs shrink-0"
              title="Tambah hari pelaksanaan ujian baru"
            >
              <Plus size={11} className="mr-1 text-indigo-600" />
              <span>Tambah Hari</span>
            </Button>

            {totalSlotsFilled > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetMatrix}
                className="text-xs h-7 px-2 font-bold text-rose-600 border-rose-200 bg-white hover:bg-rose-50 cursor-pointer shadow-2xs shrink-0"
                title="Kosongkan seluruh isian mata pelajaran di matriks"
              >
                <RotateCcw size={11} className="mr-1" />
                <span>Kosongkan</span>
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => bulkCreateMutation.mutate()}
              disabled={bulkCreateMutation.isPending || totalSlotsFilled === 0}
              className={cn(
                'text-xs h-7 px-2.5 font-bold text-white shadow-2xs cursor-pointer flex items-center gap-1 shrink-0',
                totalSlotsFilled > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              )}
            >
              <Sparkles size={11} />
              <span>
                {bulkCreateMutation.isPending ? 'Menerbitkan...' : `Terbitkan (${estimatedGeneratedCount})`}
              </span>
            </Button>

            {onProceedToNextPhase && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onProceedToNextPhase}
                className="text-xs h-7 px-2.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>Lanjut</span>
                <ArrowRight size={11} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Matriks Hari & Sesi */}
      <div className="space-y-3">
        {days.map((day) => (
          <div
            key={day.day_index}
            className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs"
          >
            {/* Header Hari */}
            <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-bold bg-indigo-50 text-indigo-700 border-indigo-200 text-xs py-0.5 px-2">
                  {day.nama_hari} (Hari {day.day_index})
                </Badge>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-semibold">Tanggal:</span>
                  <input
                    type="date"
                    value={day.tanggal}
                    onChange={(e) => handleUpdateDayDate(day.day_index, e.target.value)}
                    aria-label={`Tanggal untuk ${day.nama_hari}`}
                    className="px-2 py-0.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  {day.sessions.length} Sesi Terjadwal
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveDay(day.day_index)}
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  title="Hapus hari ujian ini"
                  aria-label="Hapus hari ujian ini"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Matrix Table Sesi x Tingkat (Pembeda Blok Warna Per Tingkat) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-3 w-40 min-w-[140px]">Sesi &amp; Jam</th>
                    {activeTingkatList.map((tingkat) => {
                      const slottedCount = Object.keys(matrix).filter(
                        (k) => k.endsWith(`_${tingkat}`) && Boolean(matrix[k])
                      ).length;
                      const totalBanks = banksByTingkat.get(tingkat)?.length || 0;
                      const theme = getTingkatTheme(tingkat);

                      return (
                        <th
                          key={tingkat}
                          className={cn('p-3 min-w-[220px] transition-colors', theme.headerBg)}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={cn('px-2 py-0.5 rounded-md font-bold text-xs border shadow-2xs flex items-center gap-1.5', theme.badgeBg)}>
                              <span className={cn('w-2 h-2 rounded-full', theme.dot)} />
                              <span>Kelas {tingkat}</span>
                            </span>
                            <span className={cn('text-[11px] font-bold', theme.rombelText)}>
                              {groupedRoomsByTingkat.get(tingkat)?.length || 0} Rombel
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] normal-case font-semibold">
                            <span
                              className={cn(
                                slottedCount >= totalBanks && totalBanks > 0
                                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                  : 'text-slate-500 dark:text-slate-400'
                              )}
                            >
                              {slottedCount}/{totalBanks} Soal Terplot
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {day.sessions.map((sess) => (
                    <tr key={sess.session_index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 align-top font-bold text-slate-900 dark:text-slate-100 bg-slate-50/30 dark:bg-slate-900/40">
                        <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                          <Clock size={13} />
                          <span>{sess.nama_sesi}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          {sess.jam_mulai} - {sess.jam_selesai}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          {sess.durasi_menit} Menit
                        </div>
                      </td>

                      {activeTingkatList.map((tingkat) => {
                        const matrixKey = `${day.day_index}_${sess.session_index}_${tingkat}`;
                        const selectedBankId = matrix[matrixKey] || '';
                        const allBanksForTingkat = banksByTingkat.get(tingkat) || [];
                        const theme = getTingkatTheme(tingkat);

                        // Filter: Jangan tampilkan bank soal yang sudah dimasukkan ke slot lain
                        const availableBanks = allBanksForTingkat.filter((b) => {
                          if (b.id === selectedBankId) return true;
                          if (usedBankIdsInMatrix.has(b.id)) return false;
                          return true;
                        });

                        const isAllPlotted =
                          !selectedBankId && availableBanks.length === 0 && allBanksForTingkat.length > 0;

                        return (
                          <td key={tingkat} className={cn('p-2.5 align-top transition-colors', theme.cellBg)}>
                            <select
                              value={selectedBankId}
                              onChange={(e) =>
                                handleSelectBankSoal(day.day_index, sess.session_index, tingkat, e.target.value)
                              }
                              aria-label={`Bank Soal ${day.nama_hari} ${sess.nama_sesi} Tingkat ${tingkat}`}
                              disabled={isAllPlotted}
                              className={cn(
                                'w-full px-2.5 py-1.5 text-xs rounded-xl border font-bold transition-all cursor-pointer shadow-2xs',
                                selectedBankId
                                  ? theme.activeSelect
                                  : isAllPlotted
                                  ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                  : cn('bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300', theme.selectBorder)
                              )}
                            >
                              <option value="">
                                {isAllPlotted
                                  ? '— Semua Soal Sudah Terplot —'
                                  : '— Belum Dijadwalkan —'}
                              </option>
                              {availableBanks.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.Mapel?.nama_mapel || b.MataPelajaran?.nama_mapel || b.judul} (
                                  {b.jumlah_soal || b._count?.Soal || 0} Soal)
                                </option>
                              ))}
                            </select>

                            {selectedBankId && (
                              <div className="mt-1 flex items-center justify-between text-[10px]">
                                {(publishedSessionsByBankId.get(selectedBankId)?.length || 0) > 0 ? (
                                  <>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/80">
                                      <CheckCircle2 size={11} /> Terbit ({publishedSessionsByBankId.get(selectedBankId)?.length} Ruang)
                                    </span>
                                    <span className="text-emerald-600 dark:text-emerald-400 text-[9px] font-semibold">Idempoten ✓</span>
                                  </>
                                ) : (
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200/60">
                                    Siap Terbit (Baru)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddDay}
            className="text-xs h-9 px-3 font-bold border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 cursor-pointer"
          >
            <Plus size={14} className="mr-1" />
            <span>Tambah Hari Ujian</span>
          </Button>

          <div className="text-xs text-slate-600 dark:text-slate-300">
            {newGeneratedCount > 0 ? (
              <span>
                <strong className="text-indigo-600 dark:text-indigo-400 font-black">{newGeneratedCount}</strong> jadwal baru siap diterbitkan
                {alreadyPublishedCount > 0 && (
                  <span className="text-emerald-700 dark:text-emerald-400 ml-1 font-semibold">
                    ({alreadyPublishedCount} jadwal lama sudah terbit &amp; aman dilewati)
                  </span>
                )}
              </span>
            ) : alreadyPublishedCount > 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={14} /> Seluruh {alreadyPublishedCount} jadwal di matriks sudah aktif diterbitkan (Aman &amp; Idempoten)
              </span>
            ) : (
              <span>Pilih mata pelajaran pada slot matriks di atas untuk memulai</span>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={totalSlotsFilled === 0 || newGeneratedCount === 0 || bulkCreateMutation.isPending}
          onClick={() => bulkCreateMutation.mutate()}
          className={cn(
            'text-xs h-9 px-5 font-bold shadow-2xs transition-all cursor-pointer',
            newGeneratedCount === 0 && alreadyPublishedCount > 0
              ? 'bg-emerald-600 text-white opacity-90 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          )}
        >
          {bulkCreateMutation.isPending ? (
            'Menerbitkan...'
          ) : newGeneratedCount > 0 ? (
            <>
              <Sparkles size={14} className="mr-1.5" />
              <span>Terbitkan {newGeneratedCount} Jadwal Baru</span>
            </>
          ) : alreadyPublishedCount > 0 ? (
            <>
              <CheckCircle2 size={14} className="mr-1.5" />
              <span>Semua Jadwal Sudah Terbit (Idempoten)</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="mr-1.5" />
              <span>Terbitkan 0 Jadwal</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
