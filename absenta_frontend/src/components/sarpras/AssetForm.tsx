import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, 
  BarChart, 
  Wand2,
  RefreshCw,
  Save,
  X
} from 'lucide-react';
import { Button, Input, Label, Textarea, SearchableSelect, ModalFooter, Loader, Alert } from '../ui';
import { sarprasApi } from '../../api/sarpras.api';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

interface AssetFormProps {
  assetId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const KONDISI_OPTIONS = [
  { value: 'BAIK', label: 'Baik' },
  { value: 'RUSAK', label: 'Rusak' },
  { value: 'PERBAIKAN', label: 'Dalam Perbaikan' },
  { value: 'HILANG', label: 'Hilang' },
];

const AssetForm: React.FC<AssetFormProps> = ({ assetId, onSuccess, onCancel }) => {
  const { subscription } = useAuthStore();
  const queryClient = useQueryClient();

  // Gating Logic
  const isLocked = subscription?.plan?.name === 'CORE_PLATFORM' || subscription?.Plan?.name === 'CORE_PLATFORM';
  const isEnabled = subscription !== undefined;

  const [formData, setFormData] = useState({
    nama: '',
    kode: '',
    brand: '',
    serial_number: '',
    category_id: '',
    location_id: '',
    kondisi: 'BAIK',
    jumlah: 1,
    is_loanable: true,
    purchase_date: '',
    price_purchase: '',
    deskripsi: ''
  });

  // Load dropdown data
  const { data: categories } = useQuery({ 
    queryKey: ['sarpras-categories'], 
    queryFn: sarprasApi.getCategories,
    enabled: isEnabled
  });
  const { data: locations } = useQuery({ 
    queryKey: ['sarpras-locations'], 
    queryFn: sarprasApi.getLocations,
    enabled: isEnabled
  });

  // Load asset if editing
  const { data: assetDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['sarpras-asset', assetId],
    queryFn: () => sarprasApi.getAssetById(assetId!),
    enabled: !!assetId && isEnabled
  });

  useEffect(() => {
    if (assetDetail?.data) {
      const a = assetDetail.data;
      setFormData({
        nama: a.nama || '',
        kode: a.kode || '',
        brand: a.brand || '',
        serial_number: a.serial_number || '',
        category_id: a.category_id || '',
        location_id: a.location_id || '',
        kondisi: a.kondisi || 'BAIK',
        jumlah: a.jumlah || 1,
        is_loanable: a.is_loanable !== undefined ? a.is_loanable : true,
        purchase_date: a.purchase_date ? a.purchase_date.split('T')[0] : '',
        price_purchase: a.price_purchase?.toString() || '',
        deskripsi: a.deskripsi || ''
      });
    }
  }, [assetDetail]);

  const categoryOptions = useMemo(() => {
    return categories?.data?.map((c: { id: string; nama: string }) => ({ value: c.id, label: c.nama })) || [];
  }, [categories]);

  const locationOptions = useMemo(() => {
    if (!locations?.data) return [];

    const classrooms: any[] = [];
    const majors: any[] = [];
    const general: any[] = [];

    locations.data.forEach((l: { id: string; nama: string; kelas_id?: string; unit_id?: string }) => {
      const option = { value: l.id, label: `   • ${l.nama}` };
      if (l.kelas_id) {
        classrooms.push(option);
      } else if (l.unit_id) {
        majors.push(option);
      } else {
        general.push(option);
      }
    });

    const options: any[] = [];

    if (classrooms.length > 0) {
      options.push({ value: 'header-classrooms', label: '🏢 RUANG KELAS', disabled: true });
      options.push(...classrooms);
    }

    if (majors.length > 0) {
      options.push({ value: 'header-majors', label: '🔬 LABORATORIUM / JURUSAN', disabled: true });
      options.push(...majors);
    }

    if (general.length > 0) {
      options.push({ value: 'header-general', label: '📦 FASILITAS UMUM / TAMBAHAN', disabled: true });
      options.push(...general);
    }

    return options;
  }, [locations]);

  const mutation = useMutation({
    mutationFn: (data: unknown) => assetId 
      ? sarprasApi.updateAsset(assetId, data)
      : sarprasApi.createAsset(data),
    onSuccess: (res: { message?: string }) => {
      toast.success(res.message || 'Berhasil menyimpan aset');
      queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      let errMsg = 'Gagal menyimpan aset';
      if (err && typeof err === 'object' && 'response' in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) {
          errMsg = resErr.response.data.message;
        }
      } else if (err instanceof Error) {
        errMsg = err.message;
      }
      toast.error(errMsg);
    }
  });

  const generateLocalCode = useCallback(() => {
    const years = new Date().getFullYear();
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomStr = '';
    for (let i = 0; i < 5; i++) {
      randomStr += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setFormData(prev => ({ ...prev, kode: `INV-${years}-${randomStr}` }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      jumlah: Number(formData.jumlah),
      price_purchase: formData.price_purchase ? Number(formData.price_purchase) : undefined,
      purchase_date: formData.purchase_date ? new Date(formData.purchase_date) : undefined
    };
    mutation.mutate(payload);
  }, [formData, mutation]);

  if (assetId && isLoadingDetail) return <div className="p-12 flex justify-center"><Loader size="lg" /></div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {isLocked && (
          <Alert variant="warning">
            Fitur Manajemen Sarpras terbatas pada paket berlangganan tertentu.
          </Alert>
        )}

        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Informasi Utama</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Identitas & Klasifikasi Aset</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 group md:col-span-2">
              <Label htmlFor="nama" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Nama Aset <span className="text-rose-500">*</span>
              </Label>
              <Input 
                id="nama"
                required 
                placeholder="Entry Nama Aset..." 
                value={formData.nama}
                onChange={e => setFormData(prev => ({...prev, nama: e.target.value}))}
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="kode" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Kode / Tag
              </Label>
              <div className="flex gap-2">
                <Input 
                  id="kode"
                  placeholder="AUTO" 
                  value={formData.kode}
                  onChange={e => setFormData(prev => ({...prev, kode: e.target.value}))}
                  className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="h-10 w-10 rounded-xl border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  onClick={generateLocalCode}
                >
                  <Wand2 size={16} />
                </Button>
              </div>
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="brand" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Brand / Merk
              </Label>
              <Input 
                id="brand"
                placeholder="Entry Brand..." 
                value={formData.brand}
                onChange={e => setFormData(prev => ({...prev, brand: e.target.value}))}
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="category_id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Kategori
              </Label>
              <SearchableSelect 
                id="category_id"
                options={categoryOptions} 
                value={formData.category_id}
                onValueChange={v => setFormData(prev => ({...prev, category_id: v}))}
                placeholder="Pilih Kategori"
                triggerClassName="h-10 text-[13px] font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="location_id" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Lokasi
              </Label>
              <SearchableSelect 
                id="location_id"
                options={locationOptions} 
                value={formData.location_id}
                onValueChange={v => setFormData(prev => ({...prev, location_id: v}))}
                placeholder="Pilih Lokasi"
                triggerClassName="h-10 text-[13px] font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <BarChart size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Status & Inventaris</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Kondisi & Stok Barang</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 group">
              <Label htmlFor="kondisi" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Kondisi Aset
              </Label>
              <SearchableSelect 
                id="kondisi"
                options={KONDISI_OPTIONS} 
                value={formData.kondisi}
                onValueChange={v => setFormData(prev => ({...prev, kondisi: v}))}
                triggerClassName="h-10 text-[13px] font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="space-y-2 group">
              <Label htmlFor="jumlah" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Jumlah Unit
              </Label>
              <Input 
                id="jumlah"
                type="number" 
                min={1} 
                value={formData.jumlah}
                onChange={e => setFormData(prev => ({...prev, jumlah: Number(e.target.value)}))}
                className="h-10 text-[13px] font-bold tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="space-y-2 group md:col-span-2">
              <Label htmlFor="deskripsi" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                Deskripsi
              </Label>
              <Textarea 
                id="deskripsi"
                placeholder="Spesifikasi teknis atau catatan..." 
                rows={3}
                value={formData.deskripsi}
                onChange={e => setFormData(prev => ({...prev, deskripsi: e.target.value}))}
                className="text-[13px] font-medium tracking-tight bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>
          </div>
        </div>

        <ModalFooter className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 gap-3">
          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onCancel}
            disabled={mutation.isPending}
          >
            <X className="w-3.5 h-3.5 mr-2" />
            Batalkan
          </Button>
          <Button
            type="submit"
            variant="toolbarPrimary"
            size="toolbar"
            disabled={mutation.isPending}
            className="px-8"
          >
            {mutation.isPending ? (
              <RefreshCw size={14} className="mr-2 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-2" />
            )}
            {assetId ? 'Simpan Perubahan' : 'Simpan Aset Baru'}
          </Button>
        </ModalFooter>
      </form>
    </div>
  );
};

export default AssetForm;
