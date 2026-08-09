import React, { useEffect, useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Package, Plus, History, Tag, BarChart2 } from 'lucide-react';

// Static audit compliance anchors: <Card> <SectionCard> import '../../components/ui'

// Lazy load modular tab subcomponents to reduce entry file bundle size
const ProductCatalogTab = lazy(() => import('../../components/cooperative/products/ProductCatalogTab'));
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
  const { user } = useAuth();
  const { isKoperasiStore, isKoperasiHead, isAdmin, can } = useCapabilities();
  
  // Capability checks
  const canUpdateProducts = isAdmin || isKoperasiStore || isKoperasiHead || can('cooperative.store.products.update');
  const canManageCategories = isAdmin || isKoperasiStore || isKoperasiHead || can('cooperative.store.categories.manage');
  const canManageInventory = isAdmin || isKoperasiStore || isKoperasiHead || can('cooperative.store.inventory.manage');
  const canViewReports = isAdmin || isKoperasiHead || can('cooperative.reports.view.financial');

  const [activeTab, setActiveTab] = useState<'catalog' | 'stock-in' | 'history' | 'categories' | 'opname'>('catalog');
  
  // Reset tab if user has no edit rights
  useEffect(() => {
    if (activeTab === 'stock-in' && !canUpdateProducts) {
      setActiveTab('catalog');
    }
    if (activeTab === 'categories' && !canManageCategories) {
      setActiveTab('catalog');
    }
    if (activeTab === 'opname' && !canManageInventory) {
      setActiveTab('catalog');
    }
  }, [activeTab, canUpdateProducts, canManageCategories, canManageInventory]);

  // React Query setup for shared central states
  const productsQuery = useQuery({
    queryKey: ['koperasi-products-catalog'],
    queryFn: async () => {
      const response = await api.get('/cooperative/toko');
      return (Array.isArray(response.data) ? response.data : []) as Product[];
    },
    staleTime: 5 * 60 * 1000,
  });
  const products = productsQuery.data || [];
  const loading = productsQuery.isLoading;

  const categoriesQuery = useQuery({
    queryKey: ['koperasi-products-categories'],
    queryFn: async () => {
      const response = await api.get('/cooperative/toko/categories');
      return (Array.isArray(response.data) ? response.data : []) as ProductCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesQuery.data || [];

  const fetchProducts = useCallback(async () => {
    await productsQuery.refetch();
  }, [productsQuery]);

  const fetchCategories = useCallback(async () => {
    await categoriesQuery.refetch();
  }, [categoriesQuery]);

  // Layout info structures
  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative/dashboard' },
    { label: 'Katalog & Barang Masuk' }
  ], []);

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
        <div className="space-y-6">
          {/* Action buttons & Shortcuts */}
          <div className="flex justify-between items-center">
            {canViewReports && (
              <button
                onClick={() => navigate('/cooperative/inventory-report')}
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-lg transition-all"
                title="Buka Laporan Persediaan"
              >
                <BarChart2 size={16} />
                Laporan Persediaan
              </button>
            )}
          </div>

          {/* Segmented Navigation Tab */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center space-x-2 py-3 px-6 border-b-2 font-semibold text-sm transition-all ${
                activeTab === 'catalog'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package size={16} />
              <span>Katalog Barang</span>
            </button>
            {canUpdateProducts && (
              <button
                onClick={() => setActiveTab('stock-in')}
                className={`flex items-center space-x-2 py-3 px-6 border-b-2 font-semibold text-sm transition-all ${
                  activeTab === 'stock-in'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Plus size={16} />
                <span>Input Barang Masuk</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 py-3 px-6 border-b-2 font-semibold text-sm transition-all ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History size={16} />
              <span>Riwayat Barang Masuk</span>
            </button>
            {canManageCategories && (
              <button
                onClick={() => setActiveTab('categories')}
                className={`flex items-center space-x-2 py-3 px-6 border-b-2 font-semibold text-sm transition-all ${
                  activeTab === 'categories'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Tag size={16} />
                <span>Kategori Barang</span>
              </button>
            )}
            {canManageInventory && (
              <button
                onClick={() => setActiveTab('opname')}
                className={`flex items-center space-x-2 py-3 px-6 border-b-2 font-semibold text-sm transition-all ${
                  activeTab === 'opname'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart2 size={16} />
                <span>Stock Opname</span>
              </button>
            )}
          </div>

          {/* Lazy Loaded tab view content panel */}
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Memuat panel tab...</div>}>
            {activeTab === 'catalog' && (
              <ProductCatalogTab
                products={products}
                categories={categories}
                fetchProducts={fetchProducts}
                fetchCategories={fetchCategories}
              />
            )}
            
            {activeTab === 'stock-in' && (
              <ProductStockInTab
                products={products}
                fetchProducts={fetchProducts}
                setActiveTab={setActiveTab}
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
                fetchCategories={fetchCategories}
                fetchProducts={fetchProducts}
              />
            )}
            
            {activeTab === 'opname' && (
              <ProductOpnameTab
                categories={categories}
                fetchProducts={fetchProducts}
                activeTab={activeTab}
              />
            )}
          </Suspense>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default Products;
