import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Table } from '../../ui/Table';
import type { Column } from '../../ui/Table';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Plus, ArrowLeft, Calendar, ChevronDown, CheckCircle2, AlertTriangle, FileText, Clock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';
import OpnameDetail from '../../../pages/cooperative/components/OpnameDetail';
import { COOP_QUERY_KEYS, invalidateAllProductCaches } from '../../../lib/coopQueryKeys';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, subDays, isAfter } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  order: number;
}

interface OpnameItem {
  id: string;
  productId: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
}

interface OpnameSession {
  id: string;
  opnameNumber: string;
  date: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  items?: OpnameItem[];
}

interface ProductOpnameTabProps {
  categories: ProductCategory[];
  activeTab: 'catalog' | 'inventory' | 'stock-in' | 'history' | 'categories' | 'opname';
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
  activeTab
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canUpdate = user?.capabilities?.includes('cooperative.store.products.update') || false;

  const [activeOpnameSessionId, setActiveOpnameSessionId] = useState<string | null>(null);
  const [isCreateOpnameModalOpen, setIsCreateOpnameModalOpen] = useState(false);
  const [newOpnameNotes, setNewOpnameNotes] = useState('');
  const [newOpnameCategoryFilter, setNewOpnameCategoryFilter] = useState('ALL');

  // Mobile date filter: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL'
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL'>('TODAY');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const opnameQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.opnameHistory,
    queryFn: async () => {
      const response = await api.get('/cooperative/toko/opname');
      return (Array.isArray(response.data) ? response.data : []) as OpnameSession[];
    },
    enabled: activeTab === 'opname',
    staleTime: 5 * 60 * 1000,
  });

  const opnameSessions = useMemo(() => opnameQuery.data || [], [opnameQuery.data]);
  const opnameLoading = opnameQuery.isLoading;

  const fetchOpnameSessions = async () => {
    await opnameQuery.refetch();
  };

  // Filter sessions by date filter
  const filteredSessions = useMemo(() => {
    if (dateFilter === 'ALL') return opnameSessions;

    return opnameSessions.filter(sess => {
      const sessDate = new Date(sess.date);
      if (dateFilter === 'TODAY') return isToday(sessDate);
      if (dateFilter === 'YESTERDAY') return isYesterday(sessDate);
      if (dateFilter === 'LAST_7_DAYS') return isAfter(sessDate, subDays(new Date(), 7));
      if (dateFilter === 'THIS_MONTH') {
        const now = new Date();
        return sessDate.getMonth() === now.getMonth() && sessDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [opnameSessions, dateFilter]);

  const dateFilterLabel = useMemo(() => {
    const todayStr = format(new Date(), 'dd MMM yyyy', { locale: localeId });
    switch (dateFilter) {
      case 'TODAY':
        return `Today (${todayStr})`;
      case 'YESTERDAY':
        return `Kemarin (${format(subDays(new Date(), 1), 'dd MMM yyyy', { locale: localeId })})`;
      case 'LAST_7_DAYS':
        return '7 Hari Terakhir';
      case 'THIS_MONTH':
        return `Bulan Ini (${format(new Date(), 'MMMM yyyy', { locale: localeId })})`;
      case 'ALL':
      default:
        return 'Semua Riwayat';
    }
  }, [dateFilter]);

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
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.opnameHistory });
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

  const handleQuickCreateOpname = () => {
    // Check if there is already an active draft session for today
    const todayDraft = opnameSessions.find(s => s.status === 'DRAFT' && isToday(new Date(s.date)));
    if (todayDraft) {
      setActiveOpnameSessionId(todayDraft.id);
      return;
    }

    // Direct create session
    createOpnameMutation.mutate({
      notes: `Stock Opname - ${format(new Date(), 'dd MMMM yyyy', { locale: localeId })}`,
      categoryFilter: 'ALL'
    });
  };

  const handleCreateOpnameSession = (e: React.FormEvent) => {
    e.preventDefault();
    createOpnameMutation.mutate({
      notes: newOpnameNotes.trim() || `Stock Opname - ${format(new Date(), 'dd MMMM yyyy', { locale: localeId })}`,
      categoryFilter: newOpnameCategoryFilter
    });
  };

  const opnameDesktopColumns = useMemo<Column[]>(() => [
    {
      key: 'opnameNumber',
      label: 'Nomor Sesi',
      sortable: true,
      render: (_val: unknown, sess: OpnameSession) => (
        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-mono">
          {sess.opnameNumber}
        </span>
      )
    },
    {
      key: 'date',
      label: 'Tanggal',
      sortable: true,
      render: (_val: unknown, sess: OpnameSession) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(sess.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (_val: unknown, sess: OpnameSession) => (
        <span className={cn(
          "inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold",
          sess.status === 'DRAFT' ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40' :
          sess.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-950/40' :
          'bg-slate-50 text-slate-400 border border-slate-200'
        )}>
          {sess.status}
        </span>
      )
    },
    {
      key: 'notes',
      label: 'Catatan',
      render: (_val: unknown, sess: OpnameSession) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate block">
          {sess.notes || '-'}
        </span>
      )
    },
    {
      key: 'items',
      label: 'Total Item',
      render: (_val: unknown, sess: OpnameSession) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {sess.items?.length || 0} barang
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_val: unknown, sess: OpnameSession) => (
        <div className="flex justify-end">
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
        </div>
      )
    }
  ], []);

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
            invalidateAllProductCaches(queryClient);
          }}
        />
      ) : (
        <div className="space-y-4 pb-28 lg:pb-6">
          {/* ──────────────────────────────────────────────────────────────────
              MOBILE VIEW (1:1 Kasir Pintar Persona: Stock Opname List)
              ────────────────────────────────────────────────────────────────── */}
          <div className="lg:hidden space-y-3.5">
            {/* 1. Date Picker Selector (Kasir Pintar Style) */}
            <div className="relative pt-1">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-xs font-semibold text-slate-800 dark:text-slate-100 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                  <Calendar size={18} />
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{dateFilterLabel}</span>
                </div>
                <ChevronDown size={18} className={cn("text-slate-400 transition-transform", isDatePickerOpen && "rotate-180")} />
              </button>

              {/* Date Filter Dropdown Menu */}
              {isDatePickerOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                  {[
                    { key: 'TODAY', label: 'Hari Ini (Today)' },
                    { key: 'YESTERDAY', label: 'Kemarin' },
                    { key: 'LAST_7_DAYS', label: '7 Hari Terakhir' },
                    { key: 'THIS_MONTH', label: 'Bulan Ini' },
                    { key: 'ALL', label: 'Semua Riwayat' }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setDateFilter(opt.key as any);
                        setIsDatePickerOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                        dateFilter === opt.key 
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold" 
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Session List or Empty State */}
            {opnameLoading ? (
              <div className="text-center py-24 text-slate-400 text-sm animate-pulse">
                Memuat riwayat opname...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 px-4 text-center">
                <p className="text-slate-400 dark:text-slate-500 font-medium text-sm tracking-wide">
                  Belum ada Stok Tercatat
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSessions.map(sess => {
                  const itemsCount = sess.items?.length || 0;
                  const diffCount = (sess.items || []).filter(it => it.difference !== 0).length;

                  return (
                    <div
                      key={sess.id}
                      onClick={() => setActiveOpnameSessionId(sess.id)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-all cursor-pointer space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono">
                          {sess.opnameNumber}
                        </span>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                          sess.status === 'DRAFT'
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                            : sess.status === 'COMPLETED'
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-50 text-slate-400 border border-slate-200"
                        )}>
                          {sess.status === 'DRAFT' ? 'DRAFT AUDIT' : sess.status === 'COMPLETED' ? 'SELESAI' : sess.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400" />
                          <span>{format(new Date(sess.date), 'dd MMM yyyy, HH:mm', { locale: localeId })}</span>
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {itemsCount} barang
                        </span>
                      </div>

                      {diffCount > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg">
                          <AlertTriangle size={13} />
                          <span>{diffCount} barang ada selisih fisik</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Floating Action Button (1:1 Kasir Pintar) */}
            {canUpdate && (
              <div className="fixed bottom-[calc(135px+env(safe-area-inset-bottom))] left-4 right-4 z-[9999]">
                <button
                  type="button"
                  onClick={handleQuickCreateOpname}
                  disabled={createOpnameLoading}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm tracking-wide rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all uppercase"
                >
                  {createOpnameLoading ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <span>TAMBAH STOCK OPNAME</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              DESKTOP VIEW (Full Management & Analytics Table)
              ────────────────────────────────────────────────────────────────── */}
          <div className="hidden lg:block space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-slate-100 text-base">Sesi Audit Stock Opname</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Pemeriksaan fisik berkala dan penyesuaian stok sistem.</p>
              </div>
              {canUpdate && (
                <Button onClick={() => setIsCreateOpnameModalOpen(true)} icon={<Plus size={18} />}>
                  Mulai Sesi Opname Baru
                </Button>
              )}
            </div>

            <Table
              data={opnameSessions}
              columns={opnameDesktopColumns}
              loading={opnameLoading}
              emptyMessage="Belum ada sesi stock opname yang dibuat. Klik tombol di atas untuk memulai audit fisik."
            />
          </div>
        </div>
      )}

      {/* Modal: Buat Sesi Opname Baru (Desktop) */}
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
            <label htmlFor="opname-cat-filter" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
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
