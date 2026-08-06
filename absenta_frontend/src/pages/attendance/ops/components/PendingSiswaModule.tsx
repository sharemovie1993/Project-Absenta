import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../../../components/ui/Button';
import Switch from '../../../../components/ui/Switch';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import Label from '../../../../components/ui/Label';
import { GerbangPendingStudentsPanel } from '../../../../components/attendance/gerbang/GerbangPendingStudentsPanel';
import { markGateAbsence } from '../../../../api/attendanceGerbang.api';
import toast from 'react-hot-toast';
import { logAttendanceMetric } from '../../../../utils/attendanceMetrics';
import type { DropdownOption } from '../../../../api/dropdown.api';
import { AnalyticsCard } from '../../../../components/ui/AnalyticsCard';
import { 
  RefreshCw, 
  Users, 
  Smile, 
  Clock, 
  Heart,
  TrendingUp,
  Sparkles,
  LayoutGrid,
  List
} from 'lucide-react';

interface PendingStudent {
  id: string;
  nama_siswa: string;
  nis?: string;
  kelas_id?: string;
  kelasId?: string;
  Kelas?: {
    id: string;
    nama_kelas?: string;
  };
  Siswa?: {
    nama_siswa?: string;
    nis?: string;
  };
}

interface PendingSiswaModuleProps {
  notPresent: PendingStudent[];
  notPresentLoading: boolean;
  miniStats: { masuk: number; keluar: number };
  selectedKelasId: string;
  setSelectedKelasId: (id: string) => void;
  kelasOptions: DropdownOption[];
  isPetugasSiswa: boolean;
  userRole?: string;
  socketConnected: boolean;
  refreshData: () => Promise<void>;
}

export const PendingSiswaModule: React.FC<PendingSiswaModuleProps> = React.memo(({
  notPresent = [],
  notPresentLoading,
  miniStats,
  selectedKelasId,
  setSelectedKelasId,
  kelasOptions = [],
  isPetugasSiswa,
  userRole,
  socketConnected,
  refreshData,
}) => {
  const [confirmEnabled, setConfirmEnabled] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const inferredKelasId = useMemo(() => {
    if (selectedKelasId) return String(selectedKelasId);
    if (kelasOptions.length === 1) return String(kelasOptions[0]?.value || '');
    return '';
  }, [selectedKelasId, kelasOptions]);

  const filteredNotPresent = useMemo(() => {
    if (!inferredKelasId) return notPresent || [];
    return (notPresent || []).filter((x: PendingStudent) => {
      const k = x?.kelas_id ?? x?.kelasId ?? x?.Kelas?.id ?? '';
      return String(k) === String(inferredKelasId);
    });
  }, [notPresent, inferredKelasId]);

  const chartMasuk = isPetugasSiswa ? (selectedKelasId ? (miniStats.masuk || 0) : 0) : (miniStats.masuk || 0);

  useEffect(() => {
    if (selectedKelasId) return;
    if (kelasOptions.length === 1) {
      setSelectedKelasId(String(kelasOptions[0]?.value || ''));
    }
  }, [selectedKelasId, kelasOptions, setSelectedKelasId]);

  const handleMarkStatus = useCallback(async (siswaId: string, status: string, catatan?: string) => {
    try {
      await markGateAbsence({ siswa_id: siswaId, status: status as 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'DISPEN', catatan });
      toast.success(`Status ${status} direkam`);
      logAttendanceMetric('GERBANG_MANUAL_STATUS', { role: userRole, kelasId: inferredKelasId || null, siswaId, status });
      await refreshData();
    } catch (e: unknown) {
      const errObj = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const statusCode = errObj?.response?.status;
      const msg = errObj?.response?.data?.message || errObj?.message || 'Gagal merekam status';
      if (statusCode === 409) {
        toast('Siswa ini sudah terekam sebelumnya', { icon: 'ℹ️' });
        await refreshData();
      } else if (statusCode === 404) {
        toast('Tidak ada sesi gerbang aktif hari ini', { icon: 'ℹ️' });
      } else if (statusCode === 403) {
        toast('Akses ditolak untuk kelas ini', { icon: 'ℹ️' });
      } else {
        toast.error(String(msg));
      }
    }
  }, [inferredKelasId, userRole, refreshData]);


  return (
    <div className="op-card bg-white dark:bg-gray-900 rounded-none sm:rounded-[3rem] border-x-0 sm:border border-gray-100 dark:border-gray-800 p-2 sm:p-8 shadow-none sm:shadow-xl space-y-3 sm:space-y-8 w-full min-w-0">
      <div className="flex flex-row items-center justify-between gap-2 sm:gap-6">
         <div className="min-w-0">
            <h3 className="text-base sm:text-2xl font-black text-gray-900 dark:text-white truncate">Daftar Kehadiran</h3>
            <p className="hidden sm:block text-sm font-bold text-gray-400 italic">Mendukung setiap langkah siswa menuju gerbang sekolah.</p>
         </div>
         <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-50 dark:bg-gray-800 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-gray-100 dark:border-gray-700">
               <button 
                 onClick={() => setViewMode('grid')}
                 className={`p-1.5 sm:p-2 rounded-md sm:rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-xs text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 <LayoutGrid className="w-4 h-4 sm:w-4 sm:h-4" />
               </button>
               <button 
                 onClick={() => setViewMode('list')}
                 className={`p-1.5 sm:p-2 rounded-md sm:rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-xs text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 <List className="w-4 h-4 sm:w-4 sm:h-4" />
               </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 dark:bg-gray-800 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-100 dark:border-gray-700">
               <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
               <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500">
                 {socketConnected ? 'Live' : 'Offline'}
               </span>
            </div>
            <Button size="sm" variant="ghost" onClick={refreshData} className="h-8 w-8 sm:h-10 sm:w-10 p-0 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center">
              <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${notPresentLoading ? 'animate-spin' : ''}`} />
            </Button>
         </div>
      </div>

      {/* Summary Analytic Cards Placed TOP of Table */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
         <AnalyticsCard
           title="Masih Dinanti"
           value={filteredNotPresent.length}
           icon={<Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />}
           gradient="bg-gradient-to-br from-rose-500 to-rose-700"
           variant="compact-premium"
           mobileCompact={true}
         />

         <AnalyticsCard
           title="Siap Belajar"
           value={chartMasuk}
           icon={<TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />}
           gradient="bg-gradient-to-br from-emerald-500 to-teal-700"
           variant="compact-premium"
           mobileCompact={true}
         />

         {!isPetugasSiswa ? (
            <div className="space-y-1 col-span-1">
               <Label htmlFor="kelas-filter" className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Filter Kelas</Label>
               <SearchableSelect
                 id="kelas-filter"
                 value={selectedKelasId}
                 onValueChange={(v) => setSelectedKelasId(v)}
                 options={kelasOptions}
                 placeholder="Pilih Kelas"
                 triggerClassName="h-8 sm:h-11 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 font-bold text-xs"
               />
            </div>
         ) : null}

         <div className="flex items-center justify-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg sm:rounded-2xl border border-gray-100 dark:border-gray-800 col-span-1">
            <Switch id="confirm-toggle" checked={confirmEnabled} onCheckedChange={setConfirmEnabled} />
            <Label htmlFor="confirm-toggle" className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest cursor-pointer select-none text-gray-500 dark:text-gray-400 truncate">Konfirmasi</Label>
         </div>
      </div>

      {/* List Panel / Table (Full Width Underneath) */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          {(filteredNotPresent || []).length > 0 ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GerbangPendingStudentsPanel
                students={filteredNotPresent}
                loading={notPresentLoading}
                isPetugas={isPetugasSiswa}
                confirmEnabled={confirmEnabled}
                viewMode={viewMode}
                onMarkHadir={(id) => handleMarkStatus(id, 'HADIR')}
                onMarkSakit={(id, note) => handleMarkStatus(id, 'SAKIT', note)}
                onMarkIzin={(id, note) => handleMarkStatus(id, 'IZIN', note)}
                onMarkDispen={(id, note) => handleMarkStatus(id, 'DISPEN', note)}
                onMarkAlpa={(id) => handleMarkStatus(id, 'ALPA')}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center text-center p-12 bg-emerald-50/20 dark:bg-emerald-900/10 rounded-[3rem] border-2 border-dashed border-emerald-100 dark:border-emerald-800/30"
            >
               <div className="w-24 h-24 rounded-3xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-6 shadow-xl shadow-emerald-600/10">
                 <Sparkles className="w-10 h-10 text-emerald-600" />
               </div>
               <h4 className="text-2xl font-black text-emerald-800 dark:text-emerald-200">Semua Telah Hadir!</h4>
               <p className="text-gray-400 font-bold max-w-sm mt-2 italic">
                 Luar biasa! Seluruh siswa telah menyapa hari ini. Ruang kelas siap untuk petualangan ilmu pengetahuan.
               </p>
               <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">
                  <Heart className="w-3 h-3 fill-current" /> Harmoni Sekolah Terjaga
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

PendingSiswaModule.displayName = 'PendingSiswaModule';
