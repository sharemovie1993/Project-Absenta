import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Tag, MapPin, Save, X, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { sarprasApi } from '../../api/sarpras.api';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

interface CategoryLocationManagerProps {
  type: 'category' | 'location';
  isOpen: boolean;
  onClose: () => void;
}

interface Item {
  id: string;
  nama: string;
  deskripsi?: string;
}

const CategoryLocationManager: React.FC<CategoryLocationManagerProps> = ({ type, isOpen, onClose }) => {
  const { subscription } = useAuthStore();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nama: '', deskripsi: '' });

  // Gating Logic
  const isLocked = subscription?.plan?.name === 'CORE_PLATFORM' || subscription?.Plan?.name === 'CORE_PLATFORM';
  const isEnabled = subscription !== undefined;

  const isCategory = type === 'category';
  const queryKey = isCategory ? 'sarpras-categories' : 'sarpras-locations';
  const Icon = isCategory ? Tag : MapPin;
  const title = isCategory ? 'Kelola Kategori Aset' : 'Kelola Lokasi Aset';
  const accentColor = isCategory ? 'indigo' : 'rose';

  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: isCategory ? sarprasApi.getCategories : sarprasApi.getLocations,
    enabled: isOpen && isEnabled
  });

  const items = (data?.data as Item[]) || [];

  const resetForm = useCallback(() => {
    setFormData({ nama: '', deskripsi: '' });
    setEditingId(null);
  }, []);

  const createMutation = useMutation({
    mutationFn: (payload: { nama: string; deskripsi?: string }) =>
      isCategory ? sarprasApi.createCategory(payload) : sarprasApi.createLocation(payload),
    onSuccess: () => {
      toast.success(`${isCategory ? 'Kategori' : 'Lokasi'} berhasil ditambahkan`);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      resetForm();
    },
    onError: (err: unknown) => {
      let errMsg = 'Gagal menyimpan';
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

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) return;
    createMutation.mutate({
      nama: formData.nama.trim(),
      deskripsi: formData.deskripsi.trim() || undefined
    });
  }, [formData, createMutation]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-6">
        {/* Add Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`flex items-center gap-2 text-${accentColor}-600 font-semibold text-sm uppercase tracking-wider`}>
            <Plus size={16} />
            Tambah {isCategory ? 'Kategori' : 'Lokasi'} Baru
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="masterdata-nama">Nama <span className="text-red-500">*</span></Label>
              <Input
                id="masterdata-nama"
                required
                placeholder={isCategory ? 'Contoh: Elektronik' : 'Contoh: Lab RPL'}
                value={formData.nama}
                onChange={e => setFormData({ ...formData, nama: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="masterdata-desc">Deskripsi</Label>
              <Input
                id="masterdata-desc"
                placeholder="Opsional..."
                value={formData.deskripsi}
                onChange={e => setFormData({ ...formData, deskripsi: e.target.value })}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={createMutation.isPending || !formData.nama.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {createMutation.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Plus size={16} className="mr-2" />}
            Tambah
          </Button>
        </form>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-700" />

        {/* Items List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Daftar {isCategory ? 'Kategori' : 'Lokasi'} ({items.length})
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="animate-spin mr-2" size={20} />
              Memuat data...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Icon size={32} className="mx-auto mb-2 opacity-40" />
              <p>Belum ada {isCategory ? 'kategori' : 'lokasi'}. Tambahkan di atas.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items?.map((item: Item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isCategory ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.nama}</p>
                      {item.deskripsi && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.deskripsi}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CategoryLocationManager;
