import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axiosInstance';
import { Modal } from '../../components/cooperative/ui/Modal';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Building2,
  Package,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  User2
} from 'lucide-react';

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

const Suppliers: React.FC = () => {
  const queryClient = useQueryClient();

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<CoopSupplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<CoopSupplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(EMPTY_FORM);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<CoopSupplier | null>(null);

  // ─── Query: Fetch Suppliers ───────────────────────────────────────────────
  const { data: suppliers = [], isLoading } = useQuery<CoopSupplier[]>({
    queryKey: ['coop-suppliers'],
    queryFn: async () => {
      const res = await api.get('/cooperative/suppliers');
      return res.data;
    }
  });

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.contact || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  }, [suppliers, searchQuery]);

  // ─── Mutation: Create Supplier ────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const res = await api.post('/cooperative/suppliers', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Supplier berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['coop-suppliers'] });
      setIsFormOpen(false);
      setFormData(EMPTY_FORM);
      setEditingSupplier(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menambahkan supplier');
    }
  });

  // ─── Mutation: Update Supplier ────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SupplierFormData }) => {
      const res = await api.put(`/cooperative/suppliers/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Data supplier berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['coop-suppliers'] });
      setIsFormOpen(false);
      setFormData(EMPTY_FORM);
      setEditingSupplier(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui supplier');
    }
  });

  // ─── Mutation: Delete (Deactivate) Supplier ───────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cooperative/suppliers/${id}`);
    },
    onSuccess: () => {
      toast.success('Supplier berhasil dinonaktifkan');
      queryClient.invalidateQueries({ queryKey: ['coop-suppliers'] });
      setIsDeleteConfirmOpen(false);
      setDeletingSupplier(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus supplier');
    }
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleOpenCreate = useCallback(() => {
    setEditingSupplier(null);
    setFormData(EMPTY_FORM);
    setIsFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((supplier: CoopSupplier, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleOpenDetail = useCallback((supplier: CoopSupplier) => {
    setSelectedSupplier(supplier);
    setIsDetailOpen(true);
  }, []);

  const handleSubmitForm = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nama supplier wajib diisi');
      return;
    }
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }, [formData, editingSupplier, createMutation, updateMutation]);

  const handleConfirmDelete = useCallback((supplier: CoopSupplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingSupplier(supplier);
    setIsDeleteConfirmOpen(true);
  }, []);

  const getInitials = (name: string) => {
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="block -mx-4 -mt-2 bg-white dark:bg-slate-950 min-h-screen pb-24">
      
      {/* ─── App Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 sticky top-0 z-20 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="p-1 -ml-1 text-slate-800 dark:text-slate-200 active:scale-95 cursor-pointer"
            aria-label="Kembali"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-bold text-base text-emerald-600 dark:text-emerald-400">
            Supplier
          </h1>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-transform cursor-pointer"
        >
          <Plus size={15} />
          <span>Tambah</span>
        </button>
      </div>

      {/* ─── Search Bar ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari nama atau kontak supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Stats Summary ────────────────────────────────────────────────── */}
      {!isLoading && suppliers.length > 0 && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Total Supplier</p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{suppliers.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 font-bold">Total Pembelian</p>
              <p className="text-lg font-black text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                Rp {suppliers.reduce((s, sup) => s + sup.totalValue, 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Supplier List ────────────────────────────────────────────────── */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-4 flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
              </div>
            </div>
          ))
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold text-sm">
              {searchQuery ? 'Tidak ada supplier ditemukan' : 'Belum ada supplier'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-4 px-5 py-2.5 rounded-full bg-emerald-600 text-white text-xs font-bold"
              >
                + Tambah Supplier Pertama
              </button>
            )}
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              onClick={() => handleOpenDetail(supplier)}
              className="px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer active:bg-slate-100 transition-colors flex items-center gap-3 select-none"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0 font-black text-sm text-emerald-600 dark:text-emerald-400">
                {getInitials(supplier.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {supplier.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {supplier.phone && (
                    <span className="flex items-center gap-0.5">
                      <Phone size={10} />
                      {supplier.phone}
                    </span>
                  )}
                  {supplier.totalPurchases > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Package size={10} />
                      {supplier.totalPurchases} faktur
                    </span>
                  )}
                </div>
                {supplier.totalValue > 0 && (
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Rp {supplier.totalValue.toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              {/* Action Buttons + Chevron */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleOpenEdit(supplier, e)}
                  className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors active:scale-90"
                  title="Edit Supplier"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleConfirmDelete(supplier, e)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors active:scale-90"
                  title="Nonaktifkan Supplier"
                >
                  <Trash2 size={15} />
                </button>
                <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 ml-1" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Modal: Form Tambah / Edit Supplier ──────────────────────────── */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingSupplier(null); setFormData(EMPTY_FORM); }}
        title={editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
      >
        <form onSubmit={handleSubmitForm} className="space-y-3 py-1 text-xs">
          {/* Nama Supplier */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Supplier / Toko / Agen *
            </label>
            <input
              type="text"
              placeholder="Contoh: PT Sumber Makmur, UD Grosir Murah..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              required
              autoFocus
            />
          </div>

          {/* Kontak Person */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <User2 size={12} /> Nama Kontak Person
            </label>
            <input
              type="text"
              placeholder="Nama sales / PIC supplier"
              value={formData.contact}
              onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Telepon */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Phone size={12} /> Telepon / WA
              </label>
              <input
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Mail size={12} /> Email
              </label>
              <input
                type="email"
                placeholder="email@supplier.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Alamat */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <MapPin size={12} /> Alamat
            </label>
            <textarea
              placeholder="Alamat lengkap supplier..."
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none text-xs"
            />
          </div>

          {/* Catatan */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Tambahan
            </label>
            <textarea
              placeholder="Catatan khusus, jadwal pengiriman, dll..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setIsFormOpen(false); setEditingSupplier(null); setFormData(EMPTY_FORM); }}
              className="flex-1 h-11 rounded-full border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 text-xs active:scale-95 transition-transform cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>{editingSupplier ? 'Simpan Perubahan' : 'Tambahkan'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal: Detail Supplier ───────────────────────────────────────── */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedSupplier(null); }}
        title={selectedSupplier?.name || 'Detail Supplier'}
      >
        {selectedSupplier && (
          <div className="space-y-4 py-1 text-xs">
            {/* Info Cards */}
            <div className="space-y-2">
              {selectedSupplier.contact && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <User2 size={15} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Kontak Person</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{selectedSupplier.contact}</p>
                  </div>
                </div>
              )}
              {selectedSupplier.phone && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <Phone size={15} className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Telepon / WhatsApp</p>
                    <a href={`tel:${selectedSupplier.phone}`} className="font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedSupplier.phone}
                    </a>
                  </div>
                </div>
              )}
              {selectedSupplier.email && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <Mail size={15} className="text-blue-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Email</p>
                    <a href={`mailto:${selectedSupplier.email}`} className="font-bold text-blue-600 dark:text-blue-400">
                      {selectedSupplier.email}
                    </a>
                  </div>
                </div>
              )}
              {selectedSupplier.address && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <MapPin size={15} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Alamat</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{selectedSupplier.address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Purchase Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-center">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide">Jumlah Faktur</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{selectedSupplier.totalPurchases}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Total Nilai</p>
                <p className="text-sm font-black text-slate-700 dark:text-slate-300 mt-1 truncate">
                  Rp {selectedSupplier.totalValue.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {selectedSupplier.notes && (
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30">
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mb-1">Catatan</p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedSupplier.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  setIsDetailOpen(false);
                  handleOpenEdit(selectedSupplier, e);
                }}
                className="flex-1 h-11 rounded-full border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
              >
                <Edit2 size={14} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setIsDetailOpen(false);
                  handleConfirmDelete(selectedSupplier, e);
                }}
                className="flex-1 h-11 rounded-full border-2 border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Nonaktifkan</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Modal: Konfirmasi Hapus / Nonaktifkan ───────────────────────── */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => { setIsDeleteConfirmOpen(false); setDeletingSupplier(null); }}
        title="Nonaktifkan Supplier?"
      >
        <div className="space-y-4 py-2 text-xs">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Supplier <strong className="text-slate-900 dark:text-slate-100">{deletingSupplier?.name}</strong> akan dinonaktifkan.
            Riwayat pembelian dari supplier ini tidak akan terhapus.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setIsDeleteConfirmOpen(false); setDeletingSupplier(null); }}
              className="flex-1 h-11 rounded-full border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 text-xs active:scale-95 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => deletingSupplier && deleteMutation.mutate(deletingSupplier.id)}
              disabled={deleteMutation.isPending}
              className="flex-1 h-11 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs active:scale-95 cursor-pointer disabled:opacity-60"
            >
              {deleteMutation.isPending ? 'Memproses...' : 'Ya, Nonaktifkan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Suppliers;
