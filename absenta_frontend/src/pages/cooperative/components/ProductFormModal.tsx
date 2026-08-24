import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Image as ImageIcon, 
  RotateCw, 
  Barcode, 
  Plus, 
  Check, 
  Info, 
  Loader2, 
  X 
} from 'lucide-react';
import { Button } from '../../../components/cooperative/ui/Button';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  code: string;
  name: string;
  price: string;
  costPrice: string;
  stock: number;
  category: string;
  imageUrl?: string | null;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  onSubmit: (data: {
    code: string;
    name: string;
    price: string;
    costPrice: string;
    stock: string;
    category: string;
    imageUrl?: string;
  }) => Promise<void>;
  isLoading: boolean;
  existingCategories: string[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = React.memo(({
  isOpen,
  onClose,
  editingProduct,
  onSubmit,
  isLoading,
  existingCategories
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    price: '0',
    costPrice: '0',
    stock: '0',
    category: '',
    imageUrl: '',
    productType: 'Default',
    showInTransaction: true,
    useStock: true,
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const DEFAULT_COOP_CATEGORIES = useMemo(() => [
    'Makanan',
    'Minuman',
    'Kebutuhan Harian',
    'Alat Tulis & Kantor',
    'Kesehatan & Obat',
    'Lain-lain'
  ], []);

  const categoryOptions = useMemo(() => {
    const rawList = (existingCategories && existingCategories.length > 0)
      ? existingCategories
      : DEFAULT_COOP_CATEGORIES;

    return Array.from(new Set([
      ...rawList.filter((cat) => cat && cat !== 'ALL'),
      ...DEFAULT_COOP_CATEGORIES
    ]));
  }, [existingCategories, DEFAULT_COOP_CATEGORIES]);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        code: editingProduct.code,
        name: editingProduct.name,
        price: editingProduct.price.toString(),
        costPrice: editingProduct.costPrice.toString(),
        stock: editingProduct.stock.toString(),
        category: editingProduct.category || categoryOptions[0] || 'Makanan',
        imageUrl: editingProduct.imageUrl || '',
        productType: 'Default',
        showInTransaction: true,
        useStock: true,
      });
    } else {
      const randomNum = Math.floor(10000000 + Math.random() * 90000000);
      setFormData({
        code: `KOP-${randomNum}`,
        name: '',
        price: '0',
        costPrice: '0',
        stock: '0',
        category: categoryOptions[0] || 'Makanan',
        imageUrl: '',
        productType: 'Default',
        showInTransaction: true,
        useStock: true,
      });
    }
    setValidationErrors({});
  }, [editingProduct, isOpen, categoryOptions]);

  // Image Upload Handler
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Hanya berkas gambar (PNG, JPG, WebP) yang diperbolehkan', { id: 'prod-photo-upload', duration: 2500 });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 5MB', { id: 'prod-photo-upload', duration: 2500 });
      return;
    }

    setIsUploadingImage(true);
    toast.loading('Mengunggah foto produk...', { id: 'prod-photo-upload' });

    const data = new FormData();
    data.append('file', file);

    try {
      const res = await api.post('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = res.data?.data?.url || res.data?.url || res.data?.data || '';
      if (fileUrl) {
        setFormData(prev => ({ ...prev, imageUrl: fileUrl }));
        toast.success('Foto produk berhasil diunggah', { id: 'prod-photo-upload', duration: 2500 });
      }
    } catch (err: any) {
      console.error('Failed to upload product photo:', err);
      toast.error(err.response?.data?.message || 'Gagal mengunggah foto produk', { id: 'prod-photo-upload', duration: 3000 });
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handleGenerateCode = useCallback(() => {
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    const autoCode = `KOP-${randomNum}`;
    setFormData((prev) => ({ ...prev, code: autoCode }));
    setValidationErrors((prev) => ({ ...prev, code: '' }));
  }, []);

  // Live Markup & Margin Calculations (Kasir Pintar Style)
  const metrics = useMemo(() => {
    const cost = Number(formData.costPrice || 0);
    const sell = Number(formData.price || 0);

    if (cost <= 0 || sell <= 0) {
      return { markup: 0, margin: 0 };
    }

    const profit = sell - cost;
    const markup = Math.round((profit / cost) * 100);
    const margin = Math.round((profit / sell) * 100);

    return { markup, margin };
  }, [formData.costPrice, formData.price]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Nama produk wajib diisi.';
    }
    if (!formData.code.trim()) {
      errors.code = 'Kode produk wajib diisi.';
    }
    if (!formData.category || !formData.category.trim()) {
      errors.category = 'Kategori produk wajib dipilih.';
    }

    const priceNum = Number(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = 'Harga jual tidak boleh negatif.';
    }

    const costNum = Number(formData.costPrice);
    if (isNaN(costNum) || costNum < 0) {
      errors.costPrice = 'Harga modal tidak boleh negatif.';
    }

    const stockNum = Number(formData.stock);
    if (isNaN(stockNum) || stockNum < 0) {
      errors.stock = 'Stok tidak boleh negatif.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Mohon periksa kolom yang belum lengkap');
      return;
    }

    setValidationErrors({});
    onSubmit({
      code: formData.code.trim(),
      name: formData.name.trim(),
      price: String(priceNum),
      costPrice: String(costNum),
      stock: String(stockNum),
      category: formData.category.trim(),
      imageUrl: formData.imageUrl || undefined
    });
  }, [formData, onSubmit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-950 w-full sm:max-w-md h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-250">
        
        {/* ─────────────────────────────────────────────────────────────────────
            TOP APP BAR (1:1 Kasir Pintar)
            ───────────────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1 -ml-1 text-slate-700 dark:text-slate-300 active:scale-95 cursor-pointer"
              aria-label="Kembali"
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {editingProduct ? 'Edit Barang' : 'Tambah Barang'}
            </h2>
          </div>

          {!editingProduct && (
            <button
              type="button"
              onClick={handleGenerateCode}
              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs tracking-tight shadow-xs cursor-pointer active:scale-95 transition-transform"
            >
              Tambah Instan
            </button>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            SCROLLABLE FORM CONTENT (1:1 Kasir Pintar Persona)
            ───────────────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* 1. Centered Photo Box & Camera/Gallery Icons */}
          <div className="flex flex-col items-center justify-center pt-1 pb-2">
            <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center relative overflow-hidden shadow-2xs group">
              {formData.imageUrl ? (
                <>
                  <img
                    src={formData.imageUrl}
                    alt="Preview Barang"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-rose-600 transition-colors"
                    title="Hapus Foto"
                  >
                    <X size={12} />
                  </button>
                </>
              ) : isUploadingImage ? (
                <Loader2 size={24} className="text-emerald-500 animate-spin" />
              ) : (
                <ImageIcon size={36} className="text-slate-300 dark:text-slate-600" />
              )}
            </div>

            {/* Camera & Gallery Action Buttons */}
            <div className="flex items-center gap-6 mt-2.5 text-slate-600 dark:text-slate-400">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploadingImage}
                className="p-1.5 hover:text-emerald-600 active:scale-90 transition-transform cursor-pointer"
                title="Ambil Foto Kamera"
              >
                <Camera size={20} />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="p-1.5 hover:text-emerald-600 active:scale-90 transition-transform cursor-pointer"
                title="Pilih dari Galeri"
              >
                <ImageIcon size={20} />
              </button>
            </div>
          </div>

          {/* 2. Nama* */}
          <div className="space-y-1">
            <label htmlFor="prod-name-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Nama*
            </label>
            <input
              id="prod-name-input"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Contoh: Marie Susu 115gr"
              className={cn(
                "w-full h-11 px-3.5 rounded-xl border bg-white dark:bg-slate-900 text-xs font-medium outline-none transition-all focus:ring-2 focus:ring-emerald-500",
                validationErrors.name ? "border-rose-500" : "border-slate-200 dark:border-slate-800"
              )}
              required
            />
            {validationErrors.name && (
              <p className="text-[11px] text-rose-500 font-medium">{validationErrors.name}</p>
            )}
          </div>

          {/* 3. Tipe Barang */}
          <div className="space-y-1">
            <label htmlFor="prod-type-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Tipe Barang
            </label>
            <div className="relative">
              <select
                id="prod-type-select"
                name="productType"
                value={formData.productType}
                onChange={handleInputChange}
                className="w-full h-11 px-3.5 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none appearance-none cursor-pointer"
              >
                <option value="Default">Default</option>
                <option value="Barang Fisik">Barang Fisik</option>
                <option value="Jasa / Layanan">Jasa / Layanan</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </span>
            </div>
          </div>

          {/* 4. Checkboxes: Tampilkan di Transaksi & Pakai Stok */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.showInTransaction}
                onChange={(e) => setFormData(prev => ({ ...prev, showInTransaction: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tampilkan di Transaksi
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.useStock}
                onChange={(e) => setFormData(prev => ({ ...prev, useStock: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pakai stok
              </span>
            </label>
          </div>

          {/* 5. Stok* */}
          {formData.useStock && (
            <div className="space-y-1">
              <label htmlFor="prod-stock-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Stok*
              </label>
              <input
                id="prod-stock-input"
                type="number"
                min="0"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          )}

          {/* 6. Kode* (With Auto Generate & Barcode Scanner) */}
          <div className="space-y-1">
            <label htmlFor="prod-code-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Kode*
            </label>
            <div className="relative flex items-center">
              <input
                id="prod-code-input"
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="KOP-12345678"
                className={cn(
                  "w-full h-11 pl-3.5 pr-20 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500",
                  validationErrors.code ? "border-rose-500" : "border-slate-200 dark:border-slate-800"
                )}
                required
              />
              <div className="absolute right-2 flex items-center gap-1.5 text-emerald-600">
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="p-1.5 hover:bg-emerald-50 rounded-lg active:scale-95 cursor-pointer"
                  title="Generate Kode Otomatis"
                >
                  <RotateCw size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => toast('Scanner Barcode siap digunakan')}
                  className="p-1.5 hover:bg-emerald-50 rounded-lg active:scale-95 cursor-pointer"
                  title="Scan Barcode"
                >
                  <Barcode size={18} />
                </button>
              </div>
            </div>
            {validationErrors.code && (
              <p className="text-[11px] text-rose-500 font-medium">{validationErrors.code}</p>
            )}
          </div>

          {/* 7. Harga dasar* (Harga Modal) */}
          <div className="space-y-1">
            <label htmlFor="prod-cost-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Harga dasar*
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-slate-500 pointer-events-none">
                Rp
              </span>
              <input
                id="prod-cost-input"
                type="number"
                min="0"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleInputChange}
                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* 8. Harga jual* + Markup & Margin Subtitles */}
          <div className="space-y-1">
            <label htmlFor="prod-price-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Harga jual*
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-slate-500 pointer-events-none">
                Rp
              </span>
              <input
                id="prod-price-input"
                type="number"
                min="0"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Live Profit Metrics (Kasir Pintar Style) */}
            <div className="pt-1 space-y-0.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold italic">
              <p className="flex items-center gap-1">
                <span>Markup Penjualan {metrics.markup}%</span>
                <Info size={12} className="inline opacity-70" />
              </p>
              <p className="flex items-center gap-1">
                <span>Margin Keuntungan {metrics.margin}%</span>
                <Info size={12} className="inline opacity-70" />
              </p>
            </div>
          </div>

          {/* 9. Kategori */}
          <div className="space-y-1 pb-4">
            <label htmlFor="prod-category-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Kategori
            </label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <select
                  id="prod-category-select"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full h-11 px-3.5 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none appearance-none cursor-pointer"
                >
                  {categoryOptions.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const custom = prompt('Masukkan nama kategori baru:');
                  if (custom && custom.trim()) {
                    setFormData(prev => ({ ...prev, category: custom.trim() }));
                  }
                }}
                className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 active:scale-95 cursor-pointer shadow-2xs"
                title="Tambah Kategori Baru"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* 10. Bottom Full-Width Simpan Button */}
          <div className="pt-2 sticky bottom-0 bg-white dark:bg-slate-950 pb-2">
            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center cursor-pointer active:scale-98 transition-transform"
            >
              Simpan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

ProductFormModal.displayName = 'ProductFormModal';

export default ProductFormModal;
