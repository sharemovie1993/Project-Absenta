import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, SectionCard } from '../../../components/ui';
import { Check, Settings, Map, Eye, ShieldAlert, Clock, Target, RefreshCw, ArrowRight, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { previewTransition, executeTransition, type TransitionPreviewInput, type TransitionPreviewResponse, type ClassMapping, type OverrideItem } from '../../../api/academic/transition.api';
import { getTahunPelajaranList as fetchTahunPelajaran } from '../../../api/academic/tahunPelajaran.api';
import { getSemesterList as fetchSemester } from '../../../api/academic/semester.api';
import { getGuruList as fetchGuru } from '../../../api/academic/guru.api';
import { getKelasList as fetchKelasList } from '../../../api/academic/kelas.api';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import type { TahunPelajaran, Semester, Kelas } from '../../../types/academic';
import toast from 'react-hot-toast';
import type { ScopeMode } from './components/TransitionForm';

// Lazy loading subcomponents (Pilar 11)
const TransitionForm = lazy(() => import('./components/TransitionForm'));
const TransitionScope = lazy(() => import('./components/TransitionScope'));
const TransitionMapping = lazy(() => import('./components/TransitionMapping'));
const TransitionPreview = lazy(() => import('./components/TransitionPreview'));
const TransitionConfirm = lazy(() => import('./components/TransitionConfirm'));
const TransitionPrerequisites = lazy(() => import('./components/TransitionPrerequisites'));

// Zod Schema Validation Guard (Pilar 25)
const transitionFormSchema = z.object({
  tahunPelajaranLamaId: z.string().min(1, 'Pilih tahun pelajaran asal'),
  tahunPelajaranBaruId: z.string().min(1, 'Pilih tahun pelajaran tujuan'),
  mappingKelas: z.array(z.object({
    kelasLamaId: z.string(),
    kelasBaruId: z.string().nullable().optional(),
    isLulus: z.boolean().optional(),
  })).optional()
});

export const AcademicTransitionPage: React.FC = React.memo(() => {
  const { user } = useAuthStore();
  const { isTeacher } = useCapabilities();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [managedClassId, setManagedClassId] = useState<string | undefined>(undefined);
  const redirectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [step, setStep] = useState<number>(1);
  const [preview, setPreview] = useState<TransitionPreviewResponse['data'] | null>(null);

  // Selection State
  const [selectedTahunLamaId, setSelectedTahunLamaId] = useState<string>('');
  const [selectedTahunBaruId, setSelectedTahunBaruId] = useState<string>('');

  // Scope Mode State
  const [scopeMode, setScopeMode] = useState<ScopeMode>('ALL');
  const [selectedTingkat, setSelectedTingkat] = useState<number[]>([]);

  // Validation State
  const [activeSemester, setActiveSemester] = useState<Semester | undefined>(undefined);
  const [semesterBaruGanjil, setSemesterBaruGanjil] = useState<boolean>(false);

  // Payload State
  const [mappingKelas, setMappingKelas] = useState<ClassMapping[]>([]);
  const [formPayload, setFormPayload] = useState<TransitionPreviewInput | null>(null);

  // 1. Fetch Tahun Pelajaran via React Query (Pilar 31)
  const { data: tahunPelajaran = [], isLoading: loadingYears } = useQuery<TahunPelajaran[]>({
    queryKey: ['tahun-pelajaran-transition'],
    queryFn: async () => {
      const res = await fetchTahunPelajaran(1, 100);
      const list = res.data || [];
      const active = list.find(t => t.is_active);
      if (active && !selectedTahunLamaId) {
        setSelectedTahunLamaId(active.id);
      }
      return list;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Active Kelas for available tingkat
  const { data: availableTingkat = [] } = useQuery<number[]>({
    queryKey: ['active-kelas-tingkat'],
    queryFn: async () => {
      const res = await fetchKelasList(1, 1000, '', '', '', '', 'true');
      const tingkats = Array.from(new Set((res.data ?? [])?.map((k: Kelas) => k.tingkat || 0)))
        .filter(t => t > 0)
        .sort((a, b) => a - b);
      if (selectedTingkat.length === 0) {
        setSelectedTingkat(tingkats);
      }
      return tingkats;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Active Semester when Tahun Lama is selected
  useEffect(() => {
    if (selectedTahunLamaId) {
      fetchSemester(1, 100, '', selectedTahunLamaId).then(res => {
        const active = (res.data ?? []).find(s => s.is_active);
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
        const hasGanjil = (res.data ?? []).some(s => ['ganjil', '1'].includes(String(s.nama_semester).toLowerCase()));
        setSemesterBaruGanjil(hasGanjil);
      });
    } else {
      setSemesterBaruGanjil(false);
    }
  }, [selectedTahunBaruId]);

  const previewMutation = useMutation({
    mutationFn: async (payload: TransitionPreviewInput) => {
      const parsed = transitionFormSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || 'Data transisi belum valid');
      }
      return previewTransition(payload);
    },
    onSuccess: (res, variables) => {
      setFormPayload(variables);
      setPreview(res.data);
      setStep(4);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal memuat pratinjau transisi';
      toast.error(msg);
    }
  });

  const executeMutation = useMutation({
    mutationFn: async (payload: TransitionPreviewInput) => {
      return executeTransition(payload);
    },
    onSuccess: () => {
      setStep(6);
      toast.success('Transisi akademik berhasil dilakukan');
      queryClient.invalidateQueries({ queryKey: ['tahun-pelajaran'] });
      queryClient.invalidateQueries({ queryKey: ['tahun-pelajaran-transition'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });

      redirectTimerRef.current = setTimeout(() => {
        navigate('/academic/tahun-pelajaran');
      }, 1000);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Gagal eksekusi transisi';
      toast.error(msg);
    }
  });

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

  const handleFormNext = useCallback(() => {
    if (!selectedTahunLamaId || !selectedTahunBaruId) {
      toast.error('Harap pilih Tahun Pelajaran Lama dan Tahun Pelajaran Baru');
      return;
    }
    setStep(2);
  }, [selectedTahunLamaId, selectedTahunBaruId]);

  const handleScopeNext = useCallback(() => {
    if (scopeMode === 'SELECTED' && selectedTingkat.length === 0) {
      toast.error('Harap pilih minimal 1 tingkat yang akan diproses');
      return;
    }
    setStep(3);
  }, [scopeMode, selectedTingkat]);

  const handleMappingNext = useCallback((mapping: ClassMapping[]) => {
    setMappingKelas(mapping);
    const payload: TransitionPreviewInput = {
      tahunPelajaranLamaId: selectedTahunLamaId,
      tahunPelajaranBaruId: selectedTahunBaruId,
      mappingKelas: mapping
    };
    previewMutation.mutate(payload);
  }, [selectedTahunLamaId, selectedTahunBaruId, previewMutation]);

  const handlePreviewNext = useCallback((overrides: OverrideItem[]) => {
    if (formPayload) {
      setFormPayload({
        ...formPayload,
        overrides
      });
    }
    setStep(5);
  }, [formPayload]);

  const handleExecute = useCallback(() => {
    if (!formPayload) return;
    executeMutation.mutate(formPayload);
  }, [formPayload, executeMutation]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const selectedTahunLamaObj = useMemo(() => (tahunPelajaran ?? []).find(t => t.id === selectedTahunLamaId), [tahunPelajaran, selectedTahunLamaId]);
  const selectedTahunBaruObj = useMemo(() => (tahunPelajaran ?? []).find(t => t.id === selectedTahunBaruId), [tahunPelajaran, selectedTahunBaruId]);

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
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Kenaikan Kelas &amp; Rollover Akademik"
        description="Proses kenaikan kelas dan kelulusan siswa massal. Digunakan sekali setahun di akhir Semester Genap sebelum tahun ajaran baru."
        breadcrumbs={[
          { label: 'Akademik', path: '/academic' },
          { label: 'Kenaikan Kelas' }
        ]}
        stats={academicStats}
        instruction={{
          title: "Panduan Kenaikan Kelas",
          description: "Proses ini memindahkan data siswa ke periode akademik baru secara massal.",
          items: [
            { text: "Langkah 1: Pastikan Tahun Pelajaran baru sudah dibuat di menu Setup." },
            { text: "Langkah 2: Tentukan cakupan tingkat yang akan diproses." },
            { text: "Langkah 3: Hubungkan setiap kelas lama ke kelas tujuan yang sesuai." },
            { text: "Langkah 4: Anda dapat membatalkan kenaikan siswa tertentu di tahap Peninjauan." },
            { text: "Langkah 5: Proses ini tidak dapat dibatalkan (Irreversible) setelah dieksekusi." }
          ]
        }}
        hardeningModuleKey="academictransitionpage"
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-8 w-full min-w-0 max-w-full">
            {/* Wizard Steps Header */}
            <div className="flex justify-between items-center w-full min-w-0 max-w-full">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Langkah Wizard Transisi (5 Langkah)
              </h4>
              {step > 1 && step < 6 && (
                <Button
                  type="button"
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={() => setStep(1)}
                  className="rounded-xl font-bold"
                >
                  <RefreshCw size={12} className="mr-1" /> Mulai Ulang
                </Button>
              )}
            </div>

            {/* Wizard Step Body */}
            <div className="w-full min-w-0 max-w-full">
              {step === 1 && (
                <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat formulir...</div>}>
                  <div className="space-y-6">
                    <TransitionPrerequisites
                      activeSemester={activeSemester}
                      semesterBaruGanjil={semesterBaruGanjil}
                      tahunBaruSelected={Boolean(selectedTahunBaruId)}
                    />
                    <TransitionForm
                      tahunPelajaran={tahunPelajaran}
                      selectedTahunLamaId={selectedTahunLamaId}
                      selectedTahunBaruId={selectedTahunBaruId}
                      onSelectTahunLama={setSelectedTahunLamaId}
                      onSelectTahunBaru={setSelectedTahunBaruId}
                      onNext={handleFormNext}
                      loadingYears={loadingYears}
                    />
                  </div>
                </Suspense>
              )}

              {step === 2 && (
                <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat cakupan tingkat...</div>}>
                  <TransitionScope
                    scopeMode={scopeMode}
                    setScopeMode={setScopeMode}
                    availableTingkat={availableTingkat}
                    selectedTingkat={selectedTingkat}
                    onToggleTingkat={handleTingkatToggle}
                    onNext={handleScopeNext}
                    onBack={() => setStep(1)}
                  />
                </Suspense>
              )}

              {step === 3 && (
                <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat pemetaan kelas...</div>}>
                  <TransitionMapping
                    selectedTahunLamaId={selectedTahunLamaId}
                    selectedTahunBaruId={selectedTahunBaruId}
                    scopeMode={scopeMode}
                    selectedTingkat={selectedTingkat}
                    onNext={handleMappingNext}
                    onBack={() => setStep(2)}
                    loadingPreview={previewMutation.isPending}
                  />
                </Suspense>
              )}

              {step === 4 && preview && (
                <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat pratinjau...</div>}>
                  <TransitionPreview
                    preview={preview}
                    onNext={handlePreviewNext}
                    onBack={() => setStep(3)}
                  />
                </Suspense>
              )}

              {step === 5 && formPayload && (
                <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat konfirmasi...</div>}>
                  <TransitionConfirm
                    formPayload={formPayload}
                    previewData={preview}
                    onExecute={handleExecute}
                    onBack={() => setStep(4)}
                    loadingExecute={executeMutation.isPending}
                  />
                </Suspense>
              )}

              {step === 6 && (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                    <Check size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transisi Selesai!</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Siswa dan rombel berhasil dialihkan ke tahun ajaran baru. Mengalihkan ke halaman Tahun Pelajaran...
                  </p>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default AcademicTransitionPage;
