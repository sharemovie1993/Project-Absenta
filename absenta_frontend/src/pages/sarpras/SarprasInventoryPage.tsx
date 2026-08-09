import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Lucide from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SectionCard } from '../../components/ui/SectionCard';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

const { Package, ArrowUpRight, AlertTriangle, MapPin, FileUp } = Lucide;
const ListIcon = Lucide.List;
import AssetGrid from '../../components/sarpras/AssetList';
import { sarprasApi } from '../../api/sarpras.api';
import type { Asset } from '../../api/sarpras.api';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const AssetForm = lazy(() => import('../../components/sarpras/AssetForm'));
const CategoryLocationManager = lazy(() => import('../../components/sarpras/CategoryLocationManager'));
const AssetImportModal = lazy(() => import('../../components/sarpras/AssetImportModal'));

interface SubscriptionFeature {
  features?: string[];
  Plan?: {
    features_json?: string[];
  };
  plan?: {
    features_json?: string[];
  };
}

const SarprasInventoryPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { subscription } = useAuthStore();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view' | null;
    assetId?: string;
  }>({
    isOpen: false,
    mode: null
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [masterDataModal, setMasterDataModal] = useState<{ isOpen: boolean; type: 'category' | 'location' }>({ isOpen: false, type: 'category' });
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Gating Logic
  const features = useMemo(() => {
    const sub = subscription as SubscriptionFeature;
    return sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  }, [subscription]);

  const isLocked = useMemo(() => {
    return !Array.isArray(features) || !features.includes('SARPRAS');
  }, [features]);

  // Stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['sarpras-stats'],
    queryFn: sarprasApi.getStats,
    enabled: subscription !== undefined
  });

  const stats = useMemo(() => {
    return statsData?.data || {
      totalAssets: 0,
      totalLoaned: 0,
      totalBroken: 0
    };
  }, [statsData]);

  const handleAdd = useCallback(() => setModalState({ isOpen: true, mode: 'create' }), []);
  const handleEdit = useCallback((asset: Asset) => setModalState({ isOpen: true, mode: 'edit', assetId: asset.id }), []);
  
  const handleSuccess = useCallback(() => {
    setModalState({ isOpen: false, mode: null });
    queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
    queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] });
    queryClient.invalidateQueries({ queryKey: ['sarpras-categories'] });
    queryClient.invalidateQueries({ queryKey: ['sarpras-locations'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    setRefreshTrigger(prev => prev + 1);
  }, [queryClient]);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Sarpras', path: '/sarpras' },
    { label: 'Inventaris Aset', path: '/sarpras/inventory' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Inventaris Aset',
    description: 'Kelola seluruh aset, sarana, dan prasarana sekolah secara digital. Lacak lokasi barang, kategori, dan stok secara real-time.',
    items: [
      { text: 'Tambahkan aset baru lengkap dengan kode, brand, kategori, dan yurisdiksi lokasi.' },
      { text: 'Gunakan fitur import excel untuk memasukkan data inventaris secara massal.' },
      { text: 'Konfigurasikan master data kategori dan lokasi melalui tombol aksi di kanan atas.' }
    ]
  }), []);

  const handleCloseModal = useCallback(() => setModalState({ isOpen: false, mode: null }), []);
  const handleCloseMasterModal = useCallback(() => setMasterDataModal(prev => ({ ...prev, isOpen: false })), []);
  const handleCloseImport = useCallback(() => setIsImportOpen(false), []);

  return (
    <PremiumFeatureGate
      moduleName="SARPRAS"
      featureName="Manajemen Inventaris Aset"
      description="Kelola seluruh aset, sarana, dan prasarana sekolah secara digital. Lacak lokasi barang, kategori, dan stok secara real-time."
    >
      <AcademicPageLayout
        title="Inventaris Aset"
        description="Manajemen inventaris, sarana, dan prasarana sekolah secara terpadu."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="sarpras_inventory"
        toolbar={
          <div className="flex gap-2">
             <Button 
               variant="outline" 
               className="rounded-xl border-slate-200 shadow-sm"
               onClick={() => setIsImportOpen(true)}
             >
                <FileUp size={18} className="mr-2 text-indigo-600" /> Import Excel
             </Button>
             <Button variant="outline" className="rounded-xl border-slate-200 shadow-sm" onClick={() => setMasterDataModal({ isOpen: true, type: 'location' })}>
                <MapPin size={18} className="mr-2 text-rose-500" /> Lokasi
             </Button>
             <Button variant="outline" className="rounded-xl border-slate-200 shadow-sm" onClick={() => setMasterDataModal({ isOpen: true, type: 'category' })}>
                <ListIcon size={18} className="mr-2 text-indigo-500" /> Kategori
             </Button>
          </div>
        }
      >
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnalyticsCard
              title="Total Aset"
              value={stats.totalAssets}
              isLoading={isLoadingStats}
              icon={<Package size={20} />}
              gradient="from-indigo-600 to-blue-500"
              subtitle="Aset terdaftar di sistem"
            />
            <AnalyticsCard
              title="Dalam Peminjaman"
              value={stats.totalLoaned}
              isLoading={isLoadingStats}
              icon={<ArrowUpRight size={20} />}
              gradient="from-emerald-600 to-teal-500"
              subtitle="Aset sedang digunakan"
            />
            <AnalyticsCard
              title="Kondisi Rusak"
              value={stats.totalBroken}
              isLoading={isLoadingStats}
              icon={<AlertTriangle size={20} />}
              gradient="from-rose-600 to-orange-500"
              subtitle="Membutuhkan perbaikan"
            />
          </div>

          {/* Main Grid Section Wrapped in SectionCard */}
          <SectionCard title="Daftar Inventaris" icon={Package} fullWidth>
            <div className="p-6">
              <AssetGrid 
                onEdit={handleEdit} 
                onAdd={handleAdd}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </SectionCard>

          {/* Suspense wrapper for heavy forms and modals */}
          <Suspense fallback={null}>
            {/* Asset Form Modal */}
            <Modal
              isOpen={modalState.isOpen}
              onClose={handleCloseModal}
              title={modalState.mode === 'create' ? 'Tambah Aset Baru' : 'Perbarui Data Aset'}
              className="!max-w-4xl"
            >
              <AssetForm 
                assetId={modalState.assetId} 
                onSuccess={handleSuccess}
                onCancel={handleCloseModal}
              />
            </Modal>

            {/* Category/Location Manager Modal */}
            <CategoryLocationManager
              type={masterDataModal.type}
              isOpen={masterDataModal.isOpen}
              onClose={handleCloseMasterModal}
            />

            <AssetImportModal 
              isOpen={isImportOpen} 
              onClose={handleCloseImport} 
            />
          </Suspense>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default SarprasInventoryPage;
