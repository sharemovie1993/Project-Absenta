import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import OpnameDetail from '../../../pages/cooperative/components/OpnameDetail';

interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  order: number;
}

interface OpnameSession {
  id: string;
  opnameNumber: string;
  date: string;
  status: string;
  notes: string | null;
  items?: { id: string }[];
}

interface ProductOpnameTabProps {
  categories: ProductCategory[];
  fetchProducts: () => Promise<void>;
  activeTab: 'catalog' | 'stock-in' | 'history' | 'categories' | 'opname';
}

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
}

export const ProductOpnameTab = React.memo<ProductOpnameTabProps>(({
  categories,
  fetchProducts,
  activeTab
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canUpdate = user?.capabilities?.includes('cooperative.store.products.update') || false;

  const [activeOpnameSessionId, setActiveOpnameSessionId] = useState<string | null>(null);
  const [isCreateOpnameModalOpen, setIsCreateOpnameModalOpen] = useState(false);
  const [newOpnameNotes, setNewOpnameNotes] = useState('');
  const [newOpnameCategoryFilter, setNewOpnameCategoryFilter] = useState('ALL');

  const opnameQuery = useQuery({
    queryKey: ['koperasi-opname-history'],
    queryFn: async () => {
      const response = await api.get('/cooperative/toko/opname');
      return (Array.isArray(response.data) ? response.data : []) as OpnameSession[];
    },
    enabled: activeTab === 'opname',
    staleTime: 5 * 60 * 1000,
  });

  const opnameSessions = opnameQuery.data || [];
  const opnameLoading = opnameQuery.isLoading;
  const fetchOpnameSessions = async () => {
    await opnameQuery.refetch();
  };

  const createOpnameMutation = useMutation({
    mutationFn: async (payload: { notes: string; categoryFilter: string }) => {
      const response = await api.post('/cooperative/toko/opname', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Sesi Stock Opname berhasil dibuat');
      setNewOpnameNotes('');
      setNewOpnameCategoryFilter('ALL');
      setIsCreateOpnameModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['koperasi-opname-history'] });
      if (data?.id) {
        setActiveOpnameSessionId(data.id);
      }
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal membuat sesi stock opname');
    }
  });

  const createOpnameLoading = createOpnameMutation.isPending;

  const handleCreateOpnameSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await createOpnameMutation.mutateAsync({
      notes: newOpnameNotes.trim(),
      categoryFilter: newOpnameCategoryFilter
    });
  };

  return (
    <div className="space-y-4">
      {activeOpnameSessionId ? (
        <OpnameDetail
          sessionId={activeOpnameSessionId}
          onBack={() => {
            setActiveOpnameSessionId(null);
            fetchOpnameSessions();
          }}
          onFinalizeSuccess={() => {
            setActiveOpnameSessionId(null);
            fetchOpnameSessions();
            fetchProducts();
          }}
        />
      ) : (
        <div className="space-y-4">
          {canUpdate && (
            <div className="flex justify-end space-x-3 mb-2">
              <Button onClick={() => setIsCreateOpnameModalOpen(true)} icon={<Plus size={18} />}>
                Buat Sesi Opname Baru
              </Button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-slate-50/50">
              <h3 className="font-bold text-gray-800 text-base">Sesi Stock Opname</h3>
              <p className="text-xs text-gray-500">Daftar sesi pemeriksaan dan pencocokan fisik stok barang koperasi.</p>
            </div>

            {opnameLoading ? (
              <div className="text-center py-12 text-gray-500">Memuat riwayat sesi opname...</div>
            ) : opnameSessions.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                Belum ada sesi stock opname yang dibuat. Klik tombol di atas untuk memulai.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nomor Sesi</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Catatan</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Item</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(opnameSessions || []).map((sess) => (
                      <tr key={sess.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                          {sess.opnameNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sess.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            sess.status === 'DRAFT' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                            sess.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border border-green-200' :
                            'bg-slate-50 text-slate-400 border border-slate-200'
                          }`}>
                            {sess.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {sess.notes || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-center text-gray-700">
                          {sess.items?.length || 0} barang
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {sess.status === 'DRAFT' ? (
                            <Button 
                              size="sm" 
                              onClick={() => setActiveOpnameSessionId(sess.id)}
                            >
                              Lanjutkan Audit
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setActiveOpnameSessionId(sess.id)}
                            >
                              Lihat Laporan
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal CRUD: Buat Sesi Opname Baru */}
      <Modal
        isOpen={isCreateOpnameModalOpen}
        onClose={() => setIsCreateOpnameModalOpen(false)}
        title="Mulai Sesi Stock Opname Baru"
      >
        <form onSubmit={handleCreateOpnameSession} className="space-y-4">
          <p className="text-xs text-slate-500">
            Membuat sesi baru akan merekam stok seluruh produk koperasi saat ini sebagai draft pembanding. Anda dapat menyesuaikannya setelah menghitung stok fisik di lapangan.
          </p>
          
          <div>
            <label htmlFor="opname-cat-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Cakupan Kategori Barang
            </label>
            <SearchableSelect
              id="opname-cat-filter"
              options={[
                { value: 'ALL', label: 'Semua Kategori (Rekomendasi)' },
                ...(categories || []).map(c => ({ value: c.name, label: c.name }))
              ]}
              value={newOpnameCategoryFilter}
              onValueChange={setNewOpnameCategoryFilter}
              placeholder="Pilih cakupan kategori..."
            />
          </div>

          <Input
            id="opname-notes"
            label="Catatan / Keterangan Sesi"
            value={newOpnameNotes}
            onChange={(e) => setNewOpnameNotes(e.target.value)}
            placeholder="Misal: Opname Bulanan Juni, Audit Gudang..."
            aria-label="Catatan Sesi"
          />

          <div className="flex justify-end space-x-3 mt-6">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setIsCreateOpnameModalOpen(false)}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              isLoading={createOpnameLoading}
            >
              Mulai Sesi Audit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
});

ProductOpnameTab.displayName = 'ProductOpnameTab';

export default ProductOpnameTab;
