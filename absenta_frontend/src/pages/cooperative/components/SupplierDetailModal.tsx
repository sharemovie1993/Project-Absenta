import React from 'react';
import { Modal } from '../../../components/cooperative/ui/Modal';
import { Button } from '@/components/ui';
import { User2, Phone, Mail, MapPin } from 'lucide-react';
import { formatCurrency } from '@/utils/layoutUtils';
import type { CoopSupplier } from './SupplierFormModal';

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: CoopSupplier | null;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = React.memo(({
  isOpen,
  onClose,
  supplier
}) => {
  if (!supplier) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier.name}
    >
      <div className="space-y-4 py-2 text-xs">
        <div className="space-y-2">
          {supplier.contact && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <User2 size={15} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Kontak Person</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{supplier.contact}</p>
              </div>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <Phone size={15} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Telepon / WhatsApp</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">{supplier.phone}</p>
              </div>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <Mail size={15} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Email Resmi</p>
                <p className="font-bold text-blue-600 dark:text-blue-400">{supplier.email}</p>
              </div>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <MapPin size={15} className="text-rose-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Alamat Kantor / Gudang</p>
                <p className="text-slate-700 dark:text-slate-300">{supplier.address}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-center">
            <p className="text-[10px] text-emerald-600 font-bold uppercase">Jumlah Faktur</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{supplier.totalPurchases || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase">Total Pembelian</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
              {formatCurrency(supplier.totalValue || 0)}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </Modal>
  );
});

export default SupplierDetailModal;
