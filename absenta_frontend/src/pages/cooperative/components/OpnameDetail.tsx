import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../../../components/cooperative/ui/Button';
import { Card } from '../../../components/cooperative/ui/Card';
import { Input } from '../../../components/cooperative/ui/Input';
import { AnalyticsCard } from '../../../components/ui/AnalyticsCard';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';
import { COOP_QUERY_KEYS, invalidateAllProductCaches } from '../../../lib/coopQueryKeys';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Trash2, 
  Barcode,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/layoutUtils';
import { printOpnameBeritaAcara, fetchCoopSettings } from '../../../utils/cooperative/coopDocUtils';
import { playBeep } from '@/components/cooperative/opname/OpnameAudioFeedback';

const ConfirmModal = lazy(() => import('@/components/ui/Modal').then(m => ({ default: m.ConfirmModal })));

// Zod Schema Validation Guard (Pilar 25)
const opnameSearchSchema = z.object({
  query: z.string().optional(),
  physicalStock: z.number().int().min(0, 'Stok minimal 0').optional(),
});

interface Product {
  id: string;
  code: string;
  name: string;
  price: string;
  costPrice: string;
  category: string | null;
}

interface OpnameItem {
  id: string;
  opnameId: string;
  productId: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  costPrice: string;
  notes: string | null;
  Product: Product;
}

interface OpnameSession {
  id: string;
  tenantId: string;
  opnameNumber: string;
  date: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  operatorId: string | null;
  items: OpnameItem[];
}

interface OpnameDetailProps {
  sessionId: string;
  onBack: () => void;
  onFinalizeSuccess: () => void;
}

export const OpnameDetail: React.FC<OpnameDetailProps> = React.memo(({
  sessionId,
  onBack,
  onFinalizeSuccess,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canUpdate = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'OPERATOR';

  const [searchQuery, setSearchQuery] = useState('');
  const [localChanges, setLocalChanges] = useState<Record<string, { physicalStock: number; notes: string }>>({});
  const [mobileTab, setMobileTab] = useState<'SELECT' | 'SUMMARY'>('SELECT');
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // Fetch Opname Session Data
  const { data: sessionRes, isLoading: loading } = useQuery({
    queryKey: COOP_QUERY_KEYS.opnameDetail(sessionId),
    queryFn: async () => {
      const res = await api.get(`/cooperative/toko/opname/${sessionId}`);
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const session: OpnameSession | null = useMemo(() => sessionRes?.data || null, [sessionRes]);

  const items: OpnameItem[] = useMemo(() => {
    return (session?.items || []) as OpnameItem[];
  }, [session]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items?.filter(item => 
      item.Product.name.toLowerCase().includes(q) ||
      item.Product.code.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const handleStockChange = useCallback((productId: string, physicalStock: number, notes = '') => {
    const parsed = opnameSearchSchema.safeParse({ physicalStock });
    if (!parsed.success) return;
    setLocalChanges(prev => ({
      ...prev,
      [productId]: { physicalStock, notes }
    }));
  }, []);

  // Save changes mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.keys(localChanges)?.map(productId => ({
        productId,
        physicalStock: localChanges[productId].physicalStock,
        notes: localChanges[productId].notes,
      }));
      const res = await api.put(`/cooperative/toko/opname/${sessionId}/items`, { items: updates });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Draf perubahan stok berhasil disimpan');
      setLocalChanges({});
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.opnameDetail(sessionId) });
    },
    onError: () => {
      toast.error('Gagal menyimpan draf perubahan');
    }
  });

  // Finalize mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/cooperative/toko/opname/${sessionId}/finalize`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Sesi opname berhasil difinalisasi!');
      invalidateAllProductCaches(queryClient);
      onFinalizeSuccess();
    },
    onError: () => {
      toast.error('Gagal memfinalisasi sesi opname');
    }
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/cooperative/toko/opname/${sessionId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Sesi opname telah dibatalkan');
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.opnameHistory });
      onBack();
    },
    onError: () => {
      toast.error('Gagal membatalkan sesi opname');
    }
  });

  const computedStats = useMemo(() => {
    let matched = 0;
    let diffCount = 0;
    let totalValueDiff = 0;

    items?.forEach(item => {
      const physical = localChanges[item.productId]?.physicalStock ?? item.physicalStock;
      const diff = physical - item.systemStock;
      if (diff === 0) matched++;
      else {
        diffCount++;
        totalValueDiff += diff * parseFloat(item.costPrice || '0');
      }
    });

    return { matched, diffCount, totalValueDiff };
  }, [items, localChanges]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="text-sm text-slate-500 font-medium">Memuat rincian sesi opname...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <AlertTriangle className="mx-auto text-amber-500" size={48} />
        <h3 className="font-bold text-slate-800 dark:text-white text-lg">Sesi Tidak Ditemukan</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">Sesi opname yang Anda minta tidak tersedia atau telah dihapus.</p>
        <Button onClick={onBack} icon={<ArrowLeft size={16} />}>Kembali</Button>
      </div>
    );
  }

  const isDraft = session.status === 'DRAFT';
  const hasChanges = Object.keys(localChanges).length > 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={onBack}
            className="flex items-center gap-1.5 font-bold rounded-xl"
          >
            <ArrowLeft size={14} />
            Kembali
          </Button>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Sesi Opname: {session.opnameNumber}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Tanggal: {formatDate(session.date, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDraft && canUpdate && (
            <>
              {hasChanges && (
                <Button
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-1.5 font-bold rounded-xl text-emerald-600"
                >
                  <Save size={14} />
                  Simpan Draft
                </Button>
              )}
              <Button
                variant="toolbarPrimary"
                size="toolbar"
                onClick={() => setConfirmFinalizeOpen(true)}
                disabled={finalizeMutation.isPending}
                className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
              >
                <CheckCircle2 size={14} />
                Finalisasi Stok
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Analytics Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AnalyticsCard
          title="Stok Cocok"
          value={String(computedStats.matched)}
          icon={CheckCircle}
          color="emerald"
        />
        <AnalyticsCard
          title="Stok Selisih"
          value={String(computedStats.diffCount)}
          icon={AlertTriangle}
          color="amber"
        />
        <AnalyticsCard
          title="Total Barang"
          value={String(items.length)}
          icon={Package}
          color="indigo"
        />
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          id="opname-detail-search"
          aria-label="Cari nama atau barcode barang"
          placeholder="Cari nama atau barcode barang..."
          value={searchQuery}
          onChange={(e) => {
            const parsed = opnameSearchSchema.safeParse({ query: e.target.value });
            if (parsed.success) {
              setSearchQuery(e.target.value);
            }
          }}
          className="pl-10 text-xs w-full rounded-xl"
        />
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-400">
            Tidak ada barang yang cocok dengan pencarian "{searchQuery}".
          </div>
        ) : (
          filteredItems?.map((item) => {
            const currentPhysical = localChanges[item.productId]?.physicalStock ?? item.physicalStock;
            const diff = currentPhysical - item.systemStock;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                    <Package size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {item.Product.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Kode: {item.Product.code}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right text-xs">
                    <span className="text-slate-400 text-[10px] block">Sistem: {item.systemStock}</span>
                    <span className="text-slate-700 dark:text-slate-200 font-bold">Fisik: {currentPhysical}</span>
                  </div>

                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                    diff === 0 
                      ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' 
                      : diff > 0 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' 
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                  }`}>
                    {diff > 0 ? `+${diff}` : diff}
                  </span>

                  {isDraft && canUpdate && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleStockChange(item.productId, Math.max(0, currentPhysical - 1));
                          playBeep('error');
                        }}
                        className="w-7 h-7 p-0 rounded-lg"
                      >
                        <Minus size={12} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleStockChange(item.productId, currentPhysical + 1);
                          playBeep('success');
                        }}
                        className="w-7 h-7 p-0 rounded-lg"
                      >
                        <Plus size={12} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirm Modals */}
      <Suspense fallback={null}>
        {confirmFinalizeOpen && (
          <ConfirmModal
            isOpen={confirmFinalizeOpen}
            onClose={() => setConfirmFinalizeOpen(false)}
            onConfirm={async () => {
              setConfirmFinalizeOpen(false);
              await finalizeMutation.mutateAsync();
            }}
            title="Finalisasi Sesi Opname?"
            message="Tindakan ini akan langsung memperbarui stok fisik ke sistem dan mencatatkan jurnal penyesuaian."
            confirmText="Ya, Finalisasi"
            cancelText="Batal"
            variant="primary"
          />
        )}

        {confirmCancelOpen && (
          <ConfirmModal
            isOpen={confirmCancelOpen}
            onClose={() => setConfirmCancelOpen(false)}
            onConfirm={async () => {
              setConfirmCancelOpen(false);
              await cancelMutation.mutateAsync();
            }}
            title="Batalkan Sesi Opname?"
            message="Semua draft perubahan yang belum disimpan akan dihapus secara permanen."
            confirmText="Ya, Batalkan"
            cancelText="Kembali"
            variant="danger"
          />
        )}
      </Suspense>
    </div>
  );
});

export default OpnameDetail;
