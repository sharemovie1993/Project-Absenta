import React, { useMemo, useState, useEffect } from 'react';
import { Badge } from '../../ui';
import { getAttendanceBadgeVariant } from '../../../utils/attendance/attendanceUiSelectors';
import { 
  BookOpen, AlertCircle, CheckCircle2, Users, Search, 
  Clock, GraduationCap, Info, RefreshCw,
  ChevronLeft, ChevronRight, LayoutList, PlayCircle
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "grid items-center gap-2 px-4 py-2 hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors group",
        isReportMode ? "grid-cols-[2fr_1fr_1fr]" : "grid-cols-[2fr_1fr_1.5fr]"
      )}
    >
      <div className="min-w-0">
        <p className="font-bold text-gray-900 dark:text-white text-[11px] truncate group-hover:text-indigo-600">
          {record.Siswa?.nama_siswa || studentId}
        </p>
        <p className="text-[8px] text-gray-400 font-bold truncate">NIS: {record.Siswa?.nis || '-'}</p>
        {record.catatan && (
          <p className="text-[7px] text-indigo-500 font-black italic truncate mt-0.5">
            {record.catatan}
          </p>
        )}
      </div>
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[10px] font-bold text-gray-500">
           {record.waktu_tap ? new Date(record.waktu_tap).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
        </span>
        {record.status === 'HADIR' && !record.asal_gerbang && (
           <RefreshCw className="w-2.5 h-2.5 text-amber-500 animate-spin-slow" />
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
        )}
      </div>
    </motion.div>
  );
});

SesiAttendanceRow.displayName = 'SesiAttendanceRow';

export function SesiAttendanceList({ records, sesi, isReportMode = false }: Props) {
  const queryClient = useQueryClient();
  const progres = sesi?.ProgresMateri;
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSlideMode, setIsSlideMode] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  // Sync state with parent props for robust optimistic updates across all dashboards
  const [localRecords, setLocalRecords] = useState<SesiAttendanceRecord[]>(records);
  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Mutation for updating student attendance with advanced React Query Optimistic Updates (Fase 3)
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ siswaAkademikId, status }: { siswaAkademikId: string, status: string }) => {
      return requestWithFallback('post', `/attendance/sesi-absensi/${sesi?.id}/tap-siswa`, {
        data: {
          siswa_akademik_id: siswaAkademikId,
          status: status
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

  const handleUpdateStatus = (siswaAkademikId: string, status: string) => {
    // 1. Instant optimistic update to local state
    setLocalRecords(prev => 
      prev.map(r => {
        const currentId = r.siswa_akademik_id || r.siswa_id;
        return currentId === siswaAkademikId 
          ? { 
              ...r, 
              status: status, 
              waktu_tap: status === 'HADIR' ? new Date().toISOString() : null 
            }
          : r;
      })
    );

    // 2. Fire mutation
    updateAttendanceMutation.mutate({ siswaAkademikId, status });
  };

  const currentSlideSiswa = filteredRecords[slideIndex];

  return (
    <div className="space-y-4 py-1">
      {/* 0. Mode Toggle (Operational only) */}
      {!isReportMode && (
        <div className="flex justify-end">
          <button 
            onClick={() => setIsSlideMode(!isSlideMode)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors border border-indigo-100 dark:border-indigo-800/50"
          >
            {isSlideMode ? <><LayoutList size={14} /> Mode List</> : <><PlayCircle size={14} /> Mode Slide (Fokus)</>}
          </button>
        </div>
      )}

      {/* 1. Ultra Compact Stats Overview */}
      <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 pb-1">
         {[
           { label: 'Hadir', value: stats.hadir, color: 'emerald', icon: CheckCircle2 },
           { label: 'Telat', value: stats.terlambat, color: 'orange', icon: Clock },
           { label: 'Izin', value: stats.izin + stats.sakit, color: 'blue', icon: Info },
           { label: 'Dispen', value: stats.dispen, color: 'violet', icon: GraduationCap },
           { label: 'Alpa', value: stats.alpa, color: 'rose', icon: AlertCircle },
           { label: 'Belum', value: stats.belum_tap, color: 'slate', icon: Users },
         ].map((item) => (
           <div key={item.label} className="bg-gray-50/80 dark:bg-gray-900/50 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-sm border border-gray-100 dark:border-gray-800 flex items-center gap-1 sm:gap-1.5">
              <div className={`p-0.5 sm:p-1 bg-${item.color}-500/10 rounded-sm`}>
                 <item.icon className={`w-2.5 h-2.5 sm:w-3 h-3 text-${item.color}-500`} />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-1">
                 <h5 className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-white leading-none">{item.value}</h5>
                 <p className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-tighter">{item.label}</p>
              </div>
           </div>
         ))}
      </div>

      {/* 2. Tiny Inline Journal Info */}
      {progres && (
        <div className="bg-indigo-50/20 dark:bg-indigo-900/10 px-4 py-2 rounded-sm border border-indigo-100/30 dark:border-indigo-800/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <p className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200 truncate">{progres.judul_materi}</p>
          </div>
          <span className="text-[9px] font-black text-indigo-600 shrink-0">{progres.pencapaian_persen}%</span>
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
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
               <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Cari..."
                    className="w-full pl-9 pr-3 h-8 bg-gray-50/50 dark:bg-gray-900 border-none rounded-sm text-[11px] font-bold focus:ring-1 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
               
               <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scrollbar-hide">
                  {['ALL', 'HADIR', 'BELUM_TAP', 'DISPEN', 'ALPA'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={cn(
                        "px-3 h-8 rounded-sm text-[8px] font-black uppercase tracking-tighter transition-all shrink-0",
                        filterStatus === st 
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-black' 
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 hover:bg-gray-200'
                      )}
                    >
                      {st === 'ALL' ? 'Semua' : (st === 'BELUM_TAP' ? (isReportMode ? 'BELUM TAP' : 'Pending') : st)}
                    </button>
                  ))}
               </div>
            </div>

            {!records || records.length === 0 ? (
              <div className="bg-gray-50/30 rounded-sm p-8 text-center border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Kosong.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-sm overflow-hidden">
                <div className={cn(
                  "grid bg-gray-50/30 dark:bg-gray-900/50 px-4 py-2 text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-gray-800",
                  isReportMode ? "grid-cols-[2fr_1fr_1fr]" : "grid-cols-[2fr_1fr_1.5fr]"
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
    </div>
  );
}

