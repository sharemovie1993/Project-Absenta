import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '../../../components/cooperative/ui/Modal';
import { Input } from '../../../components/cooperative/ui/Input';
import { Button } from '../../../components/cooperative/ui/Button';

const opnameSchema = z.object({
  newStock: z.number({ invalid_type_error: 'Jumlah stok harus berupa angka' }).min(0, 'Stok tidak boleh bernilai negatif'),
  reason: z.string().max(255, 'Alasan maksimal 255 karakter').optional(),
});

interface Product {
  id: string;
  code: string;
  name: string;
  price: string;
  costPrice: string;
  stock: number;
  category: string;
}

interface OpnameFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmit: (newStock: number, reason: string) => Promise<void>;
  isLoading: boolean;
}

export const OpnameFormModal: React.FC<OpnameFormModalProps> = React.memo(({
  isOpen,
  onClose,
  product,
  onSubmit,
  isLoading
}) => {
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (product) {
      setNewStock(product.stock.toString());
      setReason('');
    }
  }, [product, isOpen]);

  const productInfo = useMemo(() => {
    if (!product) return null;
    return {
      name: product.name,
      code: product.code,
      stock: product.stock,
      costPrice: Number(product.costPrice || 0).toLocaleString('id-ID'),
    };
  }, [product]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const stockVal = Number(newStock);
    const parsed = opnameSchema.safeParse({ newStock: stockVal, reason });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Input stok tidak valid');
      return;
    }
    onSubmit(parsed.data.newStock, parsed.data.reason || '');
  }, [newStock, reason, onSubmit]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? `Stock Opname: ${product.name}` : 'Stock Opname'}
    >
      {product && productInfo && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg text-sm border border-slate-100 space-y-1">
            <p><strong>Nama Produk:</strong> {productInfo.name}</p>
            <p><strong>Kode Produk:</strong> {productInfo.code}</p>
            <p><strong>Stok Sistem Saat Ini:</strong> {productInfo.stock} pcs</p>
            <p><strong>Harga Modal:</strong> Rp {productInfo.costPrice}</p>
          </div>

          <Input
            id="opname-new-stock"
            label="Jumlah Stok Fisik Baru (pcs)"
            type="number"
            value={newStock}
            onChange={(e) => setNewStock(e.target.value)}
            required
            placeholder="0"
            aria-label="Jumlah Stok Fisik Baru"
          />

          <div>
            <label htmlFor="opname-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Alasan Penyesuaian
            </label>
            <textarea
              id="opname-reason"
              rows={3}
              placeholder="E.g. barang rusak, salah hitung stok..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
              aria-label="Alasan Penyesuaian"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Simpan Penyesuaian
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
});
export default OpnameFormModal;
