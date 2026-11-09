import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TableIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Lock,
  Unlock,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  Check,
  ArrowRight,
  School,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtEventItem, CbtTpEventsSummary } from '@/types/cbt.types';
import { useKelasOptions, useTahunPelajaranOptions } from '@/components/common';
import { useCbtOperationMode } from '../cbtModeHelper';
import { CbtEventConfigModal } from './CbtEventConfigModal';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface CbtEventSettingsTableProps {
  onSelectEventForOrchestrator?: (event: CbtEventItem) => void;
  isInsideModal?: boolean;
}

export const CbtEventSettingsTable: React.FC<CbtEventSettingsTableProps> = ({
  onSelectEventForOrchestrator,
  isInsideModal = false,
}) => {
  const queryClient = useQueryClient();
  const { updateActiveEvent } = useCbtOperationMode();
  const { rawList: kelasList = [] } = useKelasOptions();
  const { options: tpOptions = [] } = useTahunPelajaranOptions();

  // Filter kelas aktif saja
  const activeKelasList = useMemo(() => {
    return kelasList.filter(
      (k) => k.is_active !== false && String(k.status || '').toUpperCase() !== 'NONAKTIF'
    );
  }, [kelasList]);

  // Query Data Ringkasan Hierarki Event CBT dari Backend
  const {
    data: eventsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: cbtQueryKeys.eventsSummary(),
    queryFn: () => cbtApi.getEventsSummary(),
  });

  const tpSummaries: CbtTpEventsSummary[] = eventsData?.summary || [];
  const activeEvent = eventsData?.active_event || null;

  // State Accordion Group Per Tahun Pelajaran (Default expanded untuk TP yang aktif)
  const [expandedTps, setExpandedTps] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    return initial;
  });

  // Sinkronkan expand TP aktif saat data tiba
  React.useEffect(() => {
    if (tpSummaries.length > 0) {
      setExpandedTps((prev) => {
        const next = { ...prev };
        tpSummaries.forEach((tp) => {
          if (next[tp.tahun_pelajaran_id] === undefined) {
            next[tp.tahun_pelajaran_id] = tp.is_active_tp;
          }
        });
        return next;
      });
    }
  }, [tpSummaries]);

  const toggleTpExpand = (tpId: string) => {
    setExpandedTps((prev) => ({
      ...prev,
      [tpId]: !prev[tpId],
    }));
  };

  // State Modal Tambah / Edit Event
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<CbtEventItem | null>(null);
  const [targetTpIdForCreate, setTargetTpIdForCreate] = useState<string | undefined>(undefined);

  // Mutation: Set Active Event
  const setActiveMutation = useMutation({
    mutationFn: (eventId: string) => cbtApi.setActiveEvent(eventId),
    onSuccess: (updatedEvent) => {
      queryClient.invalidateQueries({ queryKey: cbtQueryKeys.eventsSummary() });
      updateActiveEvent(updatedEvent);
      toast.success(`Event aktif berhasil diubah ke: ${updatedEvent.nama_event}`);
      onSelectEventForOrchestrator?.(updatedEvent);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengubah event aktif');
    },
  });

  // Mutation: Delete Event
  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => cbtApi.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cbtQueryKeys.eventsSummary() });
      toast.success('Event CBT berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus event CBT');
    },
  });

  const handleCreateNew = (tpId?: string) => {
    setSelectedEventToEdit(null);
    setTargetTpIdForCreate(tpId);
    setIsModalOpen(true);
  };

  const handleEdit = (event: CbtEventItem) => {
    setSelectedEventToEdit(event);
    setTargetTpIdForCreate(event.tahun_pelajaran_id);
    setIsModalOpen(true);
  };

  const handleDelete = (event: CbtEventItem) => {
    if (event.is_active) {
      toast.error('Event ini sedang aktif di Meja Kerja Panitia! Ganti event aktif terlebih dahulu.');
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus event "${event.nama_event}"?`)) {
      deleteMutation.mutate(event.id);
    }
  };

  const calculateEstimatedRombel = (targetTingkat?: number[]) => {
    if (!targetTingkat || targetTingkat.length === 0) return activeKelasList.length;
    return activeKelasList.filter((k) => targetTingkat.includes(Number(k.tingkat))).length;
  };

  return (
    <div className="space-y-4 w-full">
      {/* ── Summary & Control Strip ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 shrink-0">
            <TableIcon size={18} />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Tabel Pengaturan Event CBT & Konteks Akademik
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hierarki Tahun Pelajaran membawahi sub-event asesmen (PSAJ, ASAS/PAS, ASTS/PTS, ANBK)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeEvent && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>
                Aktif: <strong>{activeEvent.kode_event}</strong> (
                {calculateEstimatedRombel(activeEvent.target_tingkat)} Rombel)
              </span>
            </div>
          )}
          <Button
            size="sm"
            onClick={() => handleCreateNew()}
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Tambah Event Ujian</span>
          </Button>
        </div>
      </div>

      {/* ── Hierarchical Grouped Tables ── */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500">
          <Clock className="w-5 h-5 animate-spin text-indigo-600 mx-auto mb-2" />
          Memuat hierarki konfigurasi event CBT...
        </div>
      ) : tpSummaries.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
          Belum ada data Tahun Pelajaran di sistem.
        </div>
      ) : (
        <div className="space-y-4">
          {tpSummaries.map((tpSummary) => {
            const isExpanded = expandedTps[tpSummary.tahun_pelajaran_id] ?? tpSummary.is_active_tp;
            const events = tpSummary.events || [];

            return (
              <div
                key={tpSummary.tahun_pelajaran_id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs"
              >
                {/* ── Baris Induk: Tahun Pelajaran ── */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleTpExpand(tpSummary.tahun_pelajaran_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleTpExpand(tpSummary.tahun_pelajaran_id);
                    }
                  }}
                  className={cn(
                    'w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors border-b',
                    isExpanded
                      ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                      : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="p-1 rounded-lg text-slate-400 dark:text-slate-500">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </span>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Tahun Pelajaran: {tpSummary.tahun_ajaran}
                      </h4>
                      {tpSummary.is_active_tp && (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">
                          Aktif Berjalan ★
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">
                      {events.length} Sub-Pengaturan Event
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCreateNew(tpSummary.tahun_pelajaran_id)}
                      className="h-8 px-2.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-1 font-bold"
                    >
                      <Plus size={13} />
                      <span>Tambah Event</span>
                    </Button>
                  </div>
                </div>

                {/* ── Sub-Tabel: Event Ujian (Child Rows) ── */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    {events.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        Belum ada sub-pengaturan event ujian untuk tahun pelajaran ini.{' '}
                        <button
                          type="button"
                          onClick={() => handleCreateNew(tpSummary.tahun_pelajaran_id)}
                          className="text-indigo-600 underline font-bold cursor-pointer"
                        >
                          Tambah sekarang
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="text-left px-4 py-3 min-w-[240px]">Nama Event &amp; Kode</th>
                            <th className="text-center px-3 py-3 w-28">Semester</th>
                            <th className="text-left px-3 py-3 min-w-[180px]">Sasaran Tingkat</th>
                            <th className="text-center px-3 py-3 w-28">Estimasi Rombel</th>
                            <th className="text-left px-3 py-3 min-w-[200px]">Kebijakan Keamanan</th>
                            <th className="text-center px-3 py-3 w-36">Status</th>
                            <th className="text-center px-4 py-3 w-36">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {events.map((event) => {
                            const isCurrentlyActive = event.is_active;
                            const rombelCount = calculateEstimatedRombel(event.target_tingkat);

                            return (
                              <tr
                                key={event.id}
                                className={cn(
                                  'transition-colors',
                                  isCurrentlyActive
                                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                                )}
                              >
                                {/* Kolom 1: Nama Event & Kode */}
                                <td className="px-4 py-3.5">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-slate-900 dark:text-white text-xs">
                                        {event.nama_event}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-200/60 dark:border-indigo-800/60 text-[10px]">
                                        {event.kode_event}
                                      </span>
                                      {event.tipe_pelaksanaan === 'MANDIRI' ? (
                                        <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                                          KBM Mandiri
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold">
                                          Ujian Massal
                                        </span>
                                      )}
                                      {event.keterangan && (
                                        <span className="truncate max-w-[240px]" title={event.keterangan}>
                                          {event.keterangan}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Kolom 2: Semester */}
                                <td className="px-3 py-3.5 text-center">
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                                      event.semester === 'GENAP'
                                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                    )}
                                  >
                                    {event.semester}
                                  </span>
                                </td>

                                {/* Kolom 3: Sasaran Tingkat */}
                                <td className="px-3 py-3.5">
                                  <div className="flex flex-wrap items-center gap-1">
                                    {event.target_tingkat && event.target_tingkat.length > 0 ? (
                                      event.target_tingkat.map((t) => (
                                        <span
                                          key={t}
                                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold"
                                        >
                                          Kelas {t}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-slate-400 italic text-[10px]">Semua Tingkat</span>
                                    )}
                                  </div>
                                </td>

                                {/* Kolom 4: Estimasi Rombel */}
                                <td className="px-3 py-3.5 text-center">
                                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs">
                                    {rombelCount} Rombel
                                  </span>
                                </td>

                                {/* Kolom 5: Kebijakan Keamanan */}
                                <td className="px-3 py-3.5">
                                  <div className="space-y-1 text-[10px]">
                                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                                      <Lock size={12} className={event.lock_teacher_scheduling ? 'text-indigo-600' : 'text-slate-400'} />
                                      <span>
                                        Jadwal Guru: <strong>{event.lock_teacher_scheduling ? 'Terkunci' : 'Bebas'}</strong>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                      <Clock size={12} className="text-amber-500" />
                                      <span>
                                        Token: {event.token_refresh_interval ? `${event.token_refresh_interval}m auto` : 'Manual'}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Kolom 6: Status */}
                                <td className="px-3 py-3.5 text-center">
                                  {isCurrentlyActive ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-tight shadow-xs animate-pulse">
                                      <CheckCircle2 size={12} />
                                      Aktif di Meja Kerja
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                                      Siap Digunakan
                                    </span>
                                  )}
                                </td>

                                {/* Kolom 7: Aksi */}
                                <td className="px-4 py-3.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {!isCurrentlyActive && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setActiveMutation.mutate(event.id)}
                                        disabled={setActiveMutation.isPending}
                                        title="Jadikan event ini aktif di Meja Kerja Panitia"
                                        className="h-7 px-2 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900 border-indigo-200 dark:border-indigo-800"
                                      >
                                        <Sparkles size={11} className="mr-1" />
                                        Gunakan
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEdit(event)}
                                      title="Edit Konfigurasi Event"
                                      className="h-7 w-7 p-0 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                      <Edit2 size={13} />
                                    </Button>
                                    {!isCurrentlyActive && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(event)}
                                        title="Hapus Event"
                                        className="h-7 w-7 p-0 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                      >
                                        <Trash2 size={13} />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Konfigurasi / Edit Event ── */}
      <CbtEventConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={selectedEventToEdit}
        defaultTpId={targetTpIdForCreate}
        tpOptions={tpOptions}
        onSuccess={(saved) => {
          queryClient.invalidateQueries({ queryKey: cbtQueryKeys.eventsSummary() });
          if (saved.is_active) {
            updateActiveEvent(saved);
            onSelectEventForOrchestrator?.(saved);
          }
        }}
      />
    </div>
  );
};

export default CbtEventSettingsTable;
