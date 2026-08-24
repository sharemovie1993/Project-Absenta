import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FileText,
  User,
  Plus,
  Minus,
  CheckCircle2,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const playBeep = (type: 'success' | 'error') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.warn('Audio feedback failed:', e);
  }
};

export const OpnameDetail: React.FC<OpnameDetailProps> = React.memo(({
  sessionId,
  onBack,
  onFinalizeSuccess
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canUpdate = user?.capabilities?.includes('cooperative.store.products.update') || false;

  const [searchQuery, setSearchQuery] = useState('');
  // Mobile tab: 'SELECT' (Pilih Barang) | 'SUMMARY' (Daftar)
  const [mobileTab, setMobileTab] = useState<'SELECT' | 'SUMMARY'>('SELECT');
  
  // Local changes dictionary mapping productId -> { physicalStock: number, notes: string }
  const [localChanges, setLocalChanges] = useState<Record<string, { physicalStock: number; notes: string }>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Fetch session details
  const sessionQuery = useQuery({
    queryKey: ['koperasi-opname-detail', sessionId],
    queryFn: async () => {
      const res = await api.get(`/cooperative/toko/opname/${sessionId}`);
      return res.data as OpnameSession;
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });

  const session = sessionQuery.data || null;
  const loading = sessionQuery.isLoading;

  useEffect(() => {
    if (session && session.items) {
      const initialChanges: Record<string, { physicalStock: number; notes: string }> = {};
      session.items.forEach((item: OpnameItem) => {
        initialChanges[item.productId] = {
          physicalStock: item.physicalStock,
          notes: item.notes || ''
        };
      });
      setLocalChanges(initialChanges);
      setIsDirty(false);
    }
  }, [session]);

  const fetchSessionDetails = useCallback(async () => {
    await sessionQuery.refetch();
  }, [sessionQuery]);

  // Global Barcode Listener for scanning
  useEffect(() => {
    if (!session || session.status !== 'DRAFT' || loading) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // If keystroke interval > 50ms, assume user is typing manually, clear buffer
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          const scannedCode = buffer.trim();
          const scannedCodeLower = scannedCode.toLowerCase();
          
          // Find matching item in session
          const matchedItem = session.items.find(
            item => item.Product.code.toLowerCase() === scannedCodeLower
          );

          if (matchedItem) {
            e.preventDefault();
            playBeep('success');
            
            // Increment physical stock count by +1
            setLocalChanges(prev => {
              const current = prev[matchedItem.productId] || { physicalStock: 0, notes: '' };
              const nextVal = current.physicalStock + 1;
              toast.success(`Scan Barcode: ${matchedItem.Product.name} (+1 → ${nextVal} pcs)`, {
                id: `scan-${matchedItem.productId}`,
                duration: 2000
              });
              
              return {
                ...prev,
                [matchedItem.productId]: {
                  ...current,
                  physicalStock: nextVal
                }
              };
            });
            setIsDirty(true);
          } else {
            // Not found in this session
            playBeep('error');
            toast.error(`Barcode "${scannedCode}" tidak ditemukan di sesi opname ini`, {
              id: `scan-err-${scannedCode}`,
              duration: 3000
            });
          }
          buffer = '';
        }
      } else if (e.key && e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, loading]);

  // Handle single physical stock quantity change
  const handleQtyChange = (productId: string, val: number) => {
    if (!session || session.status !== 'DRAFT') return;
    const cleanVal = Math.max(0, val);
    
    setLocalChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        physicalStock: cleanVal
      }
    }));
    setIsDirty(true);
  };

  // Handle single item notes change
  const handleNoteChange = (productId: string, noteStr: string) => {
    if (!session || session.status !== 'DRAFT') return;
    
    setLocalChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        notes: noteStr
      }
    }));
    setIsDirty(true);
  };

  // Helper 2-letter Initials
  const getInitials = (name: string) => {
    if (!name) return 'PR';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 1) return words[0].substring(0, 2);
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  // Computed statistics
  const computedStats = useMemo(() => {
    if (!session || !session.items) {
      return {
        totalItems: 0,
        itemsWithDiff: 0,
        totalDeficitQty: 0,
        totalSurplusQty: 0,
        totalDeficitValue: 0,
        totalSurplusValue: 0,
        netValueDiff: 0,
        modifiedItemsCount: 0
      };
    }

    let itemsWithDiff = 0;
    let totalDeficitQty = 0;
    let totalSurplusQty = 0;
    let totalDeficitValue = 0;
    let totalSurplusValue = 0;
    let modifiedItemsCount = 0;

    session.items.forEach((item: OpnameItem) => {
      const currentPhysical = localChanges[item.productId] !== undefined
        ? localChanges[item.productId].physicalStock
        : item.physicalStock;
      
      const diff = currentPhysical - item.systemStock;
      const cost = Number(item.costPrice || 0);

      if (diff !== 0) {
        itemsWithDiff++;
        modifiedItemsCount++;
        if (diff < 0) {
          const absDiff = Math.abs(diff);
          totalDeficitQty += absDiff;
          totalDeficitValue += absDiff * cost;
        } else {
          totalSurplusQty += diff;
          totalSurplusValue += diff * cost;
        }
      }
    });

    return {
      totalItems: session.items.length,
      itemsWithDiff,
      totalDeficitQty,
      totalSurplusQty,
      totalDeficitValue,
      totalSurplusValue,
      netValueDiff: totalSurplusValue - totalDeficitValue,
      modifiedItemsCount
    };
  }, [session, localChanges]);

  // Filtered session items based on search query
  const filteredItems = useMemo(() => {
    if (!session || !session.items) return [];
    return session.items.filter((item: OpnameItem) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        item.Product.name.toLowerCase().includes(q) ||
        item.Product.code.toLowerCase().includes(q) ||
        (item.Product.category && item.Product.category.toLowerCase().includes(q))
      );
    });
  }, [session, searchQuery]);

  // Modified items only for Tab 2 (Daftar)
  const modifiedItems = useMemo(() => {
    if (!session || !session.items) return [];
    return session.items.filter((item: OpnameItem) => {
      const currentPhysical = localChanges[item.productId] !== undefined
        ? localChanges[item.productId].physicalStock
        : item.physicalStock;
      return currentPhysical !== item.systemStock;
    });
  }, [session, localChanges]);

  // Save Draft Mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const payloadItems = Object.keys(localChanges).map(prodId => ({
        productId: prodId,
        physicalStock: localChanges[prodId].physicalStock,
        notes: localChanges[prodId].notes
      }));

      const res = await api.put(`/cooperative/toko/opname/${session!.id}/items`, {
        items: payloadItems
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Draft opname berhasil disimpan!');
      setIsDirty(false);
      fetchSessionDetails();
    },
    onError: (err) => {
      console.error(err);
      toast.error('Gagal menyimpan draft opname');
    }
  });

  const saving = saveDraftMutation.isPending;

  const handleSaveDraft = async () => {
    if (!session) return;
    await saveDraftMutation.mutateAsync();
  };

  // Finalize Mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (isDirty) {
        const payloadItems = Object.keys(localChanges).map(prodId => ({
          productId: prodId,
          physicalStock: localChanges[prodId].physicalStock,
          notes: localChanges[prodId].notes
        }));
        await api.put(`/cooperative/toko/opname/${session!.id}/items`, {
          items: payloadItems
        });
      }
      const res = await api.post(`/cooperative/toko/opname/${session!.id}/finalize`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Sesi Stock Opname berhasil difinalisasi!');
      queryClient.invalidateQueries({ queryKey: ['koperasi-opname-detail', sessionId] });
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.opnameHistory });
      invalidateAllProductCaches(queryClient);
      onFinalizeSuccess();
    },
    onError: (err) => {
      console.error(err);
      toast.error('Gagal memfinalisasi sesi opname');
    }
  });

  const finalizing = finalizeMutation.isPending;

  const handleFinalize = async () => {
    if (!session) return;
    
    const confirmMsg = computedStats.itemsWithDiff > 0
      ? `Terdapat ${computedStats.itemsWithDiff} barang dengan selisih stok. Apakah Anda yakin ingin memfinalisasi opname? Tindakan ini akan langsung meng-update stok di sistem dan membukukan jurnal keuangan.`
      : `Tidak ada selisih stok yang terdeteksi. Apakah Anda yakin ingin menutup sesi opname?`;

    if (!window.confirm(confirmMsg)) return;

    await finalizeMutation.mutateAsync();
  };

  // Cancel Session
  const cancelSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/cooperative/toko/opname/${session!.id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Sesi opname telah dibatalkan');
      queryClient.invalidateQueries({ queryKey: COOP_QUERY_KEYS.opnameHistory });
      onBack();
    },
    onError: (err) => {
      console.error(err);
      toast.error('Gagal membatalkan sesi opname');
    }
  });

  const cancelling = cancelSessionMutation.isPending;

  const handleCancelSession = async () => {
    if (!session) return;
    if (!window.confirm('Apakah Anda yakin ingin membatalkan sesi opname ini? Semua draft yang belum disimpan permanen akan dibuang.')) return;
    await cancelSessionMutation.mutateAsync();
  };

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
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <AlertTriangle className="mx-auto text-amber-500" size={48} />
        <h3 className="font-bold text-slate-800 text-lg">Sesi Tidak Ditemukan</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">Sesi opname yang Anda minta tidak tersedia atau telah dihapus.</p>
        <Button onClick={onBack} icon={<ArrowLeft size={16} />}>Kembali</Button>
      </div>
    );
  }

  const isDraft = session.status === 'DRAFT';

  return (
    <div className="space-y-4 pb-28 lg:pb-6">
      {/* ──────────────────────────────────────────────────────────────────────
          MOBILE VIEW (1:1 Kasir Pintar Persona: Input Barang)
          ────────────────────────────────────────────────────────────────────── */}
      <div className="lg:hidden space-y-3">
        {/* 1. Header with back button */}
        <div className="flex items-center justify-between px-1 py-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isDirty && isDraft) {
                  if (!window.confirm('Terdapat draft perubahan yang belum disimpan. Yakin ingin kembali?')) return;
                }
                onBack();
              }}
              className="p-2 -ml-2 text-emerald-600 dark:text-emerald-400 active:scale-95 transition-transform"
              aria-label="Kembali"
            >
              <ArrowLeft size={22} className="stroke-[2.5]" />
            </button>
            <h2 className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
              Input Barang
            </h2>
          </div>

          {isDraft && canUpdate && (
            <button
              type="button"
              onClick={handleCancelSession}
              disabled={cancelling}
              className="text-xs text-rose-500 font-semibold px-2 py-1 hover:bg-rose-50 rounded-lg"
            >
              Batal
            </button>
          )}
        </div>

        {/* 2. Segmented 2-tab Selector (Kasir Pintar Style) */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setMobileTab('SELECT')}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center",
              mobileTab === 'SELECT'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
            )}
          >
            Pilih Barang
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('SUMMARY')}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
              mobileTab === 'SUMMARY'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
            )}
          >
            <span>Daftar</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              computedStats.modifiedItemsCount > 0
                ? "bg-emerald-600 text-white font-bold"
                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            )}>
              {computedStats.modifiedItemsCount}
            </span>
          </button>
        </div>

        {/* 3. Search Bar with Barcode Scanner (Kasir Pintar Style) */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari nama atau kode barang"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-4 pr-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={() => toast('Scanner Barcode siap (gunakan scanner atau kamera)')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 p-1 active:scale-90"
            title="Scan Barcode"
          >
            <Barcode size={22} className="stroke-[1.8]" />
          </button>
        </div>

        {/* 4. Tab 1: PILIH BARANG */}
        {mobileTab === 'SELECT' && (
          <div className="space-y-2.5 pt-1">
            {filteredItems.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">
                Tidak ada barang ditemukan untuk "{searchQuery}"
              </div>
            ) : (
              filteredItems.map((item: OpnameItem) => {
                const currentPhysical = localChanges[item.productId] !== undefined
                  ? localChanges[item.productId].physicalStock
                  : item.physicalStock;
                const diff = currentPhysical - item.systemStock;

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-3"
                  >
                    {/* Item Top Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100 dark:border-emerald-900">
                        {getInitials(item.Product.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {item.Product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>{item.Product.code}</span>
                          {item.Product.category && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-300">
                              {item.Product.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock comparison & Stepper */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Stok Sistem</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {item.systemStock} pcs
                        </span>
                      </div>

                      {/* Physical Stock Stepper */}
                      {isDraft ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.productId, currentPhysical - 1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center active:scale-90 font-bold"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={currentPhysical}
                            onChange={(e) => handleQtyChange(item.productId, parseInt(e.target.value, 10) || 0)}
                            className="w-14 h-8 text-center text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.productId, currentPhysical + 1)}
                            className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center active:scale-90 font-bold"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Stok Fisik</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {currentPhysical} pcs
                          </span>
                        </div>
                      )}

                      {/* Selisih Indicator */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Selisih</span>
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold",
                          diff === 0
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            : diff < 0
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        )}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 5. Tab 2: DAFTAR (Summary & Modified Items) */}
        {mobileTab === 'SUMMARY' && (
          <div className="space-y-3 pt-1">
            {/* Quick Summary Card */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300">
                Ringkasan Selisih Fisik
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block">Item Berselisih</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {computedStats.itemsWithDiff} dari {computedStats.totalItems}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block">Estimasi Selisih Nilai</span>
                  <span className={cn(
                    "font-bold",
                    computedStats.netValueDiff < 0 ? "text-rose-600" : "text-emerald-600"
                  )}>
                    Rp {computedStats.netValueDiff.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Modified Items List */}
            {modifiedItems.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                Belum ada barang yang diubah / berselisih dari stok sistem.
              </div>
            ) : (
              <div className="space-y-2.5">
                {modifiedItems.map((item: OpnameItem) => {
                  const currentPhysical = localChanges[item.productId] !== undefined
                    ? localChanges[item.productId].physicalStock
                    : item.physicalStock;
                  const diff = currentPhysical - item.systemStock;
                  const note = localChanges[item.productId]?.notes || item.notes || '';

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {item.Product.name}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          diff < 0
                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        )}>
                          Selisih: {diff > 0 ? `+${diff}` : diff} pcs
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Sistem: <strong>{item.systemStock}</strong></span>
                        <span>Fisik: <strong className="text-slate-900 dark:text-slate-100">{currentPhysical}</strong></span>
                        <span>Estimasi: <strong>Rp {((diff) * Number(item.costPrice || 0)).toLocaleString('id-ID')}</strong></span>
                      </div>

                      {/* Note Input if in Draft */}
                      {isDraft && (
                        <input
                          type="text"
                          placeholder="Alasan / catatan selisih (opsional)..."
                          value={note}
                          onChange={(e) => handleNoteChange(item.productId, e.target.value)}
                          className="w-full h-8 px-2.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 6. Floating Action Bar (Kasir Pintar Style) */}
        {isDraft && canUpdate && (
          <div className="fixed bottom-[calc(135px+env(safe-area-inset-bottom))] left-4 right-4 z-[9999] flex gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex-1 h-12 bg-white dark:bg-slate-900 border-2 border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold text-xs tracking-wide rounded-full shadow-lg flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all uppercase"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              <span>SIMPAN DRAFT</span>
            </button>
            <button
              type="button"
              onClick={handleFinalize}
              disabled={finalizing}
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs tracking-wide rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all uppercase"
            >
              {finalizing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span>FINALISASI</span>
            </button>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          DESKTOP VIEW (Analytics & Full Management Table)
          ────────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block space-y-6">
        {/* Header Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => {
                  if (isDirty && isDraft) {
                    if (!window.confirm('Terdapat perubahan draft yang belum disimpan. Yakin ingin kembali?')) return;
                  }
                  onBack();
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                aria-label="Kembali ke daftar sesi"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="font-black text-slate-800 dark:text-slate-100 text-xl tracking-tight">Sesi: {session.opnameNumber}</h2>
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                session.status === 'DRAFT' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                session.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border border-green-200' :
                'bg-slate-50 text-slate-400 border border-slate-200'
              )}>
                {session.status}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-400">
              <span className="flex items-center space-x-1"><FileText size={14} className="opacity-70" /> <span>Catatan: {session.notes || '-'}</span></span>
              <span className="flex items-center space-x-1"><Package size={14} className="opacity-70" /> <span>Total Item: {computedStats.totalItems}</span></span>
              <span className="flex items-center space-x-1"><User size={14} className="opacity-70" /> <span>Tanggal: {new Date(session.date).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></span>
            </div>
          </div>

          {isDraft && canUpdate && (
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline"
                onClick={handleCancelSession}
                isLoading={cancelling}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                Batalkan Sesi
              </Button>
              <Button 
                variant="secondary"
                onClick={handleSaveDraft}
                isLoading={saving}
                disabled={!isDirty}
                icon={<Save size={16} />}
              >
                Simpan Draft
              </Button>
              <Button 
                onClick={handleFinalize}
                isLoading={finalizing}
                icon={<CheckCircle size={16} />}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Finalisasi & Update Stok
              </Button>
            </div>
          )}
        </div>

        {/* Stats Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnalyticsCard
            title="Barang Berselisih"
            value={`${computedStats.itemsWithDiff} / ${computedStats.totalItems}`}
            icon={<AlertTriangle size={18} />}
            gradient="from-slate-500 to-slate-600"
            subtitle="Item yang stok fisiknya tidak sama dengan sistem"
          />
          <AnalyticsCard
            title="Selisih Lebih (Surplus)"
            value={`Rp ${computedStats.totalSurplusValue.toLocaleString('id-ID')}`}
            icon={<CheckCircle size={18} />}
            gradient="from-emerald-500 to-teal-600"
            subtitle="Keuntungan nilai dari penambahan stok fisik"
          />
          <AnalyticsCard
            title="Selisih Kurang (Defisit)"
            value={`Rp ${computedStats.totalDeficitValue.toLocaleString('id-ID')}`}
            icon={<Trash2 size={18} />}
            gradient="from-rose-500 to-pink-600"
            subtitle="Kerugian nilai dari pengurangan stok fisik"
          />
        </div>

        {/* Table of items */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari barang atau scan barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Nama Barang</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Kode</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500">Stok Sistem</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500">Stok Fisik</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500">Selisih</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item: OpnameItem) => {
                  const currentPhysical = localChanges[item.productId] !== undefined
                    ? localChanges[item.productId].physicalStock
                    : item.physicalStock;
                  const diff = currentPhysical - item.systemStock;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-100">
                        {item.Product.name}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {item.Product.code}
                      </td>
                      <td className="px-6 py-4 text-xs text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.systemStock}
                      </td>
                      <td className="px-6 py-4 text-xs text-center font-bold">
                        {isDraft ? (
                          <input
                            type="number"
                            min="0"
                            value={currentPhysical}
                            onChange={(e) => handleQtyChange(item.productId, parseInt(e.target.value, 10) || 0)}
                            className="w-20 text-center py-1 border rounded-lg text-xs font-bold"
                          />
                        ) : (
                          currentPhysical
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-center font-bold">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-bold",
                          diff === 0 ? "bg-slate-100 text-slate-500" :
                          diff < 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {isDraft ? (
                          <input
                            type="text"
                            placeholder="Alasan selisih..."
                            value={localChanges[item.productId]?.notes || item.notes || ''}
                            onChange={(e) => handleNoteChange(item.productId, e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded-lg"
                          />
                        ) : (
                          item.notes || '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
});

OpnameDetail.displayName = 'OpnameDetail';

export default OpnameDetail;
