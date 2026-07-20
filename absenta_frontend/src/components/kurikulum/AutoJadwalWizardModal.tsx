import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Play, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, RefreshCw, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { getKelasForDropdown } from '../../api/dropdown.api';
import { previewAutoJadwal, applyAutoJadwal } from '../../api/attendance/jadwalKBM.api';
import { toast } from 'react-hot-toast';

interface AutoJadwalWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tahunPelajaranId: string;
  semesterId: string;
  onSuccess?: () => void;
}

export const AutoJadwalWizardModal: React.FC<AutoJadwalWizardModalProps> = ({
  isOpen,
  onClose,
  tahunPelajaranId,
  semesterId,
  onSuccess
}) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState<boolean>(true);
  
  // Solver results
  const [solverResult, setSolverResult] = useState<any>(null);
  
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSolverResult(null);
      
      const fetchClasses = async () => {
        try {
          const res = await getKelasForDropdown();
          if (res?.success) {
            setClasses(res.data || []);
            // default select all
            setSelectedClassIds((res.data || []).map((c: any) => c.value));
          }
        } catch (e) {
          console.error(e);
          toast.error('Gagal mengambil daftar rombel');
        }
      };
      
      fetchClasses();
    }
  }, [isOpen]);

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const handleSelectAllClasses = () => {
    if (selectedClassIds.length === classes.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(classes.map(c => c.value));
    }
  };

  const handleStartGeneration = async () => {
    if (selectedClassIds.length === 0) {
      toast.error('Silakan pilih minimal 1 rombel');
      return;
    }
    
    try {
      setLoading(true);
      const res = await previewAutoJadwal({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
        kelas_ids: selectedClassIds,
        overwrite_existing: overwrite
      });

      if (res.success && res.data) {
        setSolverResult(res.data);
        setStep(2);
      } else {
        toast.error(res.message || 'Gagal menghitung jadwal otomatis');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Gagal menghitung jadwal otomatis');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyGeneration = async () => {
    if (!solverResult?.generated_schedules || solverResult.generated_schedules.length === 0) {
      toast.error('Tidak ada jadwal untuk diterapkan');
      return;
    }

    try {
      setLoading(true);
      const res = await applyAutoJadwal({
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
        generated_schedules: solverResult.generated_schedules,
        overwrite_existing: overwrite
      });

      if (res.success) {
        toast.success(`Berhasil menerapkan ${res.data?.count || 0} slot jadwal pelajaran`);
        setStep(3);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || 'Gagal menerapkan jadwal');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Gagal menerapkan jadwal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={
        <div className="flex items-center gap-2 text-slate-800 dark:text-white">
          <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
          <span className="font-extrabold text-sm md:text-base">Auto-Timetable Generator (CSP Solver)</span>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between max-w-md mx-auto relative mb-4">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
          <div className="absolute left-0 top-1/2 h-0.5 bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-300" style={{ width: `${((step - 1) / 2) * 100}%` }} />

          {[1, 2, 3].map((num) => (
            <div 
              key={num} 
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all border duration-300 ${
                step >= num 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              {num === 3 && step === 3 ? <CheckCircle2 className="w-4 h-4" /> : num}
            </div>
          ))}
        </div>

        {/* Wizard Steps Content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/30 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed">
                <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-slate-650 dark:text-slate-350 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-white">Bagaimana Mesin Solver Bekerja?</p>
                  <p>Mesin solver akan secara otomatis mendistribusikan alokasi JP mingguan dari struktur kurikulum dan guru pengampu ke slot-slot kosong. Membantu menyusun ribuan kemungkinan agar terbebas dari bentrok jadwal guru maupun kelas.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Rombongan Belajar (Kelas) Target</label>
                  <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2 font-bold text-indigo-600 dark:text-indigo-400" onClick={handleSelectAllClasses}>
                    {selectedClassIds.length === classes.length ? 'Kosongkan Semua' : 'Pilih Semua'}
                  </Button>
                </div>

                <div className="max-h-[160px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
                  {classes.map((c) => {
                    const isSelected = selectedClassIds.includes(c.value);
                    return (
                      <button
                        key={c.value}
                        onClick={() => handleToggleClass(c.value)}
                        className={`p-2.5 rounded-xl border text-xs text-left font-bold transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <span>{c.label.split(' - ')[0]}</span>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <span className="text-[9px]">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">Bersihkan & Timpa Jadwal Lama?</span>
                  <span className="text-[10px] text-slate-500">Menghapus seluruh jadwal lama pada rombel terpilih sebelum menerapkan yang baru.</span>
                </div>
                <button
                  onClick={() => setOverwrite(!overwrite)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    overwrite ? 'bg-indigo-600' : 'bg-slate-250 dark:bg-slate-850'
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ${
                    overwrite ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleStartGeneration} 
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl font-bold flex items-center gap-1.5"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Mulai Generasi Otomatis
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && solverResult && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-5"
            >
              {/* Score panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/30 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Persentase Terisi</span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{solverResult.success_rate}%</div>
                  <span className="text-[10px] text-slate-400 block">{solverResult.total_placed} dari {solverResult.total_cards} JP terpasang</span>
                </div>

                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/60 dark:border-indigo-900/30 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Berhasil Ditempatkan</span>
                  <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{solverResult.total_placed} JP</div>
                  <span className="text-[10px] text-slate-400 block">Jadwal baru siap di-apply</span>
                </div>

                <div className="p-4 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/60 dark:border-rose-900/30 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Gagal/Belum Terisi</span>
                  <div className="text-3xl font-black text-rose-600 dark:text-rose-450">{solverResult.total_unplaced} JP</div>
                  <span className="text-[10px] text-slate-400 block">Memerlukan penyesuaian manual</span>
                </div>
              </div>

              {/* Unplaced Cards Warnings */}
              {solverResult.unplaced_cards.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Peringatan Kartu Jam yang Belum Terpasang:
                  </span>
                  
                  <div className="max-h-[160px] overflow-y-auto border border-amber-100 dark:border-amber-900/30 rounded-2xl divide-y divide-amber-50 dark:divide-amber-950 bg-amber-50/20 dark:bg-amber-950/5">
                    {solverResult.unplaced_cards.map((c: any, idx: number) => (
                      <div key={idx} className="p-3 text-[11px] leading-relaxed text-amber-800 dark:text-amber-400 flex justify-between gap-4">
                        <div>
                          <strong className="text-slate-800 dark:text-white">{c.kelas_name}</strong> - {c.mapel_name} ({c.guru_name})
                        </div>
                        <span className="text-[10px] font-bold shrink-0">{c.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Schedules preview summary */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Daftar Penjadwalan yang Dihasilkan</span>
                <div className="max-h-[200px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {solverResult.generated_schedules.map((s: any, idx: number) => (
                    <div key={idx} className="px-4 py-3 text-[11px] flex justify-between items-center gap-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <div>
                        <strong className="text-slate-800 dark:text-white">{s.kelas_name}</strong>
                        <span className="text-slate-400 mx-1.5">|</span>
                        <span>{s.mapel_name}</span>
                        <span className="text-slate-400 mx-1.5">|</span>
                        <span className="text-slate-500 font-medium">{s.guru_name}</span>
                      </div>
                      <Badge className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-none font-bold text-[9px] tracking-wide scale-95 uppercase">
                        {s.hari} - JAM KE-{s.slot_index}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali
                </Button>
                
                <Button 
                  onClick={handleApplyGeneration} 
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl font-bold flex items-center gap-1.5"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Terapkan Jadwal ke Sistem
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8 space-y-6 max-w-sm mx-auto"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-black text-slate-800 dark:text-white">Generasi Jadwal Sukses!</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Jadwal baru berhasil didistribusikan bebas bentrok dan tersimpan aman di database Absenta.id.
                </p>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={onClose} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-1"
                >
                  Selesai & Tutup
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </Modal>
  );
};
