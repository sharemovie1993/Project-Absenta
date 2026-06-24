import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Button } from '../../../components/ui/Button';
import { Loader } from '../../../components/ui/Loader';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { ModalFooter } from '../../../components/ui/Modal';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { useToast } from '../../../hooks/useToast';
import { 
    CheckCircle2, 
    XCircle, 
    ArrowRight, 
    Calendar, 
    Clock, 
    Sparkles, 
    ShieldCheck, 
    ArrowRightCircle,
    ChevronRight,
    RefreshCw,
    X,
    AlertTriangle
} from 'lucide-react';
import { getTahunPelajaranList, getActiveTahunPelajaran, activateTahunPelajaran } from '../../../api/academic/tahunPelajaran.api';
import { getSemesterList, createSemester, setActiveSemester } from '../../../api/academic/semester.api';
import type { TahunPelajaran, Semester } from '../../../types/academic';
import { SectionCard, DetailRow } from './form/FormShared';

interface Props {
  onDone: () => void;
  onClose: () => void;
}

const SemesterTransitionWizard: React.FC<Props> = React.memo(({ onDone, onClose }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<number>(1);
  const [tahunPelajaran, setTahunPelajaran] = useState<TahunPelajaran[]>([]);
  const [activeYear, setActiveYear] = useState<TahunPelajaran | null>(null);
  const [activeSemester, setActiveSemesterState] = useState<Semester | null>(null);
  const [targetYearId, setTargetYearId] = useState<string>('');
  const [targetYear, setTargetYear] = useState<TahunPelajaran | null>(null);
  const [targetSemester, setTargetSemester] = useState<Semester | null>(null);
  const [targetExists, setTargetExists] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const tpRes = await getTahunPelajaranList(1, 100);
        const list = tpRes.data || [];
        setTahunPelajaran(list);
        const ay = await getActiveTahunPelajaran();
        setActiveYear(ay || null);
        if (ay?.id) {
          const semRes = await getSemesterList(1, 100, '', ay.id);
          const active = (semRes.data || []).find(s => s.is_active);
          setActiveSemesterState(active || null);
        }
      } catch {
        showToast('Gagal memuat data akademik', 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [showToast]);

  const mode = useMemo<'IN_YEAR' | 'CROSS_YEAR'>(() => {
    const name = String(activeSemester?.nama_semester || '').toLowerCase();
    if (name === 'ganjil' || name === '1') return 'IN_YEAR';
    if (name === 'genap' || name === '2') return 'CROSS_YEAR';
    return 'IN_YEAR';
  }, [activeSemester]);

  useEffect(() => {
    if (mode === 'IN_YEAR' && activeYear?.id) {
      getSemesterList(1, 100, '', activeYear.id).then(res => {
        const list = res.data || [];
        const genap = list.find(s => ['genap', '2'].includes(String(s.nama_semester).toLowerCase()));
        setTargetSemester(genap || null);
        setTargetExists(!!genap);
      });
      setTargetYearId(activeYear.id);
      setTargetYear(activeYear);
    }
  }, [mode, activeYear]);

  useEffect(() => {
    if (mode === 'CROSS_YEAR') {
      const candidates = (tahunPelajaran || []).filter(tp => !tp.is_active);
      const defaultTarget = candidates[0] || null;
      setTargetYearId(defaultTarget?.id || '');
      setTargetYear(defaultTarget);
    }
  }, [mode, tahunPelajaran]);

  useEffect(() => {
    if (mode === 'CROSS_YEAR' && targetYearId) {
      getSemesterList(1, 100, '', targetYearId).then(res => {
        const list = res.data || [];
        const ganjil = list.find(s => ['ganjil', '1'].includes(String(s.nama_semester).toLowerCase()));
        setTargetSemester(ganjil || null);
        setTargetExists(!!ganjil);
      });
    }
  }, [mode, targetYearId]);

  const handleExecute = useCallback(async () => {
    try {
      setSubmitting(true);
      
      // 1. Activate Year if Cross Year
      if (mode === 'CROSS_YEAR' && targetYearId && !targetYear?.is_active) {
        await activateTahunPelajaran(targetYearId);
      }

      // 2. Create Semester if not exists
      let semId = targetSemester?.id;
      if (!targetExists) {
        const nama = mode === 'IN_YEAR' ? 'Genap' : 'Ganjil';
        const res = await createSemester({ nama_semester: nama, tahun_pelajaran_id: targetYearId });
        semId = res.data.id;
      }

      // 3. Set Active Semester
      if (semId) {
        await setActiveSemester(semId);
        showToast('Transisi semester berhasil dilakukan', 'success');
        setStep(3);
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal melakukan transisi', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [mode, targetYearId, targetYear, targetSemester, targetExists, showToast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader size="lg" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Menyiapkan Jalur Transisi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Status Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SectionCard title="Kondisi Saat Ini" icon={Clock} className="md:col-span-1">
             <DetailRow icon={<Calendar size={14} />} label="Tahun" value={activeYear?.tahun || '-'} />
             <DetailRow icon={<Clock size={14} />} label="Semester" value={activeSemester?.nama_semester || '-'} />
          </SectionCard>
          
          <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
             <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-200" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100">Jalur Akselerasi</span>
                </div>
                <h3 className="text-2xl font-black leading-tight italic">
                    {mode === 'IN_YEAR' ? 'Ganjil → Genap' : 'Genap → Ganjil (Tahun Baru)'}
                </h3>
                <p className="text-blue-100/80 text-sm font-medium max-w-xs tracking-tight">
                    Sistem akan memindahkan fokus akademik secara otomatis ke periode berikutnya.
                </p>
             </div>
             <ArrowRight className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12" />
          </div>
      </div>

      {step === 1 && (
        <SectionCard title="Konfigurasi Tujuan" icon={ArrowRightCircle}>
          {mode === 'CROSS_YEAR' ? (
            <div className="space-y-4 md:col-span-2">
               <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 tracking-tight">
                    Transisi lintas tahun membutuhkan pemilihan tahun pelajaran baru yang sudah terdaftar.
                  </p>
               </div>
               <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Pilih Tahun Pelajaran Baru</label>
                  <SearchableSelect
                    value={targetYearId}
                    onValueChange={setTargetYearId}
                    options={(tahunPelajaran || []).filter(tp => !tp.is_active).map(tp => ({ label: tp.tahun, value: tp.id }))}
                    placeholder="Pilih Tahun..."
                    triggerClassName="h-12 text-sm font-bold rounded-xl border-2 border-slate-100 dark:border-slate-800"
                  />
               </div>
            </div>
          ) : (
            <div className="md:col-span-2 py-8 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-800">
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Target Terdeteksi: Semester Genap {activeYear?.tahun}</p>
            </div>
          )}
          
          <ModalFooter className="md:col-span-2 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button variant="toolbarOutline" onClick={onClose} size="toolbar">
                <X className="w-3.5 h-3.5 mr-2" /> Batalkan
            </Button>
            <Button 
                variant="toolbarPrimary" 
                onClick={() => setStep(2)} 
                disabled={mode === 'CROSS_YEAR' && !targetYearId}
                size="toolbar"
                className="px-10"
            >
                Lanjutkan <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </ModalFooter>
        </SectionCard>
      )}

      {step === 2 && (
        <SectionCard title="Validasi & Eksekusi" icon={ShieldCheck}>
           <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className={`p-5 rounded-xl border-2 transition-all ${targetExists ? 'border-green-100 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10' : 'border-amber-100 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-900/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status Semester</span>
                        {targetExists ? <CheckCircle2 size={16} className="text-green-600" /> : <RefreshCw size={16} className="text-amber-600 animate-spin" />}
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {targetExists ? 'Semester Sudah Terdaftar' : 'Akan Dibuat Otomatis'}
                    </p>
                 </div>
                 {mode === 'CROSS_YEAR' && (
                    <div className={`p-5 rounded-xl border-2 transition-all ${targetYear?.is_active ? 'border-green-100 bg-green-50/50' : 'border-blue-100 bg-blue-50/50'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status Tahun</span>
                            {targetYear?.is_active ? <CheckCircle2 size={16} className="text-green-600" /> : <ShieldCheck size={16} className="text-blue-600" />}
                        </div>
                        <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                            {targetYear?.is_active ? 'Tahun Sudah Aktif' : 'Akan Diaktifkan'}
                        </p>
                    </div>
                 )}
              </div>
              
              <Alert className="rounded-xl border-dashed bg-slate-50 dark:bg-slate-900/50">
                 <AlertDescription className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Klik tombol eksekusi di bawah untuk menerapkan perubahan. Proses ini akan mengubah status aktif di seluruh sistem.
                 </AlertDescription>
              </Alert>
           </div>

           <ModalFooter className="md:col-span-2 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <Button variant="toolbarOutline" onClick={() => setStep(1)} disabled={submitting} size="toolbar">
                  Kembali
              </Button>
              <Button 
                  variant="toolbarPrimary" 
                  onClick={handleExecute} 
                  disabled={submitting}
                  size="toolbar"
                  className="px-10"
              >
                  {submitting ? <Loader className="mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Eksekusi Transisi
              </Button>
           </ModalFooter>
        </SectionCard>
      )}

      {step === 3 && (
        <div className="py-12 text-center space-y-6 animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-3xl flex items-center justify-center text-green-600 dark:text-green-400 mx-auto shadow-xl shadow-green-500/10">
              <CheckCircle2 size={48} />
           </div>
           <div>
              <h2 className="text-2xl font-black italic tracking-tight">Transisi Selesai!</h2>
              <p className="text-slate-500 font-medium text-sm mt-1">Status akademik sistem telah diperbarui sepenuhnya.</p>
           </div>
           <Button variant="toolbarPrimary" size="toolbar" onClick={() => { onDone(); onClose(); }} className="px-12">
              Tutup & Selesai
           </Button>
        </div>
      )}
    </div>
  );
});

SemesterTransitionWizard.displayName = 'SemesterTransitionWizard';
export default SemesterTransitionWizard;

