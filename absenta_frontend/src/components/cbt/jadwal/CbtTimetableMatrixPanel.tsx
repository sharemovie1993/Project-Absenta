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
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtBankSoal, CbtJadwalUjian } from '@/types/cbt.types';
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
  bankList: CbtBankSoal[];
  roomMappings: KelasRoomMapping[];
  activeTpId?: string;
  activeSemId?: string;
  defaultTodayStr: string;
  existingSchedules?: CbtJadwalUjian[];
  onSuccessGenerate?: () => void;
}

export const CbtTimetableMatrixPanel: React.FC<CbtTimetableMatrixPanelProps> = ({
  bankList,
  roomMappings,
  activeTpId,
  activeSemId,
  defaultTodayStr,
  existingSchedules,
  onSuccessGenerate,
}) => {
  const queryClient = useQueryClient();
  const { jenjang } = useJenjang();

  const [eventPrefix, setEventPrefix] = useState('PSAS Ganjil');
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
    return Array.from(groupedRoomsByTingkat.keys()).sort((a, b) => a - b);
  }, [groupedRoomsByTingkat]);

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
    <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs space-y-5">
      {/* Header & Nomenklatur Selector */}
      <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              <span>Matriks Ploting Mapel ke Hari &amp; Sesi Ujian Massal</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Petakan mata pelajaran per sesi waktu untuk seluruh tingkat secara serentak (Senin: Sesi 1 PKN, Sesi 2 PAI, dll).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Mode Rangkaian:</span>
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setGenerationMode('per_rombel_ruang')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer',
                  generationMode === 'per_rombel_ruang'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
                title="Menghasilkan jadwal spesifik untuk setiap kelas dan slot ruang (R.01 s/d R.n) agar Berita Acara & Pengawas per ruang valid"
              >
                Per Rombel &amp; Ruang (R.01-R.n)
              </button>
              <button
                type="button"
                onClick={() => setGenerationMode('per_tingkat')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer',
                  generationMode === 'per_tingkat'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
                title="1 Jadwal Ujian Terpadu untuk seluruh rombel di tingkat tersebut"
              >
                Per Tingkat Terpadu
              </button>
            </div>
          </div>
        </div>

        {/* Nomenklatur Preset & Status Simpan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">Event:</span>
            {[
              'PSAS Ganjil',
              'PSAT Genap',
              'PSTS Ganjil',
              'PSTS Genap',
              'PSAJ (Kelulusan)',
              'Asesmen Madrasah (AM)',
              'UKK Teori Kejuruan',
            ].map((nom) => (
              <button
                key={nom}
                type="button"
                onClick={() => setEventPrefix(nom)}
                className={cn(
                  'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                  eventPrefix === nom
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                )}
              >
                {nom}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            {lastSavedTime && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={12} />
                <span>Tersimpan Otomatis ({lastSavedTime})</span>
              </span>
            )}

            {totalSlotsFilled > 0 && (
              <button
                type="button"
                onClick={handleResetMatrix}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                title="Kosongkan seluruh isian mata pelajaran di matriks"
              >
                <RotateCcw size={11} />
                <span>Kosongkan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Matriks Hari & Sesi */}
      <div className="space-y-4">
        {days.map((day) => (
          <div
            key={day.day_index}
            className="border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs"
          >
            {/* Header Hari */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-bold bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
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

            {/* Matrix Table Sesi x Tingkat */}
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

                      return (
                        <th key={tingkat} className="p-3 min-w-[220px]">
                          Tingkat {formatTingkatRomawi(tingkat)} (Kelas {tingkat})
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] normal-case font-semibold">
                            <span className="text-indigo-600 dark:text-indigo-400">
                              {groupedRoomsByTingkat.get(tingkat)?.length || 0} Rombel
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">&bull;</span>
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
                      <td className="p-3 align-top font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                          <Clock size={13} />
                          <span>{sess.nama_sesi}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {sess.jam_mulai} - {sess.jam_selesai}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          Durasi: {sess.durasi_menit} Menit
                        </div>
                      </td>

                      {activeTingkatList.map((tingkat) => {
                        const matrixKey = `${day.day_index}_${sess.session_index}_${tingkat}`;
                        const selectedBankId = matrix[matrixKey] || '';
                        const allBanksForTingkat = banksByTingkat.get(tingkat) || [];

                        // Filter: Jangan tampilkan bank soal yang sudah dimasukkan ke slot lain
                        const availableBanks = allBanksForTingkat.filter((b) => {
                          if (b.id === selectedBankId) return true;
                          if (usedBankIdsInMatrix.has(b.id)) return false;
                          return true;
                        });

                        const isAllPlotted =
                          !selectedBankId && availableBanks.length === 0 && allBanksForTingkat.length > 0;

                        return (
                          <td key={tingkat} className="p-2.5 align-top">
                            <select
                              value={selectedBankId}
                              onChange={(e) =>
                                handleSelectBankSoal(day.day_index, sess.session_index, tingkat, e.target.value)
                              }
                              aria-label={`Bank Soal ${day.nama_hari} ${sess.nama_sesi} Tingkat ${tingkat}`}
                              disabled={isAllPlotted}
                              className={cn(
                                'w-full px-2.5 py-1.5 text-xs rounded-xl border font-semibold transition-all cursor-pointer',
                                selectedBankId
                                  ? 'bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-700'
                                  : isAllPlotted
                                  ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700'
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
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                      <CheckCircle2 size={11} /> Sudah Terbit ({publishedSessionsByBankId.get(selectedBankId)?.length} Ruang)
                                    </span>
                                    <span className="text-emerald-600 dark:text-emerald-400 text-[9px] font-semibold">Idempoten ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                                      <Sparkles size={11} /> Siap Diterbitkan
                                    </span>
                                    <span className="text-slate-500 font-medium">
                                      {groupedRoomsByTingkat.get(tingkat)?.length || 0} Ruang
                                    </span>
                                  </>
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
    </Card>
  );
};
