import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  History,
  X,
  CheckCircle2,
  Loader2,
  BookOpen,
  DoorOpen,
  Users,
  Calendar,
  ArrowRight,
  Search,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtBankSoal, CbtEventItem } from '@/types/cbt.types';
import { useTahunPelajaranOptions, useSemesterOptions } from '@/components/common';
import { cn } from '@/lib/utils';

export type CbtRolloverMode = 'bank-soal' | 'event-config';

export interface CbtRolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: CbtRolloverMode;
  targetEvent?: CbtEventItem | null;
  targetTpId?: string;
  targetSemId?: string;
  guruId?: string;
  onSuccess?: () => void;
}

export const CbtRolloverModal: React.FC<CbtRolloverModalProps> = ({
  isOpen,
  onClose,
  mode,
  targetEvent,
  targetTpId,
  targetSemId,
  guruId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { rawList: tpList = [] } = useTahunPelajaranOptions();
  const { rawList: semList = [] } = useSemesterOptions();

  const { data: eventsRes } = useQuery({
    queryKey: ['cbt-events-summary-rollover'],
    queryFn: () => cbtApi.getEventsSummary(),
    enabled: isOpen,
  });

  const allEvents: CbtEventItem[] = eventsRes?.events || [];
  const sourceEvents = useMemo(
    () => allEvents.filter((e) => e.id !== targetEvent?.id),
    [allEvents, targetEvent?.id]
  );

  const [sourceType, setSourceType] = useState<'event' | 'tp'>('event');
  const [sourceEventId, setSourceEventId] = useState<string>('');
  const [sourceTpId, setSourceTpId] = useState<string>('');
  const [sourceSemId, setSourceSemId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());
  const [keepStatus, setKeepStatus] = useState(true);

  // Event config rollover options
  const [includeRoomMappings, setIncludeRoomMappings] = useState(true);
  const [includePengawasCandidates, setIncludePengawasCandidates] = useState(true);
  const [includeDaysConfig, setIncludeDaysConfig] = useState(false);
  const [includeBankSoal, setIncludeBankSoal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (sourceEvents.length > 0 && !sourceEventId) {
      setSourceEventId(sourceEvents[0].id);
    } else if (sourceEvents.length === 0 && mode === 'bank-soal') {
      setSourceType('tp');
    }
    if (tpList.length > 0 && !sourceTpId) {
      const nonTarget = tpList.find((tp) => tp.id !== targetTpId);
      setSourceTpId(nonTarget?.id || tpList[0].id);
    }
    setSelectedBankIds(new Set());
    setSearchTerm('');
  }, [isOpen, sourceEvents, tpList, targetTpId, mode]);

  // Query source banks when in bank-soal mode
  const sourceBankParams = useMemo(() => {
    if (sourceType === 'event' && sourceEventId) {
      return {
        limit: 500,
        event_id: sourceEventId,
        ...(guruId ? { guru_id: guruId } : {}),
      };
    }
    return {
      limit: 500,
      ...(sourceTpId ? { tahun_pelajaran_id: sourceTpId } : {}),
      ...(sourceSemId ? { semester_id: sourceSemId } : {}),
      ...(guruId ? { guru_id: guruId } : {}),
    };
  }, [sourceType, sourceEventId, sourceTpId, sourceSemId, guruId]);

  const { data: sourceBanksRes, isLoading: isLoadingSourceBanks } = useQuery({
    queryKey: ['cbt-rollover-source-banks', sourceBankParams],
    queryFn: () => cbtApi.getBankSoalList(sourceBankParams),
    enabled:
      isOpen &&
      mode === 'bank-soal' &&
      ((sourceType === 'event' && Boolean(sourceEventId)) ||
        (sourceType === 'tp' && Boolean(sourceTpId))),
  });

  const sourceBanks: CbtBankSoal[] = useMemo(() => {
    const items = sourceBanksRes?.items || [];
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter(
      (b) =>
        b.judul.toLowerCase().includes(q) ||
        b.kode_bank.toLowerCase().includes(q) ||
        (b.Mapel?.nama_mapel || '').toLowerCase().includes(q) ||
        (b.Guru?.nama_guru || '').toLowerCase().includes(q)
    );
  }, [sourceBanksRes, searchTerm]);

  const allSelected =
    sourceBanks.length > 0 && sourceBanks.every((b) => selectedBankIds.has(b.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedBankIds(new Set());
    } else {
      setSelectedBankIds(new Set(sourceBanks.map((b) => b.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedBankIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rolloverBankMutation = useMutation({
    mutationFn: () => {
      if (!targetEvent?.id) {
        throw new Error('Belum ada Event CBT aktif untuk tujuan rollover.');
      }
      return cbtApi.rolloverBankSoal({
        bank_soal_ids: Array.from(selectedBankIds),
        target_event_id: targetEvent.id,
        target_tahun_pelajaran_id: targetTpId,
        target_semester_id: targetSemId,
        ...(guruId ? { guru_id: guruId } : {}),
        keep_status: keepStatus,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all });
      toast.success(
        `Berhasil rollover ${res.created_count} bank soal` +
          (res.skipped_count > 0 ? ` (${res.skipped_count} dilewati karena sudah ada)` : '')
      );
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal melakukan rollover bank soal');
    },
  });

  const rolloverEventMutation = useMutation({
    mutationFn: () => {
      if (!targetEvent?.id) {
        throw new Error('Belum ada Event CBT aktif untuk tujuan rollover.');
      }
      if (!sourceEventId) {
        throw new Error('Pilih event sumber terlebih dahulu.');
      }
      return cbtApi.rolloverEvent({
        source_event_id: sourceEventId,
        target_event_id: targetEvent.id,
        include_room_mappings: includeRoomMappings,
        include_pengawas_candidates: includePengawasCandidates,
        include_days_config: includeDaysConfig,
        include_bank_soal: includeBankSoal,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['cbt-events-summary'] });
      const bankInfo = res?.bank_rollover
        ? ` + ${res.bank_rollover.created_count} bank soal`
        : '';
      toast.success(`Rollover konfigurasi event${bankInfo} berhasil diterapkan!`);
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal melakukan rollover event');
    },
  });

  if (!isOpen) return null;

  const tpMap = new Map(tpList.map((tp) => [tp.id, tp.tahun]));
  const isSubmitting = rolloverBankMutation.isPending || rolloverEventMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 to-white dark:from-indigo-950/40 dark:to-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <History size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                {mode === 'bank-soal'
                  ? 'Rollover Bank Soal CBT'
                  : 'Rollover Konfigurasi Event & Ruang'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Target:{' '}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {targetEvent?.nama_event || 'Belum ada event aktif'}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {!targetEvent?.id && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>
                Belum ada Event CBT aktif pada Tahun Pelajaran/Semester ini. Buat & aktifkan Event
                CBT terlebih dahulu agar data rollover bisa ditampung.
              </span>
            </div>
          )}

          {mode === 'bank-soal' ? (
            <>
              {/* Source mode switch */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSourceType('event')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                    sourceType === 'event'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  )}
                >
                  Dari Event Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('tp')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                    sourceType === 'tp'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  )}
                >
                  Dari Tahun Pelajaran / Semester
                </button>
              </div>

              {sourceType === 'event' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pilih Event Sumber
                  </label>
                  <select
                    value={sourceEventId}
                    onChange={(e) => {
                      setSourceEventId(e.target.value);
                      setSelectedBankIds(new Set());
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {sourceEvents.length === 0 ? (
                      <option value="">Tidak ada event sumber lain</option>
                    ) : (
                      sourceEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.nama_event} ({tpMap.get(ev.tahun_pelajaran_id || '') || 'TP'} •{' '}
                          {ev.semester})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tahun Pelajaran Sumber
                    </label>
                    <select
                      value={sourceTpId}
                      onChange={(e) => {
                        setSourceTpId(e.target.value);
                        setSelectedBankIds(new Set());
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      {tpList.map((tp) => (
                        <option key={tp.id} value={tp.id}>
                          {tp.tahun}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Semester Sumber (Opsional)
                    </label>
                    <select
                      value={sourceSemId}
                      onChange={(e) => {
                        setSourceSemId(e.target.value);
                        setSelectedBankIds(new Set());
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      <option value="">Semua Semester</option>
                      {semList
                        .filter((s: any) => !sourceTpId || s.tahun_pelajaran_id === sourceTpId)
                        .map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.nama_semester || s.nama}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Search & Select All */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari judul, kode bank, mapel, atau guru..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleAll}
                  disabled={sourceBanks.length === 0}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  {allSelected ? 'Batal Pilih Semua' : `Pilih Semua (${sourceBanks.length})`}
                </button>
              </div>

              {/* Bank List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                {isLoadingSourceBanks ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Memuat daftar bank soal sumber...
                  </div>
                ) : sourceBanks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tidak ada bank soal ditemukan pada sumber terpilih.
                  </div>
                ) : (
                  sourceBanks.map((bank) => {
                    const checked = selectedBankIds.has(bank.id);
                    const totalSoal = bank.jumlah_soal || bank._count?.Soal || 0;
                    return (
                      <label
                        key={bank.id}
                        className={cn(
                          'flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors',
                          checked && 'bg-indigo-50/50 dark:bg-indigo-950/20'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(bank.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {bank.judul}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                              {bank.kode_bank}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                              Tingkat {bank.tingkat}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{bank.Mapel?.nama_mapel || '-'}</span>
                            <span>•</span>
                            <span>{bank.Guru?.nama_guru || '-'}</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {totalSoal} Butir Soal
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepStatus}
                  onChange={(e) => setKeepStatus(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Pertahankan status terbit (`PUBLISHED`) jika naskah sumber sudah siap</span>
              </label>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tarik Konfigurasi dari Event Sumber
                </label>
                <select
                  value={sourceEventId}
                  onChange={(e) => setSourceEventId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  {sourceEvents.length === 0 ? (
                    <option value="">Tidak ada event sumber lain</option>
                  ) : (
                    sourceEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.nama_event} ({tpMap.get(ev.tahun_pelajaran_id || '') || 'TP'} •{' '}
                        {ev.semester})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={includeRoomMappings}
                    onChange={(e) => setIncludeRoomMappings(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <DoorOpen size={14} className="text-indigo-500" /> Ploting Ruang Ujian (`R.01..R.n`)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Salin susunan ruang fisik & penempatan rombel dari event sumber.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={includePengawasCandidates}
                    onChange={(e) => setIncludePengawasCandidates(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Users size={14} className="text-emerald-500" /> Daftar Kandidat Pengawas
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Salin daftar guru yang ditetapkan sebagai kandidat pengawas ruang.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={includeDaysConfig}
                    onChange={(e) => setIncludeDaysConfig(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Calendar size={14} className="text-amber-500" /> Kerangka Hari & Sesi (`days_config`)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Salin struktur jam & jumlah sesi per hari (tanggal perlu disesuaikan ulang).
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBankSoal}
                    onChange={(e) => setIncludeBankSoal(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <BookOpen size={14} className="text-indigo-600" /> Sekaligus Tarik Semua Bank Soal Event Sumber
                    </div>
                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                      Menduplikasi seluruh bank soal & butir soal dari event sumber ke event aktif ini.
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {mode === 'bank-soal'
              ? `${selectedBankIds.size} bank soal dipilih untuk ditarik`
              : 'Data event sumber tidak akan terhapus atau berubah'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={
                isSubmitting ||
                !targetEvent?.id ||
                (mode === 'bank-soal' ? selectedBankIds.size === 0 : !sourceEventId)
              }
              onClick={() =>
                mode === 'bank-soal'
                  ? rolloverBankMutation.mutate()
                  : rolloverEventMutation.mutate()
              }
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>Jalankan Rollover</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CbtRolloverModal;
