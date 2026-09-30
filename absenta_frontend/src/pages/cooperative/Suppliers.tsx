import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
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
  User2,
  CheckCircle
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { Button, Input, SectionCard } from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { formatDate, formatCurrency } from '@/utils/layoutUtils';
import { useIsMobile } from '@/hooks/useIsMobile';

const Modal = lazy(() => import('../../components/cooperative/ui/Modal').then(m => ({ default: m.Modal })));

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

const EMPTY_FORM: SupplierFormData = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
};

export const Suppliers: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<CoopSupplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<CoopSupplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(EMPTY_FORM);
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

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return suppliers;
    return (suppliers ?? []).filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.contact || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  }, [suppliers, searchQuery]);

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
      setFormData(EMPTY_FORM);
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
      setFormData(EMPTY_FORM);
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

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const parsed = supplierFormSchema.safeParse(formData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data belum valid');
      return;
    }
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }, [formData, editingSupplier, createMutation, updateMutation]);

  const handleOpenCreate = useCallback(() => {
    setEditingSupplier(null);
    setFormData(EMPTY_FORM);
    setIsFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((supplier: CoopSupplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact: supplier.contact || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || ''
    });
    setIsFormOpen(true);
  }, []);

  const handleConfirmDelete = useCallback((supplier: CoopSupplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingSupplier(supplier);
    setIsDeleteConfirmOpen(true);
  }, []);

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

              {/* Filter Bar */}
              <div className="relative">
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

              {/* Supplier Cards Grid */}
              {isLoading ? (
                <div className="text-center py-20 text-xs text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto mb-2" />
                  Memuat data supplier...
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                  Tidak ada data supplier yang ditemukan.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSuppliers?.map((supplier) => (
                    <div
                      key={supplier.id}
                      onClick={() => {
                        setSelectedSupplier(supplier);
                        setIsDetailOpen(true);
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:border-emerald-500/40 transition-all cursor-pointer space-y-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                              {supplier.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {supplier.contact ? `PIC: ${supplier.contact}` : 'Supplier Mitra'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleOpenEdit(supplier, e)}
                            className="w-7 h-7 text-emerald-600"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleConfirmDelete(supplier, e)}
                            className="w-7 h-7 text-rose-500"
                            title="Nonaktifkan"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
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
                            <MapPin size={12} className="text-rose-500 shrink-0" />
                            <span className="truncate">{supplier.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400">
                          {supplier.totalPurchases || 0} Transaksi Faktur
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(supplier.totalValue || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
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
            <Modal
              isOpen={isFormOpen}
              onClose={() => { setIsFormOpen(false); setEditingSupplier(null); setFormData(EMPTY_FORM); }}
              title={editingSupplier ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}
            >
              <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
                <div>
                  <label htmlFor="sup-name" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Supplier / Badan Usaha <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="sup-name"
                    aria-label="Nama supplier"
                    placeholder="PT. Sumber Makmur / Toko Berkah"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="sup-contact" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kontak Person (Sales / PIC)
                  </label>
                  <Input
                    id="sup-contact"
                    aria-label="Kontak person"
                    placeholder="Bpk. Budi Santoso"
                    value={formData.contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sup-phone" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      No. Telepon / WhatsApp
                    </label>
                    <Input
                      id="sup-phone"
                      aria-label="Nomor telepon"
                      placeholder="08xxxxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="sup-email" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email
                    </label>
                    <Input
                      id="sup-email"
                      aria-label="Email supplier"
                      type="email"
                      placeholder="email@supplier.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="sup-address" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alamat Lengkap
                  </label>
                  <textarea
                    id="sup-address"
                    aria-label="Alamat lengkap supplier"
                    placeholder="Alamat kantor atau gudang..."
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    rows={2}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Menyimpan...' : editingSupplier ? 'Simpan Perubahan' : 'Tambahkan'}
                  </Button>
                </div>
              </form>
            </Modal>
          )}

          {isDetailOpen && selectedSupplier && (
            <Modal
              isOpen={isDetailOpen}
              onClose={() => { setIsDetailOpen(false); setSelectedSupplier(null); }}
              title={selectedSupplier.name}
            >
              <div className="space-y-4 py-2 text-xs">
                <div className="space-y-2">
                  {selectedSupplier.contact && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                      <User2 size={15} className="text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Kontak Person</p>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{selectedSupplier.contact}</p>
                      </div>
                    </div>
                  )}
                  {selectedSupplier.phone && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                      <Phone size={15} className="text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Telepon / WhatsApp</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{selectedSupplier.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-center">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Jumlah Faktur</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{selectedSupplier.totalPurchases || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Total Pembelian</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
                      {formatCurrency(selectedSupplier.totalValue || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)}>Tutup</Button>
                </div>
              </div>
            </Modal>
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
