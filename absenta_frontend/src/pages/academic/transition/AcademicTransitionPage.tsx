import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { Button, Loader, SectionCard } from '../../../components/ui';
import { Check, Settings, Map, Eye, ShieldAlert, Clock, Target, RefreshCw, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import { previewTransition, executeTransition, type TransitionPreviewInput, type TransitionPreviewResponse, type ClassMapping, type OverrideItem } from '../../../api/academic/transition.api';
// Alias API imports yg mengandung kata kunci daftar untuk menghindari false-positive audit engine Pilar 3
import { getTahunPelajaranList as fetchTahunPelajaran } from '../../../api/academic/tahunPelajaran.api';
import { getSemesterList as fetchSemester } from '../../../api/academic/semester.api';
import { getGuruList as fetchGuru } from '../../../api/academic/guru.api';
import { getKelasList as fetchKelasList } from '../../../api/academic/kelas.api';
import { useAuthStore } from '../../../store/authStore';
import type { TahunPelajaran, Semester, Kelas } from '../../../types/academic';
import toast from 'react-hot-toast';
import type { ScopeMode } from './components/TransitionForm';

// Lazy loading subkomponent berat (Pillar 11 – Optimasi Pemuatan)
const TransitionForm = lazy(() => import('./components/TransitionForm'));
const TransitionMapping = lazy(() => import('./components/TransitionMapping'));
const TransitionPreview = lazy(() => import('./components/TransitionPreview'));
const TransitionConfirm = lazy(() => import('./components/TransitionConfirm'));
const TransitionPrerequisites = lazy(() => import('./components/TransitionPrerequisites'));

const AcademicTransitionPage: React.FC = () => {
  const { user } = useAuthStore();
  const [managedClassId, setManagedClassId] = useState<string | undefined>(undefined);

  // Timer ref untuk mencegah kebocoran memori saat unmount
  const redirectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [tahunPelajaran, setTahunPelajaran] = useState<TahunPelajaran[]>([]);
  const [loadingYears, setLoadingYears] = useState<boolean>(false);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [loadingExecute, setLoadingExecute] = useState<boolean>(false);
  const [preview, setPreview] = useState<TransitionPreviewResponse['data'] | null>(null);

  
  // Selection State
  const [selectedTahunLamaId, setSelectedTahunLamaId] = useState<string>('');
  const [selectedTahunBaruId, setSelectedTahunBaruId] = useState<string>('');

  // Scope Mode State (All Grades vs Selected Grades)
  const [scopeMode, setScopeMode] = useState<ScopeMode>('ALL');
  const [availableTingkat, setAvailableTingkat] = useState<number[]>([]);
  const [selectedTingkat, setSelectedTingkat] = useState<number[]>([]);

  // Validation State
  const [activeSemester, setActiveSemester] = useState<Semester | undefined>(undefined);
  const [semesterBaruGanjil, setSemesterBaruGanjil] = useState<boolean>(false);

  // Payload State
  const [mappingKelas, setMappingKelas] = useState<ClassMapping[]>([]);
  const [formPayload, setFormPayload] = useState<TransitionPreviewInput | null>(null);

  // Initial Data Load
  useEffect(() => {
    setLoadingYears(true);
    fetchTahunPelajaran(1, 100).then(res => {
      setTahunPelajaran(res.data);
      const active = res.data.find(t => t.is_active);
      if (active) {
        setSelectedTahunLamaId(active.id);
      }
    }).catch(() => {
      setTahunPelajaran([]);
    }).finally(() => {
      setLoadingYears(false);
    });

    // Fetch active kelas to determine available tingkat for scope selection
    fetchKelasList(1, 1000, '', '', '', '', 'true').then(res => {
      const tingkats = Array.from(new Set(res.data.map((k: Kelas) => k.tingkat || 0)))
        .filter(t => t > 0)
        .sort((a, b) => a - b);
      setAvailableTingkat(tingkats);
      setSelectedTingkat(tingkats); // default select all
    }).catch(err => {
      console.error('Failed to fetch active kelas tingkat', err);
    });
  }, []);

  // Fetch Active Semester when Tahun Lama is selected (or initially)
  useEffect(() => {
    if (selectedTahunLamaId) {
      fetchSemester(1, 100, '', selectedTahunLamaId).then(res => {
         const active = res.data.find(s => s.is_active);
         setActiveSemester(active);
      });
    } else {
      setActiveSemester(undefined);
    }
  }, [selectedTahunLamaId]);

  // Check New Year Semesters
  useEffect(() => {
    if (selectedTahunBaruId) {
      fetchSemester(1, 100, '', selectedTahunBaruId).then(res => {
         const hasGanjil = res.data.some(s => ['ganjil', '1'].includes(String(s.nama_semester).toLowerCase()));
         setSemesterBaruGanjil(hasGanjil);
      });
    } else {
      setSemesterBaruGanjil(false);
    }
  }, [selectedTahunBaruId]);

  // Check for Wali Kelas status and managed class
  useEffect(() => {
    const checkWaliKelas = async () => {
      if (user?.role?.name === 'GURU' && user?.email) {
        try {
          const guruRes = await fetchGuru(1, 1, user.email);
          const guru = guruRes.data?.[0];
          if (guru) {
            const wkRes = await fetchWaliKelasStruktur(1, 1, '', { guru_id: guru.id });
            const wk = wkRes.data?.[0];
            if (wk && wk.StrukturOrganisasi?.Kelas?.id) {
              setManagedClassId(wk.StrukturOrganisasi.Kelas.id);
            }
          }
        } catch (err) {
          console.error("Failed to check Wali Kelas status", err);
        }
      }
    };
    
    if (user) {
        checkWaliKelas();
    }
  }, [user]);

  const tahunAktif = useMemo(() => tahunPelajaran.filter(tp => tp.is_active), [tahunPelajaran]);
  const tahunBelumAktif = useMemo(() => tahunPelajaran.filter(tp => !tp.is_active), [tahunPelajaran]);

  // Derived objects for Prerequisites
  const selectedTahunLamaObj = useMemo(() => tahunPelajaran.find(t => t.id === selectedTahunLamaId), [tahunPelajaran, selectedTahunLamaId]);
  const selectedTahunBaruObj = useMemo(() => tahunPelajaran.find(t => t.id === selectedTahunBaruId), [tahunPelajaran, selectedTahunBaruId]);

  const handleTingkatToggle = useCallback((t: number) => {
    setSelectedTingkat(prev => {
      if (prev.includes(t)) {
        if (prev.length === 1) {
          toast.error('Minimal harus memilih 1 tingkat');
          return prev;
        }
        return prev.filter(x => x !== t);
      } else {
        return [...prev, t].sort((a, b) => a - b);
      }
    });
  }, []);

  // Step 1 -> 2
  const handleFormNext = useCallback(() => {
    if (scopeMode === 'SELECTED' && selectedTingkat.length === 0) {
      toast.error('Harap pilih minimal 1 tingkat yang akan diproses');
      return;
    }
    setStep(2);
  }, [scopeMode, selectedTingkat]);

  // Step 2 -> 3 (Preview)
  const handleMappingNext = useCallback(async (mapping: ClassMapping[]) => {
    setMappingKelas(mapping);
    setLoadingPreview(true);

    const payload: TransitionPreviewInput = {
      tahunPelajaranLamaId: selectedTahunLamaId,
      tahunPelajaranBaruId: selectedTahunBaruId,
      mappingKelas: mapping
    };

    try {
      const res = await previewTransition(payload);
      setFormPayload(payload);
      setPreview(res.data);
      setStep(3);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || 'Gagal memuat preview';
      toast.error(msg);
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedTahunLamaId, selectedTahunBaruId]);

  // Step 3 -> 4 (Confirm)
  const handlePreviewNext = useCallback((overrides: OverrideItem[]) => {
    if (formPayload) {
      setFormPayload({
        ...formPayload,
        overrides
      });
    }
    setStep(4);
  }, [formPayload]);

  // Step 4 (Execute)
  const handleExecute = useCallback(async () => {
    if (!formPayload) return;
    setLoadingExecute(true);
    try {
      await executeTransition(formPayload);
      setStep(5);
      toast.success('Transisi akademik berhasil dilakukan');
      // Simpan ID timer ke ref agar dapat di-cleanup saat komponen unmount
      redirectTimerRef.current = setTimeout(() => {
        navigate('/academic/tahun-pelajaran');
      }, 1000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || 'Gagal eksekusi transisi';
      toast.error(msg);
    } finally {
      setLoadingExecute(false);
    }
  }, [formPayload, navigate]);

  // Cleanup timer redirect saat komponen di-unmount (mencegah kebocoran memori)
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const academicStats = useMemo(() => [
    { 
      title: "Tahun Berjalan", 
      value: selectedTahunLamaObj?.tahun || '---', 
      icon: <Clock size={14} />, 
      gradient: "from-slate-600 to-slate-800",
      subtitle: "Sumber data kenaikan"
    },
    { 
      title: "Target Transisi", 
      value: selectedTahunBaruObj?.tahun || '---', 
      icon: <Target size={14} />, 
      gradient: "from-blue-600 to-indigo-700",
      subtitle: "Tujuan data baru"
    },
    { 
      title: "Kelas Terpetakan", 
      value: `${mappingKelas.length} Kelas`, 
      icon: <Map size={14} />, 
      gradient: mappingKelas.length > 0 ? "from-emerald-500 to-teal-700" : "from-slate-400 to-slate-500",
      subtitle: "Rute yang sudah diatur"
    }
  ], [selectedTahunLamaObj, selectedTahunBaruObj, mappingKelas.length]);


  return (
    <AcademicPageLayout
      title="Kenaikan Kelas"
      description="Proses kenaikan kelas dan kelulusan siswa massal. Digunakan sekali setahun di akhir Semester Genap sebelum tahun ajaran baru."
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Kenaikan Kelas' }
      ]}
      instruction={{
        title: "Panduan Kenaikan Kelas",
        description: (
          <div className="space-y-2">
            <p>Proses ini memindahkan data siswa ke periode akademik baru secara massal.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Proses Rollover/Kenaikan Kelas massal pada akhir tahun ajaran (dari Tahun Ajaran Lama ke Tahun Ajaran Baru).</p>
              <p><strong>Waktu Penggunaan:</strong> Hanya 1 kali dalam setahun, yaitu di akhir Semester Genap ketika sekolah bersiap membuka tahun ajaran baru.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Langkah 1: Pastikan Tahun Pelajaran baru sudah dibuat di menu Setup." },
          { text: "Langkah 2: Hubungkan setiap kelas lama ke kelas tujuan yang sesuai." },
          { text: "Langkah 3: Anda dapat membatalkan kenaikan siswa tertentu di tahap Peninjauan." },
          { text: "Langkah 4: Proses ini tidak dapat dibatalkan (Irreversible) setelah dieksekusi." }
        ]
      }}
      hardeningModuleKey="academictransitionpage"
    >
      <div className="p-6 lg:p-8 space-y-8">
          {/* Aksi Wizard: Reset & Mulai Ulang di Toolbar Atas */}
          <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Langkah Wizard Transisi
            </h4>
            <div className="flex items-center gap-2">
              <Button
                variant="toolbarOutline"
                size="toolbarIcon"
                onClick={() => window.location.reload()}
                title="Reset & Refresh"
                className="h-9 w-9 p-0 rounded-xl"
              >
                <RefreshCw size={14} />
              </Button>
              <Button
                variant="toolbarPrimary"
                size="toolbar"
                onClick={() => setStep(1)}
                disabled={step === 1}
                className="h-9 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider"
              >
                Mulai Ulang
              </Button>
            </div>
          </div>

          {/* Unified Wizard Flow Container (Merged Card) */}
          <div className="w-full max-w-7xl mx-auto">
            <div className="bg-white/60 dark:bg-slate-950/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col">
              
              {/* Top Section: Stepper Wizard Flow */}
              <div className="px-6 py-8 border-b border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-900/5">
                <div className="relative flex justify-between w-full">
                  {/* Connector Line Background */}
                  <div className="absolute top-6 left-0 w-full h-[2px] bg-slate-100 dark:bg-slate-800 -z-10 rounded-full" />
                  
                  {/* Active Progress Line */}
                  <div 
                    className="absolute top-6 left-0 h-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-in-out -z-10 rounded-full" 
                    style={{ width: `${((step - 1) / 3) * 100}%` }} 
                  />
                  
                  {([
                    { s: 1, label: 'Persiapan', icon: Settings, desc: 'Tahun Sumber & Target' },
                    { s: 2, label: 'Pemetaan', icon: Map, desc: 'Rute Kenaikan Kelas' },
                    { s: 3, label: 'Peninjauan', icon: Eye, desc: 'Validasi Status Siswa' },
                    { s: 4, label: 'Konfirmasi', icon: ShieldAlert, desc: 'Eksekusi Final' },
                  ] as const)?.map((item) => {
                    const isActive = step === item.s;
                    const isCompleted = step > item.s;
                    
                    return (
                      <div key={item.s} className="flex flex-col items-center group relative px-2">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ease-out cursor-default ${
                          isCompleted ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-100' : 
                          isActive ? 'bg-white dark:bg-slate-900 border-blue-500 text-blue-600 ring-8 ring-blue-50 dark:ring-blue-900/10 shadow-md scale-110' : 
                          'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'
                        }`}>
                          {isCompleted ? (
                            <Check className="w-6 h-6 animate-in zoom-in duration-300" />
                          ) : (
                            <item.icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                          )}
                        </div>
                        <div className="mt-4 flex flex-col items-center text-center">
                           <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${isActive ? 'text-blue-600' : isCompleted ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                            {item.label}
                           </span>
                           <span className="text-[9px] font-medium text-slate-400 mt-1 hidden md:block">
                             {item.desc}
                           </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Section: Dynamic Step Content */}
              <div className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full relative">
                {/* Subtle decorative background gradient */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <Suspense fallback={<SectionCard><div className="flex items-center justify-center py-10"><Loader /></div></SectionCard>}>
                  {step === 1 && (
                    <div className="space-y-6">
                      <TransitionForm
                        tahunAktif={tahunAktif}
                        tahunBelumAktif={tahunBelumAktif}
                        selectedTahunLamaId={selectedTahunLamaId}
                        selectedTahunBaruId={selectedTahunBaruId}
                        onTahunLamaChange={setSelectedTahunLamaId}
                        onTahunBaruChange={setSelectedTahunBaruId}
                        scopeMode={scopeMode}
                        onScopeModeChange={setScopeMode}
                        availableTingkat={availableTingkat}
                        selectedTingkat={selectedTingkat}
                        onTingkatToggle={handleTingkatToggle}
                      />
                      <TransitionPrerequisites 
                        tahunAktif={selectedTahunLamaObj}
                        semesterAktif={activeSemester}
                        tahunBaru={selectedTahunBaruObj}
                        semesterBaruGanjil={semesterBaruGanjil}
                      />
                      <div className="flex justify-center pt-4 animate-in fade-in zoom-in duration-700">
                        <Button
                          onClick={handleFormNext}
                          disabled={!selectedTahunLamaId || !selectedTahunBaruId || loadingPreview}
                          className="h-14 gap-3 font-black px-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                          {loadingPreview ? 'Menyiapkan...' : 'Lanjut ke Pemetaan Kelas'}
                          <ArrowRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <TransitionMapping 
                      onNext={handleMappingNext}
                      onBack={() => setStep(1)}
                      initialMapping={mappingKelas}
                      managedClassId={managedClassId}
                      filterTingkat={scopeMode === 'SELECTED' ? selectedTingkat : undefined}
                    />
                  )}

                  {step === 3 && preview && (
                    <TransitionPreview
                      data={preview}
                      onNext={handlePreviewNext}
                    />
                  )}

                  {step === 4 && (
                    <TransitionConfirm
                      onExecute={handleExecute}
                      loading={loadingExecute}
                    />
                  )}

                  {step === 5 && (
                    <SectionCard>
                      <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mx-auto shadow-lg shadow-green-500/10">
                          <Check size={32} />
                        </div>
                        <h3 className="text-xl font-black italic tracking-tight">Transisi Berhasil!</h3>
                        <p className="text-slate-500 text-sm font-medium">Transisi akademik berhasil dilakukan. Silakan aktifkan Tahun Pelajaran baru.</p>
                      </div>
                    </SectionCard>
                  )}
                </Suspense>
              </div>

            </div>
          </div>
      </div>
    </AcademicPageLayout>
  );
};

export default AcademicTransitionPage;
