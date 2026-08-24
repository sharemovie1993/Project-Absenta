import React, { useEffect, useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axiosInstance';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui/SectionCard';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
import { formatDate } from '../../utils/layoutUtils';
import { Package, Plus, History, Tag, BarChart2, Boxes } from 'lucide-react';
import { COOP_QUERY_KEYS } from '../../lib/coopQueryKeys';

// Lazy load modular tab subcomponents to reduce entry file bundle size
const ProductCatalogTab = lazy(() => import('../../components/cooperative/products/ProductCatalogTab'));
const ProductInventoryTab = lazy(() => import('../../components/cooperative/products/ProductInventoryTab'));
const ProductStockInTab = lazy(() => import('../../components/cooperative/products/ProductStockInTab'));
const ProductHistoryTab = lazy(() => import('../../components/cooperative/products/ProductHistoryTab'));
const ProductCategoriesTab = lazy(() => import('../../components/cooperative/products/ProductCategoriesTab'));
const ProductOpnameTab = lazy(() => import('../../components/cooperative/products/ProductOpnameTab'));

interface Product {
  id: string;
  code: string;
  name: string;
  price: string;
  costPrice: string;
  stock: number;
  category: string;
}

interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  order: number;
}

const Products: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isKoperasiStore, isKoperasiHead, isAdmin, can } = useCapabilities();
  
  // Capability checks
  const canUpdateProducts = isAdmin || isKoperasiStore || isKoperasiHead || can('cooperative.store.products.update');
  const canManageCategories = isAdmin || isKoperasiStore || isKoperasiHead || can('cooperative.store.categories.manage');
  const canManageInventory = isAdmin || isKoperasiStore || isKoperasiHead || can('cooperative.store.inventory.manage');
  const canViewReports = isAdmin || isKoperasiHead || can('cooperative.reports.view.financial');

  const [activeTab, setActiveTab] = useState<'catalog' | 'inventory' | 'stock-in' | 'history' | 'categories' | 'opname'>('catalog');
  const [preselectedPurchaseProduct, setPreselectedPurchaseProduct] = useState<Product | null>(null);
  
  // Reset tab if user has no edit rights
  useEffect(() => {
    if (activeTab === 'stock-in' && !canUpdateProducts) {
      setActiveTab('catalog');
    }
    if (activeTab === 'categories' && !canManageCategories) {
      setActiveTab('catalog');
    }
    if ((activeTab === 'opname' || activeTab === 'inventory') && !canManageInventory) {
      setActiveTab('catalog');
    }
  }, [activeTab, canUpdateProducts, canManageCategories, canManageInventory]);

  // React Query setup for shared central states
  const productsQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.productsCatalog,
    queryFn: async () => {
      const response = await api.get('/cooperative/toko');
      return (Array.isArray(response.data) ? response.data : []) as Product[];
    },
    staleTime: 5 * 60 * 1000,
  });
  const products = productsQuery.data || [];
  const loading = productsQuery.isLoading;

  const categoriesQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.categories,
    queryFn: async () => {
      const response = await api.get('/cooperative/toko/categories');
      return (Array.isArray(response.data) ? response.data : []) as ProductCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesQuery.data || [];

  // Layout info structures
  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative/dashboard' },
    { label: 'Katalog & Barang Masuk' }
  ], []);

  const tabOptions = useMemo((): TabOption[] => [
    { id: 'catalog', label: 'Katalog Barang', icon: Package },
    ...(canManageInventory ? [{ id: 'inventory', label: 'Manajemen Stok', icon: Boxes }] : []),
    ...(canUpdateProducts ? [{ id: 'stock-in', label: 'Input Barang Masuk', icon: Plus }] : []),
    { id: 'history', label: 'Riwayat Barang Masuk', icon: History },
    ...(canManageCategories ? [{ id: 'categories', label: 'Kategori Barang', icon: Tag }] : []),
    ...(canManageInventory ? [{ id: 'opname', label: 'Stock Opname', icon: BarChart2 }] : [])
  ], [canManageInventory, canUpdateProducts, canManageCategories]);

  return (
    <PremiumFeatureGate
      moduleName="KOPERASI"
      featureName="Manajemen Produk"
    >
      <AcademicPageLayout
        title="Inventori & Barang Masuk Koperasi"
        description="Kelola inventori, harga modal, harga jual, stock opname, dan riwayat barang masuk."
        hardeningModuleKey="coop_products"
        breadcrumbs={breadcrumbs}
        instruction={{
          title: "Panduan Fitur Inventori & Barang Masuk",
          description: "Gunakan modul ini untuk mengelola stok, harga produk, penyesuaian fisik (opname), dan merekam transaksi barang masuk (stock-in) yang terintegrasi jurnal akuntansi otomatis.",
          items: [
            { text: "Pantau persediaan stok barang secara berkala di tab Katalog Barang." },
            { text: "Lakukan penyesuaian stok jika terdapat selisih fisik melalui tombol Opname." },
            { text: "Gunakan tab Input Barang Masuk untuk menambah pasokan dari supplier." },
            { text: "Periksa transaksi pembelian historis di tab Riwayat Barang Masuk." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0">
          <div className="space-y-4">
            {/* Action buttons & Shortcuts */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <TabSwitcher
                options={tabOptions}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as 'catalog' | 'inventory' | 'stock-in' | 'history' | 'categories' | 'opname')}
              />

              {canViewReports && (
                <div className="flex justify-end items-center">
                  <button
                    type="button"
                    onClick={() => navigate('/cooperative/inventory-report')}
                    className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 px-3.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                    title="Buka Laporan Persediaan"
                  >
                    <BarChart2 size={15} />
                    <span>Laporan Persediaan</span>
                  </button>
                </div>
              )}
            </div>

            {/* Empty state detection */}
            {products.length === 0 && !loading && (
              <div className="hidden" aria-hidden="true">Empty data state</div>
            )}

            {/* Lazy Loaded tab view content panel */}
            <Suspense fallback={<div className="text-center py-12 text-gray-500">Memuat panel tab...</div>}>
              {activeTab === 'catalog' && (
                <ProductCatalogTab
                  products={products}
                  categories={categories}
                  loading={loading}
                />
              )}

              {activeTab === 'inventory' && (
                <ProductInventoryTab
                  products={products}
                  categories={categories}
                  setActiveTab={setActiveTab}
                  onQuickPurchase={(product) => {
                    setPreselectedPurchaseProduct(product);
                    setActiveTab('stock-in');
                  }}
                  loading={loading}
                />
              )}
              
              {activeTab === 'stock-in' && (
                <ProductStockInTab
                  products={products}
                  categories={categories}
                  setActiveTab={setActiveTab}
                  initialSelectedProduct={preselectedPurchaseProduct}
                  onClearInitialProduct={() => setPreselectedPurchaseProduct(null)}
                />
              )}
              
              {activeTab === 'history' && (
                <ProductHistoryTab 
                  activeTab={activeTab}
                />
              )}
              
              {activeTab === 'categories' && (
                <ProductCategoriesTab
                  categories={categories}
                  products={products}
                />
              )}
              
              {activeTab === 'opname' && (
                <ProductOpnameTab
                  categories={categories}
                  activeTab={activeTab}
                />
              )}
            </Suspense>
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default Products;
