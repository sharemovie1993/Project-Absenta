const sarprasCatalogSchema = z.object({
  nama_barang: z.string().min(1, 'Nama barang wajib diisi'),
  kategori: z.string().min(1, 'Kategori wajib diisi'),
  satuan: z.string().min(1, 'Satuan wajib diisi')
});
import { z } from 'zod';
import { formatDate } from '@/utils/date.utils';
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, Button, Input, Label, Textarea, Switch, SearchableSelect } from '@/components/ui';

interface CatalogItem {
  id: string;
  nama: string;
  brand: string | null;
  category_name: string;
  is_loanable: boolean;
  deskripsi: string | null;
  image_url: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  formData: {
    nama: string;
    brand: string;
    category_name: string;
    custom_category: string;
    is_loanable: boolean;
    deskripsi: string;
    image_url: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    nama: string;
    brand: string;
    category_name: string;
    custom_category: string;
    is_loanable: boolean;
    deskripsi: string;
    image_url: string;
  }>>;
  useCustomCategory: boolean;
  setUseCustomCategory: (val: boolean) => void;
  categorySelectOptions: Array<{ value: string; label: string }>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export const SarprasCatalogFormModal: React.FC<Props> = React.memo(({
  isOpen,
  onClose,
  mode,
  formData,
  setFormData,
  useCustomCategory,
  setUseCustomCategory,
  categorySelectOptions,
  onSubmit,
  isPending
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Tambah Item Katalog Standar' : 'Edit Item Katalog'}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4 py-2 text-xs">
        <div className="space-y-1">
          <Label htmlFor="cat_nama">Nama Barang Standar <span className="text-rose-500">*</span></Label>
          <Input
            id="cat_nama"
            aria-label="Nama barang standar"
            placeholder="Contoh: Router MikroTik RB750Gr3"
            value={formData.nama}
            onChange={e => setFormData(prev => ({ ...prev, nama: e.target.value }))}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="cat_brand">Merek / Brand (Opsional)</Label>
          <Input
            id="cat_brand"
            aria-label="Merek atau brand barang"
            placeholder="Contoh: MikroTik, Asus, IKEA"
            value={formData.brand}
            onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value }))}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="cat_category">Kategori Standar</Label>
          <SearchableSelect
            id="cat_category"
            aria-label="Pilih kategori barang"
            value={useCustomCategory ? 'CUSTOM' : formData.category_name}
            onValueChange={(val) => {
              if (val === 'CUSTOM') {
                setUseCustomCategory(true);
              } else {
                setUseCustomCategory(false);
                setFormData(prev => ({ ...prev, category_name: val }));
              }
            }}
            options={categorySelectOptions}
            placeholder="Pilih Kategori"
          />
        </div>

        {useCustomCategory && (
          <div className="space-y-1">
            <Label htmlFor="cat_custom_cat">Kategori Kustom Baru <span className="text-rose-500">*</span></Label>
            <Input
              id="cat_custom_cat"
              aria-label="Kategori kustom baru"
              placeholder="Contoh: Jurusan: DKV - Kamera & Lensa"
              value={formData.custom_category}
              onChange={e => setFormData(prev => ({ ...prev, custom_category: e.target.value }))}
              className="rounded-xl"
            />
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Dapat Dipinjamkan</span>
            <span className="text-[10px] text-slate-400">Izinkan barang ini muncul di form peminjaman sarpras</span>
          </div>
          <Switch
            checked={formData.is_loanable}
            onCheckedChange={val => setFormData(prev => ({ ...prev, is_loanable: val }))}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="cat_desk">Deskripsi Ringkas</Label>
          <Textarea
            id="cat_desk"
            aria-label="Deskripsi ringkas barang"
            placeholder="Tulis spesifikasi singkat atau fungsi barang..."
            value={formData.deskripsi}
            onChange={e => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
            rows={3}
            className="rounded-xl"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            size="toolbar"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            {mode === 'create' ? 'Tambah Item' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

export default SarprasCatalogFormModal;
