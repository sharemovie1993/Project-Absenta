import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getStrukturTree } from '@/api/academic/strukturOrganisasi.api';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useJenjang } from '@/hooks/useJenjang';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Button } from '@/components/ui/Button';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { SectionCard } from '@/components/ui/SectionCard';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { 
  Crown,
  Building2,
  Briefcase,
  Wrench,
  Laptop,
  UserCheck,
  Sparkles,
  HeartHandshake,
  ShieldCheck,
  ClipboardList,
  ShoppingCart
} from 'lucide-react';
import { StrukturDiagram } from '@/components/academic/struktur/StrukturDiagram';

const TABS = [
  { id: 'PIMPINAN', label: 'Pimpinan', icon: Crown, codes: ['KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'HUBIN', 'SARPRAS', 'TU_KEPALA', 'BKK'] },
  { id: 'TATA_USAHA', label: 'Tata Usaha', icon: Building2, codes: ['TU_PERSURATAN', 'TU_KEUANGAN', 'TU_KEPEGAWAIAN', 'TU_SARPRAS'] },
  { id: 'KAPROG', label: 'Kaprog', icon: Briefcase, codes: ['KAPROG'] },
  { id: 'KABENG', label: 'Kabeng', icon: Wrench, codes: ['KABENG'] },
  { id: 'TOOLMAN', label: 'Toolman', icon: Laptop, codes: ['TOOLMAN'] },
  { id: 'WALI_KELAS', label: 'Wali Kelas', icon: UserCheck, codes: ['WALIKELAS'] },
  { id: 'PEMBINA_ESKUL', label: 'Pembina Eskul', icon: Sparkles, codes: ['PEMBINA_ESKUL'] },
  { id: 'BP_BK', label: 'BP/BK', icon: HeartHandshake, codes: ['BPBK'] },
  { id: 'GERBANG', label: 'Gerbang', icon: ShieldCheck, codes: ['GERBANG'] },
  { id: 'PETUGAS_KELAS', label: 'Petugas Kelas', icon: ClipboardList, codes: ['PETUGAS_KELAS', 'PETUGAS_ABSENSI'] },
  { id: 'KOPERASI', label: 'Koperasi', icon: ShoppingCart, codes: ['KETUA_KOPERASI', 'BENDAHARA_KOPERASI', 'SEKRETARIS_KOPERASI', 'MANAJER_TOKO_KOPERASI', 'PENGAWAS_KOPERASI'] }
];

const StrukturOrganisasiPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user } = useAuthStore();
  const { isKurikulum, isKepalaSekolah, isAdmin, can } = useCapabilities();
  const { jenjang } = useJenjang();

  const canManageAcademic = isAdmin || isKurikulum || isKepalaSekolah || can('academic.structures.view.tree') || can('academic.structures.view.list');

  // Pre-warm data cache & loading guard (Pillar 9 & 31)
  const { isLoading } = useQuery({
    queryKey: ['strukturTree'],
    queryFn: getStrukturTree,
    enabled: canManageAcademic,
    staleTime: 5 * 60 * 1000
  });

  const rawJenjang = useMemo(() => (jenjang || 'SMA').toUpperCase(), [jenjang]);

  const visibleTabs = useMemo(() => {
    return TABS.filter(tab => {
      // 1. Jika bukan SMK/MAK, sembunyikan Kaprog, Kabeng, Toolman
      if (['KAPROG', 'KABENG', 'TOOLMAN'].includes(tab.id) && !['SMK', 'MAK'].includes(rawJenjang)) {
        return false;
      }
      // 2. Jika SD/MI, sembunyikan BP/BK
      if (tab.id === 'BP_BK' && ['SD', 'MI'].includes(rawJenjang)) {
        return false;
      }
      return true;
    });
  }, [rawJenjang]);

  // Tab State — default dari query param ?tab= jika ada, fallback ke 'PIMPINAN'
  const initialTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    return tabParam && visibleTabs.some(t => t.id === tabParam) ? tabParam : 'PIMPINAN';
  }, [searchParams, visibleTabs]);

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const activeTabCodes = useMemo(() => {
    const tab = (visibleTabs || []).find(t => t.id === activeTab);
    return tab ? tab.codes : [];
  }, [activeTab, visibleTabs]);

  // Memoized Tab Change Handler for Performance Optimization (Pillar 3 DOM Churn Guard)
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
  }, []);

  const tabOptions = useMemo(() => {
    return (visibleTabs || []).map(tab => ({
      id: tab.id,
      label: tab.label,
      icon: tab.icon
    }));
  }, [visibleTabs]);

  const breadcrumbs = useMemo(() => [
    { label: 'Akademik' },
    { label: 'Struktur Organisasi' }
  ], []);

  if (!canManageAcademic) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <div className="flex items-center">
            <div className="ml-2">
              <h4 className="font-medium">Akses Ditolak</h4>
              <AlertDescription className="text-sm">
                Anda tidak memiliki izin untuk mengakses halaman Struktur Organisasi.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <AcademicPageLayout
      title="Struktur Organisasi"
      description="Kelola jabatan dan susunan pengurus sekolah. Digunakan setiap awal tahun ajaran baru atau saat ada pergantian jabatan."
      breadcrumbs={breadcrumbs}
      instruction={{
        title: "Panduan Struktur Organisasi",
        description: (
          <div className="space-y-2">
            <p>Mengatur pembagian tugas dan jabatan staf sekolah (seperti Kepala Sekolah, Waka Kurikulum, Kepala Program, dll).</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mengatur struktur pengurus dan jabatan staf sekolah.</p>
              <p><strong>Waktu Penggunaan:</strong> Setiap awal tahun ajaran baru atau jika ada perubahan susunan pengurus.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Pilih tab Jabatan untuk melihat pembagian divisi kepengurusan." },
          { text: "Ketuk tombol Tugaskan / Pensil pada kartu personil untuk memilih guru atau staf." }
        ]
      }}
      hardeningModuleKey="academic_struktur_organisasi"
    >
      <SectionCard fullWidth className="bg-transparent border-none p-0 shadow-none dark:bg-transparent min-w-0">
      <div className="space-y-6">
        {/* Navigation & Controls header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5">
            <TabSwitcher
              options={tabOptions}
              activeTab={activeTab}
              onChange={handleTabChange}
            />
          </div>

          {activeTab === 'PEMBINA_ESKUL' && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Button
                variant="outline"
                onClick={() => navigate('/attendance/anggota-kegiatan-eskul')}
                className="font-bold text-xs sm:text-sm h-9 sm:h-10 px-3.5 sm:px-5 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                Manajemen Eskul
              </Button>
            </div>
          )}
        </div>

        {/* Main Content Area: Protected by Skeleton & Loading Guard (Pillar 9) */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
          <React.Suspense fallback={<div className="p-8 text-center"><span className="text-sm font-bold text-slate-400 animate-pulse">Memuat Struktur...</span></div>}>
            <StrukturDiagram 
              activeTab={activeTab}
              activeCodes={activeTabCodes}
              refreshKey={0}
            />
          </React.Suspense>
        </div>
      </div>
      </SectionCard>
    </AcademicPageLayout>
  );
};

export default StrukturOrganisasiPage;
