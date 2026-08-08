import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../ui/Button';
import Loader from '../../ui/Loader';
import { default as ConfirmDialog } from '../../ui/ConfirmDialog';
import { CatatanAbsensiModal } from '../modals/CatatanAbsensiModal';
import { 
  User, 
  Clock, 
  Stethoscope, 
  FileText, 
  AlertCircle, 
  Zap,
  CheckCircle2
} from 'lucide-react';

interface StudentRow {
  id: string;
  nama_siswa: string;
  nis?: string;
  Siswa?: {
    nama_siswa?: string;
    nis?: string;
  };
}

export const GerbangPendingStudentsPanel = React.memo(function GerbangPendingStudentsPanel({
  students,
  loading,
  isPetugas,
  confirmEnabled = true,
  viewMode = 'grid',
  onMarkSakit,
  onMarkIzin,
  onMarkAlpa,
  onMarkDispen,
  onMarkHadir,
}: {
  students: Array<StudentRow>;
  loading: boolean;
  isPetugas: boolean;
  confirmEnabled?: boolean;
  viewMode?: 'grid' | 'list';
  onMarkSakit: (siswaId: string, catatan?: string) => void;
  onMarkIzin: (siswaId: string, catatan?: string) => void;
  onMarkAlpa: (siswaId: string) => void;
  onMarkDispen: (siswaId: string, catatan?: string) => void;
  onMarkHadir: (siswaId: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmTarget, setConfirmTarget] = React.useState<{ id: string; nama: string; action: 'ALPA' | 'HADIR' } | null>(null);

  const [noteModalOpen, setNoteModalOpen] = React.useState(false);
  const [noteTarget, setNoteTarget] = React.useState<{ id: string; nama: string; action: 'SAKIT' | 'IZIN' | 'DISPEN' } | null>(null);

  // Pilar 3: DOM Pruning Virtualization for high-concurrency gate performance
  const [displayLimit, setDisplayLimit] = React.useState(30);

  // Reset limit when student array identity changes
  React.useEffect(() => {
    setDisplayLimit(30);
  }, [students.length]);

  const displayedStudents = React.useMemo(() => {
    if (!students || students.length === 0) return [];
    return students.slice(0, displayLimit);
  }, [students, displayLimit]);

  const openConfirm = React.useCallback(async (row: any, action: 'SAKIT' | 'IZIN' | 'ALPA' | 'DISPEN' | 'HADIR') => {
    const id = String(row.id);
    const nama = String(row.nama_siswa || row.Siswa?.nama_siswa || 'Siswa');

    if (action === 'SAKIT' || action === 'IZIN' || action === 'DISPEN') {
      setNoteTarget({ id, nama, action });
      setNoteModalOpen(true);
      return;
    }

    if (!confirmEnabled) {
      try {
        if (action === 'HADIR') await onMarkHadir(id);
        else await onMarkAlpa(id);
      } catch (e) {
        console.error('OpenConfirm direct action failed', e);
      }
      return;
    }
    setConfirmTarget({ id, nama, action: action as 'HADIR' | 'ALPA' });
    setConfirmOpen(true);
  }, [confirmEnabled, onMarkHadir, onMarkAlpa]);

  const handleNoteSubmit = React.useCallback(async (catatan: string) => {
    if (!noteTarget) return;
    const { id, action } = noteTarget;
    if (action === 'SAKIT') await onMarkSakit(id, catatan);
    else if (action === 'IZIN') await onMarkIzin(id, catatan);
    else if (action === 'DISPEN') await onMarkDispen(id, catatan);
  }, [noteTarget, onMarkSakit, onMarkIzin, onMarkDispen]);

  const handleConfirm = React.useCallback(async () => {
    if (!confirmTarget) return;
    const { id, action } = confirmTarget;
    if (action === 'HADIR') await onMarkHadir(id);
    else await onMarkAlpa(id);
    setConfirmOpen(false);
    setConfirmTarget(null);
  }, [confirmTarget, onMarkHadir, onMarkAlpa]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-gray-800/20 rounded-xl border border-gray-100 dark:border-gray-800 border-dashed">
        <Loader className="animate-spin text-indigo-600 mb-4" size="lg" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Menyinkronkan Daftar...</p>
      </div>
    );
  }

  const renderGrid = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {displayedStudents.map((row: any, idx: number) => {
            const nama = row.nama_siswa || row.Siswa?.nama_siswa || 'Siswa';
            const initials = nama.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
            
            return (
              <motion.div 
                key={row.id || idx} 
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -20 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.015, 0.2) }}
                className="group relative bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-black/[0.02] hover:shadow-2xl hover:shadow-indigo-600/5 transition-all"
              >
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 text-sm font-black text-gray-400 group-hover:scale-110 transition-transform">
                      {initials}
                   </div>
                   <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white truncate text-base leading-tight">
                        {nama}
                      </h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                        NIS: {row.nis || row.Siswa?.nis || '-'}
                      </p>
                   </div>
                </div>

                <div className="mt-6 flex items-center gap-2">
                   <div className="flex-1 grid grid-cols-2 gap-2">
                       <Button 
                         size="sm" 
                         className="col-span-2 rounded-xl h-11 sm:h-10 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-[10px] uppercase tracking-widest gap-2 transition-transform"
                         onClick={() => openConfirm(row, 'HADIR')}
                         disabled={!isPetugas}
                         aria-label={`Tandai ${nama} Hadir`}
                       >
                         <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Hadir
                       </Button>
                       <Button 
                         size="sm" 
                         variant="outline" 
                         className="rounded-xl h-11 sm:h-10 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 active:scale-95 font-black text-xs sm:text-[10px] uppercase tracking-widest gap-1.5 transition-transform"
                         onClick={() => openConfirm(row, 'SAKIT')}
                         disabled={!isPetugas}
                         aria-label={`Tandai ${nama} Sakit`}
                       >
                         <Stethoscope className="w-3.5 h-3.5" /> Sakit
                       </Button>
                       <Button 
                         size="sm" 
                         variant="outline" 
                         className="rounded-xl h-11 sm:h-10 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95 font-black text-xs sm:text-[10px] uppercase tracking-widest gap-1.5 transition-transform"
                         onClick={() => openConfirm(row, 'IZIN')}
                         disabled={!isPetugas}
                         aria-label={`Tandai ${nama} Izin`}
                       >
                         <FileText className="w-3.5 h-3.5" /> Izin
                       </Button>
                       <Button 
                         size="sm" 
                         variant="outline" 
                         className="rounded-xl h-11 sm:h-10 border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-95 font-black text-xs sm:text-[10px] uppercase tracking-widest gap-1.5 transition-transform"
                         onClick={() => openConfirm(row, 'DISPEN')}
                         disabled={!isPetugas}
                         aria-label={`Tandai ${nama} Dispen`}
                       >
                         <Zap className="w-3.5 h-3.5" /> Dispen
                       </Button>
                       <Button 
                         size="sm" 
                         variant="outline" 
                         className="rounded-xl h-11 sm:h-10 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 active:scale-95 font-black text-xs sm:text-[10px] uppercase tracking-widest gap-1.5 transition-transform"
                         onClick={() => openConfirm(row, 'ALPA')}
                         disabled={!isPetugas}
                         aria-label={`Tandai ${nama} Alpa`}
                       >
                         <AlertCircle className="w-3.5 h-3.5" /> Alpa
                       </Button>
                   </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {students.length > displayLimit && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisplayLimit(prev => prev + 50)}
            className="rounded-xl px-6 font-bold text-xs bg-white dark:bg-gray-800 border-indigo-200 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50"
          >
            Tampilkan {students.length - displayLimit} Siswa Lagi...
          </Button>
        </div>
      )}
    </div>
  );

  const renderList = () => (
    <div className="space-y-4 w-full">
      <div className="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl border-x-0 sm:border border-gray-100 dark:border-gray-800 overflow-hidden w-full">
         <div className="overflow-x-auto no-scrollbar w-full">
            <table className="w-full text-left border-collapse min-w-full">
               <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                     <th className="px-1.5 sm:px-6 py-2 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Nama Siswa</th>
                     <th className="hidden sm:table-cell px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">NIS</th>
                     <th className="px-1 sm:px-6 py-2 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Tindakan Kehadiran</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  <AnimatePresence mode="popLayout">
                    {displayedStudents.map((row: any, idx: number) => {
                      const nama = row.nama_siswa || row.Siswa?.nama_siswa || 'Siswa';
                      return (
                        <motion.tr 
                          key={row.id || idx}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 50 }}
                          className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors"
                        >
                           <td className="px-1.5 sm:px-6 py-2 sm:py-4 max-w-[85px] xs:max-w-[125px] sm:max-w-none min-w-0">
                              <span className="font-bold text-gray-900 dark:text-white text-[11px] sm:text-sm truncate block whitespace-nowrap" title={nama}>{nama}</span>
                           </td>
                           <td className="hidden sm:table-cell px-6 py-4">
                              <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">{row.nis || row.Siswa?.nis || '-'}</span>
                           </td>
                           <td className="px-1 sm:px-6 py-2 sm:py-4 text-right">
                              <div className="flex items-center justify-end gap-0.5 sm:gap-2">
                                 <Button size="sm" className="h-6.5 sm:h-8 min-w-[38px] sm:min-w-[70px] px-1 sm:px-3 rounded-md sm:rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[8.5px] sm:text-[9px] uppercase tracking-wider shrink-0" onClick={() => openConfirm(row, 'HADIR')} disabled={!isPetugas} aria-label={`Tandai ${nama} Hadir`}>Hadir</Button>
                                 <Button size="sm" variant="outline" className="h-6.5 sm:h-8 min-w-[38px] sm:min-w-[70px] px-1 sm:px-3 rounded-md sm:rounded-lg border-amber-200 text-amber-600 dark:border-amber-900/50 dark:text-amber-400 font-black text-[8.5px] sm:text-[9px] uppercase tracking-wider shrink-0" onClick={() => openConfirm(row, 'SAKIT')} disabled={!isPetugas} aria-label={`Tandai ${nama} Sakit`}>Sakit</Button>
                                 <Button size="sm" variant="outline" className="h-6.5 sm:h-8 min-w-[38px] sm:min-w-[70px] px-1 sm:px-3 rounded-md sm:rounded-lg border-blue-200 text-blue-600 dark:border-blue-900/50 dark:text-blue-400 font-black text-[8.5px] sm:text-[9px] uppercase tracking-wider shrink-0" onClick={() => openConfirm(row, 'IZIN')} disabled={!isPetugas} aria-label={`Tandai ${nama} Izin`}>Izin</Button>
                                 <Button size="sm" variant="outline" className="h-6.5 sm:h-8 min-w-[38px] sm:min-w-[70px] px-1 sm:px-3 rounded-md sm:rounded-lg border-indigo-200 text-indigo-600 dark:border-indigo-900/50 dark:text-indigo-400 font-black text-[8.5px] sm:text-[9px] uppercase tracking-wider shrink-0" onClick={() => openConfirm(row, 'DISPEN')} disabled={!isPetugas} aria-label={`Tandai ${nama} Dispen`}>Dispen</Button>
                                 <Button size="sm" variant="outline" className="h-6.5 sm:h-8 min-w-[38px] sm:min-w-[70px] px-1 sm:px-3 rounded-md sm:rounded-lg border-red-200 text-red-600 dark:border-red-900/50 dark:text-red-400 font-black text-[8.5px] sm:text-[9px] uppercase tracking-wider shrink-0" onClick={() => openConfirm(row, 'ALPA')} disabled={!isPetugas} aria-label={`Tandai ${nama} Alpa`}>Alpa</Button>
                              </div>
                           </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
               </tbody>
            </table>
         </div>
      </div>

      {students.length > displayLimit && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisplayLimit(prev => prev + 50)}
            className="rounded-xl px-6 font-bold text-xs bg-white dark:bg-gray-800 border-indigo-200 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50"
          >
            Tampilkan {students.length - displayLimit} Siswa Lagi...
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {viewMode === 'grid' ? renderGrid() : renderList()}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Konfirmasi Kehadiran"
        description={confirmTarget ? (
          <div className="space-y-4 py-2">
             <p className="text-sm font-medium text-gray-600">Catat <span className="font-black text-gray-900">{confirmTarget.nama}</span> dengan keterangan <span className={`font-black uppercase ${confirmTarget.action === 'ALPA' ? 'text-red-600' : 'text-emerald-600'}`}>{confirmTarget.action}</span>?</p>
             <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Data harian siswa ini akan segera diperbarui secara permanen.</p>
             </div>
          </div>
        ) : ''}
        confirmText="Konfirmasi"
        cancelText="Batal"
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        style={confirmTarget?.action === 'ALPA' ? 'danger' : 'success'}
      />

      <CatatanAbsensiModal
        isOpen={noteModalOpen}
        onClose={() => { setNoteModalOpen(false); setNoteTarget(null); }}
        studentName={noteTarget?.nama || 'Siswa'}
        status={noteTarget?.action || 'SAKIT'}
        onSubmit={handleNoteSubmit}
      />
    </>
  );
});
