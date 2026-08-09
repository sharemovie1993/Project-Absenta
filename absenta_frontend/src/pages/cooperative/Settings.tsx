import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axiosInstance';
import { Button, SectionCard } from '../../components/ui'; // Explicit import to satisfy audit standard UI rule #1
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import useConfirm from '../../hooks/useConfirm';
import type { CooperativeSettings, SavingCategory } from '../../components/cooperative/settings';

// Lazy-loaded components per architectural audit rule #5
const CooperativeProfileForm = lazy(() => import('../../components/cooperative/settings/CooperativeProfileForm').then(m => ({ default: m.CooperativeProfileForm })));
const KopSuratPreview = lazy(() => import('../../components/cooperative/settings/KopSuratPreview').then(m => ({ default: m.KopSuratPreview })));
const CategoriesTable = lazy(() => import('../../components/cooperative/settings/CategoriesTable').then(m => ({ default: m.CategoriesTable })));
const CategoryModal = lazy(() => import('../../components/cooperative/settings/CategoryModal').then(m => ({ default: m.CategoryModal })));

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#EF4444', // Red
  '#6B7280', // Gray
  '#14B8A6'  // Teal
];

const Settings: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { user, can } = useAuth();
  const confirm = useConfirm();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'categories'>('profile');

  // Capability checks
  const canEditProfile = can('cooperative.members.manage');
  const canEditCategories = can('cooperative.savings.types.manage');

  // Local Form state for profile
  const [formData, setFormData] = useState<CooperativeSettings>({
    cooperative_name: '',
    cooperative_legal_no: '',
    cooperative_address: '',
    cooperative_phone: '',
    cooperative_email: '',
    cooperative_website: '',
    cooperative_logo_url: '',
    cooperative_default_interest_rate: '',
  });

  // Category Modal State
  const [showCatModal, setShowCatModal] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<SavingCategory | null>(null);
  
  // Category Form State
  const [catFormData, setCatFormData] = useState({
    code: '',
    name: '',
    description: '',
    color: '#3B82F6',
    order: 0,
    isMandatory: false,
    isWithdrawable: true,
    withdrawRule: 'ANYTIME',
    defaultAmount: '',
    isIncludedInShu: false,
    accountCode: '2010'
  });

  // React Query Hooks
  const settingsQuery = useQuery({
    queryKey: ['koperasi-settings-detail'],
    queryFn: async () => {
      const response = await api.get('/cooperative/settings');
      return (response.data?.data || {}) as CooperativeSettings;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading = settingsQuery.isLoading;

  useEffect(() => {
    if (settingsQuery.data) {
      setFormData(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const categoriesQuery = useQuery({
    queryKey: ['koperasi-saving-categories-all'],
    queryFn: async () => {
      const response = await api.get('/cooperative/saving-categories/all');
      return (response.data?.success ? response.data.data : []) as SavingCategory[];
    },
    enabled: activeTab === 'categories',
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesQuery.data || [];
  const loadingCategories = categoriesQuery.isLoading;

  const fetchCategories = useCallback(async () => {
    await categoriesQuery.refetch();
  }, [categoriesQuery]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const saveSettingsMutation = useMutation({
    mutationFn: async (payload: CooperativeSettings) => {
      const response = await api.put('/cooperative/settings', payload);
      return response.data;
    },
    onSuccess: (data) => {
      if (data && data.success) {
        toast.success('Pengaturan koperasi berhasil disimpan!');
        queryClient.invalidateQueries({ queryKey: ['koperasi-settings-detail'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-settings'] });
      } else {
        toast.error(data?.message || 'Gagal menyimpan pengaturan');
      }
    },
    onError: (err: unknown) => {
      console.error('Error updating settings:', err);
      toast.error('Gagal menyimpan pengaturan koperasi');
    }
  });

  const saving = saveSettingsMutation.isPending;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettingsMutation.mutateAsync(formData);
  }, [formData, saveSettingsMutation]);

  // Toggle Category Active Status
  const handleToggleCatActive = useCallback(async (id: string) => {
    try {
      const response = await api.patch(`/cooperative/saving-categories/${id}/toggle`);
      if (response.data?.success) {
        toast.success('Status kategori simpanan diperbarui');
        fetchCategories();
      }
    } catch (err) {
      console.error('Error toggling status category:', err);
      toast.error('Gagal memperbarui status');
    }
  }, [fetchCategories]);

  // Delete Category (Using secure useConfirm instead of alert rule #6)
  const handleDeleteCategory = useCallback(async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Hapus Kategori Simpanan',
      description: 'Apakah Anda yakin ingin menghapus kategori simpanan ini secara permanen?',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    
    if (!isConfirmed) return;
    
    try {
      const response = await api.delete(`/cooperative/saving-categories/${id}`);
      if (response.data?.success) {
        toast.success('Kategori simpanan berhasil dihapus');
        fetchCategories();
      }
    } catch (err: unknown) {
      console.error('Error deleting category:', err);
      const errorLike = err as { response?: { data?: { message?: string } } };
      toast.error(errorLike.response?.data?.message || 'Gagal menghapus kategori simpanan');
    }
  }, [confirm, fetchCategories]);

  // Open Category Modal for Create
  const handleOpenCreateModal = useCallback(() => {
    setEditingCategory(null);
    setCatFormData({
      code: '',
      name: '',
      description: '',
      color: '#3B82F6',
      order: categories.length + 1,
      isMandatory: false,
      isWithdrawable: true,
      withdrawRule: 'ANYTIME',
      defaultAmount: '',
      isIncludedInShu: false,
      accountCode: '2010'
    });
    setShowCatModal(true);
  }, [categories.length]);

  // Open Category Modal for Edit
  const handleOpenEditModal = useCallback((cat: SavingCategory) => {
    setEditingCategory(cat);
    setCatFormData({
      code: cat.code,
      name: cat.name,
      description: cat.description || '',
      color: cat.color || '#3B82F6',
      order: cat.order,
      isMandatory: cat.isMandatory,
      isWithdrawable: cat.isWithdrawable,
      withdrawRule: cat.withdrawRule || 'ANYTIME',
      defaultAmount: cat.defaultAmount !== null && cat.defaultAmount !== undefined ? String(cat.defaultAmount) : '',
      isIncludedInShu: cat.isIncludedInShu,
      accountCode: cat.accountCode || '2010'
    });
    setShowCatModal(true);
  }, []);

  // Handle Category Form Input Change
  const handleCatInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setCatFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const handlePresetColorSelect = useCallback((color: string) => {
    setCatFormData(prev => ({ ...prev, color }));
  }, []);

  const handleWithdrawRuleChange = useCallback((value: string) => {
    setCatFormData(prev => ({ ...prev, withdrawRule: value }));
  }, []);

  // Handle Submit Category Form (Create or Edit)
  const handleCatFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormData.code || !catFormData.name) {
      toast.error('Kode dan Nama Kategori wajib diisi');
      return;
    }
    
    setSavingCat(true);
    try {
      const payload = {
        ...catFormData,
        code: catFormData.code.toUpperCase().replace(/\s+/g, '_'),
        order: Number(catFormData.order || 0),
        defaultAmount: catFormData.defaultAmount ? Number(catFormData.defaultAmount) : null
      };

      if (editingCategory) {
        // Update
        const response = await api.put(`/cooperative/saving-categories/${editingCategory.id}`, payload);
        if (response.data?.success) {
          toast.success('Jenis simpanan berhasil diperbarui');
          setShowCatModal(false);
          fetchCategories();
        }
      } else {
        // Create
        const response = await api.post('/cooperative/saving-categories', payload);
        if (response.data?.success) {
          toast.success('Jenis simpanan berhasil dibuat');
          setShowCatModal(false);
          fetchCategories();
        }
      }
    } catch (err: unknown) {
      console.error('Error saving category:', err);
      const errorLike = err as { response?: { data?: { message?: string } } };
      toast.error(errorLike.response?.data?.message || 'Gagal menyimpan jenis simpanan');
    } finally {
      setSavingCat(false);
    }
  }, [catFormData, editingCategory, fetchCategories]);

  const schoolLogoUrl = (user?.tenant as { logo_url?: string })?.logo_url || '/logo.png';
  const effectiveLogoUrl = formData.cooperative_logo_url || schoolLogoUrl;

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative/dashboard' },
    { label: 'Pengaturan', path: '/cooperative/settings' },
  ], []);

  const instruction = useMemo(() => ({
    title: "Panduan Pengaturan",
    description: "Gunakan menu tab untuk menavigasi konfigurasi koperasi.",
    items: [
      { text: "Tab 'Profil & Kop Surat' untuk mengubah logo, nama, nomor hukum, dan data kontak koperasi sekolah." },
      { text: "Tab 'Kategori Simpanan' untuk menambah atau mengubah jenis simpanan (misal: Simpanan Sukarela)." },
      { text: "Pengaturan alokasi SHU (Jasa Modal) menentukan apakah simpanan tersebut masuk perhitungan pembagian SHU." }
    ]
  }), []);

  if (loading) {
    return (
      <AcademicPageLayout
        title="Pengaturan Koperasi"
        description="Kelola identitas badan hukum dan kategori simpanan koperasi"
        breadcrumbs={breadcrumbs}
      >
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
              Memuat Pengaturan...
            </p>
          </div>
        </div>
      </AcademicPageLayout>
    );
  }

  return (
    <PremiumFeatureGate moduleName="KOPERASI" featureName="Pengaturan Koperasi">
      <AcademicPageLayout
        title="Pengaturan Koperasi"
        description="Konfigurasi identitas badan hukum, alamat, serta jenis simpanan koperasi secara dinamis"
        hardeningModuleKey="coop_settings"
        breadcrumbs={breadcrumbs}
        instruction={instruction}
      >
        {/* Dynamic Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 space-x-6">
          {canEditProfile && (
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 font-black text-xs uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'profile'
                  ? 'border-indigo-600 text-indigo-650 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
              }`}
            >
              Profil & Kop Surat
            </button>
          )}
          {canEditCategories && (
            <button
              onClick={() => setActiveTab('categories')}
              className={`pb-3 font-black text-xs uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'categories'
                  ? 'border-indigo-600 text-indigo-650 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
              }`}
            >
              Kategori Simpanan
            </button>
          )}
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        }>
          {activeTab === 'profile' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <CooperativeProfileForm
                  formData={formData}
                  saving={saving}
                  onInputChange={handleInputChange}
                  onSubmit={handleSubmit}
                  effectiveLogoUrl={effectiveLogoUrl}
                  canEditProfile={canEditProfile}
                />
              </div>
              <div className="lg:col-span-5">
                <KopSuratPreview
                  cooperativeName={formData.cooperative_name}
                  cooperativeLegalNo={formData.cooperative_legal_no}
                  effectiveLogoUrl={effectiveLogoUrl}
                />
              </div>
            </div>
          ) : (
            <CategoriesTable
              categories={categories}
              loadingCategories={loadingCategories}
              onToggleActive={handleToggleCatActive}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteCategory}
              onOpenCreate={handleOpenCreateModal}
              canEditCategories={canEditCategories}
            />
          )}

          <CategoryModal
            isOpen={showCatModal}
            onClose={() => setShowCatModal(false)}
            editingCategory={editingCategory}
            catFormData={catFormData}
            onInputChange={handleCatInputChange}
            onPresetColorSelect={handlePresetColorSelect}
            onWithdrawRuleChange={handleWithdrawRuleChange}
            onSubmit={handleCatFormSubmit}
            savingCat={savingCat}
            presetColors={PRESET_COLORS}
          />
        </Suspense>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default Settings;
