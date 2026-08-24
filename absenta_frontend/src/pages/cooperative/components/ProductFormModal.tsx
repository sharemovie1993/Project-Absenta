import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Modal } from '../../../components/cooperative/ui/Modal';
import { Input } from '../../../components/cooperative/ui/Input';
import { Button } from '../../../components/cooperative/ui/Button';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Upload, Loader2, Image as ImageIcon, X } from 'lucide-react';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';

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
    price: '',
    costPrice: '',
    stock: '',
    category: '',
    imageUrl: ''
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        code: editingProduct.code,
        name: editingProduct.name,
        price: editingProduct.price.toString(),
        costPrice: editingProduct.costPrice.toString(),
        stock: editingProduct.stock.toString(),
        category: editingProduct.category || '',
        imageUrl: editingProduct.imageUrl || ''
      });
      // Check if current category is not in standard list to toggle custom input
      const isCustom = editingProduct.category && !existingCategories.includes(editingProduct.category);
      setIsCustomCategory(!!isCustom);
    } else {
      setFormData({
        code: '',
        name: '',
        price: '',
        costPrice: '',
        stock: '',
        category: '',
        imageUrl: ''
      });
      setIsCustomCategory(false);
    }
    setValidationErrors({});
  }, [editingProduct, isOpen, existingCategories]);

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
      // Reset input value so same file can be re-selected if needed
      if (e.target) e.target.value = '';
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handleCategoryChange = useCallback((val: string) => {
    setFormData((prev) => ({ ...prev, category: val }));
    setValidationErrors((prev) => ({ ...prev, category: '' }));
  }, []);

  const handleGenerateCode = useCallback(() => {
    const randomNum = Math.floor(10000000 + Math.random() * 90000000); // 8-digit random
    const autoCode = `KOP-${randomNum}`;
    setFormData((prev) => ({ ...prev, code: autoCode }));
    setValidationErrors((prev) => ({ ...prev, code: '' }));
  }, []);

  // Handle Enter key for barcode scanner (prevents submit, focuses product name)
  const handleCodeKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nameInput = document.getElementById('prod-name');
      if (nameInput) {
        nameInput.focus();
      }
    }
  }, []);

  const warningMessage = useMemo(() => {
    const priceNum = Number(formData.price || 0);
    const costNum = Number(formData.costPrice || 0);
    if (priceNum > 0 && costNum > 0 && priceNum < costNum) {
      return 'Harga jual lebih rendah dari harga modal (Rugi)';
    }
    return '';
  }, [formData.price, formData.costPrice]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.code.trim()) {
      errors.code = 'Kode produk wajib diisi.';
    }
    if (!formData.name.trim()) {
      errors.name = 'Nama produk wajib diisi.';
    }
    if (!formData.category || !formData.category.trim()) {
      errors.category = 'Kategori produk wajib dipilih atau diisi.';
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
    if (!editingProduct && (isNaN(stockNum) || stockNum < 0)) {
      errors.stock = 'Stok awal tidak boleh negatif.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    onSubmit(formData);
  }, [formData, onSubmit, editingProduct]);

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

    const combined = Array.from(new Set([
      ...rawList.filter((cat) => cat && cat !== 'ALL'),
      ...DEFAULT_COOP_CATEGORIES
    ]));

    return combined.map((cat) => ({
      label: cat,
      value: cat
    }));
  }, [existingCategories, DEFAULT_COOP_CATEGORIES]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="prod-code" className="block text-sm font-medium text-gray-700">
                Kode Produk
              </label>
              <button
                type="button"
                onClick={handleGenerateCode}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
              >
                Buat Otomatis
              </button>
            </div>
            <Input
              id="prod-code"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              onKeyDown={handleCodeKeyDown}
              required
              autoFocus
              placeholder="E.g. PRD-001"
              aria-label="Kode Produk"
              error={validationErrors.code}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor={isCustomCategory ? 'prod-category-custom' : 'prod-category-select'} className="block text-sm font-medium text-gray-700">
                Kategori Produk
              </label>
              <label className="flex items-center space-x-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCustomCategory}
                  onChange={(e) => {
                    setIsCustomCategory(e.target.checked);
                    setFormData((prev) => ({ ...prev, category: '' }));
                    setValidationErrors((prev) => ({ ...prev, category: '' }));
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span className="text-xs text-gray-500 font-medium">Buat Baru</span>
              </label>
            </div>

            {isCustomCategory ? (
              <Input
                id="prod-category-custom"
                placeholder="Ketik kategori baru..."
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                aria-label="Kategori Baru"
                error={validationErrors.category}
              />
            ) : (
              <div>
                <SearchableSelect
                  id="prod-category-select"
                  options={categoryOptions}
                  value={formData.category}
                  onValueChange={handleCategoryChange}
                  placeholder="Pilih atau cari kategori..."
                  clearable
                />
                {validationErrors.category && <p className="mt-1 text-sm text-red-600">{validationErrors.category}</p>}
              </div>
            )}
          </div>
        </div>

        <Input
          id="prod-name"
          label="Nama Produk"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          required
          placeholder="E.g. Susu UHT 250ml"
          aria-label="Nama Produk"
          error={validationErrors.name}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              id="prod-price"
              label="Harga Jual (Rp)"
              name="price"
              type="number"
              min="0"
              value={formData.price}
              onChange={handleInputChange}
              required
              placeholder="0"
              aria-label="Harga Jual"
              error={validationErrors.price}
            />
            {formData.price && !isNaN(Number(formData.price)) && (
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Pratinjau: Rp {Number(formData.price).toLocaleString('id-ID')}
              </p>
            )}
            {warningMessage && (
              <p className="mt-1 text-xs text-amber-600 font-bold">
                ⚠️ {warningMessage}
              </p>
            )}
          </div>
          <div>
            <Input
              id="prod-cost-price"
              label="Harga Modal (Rp)"
              name="costPrice"
              type="number"
              min="0"
              value={formData.costPrice}
              onChange={handleInputChange}
              required
              placeholder="0"
              aria-label="Harga Modal"
              error={validationErrors.costPrice}
            />
            {formData.costPrice && !isNaN(Number(formData.costPrice)) && (
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Pratinjau: Rp {Number(formData.costPrice).toLocaleString('id-ID')}
              </p>
            )}
          </div>
        </div>

        {/* Foto Produk (Terintegrasi ke Storage Engine) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Foto Produk (Opsional)
          </label>
          <div className="flex items-center gap-3.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
              {formData.imageUrl ? (
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <ImageIcon className="text-slate-400" size={24} />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="text-xs flex items-center gap-1.5"
                >
                  {isUploadingImage ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  <span>{formData.imageUrl ? 'Ganti Foto' : 'Unggah Foto'}</span>
                </Button>
                {formData.imageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900"
                  >
                    Hapus
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Format PNG, JPG, WebP. Tersimpan otomatis ke storage engine.
              </p>
            </div>
          </div>
        </div>

        <Input
          id="prod-stock"
          label="Stok Awal"
          name="stock"
          type="number"
          min="0"
          value={formData.stock}
          onChange={handleInputChange}
          required
          disabled={!!editingProduct}
          placeholder="0"
          aria-label="Stok Awal"
          error={validationErrors.stock}
        />

        <div className="flex justify-end space-x-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
});
export default ProductFormModal;
