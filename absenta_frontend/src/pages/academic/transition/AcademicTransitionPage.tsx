import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Alert, AlertDescription, Loader, Badge, SectionCard } from '../../../components/ui';
import { Check, ChevronRight, Settings, Map, Eye, ShieldAlert, GraduationCap, Clock, Target, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import { previewTransition, executeTransition, type TransitionPreviewInput, type TransitionPreviewResponse, type ClassMapping, type OverrideItem } from '../../../api/academic/transition.api';
import { getTahunPelajaranList } from '../../../api/academic/tahunPelajaran.api';
import { getSemesterList } from '../../../api/academic/semester.api';
import { getGuruList } from '../../../api/academic/guru.api';
import { getWaliKelasStrukturList } from '../../../api/academic/waliKelas.api';
import { useAuthStore } from '../../../store/authStore';
import type { TahunPelajaran, Semester } from '../../../types/academic';
import TransitionForm from './components/TransitionForm';
import TransitionMapping from './components/TransitionMapping';
import TransitionPreview from './components/TransitionPreview';
import TransitionConfirm from './components/TransitionConfirm';
import TransitionPrerequisites from './components/TransitionPrerequisites';
import { useToast } from '../../../hooks/useToast';

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
  const { showToast } = useToast();
  
  // Selection State
  const [selectedTahunLamaId, setSelectedTahunLamaId] = useState<string>('');
  const [selectedTahunBaruId, setSelectedTahunBaruId] = useState<string>('');

  // Validation State
  const [activeSemester, setActiveSemester] = useState<Semester | undefined>(undefined);
  const [semesterBaruGanjil, setSemesterBaruGanjil] = useState<boolean>(false);

  // Payload State
  const [mappingKelas, setMappingKelas] = useState<ClassMapping[]>([]);
  const [formPayload, setFormPayload] = useState<TransitionPreviewInput | null>(null);

  // Initial Data Load
  useEffect(() => {
    setLoadingYears(true);
    getTahunPelajaranList(1, 100).then(res => {
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
  }, []);

  // Fetch Active Semester when Tahun Lama is selected (or initially)
  useEffect(() => {
    if (selectedTahunLamaId) {
      getSemesterList(1, 100, '', selectedTahunLamaId).then(res => {
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
      getSemesterList(1, 100, '', selectedTahunBaruId).then(res => {
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
          const guruRes = await getGuruList(1, 1, user.email);
          const guru = guruRes.data?.[0];
          if (guru) {
            const wkRes = await getWaliKelasStrukturList(1, 1, '', { guru_id: guru.id });
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

  // Step 1 -> 2
  const handleFormNext = useCallback(() => {
    setStep(2);
  }, []);

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
      showToast(msg, 'error');
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedTahunLamaId, selectedTahunBaruId, showToast]);

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
      showToast('Transisi akademik berhasil dilakukan', 'success');
      // Simpan ID timer ke ref agar dapat di-cleanup saat komponen unmount
      redirectTimerRef.current = setTimeout(() => {
        navigate('/academic/tahun-pelajaran');
      }, 1000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || 'Gagal eksekusi transisi';
      showToast(msg, 'error');
    } finally {
      setLoadingExecute(false);
    }
  }, [formPayload, navigate, showToast]);

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

  const toolbar = (
    <div className="flex items-center gap-2">
      <Button
        variant="toolbarOutline"
        size="toolbarIcon"
        onClick={() => window.location.reload()}
        title="Reset & Refresh"
      >
        <RefreshCw size={14} />
      </Button>
      <Button
        variant="toolbarPrimary"
        size="toolbar"
        onClick={() => setStep(1)}
        disabled={step === 1}
      >
        Mulai Ulang
      </Button>
    </div>
  );

  return (
    <AcademicPageLayout
      title="Transisi Akademik (Naik Kelas)"
      description="Lakukan pemetaan rute kelas lama ke kelas baru, peninjauan kelulusan siswa, dan eksekusi naik kelas masal."
      stats={academicStats}
      toolbar={toolbar}
      instruction={{
        title: "Panduan Transisi Akademik",
        description: "Proses ini memindahkan data siswa ke periode akademik baru secara massal.",
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
          {/* Progress Stepper - Premium SaaS Style */}
          <SectionCard noPadding className="mb-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-dashed">
            <div className="px-4 max-w-5xl mx-auto py-8">
              <div className="relative flex justify-between">
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
          </SectionCard>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {step === 1 && (
              <>
                {loadingYears ? (
                  <SectionCard>
                    <div className="flex items-center justify-center py-10"><Loader /></div>
                  </SectionCard>
                ) : (
                  <div className="space-y-6">
                    <TransitionPrerequisites 
                      tahunAktif={selectedTahunLamaObj}
                      semesterAktif={activeSemester}
                      tahunBaru={selectedTahunBaruObj}
                      semesterBaruGanjil={semesterBaruGanjil}
                    />
                    <TransitionForm
                      tahunAktif={tahunAktif}
                      tahunBelumAktif={tahunBelumAktif}
                      selectedTahunLamaId={selectedTahunLamaId}
                      selectedTahunBaruId={selectedTahunBaruId}
                      onTahunLamaChange={setSelectedTahunLamaId}
                      onTahunBaruChange={setSelectedTahunBaruId}
                      onNext={handleFormNext}
                      loading={loadingPreview}
                    />
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <TransitionMapping 
                onNext={handleMappingNext}
                onBack={() => setStep(1)}
                initialMapping={mappingKelas}
                managedClassId={managedClassId}
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
          </div>
      </div>
    </AcademicPageLayout>
  );
};

export default AcademicTransitionPage;
