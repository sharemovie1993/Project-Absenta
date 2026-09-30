import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axiosInstance';
import toast from 'react-hot-toast';
import { COOP_QUERY_KEYS } from '../../lib/coopQueryKeys';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building2,
  Package,
  Edit2,
  Trash2,
  CheckCircle2,
  CheckCircle,
  List,
  LayoutGrid,
  Filter
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { Button, Input, SectionCard, Table } from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { formatDate, formatCurrency } from '@/utils/layoutUtils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

const getInitials = (name: string): string => {
  if (!name) return 'SP';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const Modal = lazy(() => import('../../components/cooperative/ui/Modal').then(m => ({ default: m.Modal })));
const SupplierFormModal = lazy(() => import('./components/SupplierFormModal'));
const SupplierDetailModal = lazy(() => import('./components/SupplierDetailModal'));

// Zod Schema Validation Guard (Pilar 25)
const supplierFormSchema = z.object({
  name: z.string().min(2, 'Nama supplier minimal 2 karakter'),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const searchFilterSchema = z.object({
  search: z.string().optional(),
});

interface CoopSupplier {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  totalPurchases: number;
  totalValue: number;
  createdAt: string;
}

interface SupplierFormData {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export const Suppliers: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<CoopSupplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<CoopSupplier | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<CoopSupplier | null>(null);

  // Query: Fetch Suppliers (Pilar 31)
  const { data: suppliers = [], isLoading } = useQuery<CoopSupplier[]>({
    queryKey: COOP_QUERY_KEYS.suppliers,
    queryFn: async () => {
      const res = await api.get('/cooperative/suppliers');
      const raw = res?.data;
      return Array.isArray(raw) ? raw : (raw?.data || []);
    },
    staleTime: 2 * 60 * 1000,
  });

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (suppliers ?? []).filter(s => {
      const matchSearch = !q ||
        s.name.toLowerCase().includes(q) ||
        (s.contact || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q);
      const matchStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && s.isActive !== false) ||
        (statusFilter === 'INACTIVE' && s.isActive === false);
      return matchSearch && matchStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  const sortedSuppliers = useMemo(() => {
    const list = [...filteredSuppliers];
    list.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (sortBy === 'totalValue') {
        aVal = a.totalValue || 0;
        bVal = b.totalValue || 0;
      } else if (sortBy === 'isActive') {
        aVal = a.isActive !== false ? 1 : 0;
        bVal = b.isActive !== false ? 1 : 0;
      } else if (sortBy === 'contact') {
        aVal = (a.contact || '').toLowerCase();
        bVal = (b.contact || '').toLowerCase();
      } else {
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredSuppliers, sortBy, sortOrder]);

  const totalPages = useMemo(() => {
    return Math.ceil(sortedSuppliers.length / limit) || 1;
  }, [sortedSuppliers.length, limit]);

  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return sortedSuppliers.slice(start, start + limit);
  }, [sortedSuppliers, currentPage, limit]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = (suppliers ?? []).filter(s => s.isActive !== false).length;
    const totalSpent = (suppliers ?? []).reduce((sum, s) => sum + (s.totalValue || 0), 0);
    return { total, active, totalSpent };
  }, [suppliers]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const res = await api.post('/cooperative/suppliers', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Supplier berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.suppliers });
      setIsFormOpen(false);
      setEditingSupplier(null);
    },
    onError: () => {
      toast.error('Gagal menambahkan supplier');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SupplierFormData }) => {
      const res = await api.put(`/cooperative/suppliers/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Data supplier berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.suppliers });
      setIsFormOpen(false);
      setEditingSupplier(null);
    },
    onError: () => {
      toast.error('Gagal memperbarui supplier');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cooperative/suppliers/${id}`);
    },
    onSuccess: () => {
      toast.success('Supplier berhasil dinonaktifkan');
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.suppliers });
      setIsDeleteConfirmOpen(false);
      setDeletingSupplier(null);
    },
    onError: () => {
      toast.error('Gagal menghapus supplier');
    }
  });

  const handleFormSubmit = useCallback((data: SupplierFormData) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [editingSupplier, createMutation, updateMutation]);

  const handleOpenCreate = useCallback(() => {
    setEditingSupplier(null);
    setIsFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((supplier: CoopSupplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  }, []);

  const handleConfirmDelete = useCallback((supplier: CoopSupplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingSupplier(supplier);
    setIsDeleteConfirmOpen(true);
  }, []);

  const columns: Column[] = useMemo(() => [
    {
      key: 'name',
      label: 'Supplier / Perusahaan',
      sortable: true,
      render: (_val: unknown, row: CoopSupplier) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100 dark:border-emerald-800">
            {getInitials(row.name)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{row.name}</div>
            <div className="text-[11px] text-slate-400 truncate">{row.contact ? `PIC: ${row.contact}` : 'Supplier Mitra'}</div>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Kontak',
      render: (_val: unknown, row: CoopSupplier) => (
        <div className="space-y-1 text-xs">
          {row.phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={11} className="text-emerald-500 shrink-0" />
              <a href={`tel:${row.phone.replace(/[^0-9+]/g, '')}`} onClick={(e) => e.stopPropagation()} className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium text-[11px]" title="Hubungi Supplier">
                {row.phone}
              </a>
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1.5">
              <Mail size={11} className="text-blue-500 shrink-0" />
              <a href={`mailto:${row.email}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] truncate max-w-44 inline-block" title="Kirim Email">
                {row.email}
              </a>
            </div>
          )}
          {!row.phone && !row.email && <span className="text-slate-400 text-xs">-</span>}
        </div>
      )
    },
    {
      key: 'address',
      label: 'Alamat',
      render: (_val: unknown, row: CoopSupplier) => (
        <div className="text-xs text-slate-600 dark:text-slate-300 max-w-48 truncate" title={row.address || ''}>
          {row.address || '-'}
        </div>
      )
    },
    {
      key: 'totalValue',
      label: 'Total Pengadaan',
      sortable: true,
      render: (_val: unknown, row: CoopSupplier) => (
        <div className="text-xs">
          <div className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(row.totalValue || 0)}</div>
          <div className="text-[10px] text-slate-400">{row.totalPurchases || 0} faktur</div>
        </div>
      )
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (_val: unknown, row: CoopSupplier) => (
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold",
          row.isActive !== false
            ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
            : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", row.isActive !== false ? "bg-emerald-500" : "bg-slate-400")} />
          {row.isActive !== false ? 'Aktif' : 'Nonaktif'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'text-right',
      render: (_val: unknown, row: CoopSupplier) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => { setSelectedSupplier(row); setIsDetailOpen(true); }} className="h-7 px-2.5 text-xs font-semibold" title="Lihat Detail Faktur">
            Detail
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => handleOpenEdit(row, e)} className="w-7 h-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" title="Edit Supplier">
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => handleConfirmDelete(row, e)} className="w-7 h-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Nonaktifkan Supplier">
            <Trash2 size={13} />
          </Button>
        </div>
      )
    }
  ], [handleOpenEdit, handleConfirmDelete]);

  const renderSupplierCard = useCallback((supplier: CoopSupplier) => (
    <div
      key={supplier.id}
      onClick={() => {
        setSelectedSupplier(supplier);
        setIsDetailOpen(true);
      }}
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs hover:border-emerald-500/40 transition-all cursor-pointer space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100 dark:border-emerald-800">
            {getInitials(supplier.name)}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{supplier.name}</h4>
            <span className="text-[11px] text-slate-400 font-medium truncate block">{supplier.contact ? `PIC: ${supplier.contact}` : 'Supplier Mitra'}</span>
          </div>
        </div>

        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0",
          supplier.isActive !== false
            ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
            : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", supplier.isActive !== false ? "bg-emerald-500" : "bg-slate-400")} />
          {supplier.isActive !== false ? 'Aktif' : 'Nonaktif'}
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        {supplier.phone && (
          <div className="flex items-center gap-2">
            <Phone size={12} className="text-emerald-500 shrink-0" />
            <a
              href={`tel:${supplier.phone.replace(/[^0-9+]/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              title="Hubungi Supplier"
            >
              {supplier.phone}
            </a>
          </div>
        )}
        {supplier.email && (
          <div className="flex items-center gap-2">
            <Mail size={12} className="text-blue-500 shrink-0" />
            <a
              href={`mailto:${supplier.email}`}
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 dark:text-blue-400 hover:underline truncate"
              title="Kirim Email"
            >
              {supplier.email}
            </a>
          </div>
        )}
        {supplier.address && (
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{supplier.address}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-medium">Total Pengadaan</p>
          <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(supplier.totalValue || 0)}</p>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={(e) => handleOpenEdit(supplier, e)} className="w-7 h-7 text-emerald-600" title="Edit">
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => handleConfirmDelete(supplier, e)} className="w-7 h-7 text-rose-500" title="Nonaktifkan">
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </div>
  ), [handleOpenEdit, handleConfirmDelete]);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative/dashboard' },
    { label: 'Daftar Supplier' }
  ], []);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PremiumFeatureGate
      moduleName="KOPERASI"
      featureName="Manajemen Supplier & Pemasok Koperasi"
      description="Kelola data vendor, kontak sales, alamat gudang distributor, dan riwayat faktur pembelian toko koperasi."
    >
      <InfraErrorBoundary>
        <AcademicPageLayout
          title="Manajemen Supplier & Pemasok"
          description="Kelola data distributor resmi, kontak perwakilan, alamat gudang, dan riwayat faktur pembelian toko."
          breadcrumbs={breadcrumbs}
          hardeningModuleKey="coop_suppliers"
          topSlot={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="toolbarPrimary"
                size="toolbar"
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Supplier
              </Button>
            </div>
          }
          instruction={{
            title: "Panduan Manajemen Supplier",
            description: "Gunakan modul ini untuk mengelola relasi mitra distributor dan histori pengadaan barang toko koperasi.",
            items: [
              { text: "Klik tombol Tambah Supplier untuk mendaftarkan vendor atau distributor baru." },
              { text: "Gunakan kolom pencarian untuk menemukan supplier berdasarkan nama atau kontak." },
              { text: "Klik kartu supplier untuk melihat detail alamat, catatan pengiriman, dan total pembelian." }
            ]
          }}
        >
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="space-y-6">
              {/* Analytics Stats Overview */}
              {isMobile ? (
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center shadow-xs">
                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate">Total</p>
                    <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{stats.total}</p>
                  </div>
                  <div className="flex-1 min-w-0 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center shadow-xs">
                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate">Aktif</p>
                    <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.active}</p>
                  </div>
                  <div className="flex-1 min-w-0 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center shadow-xs">
                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate">Pengadaan</p>
                    <p className="text-[11px] font-black text-blue-600 dark:text-blue-400 mt-1 truncate">{formatCurrency(stats.totalSpent)}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <AnalyticsCard
                    title="Total Supplier"
                    value={String(stats.total)}
                    icon={Building2}
                    color="indigo"
                  />
                  <AnalyticsCard
                    title="Supplier Aktif"
                    value={String(stats.active)}
                    icon={CheckCircle}
                    color="emerald"
                  />
                  <AnalyticsCard
                    title="Total Pengadaan"
                    value={formatCurrency(stats.totalSpent)}
                    icon={Package}
                    color="blue"
                  />
                </div>
              )}

              {/* Toolbar: Search, Status Filter & View Mode Switcher */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      id="supplier-search-input"
                      aria-label="Cari nama supplier atau kontak"
                      placeholder="Cari nama supplier, kontak, atau nomor telepon..."
                      value={searchQuery}
                      onChange={(e) => {
                        const parsed = searchFilterSchema.safeParse({ search: e.target.value });
                        if (parsed.success) {
                          setSearchQuery(e.target.value);
                        }
                      }}
                      className="pl-10 text-xs w-full rounded-xl"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="w-36 shrink-0">
                    <SearchableSelect
                      id="status-filter-select"
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                      options={[
                        { value: 'ALL', label: 'Semua Status' },
                        { value: 'ACTIVE', label: 'Aktif Saja' },
                        { value: 'INACTIVE', label: 'Nonaktif Saja' }
                      ]}
                      placeholder="Status"
                    />
                  </div>
                </div>

                {/* View Mode Switcher (Desktop only) */}
                <div className="hidden sm:flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      viewMode === 'table'
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                    title="Tampilan Tabel Standar"
                  >
                    <List size={14} />
                    <span>Tabel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      viewMode === 'grid'
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                    title="Tampilan Kartu Grid"
                  >
                    <LayoutGrid size={14} />
                    <span>Kartu</span>
                  </button>
                </div>
              </div>

              {/* Content: Mobile Deck or Desktop Table/Grid */}
              {isLoading ? (
                <div className="text-center py-20 text-xs text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto mb-2" />
                  Memuat data supplier...
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-400 space-y-2">
                  <Building2 size={36} className="mx-auto opacity-30 text-slate-400" />
                  <p>Tidak ada data supplier yang ditemukan.</p>
                </div>
              ) : isMobile ? (
                /* Mobile Card Deck View */
                <div className="space-y-3">
                  {(paginatedSuppliers ?? [])?.map(renderSupplierCard)}

                  {/* Mobile Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 px-1 text-xs">
                      <span className="text-slate-500 text-[11px]">
                        Hal. {currentPage} / {totalPages} ({filteredSuppliers.length} supplier)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className="h-7 px-2 text-xs"
                        >
                          Sebelumnya
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className="h-7 px-2 text-xs"
                        >
                          Selanjutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : viewMode === 'table' ? (
                /* Desktop Table View (Layout Halaman Stok) */
                <Table
                  columns={columns}
                  data={paginatedSuppliers}
                  loading={isLoading}
                  emptyMessage="Tidak ada data supplier yang ditemukan."
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  rowKey="id"
                  pagination={{
                    currentPage,
                    totalPages,
                    totalItems: filteredSuppliers.length,
                    itemsPerPage: limit,
                    onPageChange: setCurrentPage,
                    onLimitChange: setLimit
                  }}
                />
              ) : (
                /* Desktop Grid View */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(paginatedSuppliers ?? [])?.map(renderSupplierCard)}
                  </div>

                  {/* Desktop Grid Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 px-1 text-xs">
                      <span className="text-slate-500 text-xs">
                        Menampilkan {paginatedSuppliers.length} dari {filteredSuppliers.length} supplier
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className="h-8 px-3 text-xs"
                        >
                          Sebelumnya
                        </Button>
                        <span className="text-xs font-semibold px-2">
                          Halaman {currentPage} / {totalPages}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className="h-8 px-3 text-xs"
                        >
                          Selanjutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </AcademicPageLayout>

        {/* Mobile Floating Action Button (FAB) */}
        {isMobile && (
          <button
            type="button"
            onClick={handleOpenCreate}
            aria-label="Tambah Supplier Baru"
            className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white p-3.5 rounded-full shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-all cursor-pointer"
          >
            <Plus size={22} className="text-white" />
          </button>
        )}

        {/* Lazy Loaded Modals */}
        <Suspense fallback={null}>
          {isFormOpen && (
            <SupplierFormModal
              isOpen={isFormOpen}
              onClose={() => { setIsFormOpen(false); setEditingSupplier(null); }}
              onSubmit={handleFormSubmit}
              editingSupplier={editingSupplier}
              isSubmitting={isSubmitting}
            />
          )}

          {isDetailOpen && selectedSupplier && (
            <SupplierDetailModal
              isOpen={isDetailOpen}
              onClose={() => { setIsDetailOpen(false); setSelectedSupplier(null); }}
              supplier={selectedSupplier}
            />
          )}

          {isDeleteConfirmOpen && deletingSupplier && (
            <Modal
              isOpen={isDeleteConfirmOpen}
              onClose={() => { setIsDeleteConfirmOpen(false); setDeletingSupplier(null); }}
              title="Nonaktifkan Supplier?"
            >
              <div className="space-y-4 py-2 text-xs">
                <p className="text-slate-600 dark:text-slate-400">
                  Supplier <strong className="text-slate-900 dark:text-slate-100">{deletingSupplier.name}</strong> akan dinonaktifkan.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Batal</Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => deleteMutation.mutate(deletingSupplier.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Memproses...' : 'Ya, Nonaktifkan'}
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </Suspense>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default Suppliers;
