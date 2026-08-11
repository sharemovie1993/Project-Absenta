import React, { useMemo, useState, useEffect } from 'react';
import { Badge } from '../../ui';
import { getAttendanceBadgeVariant } from '../../../utils/attendance/attendanceUiSelectors';
import { CatatanAbsensiModal } from '../modals/CatatanAbsensiModal';
import { 
  BookOpen, CheckCircle2, Users, Search, 
  RefreshCw, ChevronLeft, ChevronRight, LayoutList, PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestWithFallback, formatErrorMessage } from '../../../api/apiUtils';
import { toast } from 'react-hot-toast';
import { cn } from '../../../lib/utils';


// Strict TypeScript Interfaces for Hardening
export interface SiswaDetail {
  id: string;
  nama_siswa: string;
  nis: string;
  jenis_kelamin?: 'L' | 'P';
}

export interface SesiAttendanceRecord {
  id: string;
  sesi_absensi_id?: string;
  siswa_akademik_id?: string;
  siswa_id?: string;
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'DISPEN' | 'ALPA' | 'BELUM_TAP' | string;
  waktu_tap?: string | null;
  is_terlambat?: boolean;
  asal_gerbang?: boolean;
  catatan?: string | null;
  Siswa?: SiswaDetail;
  is_piket_out?: boolean;
  piket_jam_keluar?: string | null;
  piket_log_id?: string | null;
}

export interface SesiDetail {
  id: string;
  status: 'BERLANGSUNG' | 'SELESAI';
  ProgresMateri?: {
    judul_materi: string;
    pencapaian_persen: number;
    kegiatan?: string;
  } | null;
}

type Props = {
  records: SesiAttendanceRecord[];
  sesi?: SesiDetail;
  isReportMode?: boolean;
  isSlideMode?: boolean;
  onToggleSlideMode?: () => void;
};

// Memoized Sub-Component for High-Performance Rendering (Fase 2)
const SesiAttendanceRow = React.memo(({
  record,
  isReportMode,
  isPending,
  onUpdateStatus
}: {
  record: SesiAttendanceRecord;
  isReportMode: boolean;
  isPending: boolean;
  onUpdateStatus: (siswaAkademikId: string, status: string) => void;
}) => {
  const studentId = record.siswa_akademik_id || record.siswa_id || '';
  const isPiketOut = record.is_piket_out || record.catatan?.includes('IZIN SEMENTARA PIKET') || record.catatan?.includes('IZIN SEMENTARA');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "grid items-center gap-2 px-4 py-2 hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors group",
        isReportMode ? "grid-cols-[3.5fr_1fr_1fr]" : "grid-cols-[3.5fr_1fr_2fr]"
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-bold text-gray-900 dark:text-white text-[11px] truncate group-hover:text-indigo-600">
            {record.Siswa?.nama_siswa || studentId}
          </p>
          {record.catatan?.includes('PULANG AWAL') && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/50">
              🟧 Pulang Awal
            </span>
          )}
          {isPiketOut && record.status !== 'HADIR' && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300/80 animate-pulse">
              🟨 Izin Piket {record.piket_jam_keluar ? `(${record.piket_jam_keluar})` : ''}
            </span>
          )}
          {record.catatan?.includes('DISPENSASI') && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300/50">
              🟦 Dispensasi
            </span>
          )}
        </div>
        <p className="hidden sm:block text-[8px] text-gray-400 font-bold truncate">NIS: {record.Siswa?.nis || '-'}</p>
        {record.catatan && (
          <p className="text-[7px] text-indigo-500 font-black italic truncate mt-0.5">
            {record.catatan}
          </p>
        )}
      </div>
      <div className="flex flex-col items-center justify-center gap-0.5">
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-500">
             {record.waktu_tap ? new Date(record.waktu_tap).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </span>
          {record.status === 'HADIR' && !record.asal_gerbang && (
             <RefreshCw className="w-2.5 h-2.5 text-amber-500 animate-spin-slow" />
          )}
        </div>
        {record.is_terlambat && (
          <span className="px-1 py-0.2 text-[7px] font-black bg-rose-50 text-rose-600 rounded-sm uppercase tracking-tighter border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50">
            Telat
          </span>
        )}
      </div>
      <div className={cn("flex items-center gap-1", isReportMode ? "justify-center" : "justify-end")}>
        {isReportMode ? (
          <Badge 
            variant={getAttendanceBadgeVariant(record.status)} 
            className="text-[8px] font-black uppercase px-2 py-0.5 rounded-sm min-w-[60px] text-center flex justify-center"
          >
            {record.status}
          </Badge>
        ) : (
          <div className="flex items-center gap-1">
            {isPiketOut && record.status !== 'HADIR' && (
              <button
                disabled={isPending}
                onClick={() => {
                  onUpdateStatus(studentId, 'HADIR');
                  toast.success(`Konfirmasi kembali: Status ${record.Siswa?.nama_siswa || 'siswa'} diubah ke HADIR & Piket diselesaikan`);
                }}
                className="h-6 px-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[8px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 transition-all active:scale-95"
                title="Siswa sudah kembali ke kelas — ubah status ke HADIR & selesaikan Izin Piket"
              >
                <CheckCircle2 size={10} />
                <span>Balik Ke Kelas</span>
              </button>
            )}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-900 p-0.5 rounded-sm border border-gray-100 dark:border-gray-800 shadow-inner">
              {[
                { label: 'H', val: 'HADIR', color: 'emerald' },
                { label: 'I', val: 'IZIN', color: 'blue' },
                { label: 'S', val: 'SAKIT', color: 'amber' },
                { label: 'D', val: 'DISPEN', color: 'violet' },
                { label: 'A', val: 'ALPA', color: 'rose' }
              ].map((btn) => {
                const isActive = record.status === btn.val;
                const isCurrentPending = isPending && isActive;
              
              return (
                <button
                  key={btn.val}
                  disabled={isPending}
                  onClick={() => onUpdateStatus(studentId, btn.val)}
                  title={btn.val}
                  className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-sm text-[9px] font-black transition-all relative",
                    isActive
                      ? `bg-${btn.color}-500 text-white shadow-sm scale-105`
                      : "text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
                    isPending && !isActive && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {isCurrentPending ? (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin absolute text-white" />
                  ) : (
                    btn.label
                  )}
                </button>
              );
            })}
          </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

SesiAttendanceRow.displayName = 'SesiAttendanceRow';

export function SesiAttendanceList({ records, sesi, isReportMode = false, isSlideMode: propIsSlideMode, onToggleSlideMode }: Props) {
  const queryClient = useQueryClient();
  const progres = sesi?.ProgresMateri;
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSlideMode, setInternalSlideMode] = useState(false);
  const isSlideMode = propIsSlideMode !== undefined ? propIsSlideMode : internalSlideMode;
  const setIsSlideMode = (val: boolean | ((prev: boolean) => boolean)) => {
    if (onToggleSlideMode) {
      onToggleSlideMode();
    } else {
      setInternalSlideMode(val);
    }
  };
  const [slideIndex, setSlideIndex] = useState(0);

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<{ siswaAkademikId: string; studentName: string; status: 'SAKIT' | 'IZIN' | 'DISPEN' } | null>(null);

  // Sync state with parent props for robust optimistic updates across all dashboards
  const [localRecords, setLocalRecords] = useState<SesiAttendanceRecord[]>(records);
  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Mutation for updating student attendance with advanced React Query Optimistic Updates (Fase 3)
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ siswaAkademikId, status, catatan }: { siswaAkademikId: string, status: string, catatan?: string }) => {
      return requestWithFallback('post', `/attendance/sesi-absensi/${sesi?.id}/tap-siswa`, {
        data: {
          siswa_akademik_id: siswaAkademikId,
          status: status,
          catatan: catatan
        }
      });
    },
    onMutate: async ({ siswaAkademikId, status }) => {
      if (!sesi?.id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sesi-detail-attendance', sesi.id] });

      // Snapshot the previous value in query cache
      const previousQueryRes = queryClient.getQueryData<any>(['sesi-detail-attendance', sesi.id]);

      // Optimistically update React Query Cache
      if (previousQueryRes?.data) {
        const optimisticQueryData = previousQueryRes.data.map((rec: SesiAttendanceRecord) => {
          const currentId = rec.siswa_akademik_id || rec.siswa_id;
          return currentId === siswaAkademikId 
            ? { ...rec, status: status, waktu_tap: status === 'HADIR' ? new Date().toISOString() : null }
            : rec;
        });
        queryClient.setQueryData(['sesi-detail-attendance', sesi.id], {
          ...previousQueryRes,
          data: optimisticQueryData
        });
      }

      return { previousQueryRes };
    },
    onSuccess: (_, variables) => {
      toast.success('Status absensi diperbarui');
      
      // Auto-next logic for Slide Mode
      if (isSlideMode && slideIndex < filteredRecords.length - 1) {
        setTimeout(() => setSlideIndex(prev => prev + 1), 300);
      }
    },
    onError: (error: any, variables, context) => {
      // Rollback local records state to prop values
      setLocalRecords(records);

      // Rollback query cache
      if (context?.previousQueryRes && sesi?.id) {
        queryClient.setQueryData(['sesi-detail-attendance', sesi.id], context.previousQueryRes);
      }

      const msg = formatErrorMessage(error);
      toast.error(msg);
    },
    onSettled: () => {
      // Force synchronization with server
      if (sesi?.id) {
        queryClient.invalidateQueries({ queryKey: ['sesi-detail-attendance', sesi.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['attendance-today-me-class'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-discipline-leaderboard-modal'] });
    }
  });

  const stats = useMemo(() => {
    return {
      total: localRecords.length,
      hadir: localRecords.filter(r => r.status === 'HADIR').length,
      izin: localRecords.filter(r => r.status === 'IZIN').length,
      sakit: localRecords.filter(r => r.status === 'SAKIT').length,
      alpa: localRecords.filter(r => r.status === 'ALPA').length,
      dispen: localRecords.filter(r => r.status === 'DISPEN').length,
      terlambat: localRecords.filter(r => r.is_terlambat).length,
      pending_gate: localRecords.filter(r => r.status === 'HADIR' && r.asal_gerbang === false).length,
      belum_tap: localRecords.filter(r => r.status === 'BELUM_TAP').length,
    };
  }, [localRecords]);

  const filteredRecords = useMemo(() => {
    return localRecords
      .filter(r => {
        const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
        const matchSearch = (r.Siswa?.nama_siswa || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchStatus && matchSearch;
      })
      .sort((a, b) => {
        const nameA = (a.Siswa?.nama_siswa || '').toLowerCase();
        const nameB = (b.Siswa?.nama_siswa || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [localRecords, filterStatus, searchTerm]);

  const handleUpdateStatus = (siswaAkademikId: string, status: string, catatan?: string) => {
    if ((status === 'SAKIT' || status === 'IZIN' || status === 'DISPEN') && !catatan) {
      const rec = localRecords.find(r => (r.siswa_akademik_id || r.siswa_id || r.id) === siswaAkademikId);
      const sName = rec?.Siswa?.nama_siswa || 'Siswa';
      setNoteTarget({ siswaAkademikId, studentName: sName, status: status as 'SAKIT' | 'IZIN' | 'DISPEN' });
      setNoteModalOpen(true);
      return;
    }

    // 1. Instant optimistic update to local state
    setLocalRecords(prev => 
      prev.map(r => {
        const currentId = r.siswa_akademik_id || r.siswa_id;
        return currentId === siswaAkademikId 
          ? { 
              ...r, 
              status: status, 
              catatan: catatan !== undefined ? catatan : r.catatan,
              waktu_tap: status === 'HADIR' ? new Date().toISOString() : null 
            }
          : r;
      })
    );

    // 2. Fire mutation
    updateAttendanceMutation.mutate({ siswaAkademikId, status, catatan });
  };

  const handleNoteSubmit = async (catatan: string) => {
    if (!noteTarget) return;
    const { siswaAkademikId, status } = noteTarget;
    handleUpdateStatus(siswaAkademikId, status, catatan);
  };

  const currentSlideSiswa = filteredRecords[slideIndex];

  return (
    <div className="space-y-4 py-1">


      {/* 2. Tiny Inline Journal Info */}
      {progres && (
        <div className="bg-indigo-50/20 dark:bg-indigo-900/10 px-3 py-1.5 rounded-lg border border-indigo-100/30 dark:border-indigo-800/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
            <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 truncate">{progres.judul_materi}</p>
          </div>
          <span className="text-[9px] font-black text-indigo-500 shrink-0">{progres.pencapaian_persen}%</span>
        </div>
      )}

      {/* 3. Content Section (Slide vs List) */}
      <AnimatePresence mode="wait">
        {isSlideMode && filteredRecords.length > 0 ? (
          <motion.div
            key="slide-mode"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-indigo-900/50 rounded-xl p-8 shadow-xl shadow-indigo-100/20"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Siswa {slideIndex + 1} dari {filteredRecords.length}</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {currentSlideSiswa.Siswa?.nama_siswa}
                </h3>
                <p className="text-sm font-bold text-gray-400">NIS: {currentSlideSiswa.Siswa?.nis || '-'}</p>
              </div>

              <div className="flex flex-col gap-4 w-full max-w-xs">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Kehadiran</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'HADIR', val: 'HADIR', color: 'emerald' },
                    { label: 'IZIN', val: 'IZIN', color: 'blue' },
                    { label: 'SAKIT', val: 'SAKIT', color: 'amber' },
                    { label: 'DISPEN', val: 'DISPEN', color: 'violet' },
                    { label: 'ALPA', val: 'ALPA', color: 'rose' }
                  ].map((btn) => {
                    const studentId = currentSlideSiswa.siswa_akademik_id || currentSlideSiswa.siswa_id || '';
                    const isPending = updateAttendanceMutation.isPending &&
                                     updateAttendanceMutation.variables?.siswaAkademikId === studentId;
                    const isActive = currentSlideSiswa.status === btn.val;
                    const isCurrentPending = isPending && updateAttendanceMutation.variables?.status === btn.val;

                    return (
                      <button
                        key={btn.val}
                        disabled={isPending}
                        onClick={() => handleUpdateStatus(studentId, btn.val)}
                        className={cn(
                          "h-14 flex items-center justify-center rounded-xl text-xs font-black transition-all border-2 relative",
                          isActive
                            ? `bg-${btn.color}-500 border-${btn.color}-500 text-white shadow-lg shadow-${btn.color}-200 dark:shadow-none scale-[1.02]`
                            : `bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-400 hover:border-${btn.color}-400 hover:text-${btn.color}-500`,
                          isPending && !isActive && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        {isCurrentPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          btn.label
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between w-full pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  disabled={slideIndex === 0}
                  onClick={() => setSlideIndex(prev => prev - 1)}
                  className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 transition-colors"
                >
                  <ChevronLeft size={24} className="text-gray-400" />
                </button>
                <div className="flex gap-1">
                  {filteredRecords.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        i === slideIndex ? "bg-indigo-600 w-4" : "bg-gray-200 dark:bg-gray-700"
                      )}
                    />
                  )).slice(Math.max(0, slideIndex - 5), Math.min(filteredRecords.length, slideIndex + 5))}
                </div>
                <button
                  disabled={slideIndex === filteredRecords.length - 1}
                  onClick={() => setSlideIndex(prev => prev + 1)}
                  className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 transition-colors"
                >
                  <ChevronRight size={24} className="text-gray-400" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2.5"
          >
            {/* Status Tabs dengan Badge Count — 1 baris fit tanpa scroll */}
            <div className="grid grid-flow-col auto-cols-fr w-full gap-1">
              {[
                { key: 'ALL', label: 'All', count: stats.total },
                { key: 'HADIR', label: 'Hadir', count: stats.hadir },
                { key: 'BELUM_TAP', label: 'Belum', count: stats.belum_tap },
                ...(stats.izin + stats.sakit > 0 ? [{ key: 'IZIN', label: 'Izin', count: stats.izin + stats.sakit }] : []),
                ...(stats.dispen > 0 ? [{ key: 'DISPEN', label: 'Dispen', count: stats.dispen }] : []),
                { key: 'ALPA', label: 'Alpa', count: stats.alpa }
              ].map((tab) => {
                const isActive = filterStatus === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={cn(
                      "flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2 h-7 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all border min-w-0 w-full",
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span className="truncate">{tab.label}</span>
                    <span className={cn(
                      "px-1 sm:px-1.5 py-0.2 rounded-full text-[9px] font-extrabold shrink-0",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {!records || records.length === 0 ? (
              <div className="bg-gray-50/30 rounded-sm p-8 text-center border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Kosong.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-sm overflow-hidden">
                <div className={cn(
                  "grid bg-gray-50/30 dark:bg-gray-900/50 px-4 py-2 text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-gray-800",
                  isReportMode ? "grid-cols-[3.5fr_1fr_1fr]" : "grid-cols-[3.5fr_1fr_2fr]"
                )}>
                  <div>Siswa</div>
                  <div className="text-center">Tap</div>
                  <div className={isReportMode ? "text-center" : "text-right"}>{isReportMode ? 'Status' : 'Aksi Cepat'}</div>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700/20">
                  {filteredRecords.map((r) => (
                    <SesiAttendanceRow 
                      key={r.id || r.siswa_akademik_id}
                      record={r}
                      isReportMode={isReportMode}
                      isPending={
                        updateAttendanceMutation.isPending && 
                        updateAttendanceMutation.variables?.siswaAkademikId === r.siswa_akademik_id
                      }
                      onUpdateStatus={handleUpdateStatus}
                    />
                  ))}
                  {filteredRecords.length === 0 && (
                    <div className="p-10 text-center space-y-2">
                      <Search className="w-8 h-8 text-gray-200 mx-auto" />
                      <p className="text-gray-400 font-bold italic text-[10px]">Tidak ditemukan.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <CatatanAbsensiModal
        isOpen={noteModalOpen}
        onClose={() => { setNoteModalOpen(false); setNoteTarget(null); }}
        studentName={noteTarget?.studentName || 'Siswa'}
        status={noteTarget?.status || 'SAKIT'}
        onSubmit={handleNoteSubmit}
      />
    </div>
  );
}

