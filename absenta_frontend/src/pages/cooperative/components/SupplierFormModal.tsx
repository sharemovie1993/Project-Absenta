import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { Modal } from '../../../components/cooperative/ui/Modal';
import { Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';

export const supplierFormSchema = z.object({
  name: z.string().min(2, 'Nama supplier minimal 2 karakter'),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export interface SupplierFormData {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export const EMPTY_SUPPLIER_FORM: SupplierFormData = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
};

export interface CoopSupplier {
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

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SupplierFormData) => void;
  editingSupplier: CoopSupplier | null;
  isSubmitting: boolean;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  editingSupplier,
  isSubmitting
}) => {
  const [formData, setFormData] = useState<SupplierFormData>(EMPTY_SUPPLIER_FORM);

  useEffect(() => {
    if (editingSupplier) {
      setFormData({
        name: editingSupplier.name,
        contact: editingSupplier.contact || '',
        phone: editingSupplier.phone || '',
        email: editingSupplier.email || '',
        address: editingSupplier.address || '',
        notes: editingSupplier.notes || ''
      });
    } else {
      setFormData(EMPTY_SUPPLIER_FORM);
    }
  }, [editingSupplier, isOpen]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = supplierFormSchema.safeParse(formData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data form tidak valid');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSupplier ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}
    >
      <form onSubmit={handleFormSubmit} className="space-y-4 py-2 text-xs">
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
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : editingSupplier ? 'Simpan Perubahan' : 'Tambahkan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

export default SupplierFormModal;
