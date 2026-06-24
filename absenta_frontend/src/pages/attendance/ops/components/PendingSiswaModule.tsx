import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../../../components/ui/Button';
import Switch from '../../../../components/ui/Switch';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import Label from '../../../../components/ui/Label';
import { GerbangPendingStudentsPanel } from '../../../../components/attendance/gerbang/GerbangPendingStudentsPanel';
import { markGateAbsence } from '../../../../api/attendanceGerbang.api';
import { useToast } from '../../../../hooks/useToast';
import { logAttendanceMetric } from '../../../../utils/attendanceMetrics';
import type { DropdownOption } from '../../../../api/dropdown.api';
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
  const { success, error, notice } = useToast();
  const [confirmEnabled, setConfirmEnabled] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const inferredKelasId = useMemo(() => {
    if (selectedKelasId) return String(selectedKelasId);
    if (!isPetugasSiswa) return String(selectedKelasId || '');
    if (kelasOptions.length === 1) return String(kelasOptions[0]?.value || '');
    const inferred =
      (notPresent || []).find((x: PendingStudent) => x?.kelas_id)?.kelas_id ??
      (notPresent || []).find((x: PendingStudent) => x?.kelasId)?.kelasId ??
      '';
    return String(inferred || '');
  }, [selectedKelasId, isPetugasSiswa, kelasOptions, notPresent]);

  const filteredNotPresent = useMemo(() => {
    if (!inferredKelasId) return notPresent || [];
    return (notPresent || []).filter((x: PendingStudent) => {
      const k = x?.kelas_id ?? x?.kelasId ?? x?.Kelas?.id ?? '';
      return String(k) === String(inferredKelasId);
    });
  }, [notPresent, inferredKelasId]);

  const chartMasuk = isPetugasSiswa ? (selectedKelasId ? (miniStats.masuk || 0) : 0) : (miniStats.masuk || 0);

  useEffect(() => {
    if (!isPetugasSiswa) return;
    if (selectedKelasId) return;
    if (kelasOptions.length === 1) {
      setSelectedKelasId(String(kelasOptions[0]?.value || ''));
      return;
    }
    if (inferredKelasId) setSelectedKelasId(String(inferredKelasId));
  }, [isPetugasSiswa, selectedKelasId, kelasOptions, inferredKelasId, setSelectedKelasId]);

  const handleMarkStatus = useCallback(async (siswaId: string, status: string) => {
    try {
      await markGateAbsence({ siswa_id: siswaId, status: status as 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'DISPEN' });
      success(`Status ${status} direkam`);
      logAttendanceMetric('GERBANG_MANUAL_STATUS', { role: userRole, kelasId: inferredKelasId || null, siswaId, status });
      await refreshData();
    } catch (e: unknown) {
      const errObj = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const statusCode = errObj?.response?.status;
      const msg = errObj?.response?.data?.message || errObj?.message || 'Gagal merekam status';
      if (statusCode === 409) {
        notice('Siswa ini sudah terekam sebelumnya');
        await refreshData();
      } else if (statusCode === 404) {
        notice('Tidak ada sesi gerbang aktif hari ini');
      } else if (statusCode === 403) {
        notice('Akses ditolak untuk kelas ini');
      } else {
        error(String(msg));
      }
    }
  }, [inferredKelasId, userRole, refreshData, success, error, notice]);


  return (
    <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-8 shadow-2xl shadow-black/[0.02] space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Daftar Kehadiran</h3>
            <p className="text-sm font-bold text-gray-400 italic">Mendukung setiap langkah siswa menuju gerbang sekolah.</p>
         </div>
         <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border border-gray-100 dark:border-gray-700 mr-2">
               <button 
                 onClick={() => setViewMode('grid')}
                 className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 <LayoutGrid size={18} />
               </button>
               <button 
                 onClick={() => setViewMode('list')}
                 className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 <List size={18} />
               </button>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-700">
               <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                 {socketConnected ? 'Live Feed' : 'Offline'}
               </span>
            </div>
            <Button size="sm" variant="ghost" onClick={refreshData} className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border border-indigo-100 dark:border-indigo-800">
              <RefreshCw className={`h-5 w-5 ${notPresentLoading ? 'animate-spin' : ''}`} />
            </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         {/* Summary Cards */}
         <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-xl border border-rose-100 dark:border-rose-800/30 flex items-center gap-4 group hover:scale-[1.02] transition-transform">
               <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                  <Clock className="w-6 h-6 text-rose-500" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">Masih Dinanti</p>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-none">{filteredNotPresent.length}</p>
               </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-xl border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-4 group hover:scale-[1.02] transition-transform">
               <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">Siap Belajar</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{chartMasuk}</p>
               </div>
            </div>

            <div className="mt-4 space-y-4">
               {!isPetugasSiswa && (
                  <div className="space-y-2">
                     <Label htmlFor="kelas-filter" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Filter Kelas</Label>
                     <SearchableSelect
                       id="kelas-filter"
                       value={selectedKelasId}
                       onValueChange={(v) => setSelectedKelasId(v)}
                       options={kelasOptions}
                       placeholder="Pilih Kelas"
                       triggerClassName="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 font-bold"
                     />
                  </div>
               )}
               <div className="flex items-center gap-3 px-4">
                 <Switch id="confirm-toggle" checked={confirmEnabled} onCheckedChange={setConfirmEnabled} />
                 <Label htmlFor="confirm-toggle" className="text-[10px] font-black uppercase tracking-widest cursor-pointer select-none text-gray-400">Konfirmasi Aksi</Label>
               </div>
            </div>
         </div>
 
         {/* List Panel */}
         <div className="lg:col-span-3">
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
                   onMarkSakit={(id) => handleMarkStatus(id, 'SAKIT')}
                   onMarkIzin={(id) => handleMarkStatus(id, 'IZIN')}
                   onMarkDispen={(id) => handleMarkStatus(id, 'DISPEN')}
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
    </div>
  );
});

PendingSiswaModule.displayName = 'PendingSiswaModule';
