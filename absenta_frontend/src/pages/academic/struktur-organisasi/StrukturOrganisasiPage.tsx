import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  getStrukturTree, 
  createStruktur,
  updateStruktur,
  deleteStruktur,
  type CreateStrukturInput,
  type UpdateStrukturInput,
  type StrukturOrganisasi 
} from '@/api/academic/strukturOrganisasi.api';
import { Loader } from '@/components/ui/Loader';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useJenjang } from '@/hooks/useJenjang';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Button } from '@/components/ui/Button';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import toast from 'react-hot-toast';
import { useConfirm } from '@/providers/ConfirmProvider';
import { SectionCard } from '@/components/ui/SectionCard';
import { 
  Plus, 
  LayoutGrid
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { StrukturDiagram } from '@/components/academic/struktur/StrukturDiagram';

const StrukturForm = lazy(() => import('@/components/academic/struktur/StrukturForm').then(m => ({ default: m.StrukturForm })));

const TABS = [
  { id: 'PIMPINAN', label: 'Pimpinan', codes: ['KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'HUBIN', 'SARPRAS', 'TU_KEPALA', 'BKK'] },
  { id: 'TATA_USAHA', label: 'Tata Usaha', codes: ['TU_PERSURATAN', 'TU_KEUANGAN', 'TU_KEPEGAWAIAN', 'TU_SARPRAS'] },
  { id: 'KAPROG', label: 'Kaprog', codes: ['KAPROG'] },
  { id: 'KABENG', label: 'Kabeng', codes: ['KABENG'] },
  { id: 'TOOLMAN', label: 'Toolman', codes: ['TOOLMAN'] },
  { id: 'WALI_KELAS', label: 'Wali Kelas', codes: ['WALIKELAS'] },
  { id: 'PEMBINA_ESKUL', label: 'Pembina Eskul', codes: ['PEMBINA_ESKUL'] },
  { id: 'BP_BK', label: 'BP/BK', codes: ['BPBK'] },
  { id: 'GERBANG', label: 'Gerbang', codes: ['GERBANG'] },
  { id: 'PETUGAS_KELAS', label: 'Petugas Kelas', codes: ['PETUGAS_KELAS', 'PETUGAS_ABSENSI'] },
  { id: 'KOPERASI', label: 'Koperasi', codes: ['KETUA_KOPERASI', 'BENDAHARA_KOPERASI', 'SEKRETARIS_KOPERASI', 'MANAJER_TOKO_KOPERASI', 'PENGAWAS_KOPERASI'] }
];

const StrukturOrganisasiPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const { confirm } = useConfirm();
  const { user } = useAuthStore();
  const { isKurikulum, isKepalaSekolah, isAdmin, can } = useCapabilities();
  const { jenjang, sekolah } = useJenjang();

  const isGlobalStrukturAdmin = isAdmin || isKurikulum || can('academic.structures.create') || can('academic.structures.update') || can('academic.structures.delete');
  const canManageAcademic = isAdmin || isKurikulum || isKepalaSekolah || can('academic.structures.view.tree') || can('academic.structures.view.list');

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

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StrukturOrganisasi | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Queries
  const { data: treeRes, isLoading: isTreeLoading } = useQuery({
    queryKey: ['strukturTree'],
    queryFn: getStrukturTree,
    enabled: canManageAcademic
  });

  const rawMap = useMemo(() => treeRes?.data || {}, [treeRes]);
  const allStrukturs = useMemo(() => Object.values(rawMap).flat() as StrukturOrganisasi[], [rawMap]);

  const activeTabCodes = useMemo(() => {
    const tab = visibleTabs.find(t => t.id === activeTab);
    return tab ? tab.codes : [];
  }, [activeTab, visibleTabs]);

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = async (values: CreateStrukturInput | UpdateStrukturInput) => {
    setIsSubmittingForm(true);
    try {
      if (editingItem) {
        await updateStruktur(editingItem.id, values);
        toast.success('Jabatan berhasil diperbarui');
      } else {
        await createStruktur(values as CreateStrukturInput);
        toast.success('Jabatan baru berhasil dibuat');
      }
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['strukturTree'] });
      queryClient.invalidateQueries({ queryKey: ['kurikulum-struktur'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    } catch (err: unknown) {
      const error = err as { message?: string } | null;
      toast.error(error?.message || 'Gagal menyimpan jabatan');
    } finally {
      setIsSubmittingForm(false);
    }
  };

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
          { text: "Pilih tab Jabatan untuk menambah atau mengubah daftar jabatan." },
          { text: "Pilih tab Personel untuk menugaskan guru ke jabatan tersebut." }
        ]
      }}
      hardeningModuleKey="academic_struktur_organisasi"
    >
      <SectionCard fullWidth className="bg-transparent border-none p-0 shadow-none dark:bg-transparent min-w-0">
      <div className="space-y-6">
        {/* Navigation & Controls header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <TabSwitcher
            options={visibleTabs?.map(tab => ({ id: tab.id, label: tab.label }))}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'PEMBINA_ESKUL' && (
              <Button
                variant="outline"
                onClick={() => navigate('/attendance/anggota-kegiatan-eskul')}
                className="font-bold text-sm h-10 px-5 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Kembali ke Manajemen Eskul
              </Button>
            )}
            {isGlobalStrukturAdmin && (
              <Button 
                onClick={handleOpenCreate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-bold text-sm h-10 px-5 flex items-center gap-2 group"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Tambah Jabatan</span>
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        {isTreeLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader size="lg" />
            <p className="text-sm text-slate-500 font-bold tracking-wide animate-pulse">Memuat Struktur Organisasi...</p>
          </div>
        ) : allStrukturs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border shadow-sm">
            <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-bold text-sm">Tidak ada data struktur organisasi.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
            <StrukturDiagram 
              activeTab={activeTab}
              activeCodes={activeTabCodes}
              refreshKey={0}
            />
          </div>
        )}
      </div>

      {/* MODAL: CREATE / EDIT JABATAN */}
      {isFormOpen && (
        <Modal 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
          title={editingItem ? 'Edit Jabatan Struktur' : 'Tambah Jabatan Baru'}
          size="lg"
        >
          <div className="pt-2">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
              <StrukturForm 
                initialData={editingItem}
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormOpen(false)}
                isLoading={isSubmittingForm}
              />
            </Suspense>
          </div>
        </Modal>
      )}
      </SectionCard>
    </AcademicPageLayout>
  );
};

export default StrukturOrganisasiPage;
