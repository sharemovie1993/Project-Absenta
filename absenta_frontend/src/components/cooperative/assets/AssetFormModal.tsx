import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { X, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import type { CoopAssetItem, CoopAssetFormData, CoopAssetCategory, CoopAssetCondition, CoopAssetStatus } from './types';

// Zod Schema Validation Guard (Best Practice Absenta Hardening)
const assetFormSchema = z.object({
  name: z.string().min(3, 'Nama aset minimal 3 karakter').max(100, 'Nama aset maksimal 100 karakter'),
  category: z.enum(['EQUIPMENT', 'DISPLAY_FURNITURE', 'COOLING_APPLIANCE', 'BUILDING_FACILITY', 'VEHICLE', 'OTHER']),
  location: z.string().min(2, 'Lokasi penempatan wajib diisi'),
  purchaseDate: z.string().min(1, 'Tanggal perolehan wajib diisi'),
  purchasePrice: z.number().min(0, 'Harga perolehan tidak boleh negatif'),
  condition: z.enum(['GOOD', 'FAIR', 'DAMAGED', 'DISPOSED']),
  status: z.enum(['IN_USE', 'IN_REPAIR', 'IDLE', 'WRITTEN_OFF']),
  usefulLifeMonths: z.number().min(1, 'Masa manfaat minimal 1 bulan'),
  salvageValue: z.number().min(0).optional(),
  serialNumber: z.string().optional(),
  picName: z.string().optional(),
  notes: z.string().optional(),
  fundingSource: z.enum(['CASH', 'RESERVE_CAPITAL']).optional(),
  postToLedger: z.boolean().optional(),
});

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CoopAssetFormData) => Promise<void>;
  asset?: CoopAssetItem | null;
  loading?: boolean;
}

export const AssetFormModal: React.FC<AssetFormModalProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  asset,
  loading = false,
}) => {
  const [formData, setFormData] = useState<CoopAssetFormData>({
    name: '',
    category: 'EQUIPMENT',
    location: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: 0,
    condition: 'GOOD',
    status: 'IN_USE',
    usefulLifeMonths: 48,
    salvageValue: 0,
    serialNumber: '',
    picName: '',
    notes: '',
    fundingSource: 'RESERVE_CAPITAL',
    postToLedger: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        category: asset.category,
        location: asset.location,
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : new Date().toISOString().split('T')[0],
        purchasePrice: asset.purchasePrice,
        condition: asset.condition,
        status: asset.status,
        usefulLifeMonths: asset.usefulLifeMonths || 48,
        salvageValue: asset.salvageValue || 0,
        serialNumber: asset.serialNumber || '',
        picName: asset.picName || '',
        notes: asset.notes || '',
        fundingSource: 'RESERVE_CAPITAL',
        postToLedger: false, // saat update tidak auto repost
      });
    } else {
      setFormData({
        name: '',
        category: 'EQUIPMENT',
        location: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: 0,
        condition: 'GOOD',
        status: 'IN_USE',
        usefulLifeMonths: 48,
        salvageValue: 0,
        serialNumber: '',
        picName: '',
        notes: '',
        fundingSource: 'RESERVE_CAPITAL',
        postToLedger: true,
      });
    }
    setErrors({});
  }, [asset, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validated = assetFormSchema.safeParse(formData);
    if (!validated.success) {
      const fieldErrors: Record<string, string> = {};
      validated.error.issues?.forEach((err) => {
        const fieldName = String(err.path[0] || 'general');
        fieldErrors[fieldName] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              {asset ? 'Ubah Data Aset Koperasi' : 'Registrasi Aset Tetap Baru'}
            </h3>
            <p className="text-xs text-slate-400">
              Pencatatan aktiva tetap dan inventaris operasional koperasi
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errors.general && (
            <div className="p-3 text-xs bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2 border border-rose-200">
              <AlertCircle size={15} />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Nama Aset */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Aset / Peralatan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Contoh: Kulkas Showcase Polytron 1 Pintu"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
            {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kategori */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Aset <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as CoopAssetCategory }))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                <option value="EQUIPMENT">Peralatan Kasir / Elektronik</option>
                <option value="DISPLAY_FURNITURE">Rak Gondola / Etalase Toko</option>
                <option value="COOLING_APPLIANCE">Mesin Pendingin / Showcase</option>
                <option value="BUILDING_FACILITY">Bangunan Toko / Kantin</option>
                <option value="VEHICLE">Kendaraan Operasional</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>

            {/* Lokasi Penempatan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lokasi Fisik <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Contoh: Toko Minimarket Lt. 1"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
              {errors.location && <p className="text-[10px] text-rose-500 mt-1">{errors.location}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tanggal Beli */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Pembelian <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            {/* Harga Perolehan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Harga Perolehan (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.purchasePrice || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: Number(e.target.value) || 0 }))}
                placeholder="0"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
              />
              {errors.purchasePrice && <p className="text-[10px] text-rose-500 mt-1">{errors.purchasePrice}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kondisi Fisik */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kondisi Fisik Barang
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as CoopAssetCondition }))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                <option value="GOOD">Baik / Normal</option>
                <option value="FAIR">Cukup / Aus Wajar</option>
                <option value="DAMAGED">Rusak / Perlu Perbaikan</option>
                <option value="DISPOSED">Afkir / Tidak Layak</option>
              </select>
            </div>

            {/* Status Penggunaan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status Penggunaan
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as CoopAssetStatus }))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                <option value="IN_USE">Sedang Digunakan</option>
                <option value="IN_REPAIR">Sedang Diservis</option>
                <option value="IDLE">Cadangan / Disimpan</option>
                <option value="WRITTEN_OFF">Dihapus dari Neraca</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Masa Manfaat (Bulan) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Masa Manfaat (Bulan)
              </label>
              <input
                type="number"
                min="1"
                value={formData.usefulLifeMonths}
                onChange={(e) => setFormData(prev => ({ ...prev, usefulLifeMonths: Number(e.target.value) || 48 }))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Misal: 48 bln (4 thn) untuk depresiasi</p>
            </div>

            {/* PIC Penanggung Jawab */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Penanggung Jawab (PIC)
              </label>
              <input
                type="text"
                value={formData.picName}
                onChange={(e) => setFormData(prev => ({ ...prev, picName: e.target.value }))}
                placeholder="Nama staf / pengurus"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Catatan / Spesifikasi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nomor Seri & Catatan Tambahan
            </label>
            <input
              type="text"
              value={formData.serialNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
              placeholder="No. Seri Pabrik (jika ada)"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden mb-2"
            />
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Spesifikasi teknis, garansi, atau keterangan kondisi..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          {/* Integrasi Neraca Keuangan (Otomasi Jurnal) */}
          {!asset && (
            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 block">
                    Integrasi Neraca Keuangan
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Otomatis catat penambahan Aktiva Tetap (Akun 1510)
                  </span>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Catat otomatis ke Neraca Keuangan"
                    checked={formData.postToLedger !== false}
                    onChange={(e) => setFormData(prev => ({ ...prev, postToLedger: e.target.checked }))}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  Posting Jurnal
                </label>
              </div>

              {formData.postToLedger !== false && (
                <div className="pt-1">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Sumber Dana Pengadaan:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fundingSource: 'RESERVE_CAPITAL' }))}
                      className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                        formData.fundingSource === 'RESERVE_CAPITAL'
                          ? 'bg-white dark:bg-slate-900 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                          : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="block font-bold">Modal Cadangan</span>
                      <span className="text-[10px] text-slate-400">Aset awal / Hibah / Modal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fundingSource: 'CASH' }))}
                      className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                        formData.fundingSource === 'CASH'
                          ? 'bg-white dark:bg-slate-900 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                          : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="block font-bold">Kas Tunai Koperasi</span>
                      <span className="text-[10px] text-slate-400">Potong saldo kas operasional</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save size={14} />
              <span>{loading ? 'Menyimpan...' : 'Simpan Aset'}</span>
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
});

AssetFormModal.displayName = 'AssetFormModal';
