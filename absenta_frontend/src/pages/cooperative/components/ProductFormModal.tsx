import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Camera, 
  Image as ImageIcon, 
  RotateCw, 
  Barcode, 
  Plus, 
  Info, 
  Loader2, 
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../../../components/cooperative/ui/Button';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

// Lazy Loaded Advanced Section (Pilar 13)
const ProductAdvancedFieldsSection = lazy(() => import('../../../components/cooperative/products/ProductAdvancedFieldsSection').then(m => ({ default: m.ProductAdvancedFieldsSection })));
const ProductImageUploadSection = lazy(() => import('../../../components/cooperative/products/ProductImageUploadSection').then(m => ({ default: m.ProductImageUploadSection })));
const ProductPriceStockSection = lazy(() => import('../../../components/cooperative/products/ProductPriceStockSection').then(m => ({ default: m.ProductPriceStockSection })));

interface Product {
  id: string;
  code: string;
  name: string;
  price: string;
  costPrice: string;
  stock: number;
  minStock?: number;
  category: string;
  imageUrl?: string | null;
  productType?: string | null;
  showInTransaction?: boolean;
  useStock?: boolean;
  weight?: string | number | null;
  unit?: string | null;
  discount?: string | number | null;
  discountType?: string | null;
  rackLocation?: string | null;
  description?: string | null;
  barcode?: string | null;
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
    minStock?: string;
    category: string;
    imageUrl?: string;
    productType?: string;
    showInTransaction?: boolean;
    useStock?: boolean;
    weight?: string;
    unit?: string;
    discount?: string;
    discountType?: string;
    rackLocation?: string;
    description?: string;
    barcode?: string;
  }) => Promise<void>;
  isLoading: boolean;
  existingCategories: string[];
}

// Zod Schema Validation Guard (Pilar 25)
const productFormSchema = z.object({
  code: z.string().min(1, 'Kode barang wajib diisi'),
  name: z.string().min(1, 'Nama barang wajib diisi'),
  price: z.string().min(1, 'Harga jual wajib diisi'),
  costPrice: z.string().min(1, 'Harga dasar wajib diisi'),
  stock: z.string().min(1, 'Stok wajib diisi'),
  category: z.string().min(1, 'Kategori wajib diisi')
});

const PRODUCT_TYPE_OPTIONS = [
  { value: 'Default', label: 'Default' },
  { value: 'Barang Fisik', label: 'Barang Fisik' },
  { value: 'Jasa / Layanan', label: 'Jasa / Layanan' }
];

export const ProductFormModal: React.FC<ProductFormModalProps> = React.memo(({
  isOpen,
  onClose,
  editingProduct,
  onSubmit,
  isLoading,
  existingCategories
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    price: '0',
    costPrice: '0',
    stock: '0',
    minStock: '0',
    category: '',
    imageUrl: '',
    productType: 'Default',
    showInTransaction: true,
    useStock: true,
    weight: '0',
    unit: 'pcs',
    discount: '0',
    discountType: 'PERCENT',
    rackLocation: '',
    description: '',
    barcode: '',
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        code: editingProduct.code || '',
        name: editingProduct.name || '',
        price: editingProduct.price || '0',
        costPrice: editingProduct.costPrice || '0',
        stock: String(editingProduct.stock ?? 0),
        minStock: String(editingProduct.minStock ?? 0),
        category: editingProduct.category || '',
        imageUrl: editingProduct.imageUrl || '',
        productType: editingProduct.productType || 'Default',
        showInTransaction: editingProduct.showInTransaction ?? true,
        useStock: editingProduct.useStock ?? true,
        weight: String(editingProduct.weight ?? 0),
        unit: editingProduct.unit || 'pcs',
        discount: String(editingProduct.discount ?? 0),
        discountType: editingProduct.discountType || 'PERCENT',
        rackLocation: editingProduct.rackLocation || '',
        description: editingProduct.description || '',
        barcode: editingProduct.barcode || '',
      });
      setIsExpanded(Boolean(editingProduct.rackLocation || editingProduct.description || editingProduct.barcode || editingProduct.minStock));
    } else {
      setFormData({
        code: 'KOP-' + Math.floor(10000000 + Math.random() * 90000000),
        name: '',
        price: '0',
        costPrice: '0',
        stock: '0',
        minStock: '0',
        category: existingCategories[0] || 'Umum',
        imageUrl: '',
        productType: 'Default',
        showInTransaction: true,
        useStock: true,
        weight: '0',
        unit: 'pcs',
        discount: '0',
        discountType: 'PERCENT',
        rackLocation: '',
        description: '',
        barcode: '',
      });
      setIsExpanded(false);
    }
    setValidationErrors({});
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
  }, [editingProduct, isOpen, existingCategories]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }, [validationErrors]);

  const handleGenerateCode = useCallback(() => {
    setFormData(prev => ({ ...prev, code: 'KOP-' + Math.floor(10000000 + Math.random() * 90000000) }));
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5MB');
      return;
    }

    const uploadPayload = new FormData();
    uploadPayload.append('image', file);

    setIsUploadingImage(true);
    try {
      const res = await api.post('/cooperative/upload-product-image', uploadPayload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success && res.data?.data?.imageUrl) {
        setFormData(prev => ({ ...prev, imageUrl: res.data.data.imageUrl }));
        toast.success('Foto barang berhasil diunggah!');
      } else {
        toast.error(res.data?.message || 'Gagal mengunggah foto');
      }
    } catch {
      toast.error('Gagal mengunggah foto');
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = productFormSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) errors[String(err.path[0])] = err.message;
      });
      setValidationErrors(errors);
      toast.error(validation.error.errors[0]?.message || 'Periksa kembali formulir Anda');
      return;
    }

    await onSubmit(formData);
    queryClient.invalidateQueries({ queryKey: ['coop-products'] });
  }, [formData, onSubmit, queryClient]);

  const categoryOptions = useMemo(() => {
    return existingCategories?.map(c => ({ value: c, label: c })) || [];
  }, [existingCategories]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Kembali"
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-500"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {editingProduct ? 'Edit Barang' : 'Tambah Barang'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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

          <Suspense fallback={<div className="h-28 flex items-center justify-center text-xs text-slate-400">Memuat foto...</div>}>
            <ProductImageUploadSection
              imageUrl={formData.imageUrl}
              isUploadingImage={isUploadingImage}
              onRemoveImage={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
              onCameraClick={() => cameraInputRef.current?.click()}
              onGalleryClick={() => fileInputRef.current?.click()}
            />
          </Suspense>

          {/* Nama* */}
          <div className="space-y-1">
            <label htmlFor="prod-name-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Nama Barang*
            </label>
            <input
              id="prod-name-input"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Contoh: Buku Tulis Sinar Dunia 38 Lembar"
              className={cn(
                "w-full h-11 px-3.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
                validationErrors.name ? "border-rose-500" : "border-slate-200 dark:border-slate-800"
              )}
              required
            />
            {validationErrors.name && (
              <p className="text-[11px] text-rose-500 font-medium">{validationErrors.name}</p>
            )}
          </div>

          {/* Tipe Barang */}
          <div className="space-y-1">
            <label htmlFor="prod-type-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Tipe Barang
            </label>
            <SearchableSelect
              id="prod-type-select"
              aria-label="Tipe Barang"
              value={formData.productType || 'Default'}
              onValueChange={(val) => setFormData(prev => ({ ...prev, productType: val }))}
              options={PRODUCT_TYPE_OPTIONS}
              placeholder="Pilih Tipe..."
              triggerClassName="w-full h-11"
            />
          </div>

          {/* Checkboxes: Tampilkan di Transaksi & Pakai Stok */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                aria-label="Tampilkan di Transaksi"
                checked={formData.showInTransaction}
                onChange={(e) => setFormData(prev => ({ ...prev, showInTransaction: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tampilkan di Transaksi
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                aria-label="Pakai stok"
                checked={formData.useStock}
                onChange={(e) => setFormData(prev => ({ ...prev, useStock: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pakai stok
              </span>
            </label>
          </div>

          {/* Kode* */}
          <div className="space-y-1">
            <label htmlFor="prod-code-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Kode / SKU Barang*
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
                  "w-full h-11 pl-3.5 pr-20 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
                  validationErrors.code ? "border-rose-500" : "border-slate-200 dark:border-slate-800"
                )}
                required
              />
              <div className="absolute right-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <button
                  type="button"
                  aria-label="Generate Kode Otomatis"
                  onClick={handleGenerateCode}
                  className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg active:scale-95 cursor-pointer transition-colors"
                >
                  <RotateCw size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Scan Barcode"
                  onClick={() => toast('Scanner Barcode siap digunakan')}
                  className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg active:scale-95 cursor-pointer transition-colors"
                >
                  <Barcode size={18} />
                </button>
              </div>
            </div>
            {validationErrors.code && (
              <p className="text-[11px] text-rose-500 font-medium">{validationErrors.code}</p>
            )}
          </div>

          <Suspense fallback={null}>
            <ProductPriceStockSection
              formData={formData}
              handleInputChange={handleInputChange}
            />
          </Suspense>

          {/* Kategori */}
          <div className="space-y-1">
            <label htmlFor="prod-category-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Kategori Barang*
            </label>
            <SearchableSelect
              id="prod-category-select"
              aria-label="Kategori Barang"
              value={formData.category || 'Umum'}
              onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
              options={categoryOptions}
              placeholder="Pilih Kategori..."
              triggerClassName="w-full h-11"
            />
          </div>

          {/* Toggle Expand Advanced Options */}
          <button
            type="button"
            aria-label="Opsi Lanjutan Barang"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <span>Opsi Tambahan (Diskon, Satuan, Lokasi Rak, Barcode)</span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isExpanded && (
            <Suspense fallback={<div className="p-4 text-center text-xs text-slate-400">Memuat opsi lanjutan...</div>}>
              <ProductAdvancedFieldsSection
                formData={formData}
                handleInputChange={handleInputChange}
                setFormData={setFormData}
              />
            </Suspense>
          )}

          {/* Footer Submit Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              {editingProduct ? 'Simpan Perubahan' : 'Tambah Barang'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default ProductFormModal;
