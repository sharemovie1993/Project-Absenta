import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../../lib/axiosInstance';
import { Button } from '../../../components/cooperative/ui/Button';
import { Card } from '../../../components/cooperative/ui/Card';
import { Input } from '../../../components/cooperative/ui/Input';
import { AnalyticsCard } from '../../../components/ui/AnalyticsCard';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';
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
  Minus
} from 'lucide-react';

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

export const OpnameDetail: React.FC<OpnameDetailProps> = ({
  sessionId,
  onBack,
  onFinalizeSuccess
}) => {
  const { user } = useAuthStore();
  const canUpdate = user?.capabilities?.includes('cooperative.store.products.update') || false;

  const [session, setSession] = useState<OpnameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local changes dictionary mapping productId -> { physicalStock: number, notes: string }
  const [localChanges, setLocalChanges] = useState<Record<string, { physicalStock: number; notes: string }>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Fetch session details
  const fetchSessionDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/cooperative/toko/opname/${sessionId}`);
      setSession(res.data);
      
      // Initialize local changes from database state
      const initialChanges: Record<string, { physicalStock: number; notes: string }> = {};
      if (res.data && res.data.items) {
        res.data.items.forEach((item: OpnameItem) => {
          initialChanges[item.productId] = {
            physicalStock: item.physicalStock,
            notes: item.notes || ''
          };
        });
      }
      setLocalChanges(initialChanges);
      setIsDirty(false);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data sesi opname');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionDetails();
  }, [fetchSessionDetails]);

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
                id: `scan-${matchedItem.productId}`, // overwrite existing toast for speed
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

  // Set physical stock equal to system stock
  const handleResetToSystem = (productId: string, systemStock: number) => {
    if (!session || session.status !== 'DRAFT') return;
    
    setLocalChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        physicalStock: systemStock
      }
    }));
    setIsDirty(true);
    toast.success('Stok fisik disesuaikan ke stok sistem.');
  };

  // Filtered session items
  const filteredItems = useMemo(() => {
    if (!session || !session.items) return [];
    return session.items.filter(item => 
      item.Product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.Product.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [session, searchQuery]);

  // Compute total numbers based on local changes
  const computedStats = useMemo(() => {
    if (!session || !session.items) return { totalItems: 0, itemsWithDiff: 0, totalSurplusValue: 0, totalDeficitValue: 0 };
    
    let totalItems = session.items.length;
    let itemsWithDiff = 0;
    let totalSurplusValue = 0;
    let totalDeficitValue = 0;

    session.items.forEach(item => {
      const local = localChanges[item.productId];
      const physical = local ? local.physicalStock : item.physicalStock;
      const difference = physical - item.systemStock;

      if (difference !== 0) {
        itemsWithDiff++;
        const val = Math.abs(difference) * Number(item.costPrice);
        if (difference > 0) {
          totalSurplusValue += val;
        } else {
          totalDeficitValue += val;
        }
      }
    });

    return {
      totalItems,
      itemsWithDiff,
      totalSurplusValue,
      totalDeficitValue
    };
  }, [session, localChanges]);

  // Save changes as draft
  const handleSaveDraft = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const payloadItems = Object.keys(localChanges).map(prodId => ({
        productId: prodId,
        physicalStock: localChanges[prodId].physicalStock,
        notes: localChanges[prodId].notes
      }));

      await api.put(`/cooperative/toko/opname/${session.id}/items`, {
        items: payloadItems
      });

      toast.success('Draft opname berhasil disimpan');
      setIsDirty(false);
      
      // Reload session from server
      await fetchSessionDetails();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan draft opname');
    } finally {
      setSaving(false);
    }
  };

  // Finalize / Commit session
  const handleFinalize = async () => {
    if (!session) return;
    
    const confirmMsg = computedStats.itemsWithDiff > 0
      ? `Terdapat ${computedStats.itemsWithDiff} barang dengan selisih stok. Apakah Anda yakin ingin memfinalisasi opname? Tindakan ini akan langsung meng-update stok di sistem dan membukukan jurnal keuangan.`
      : `Tidak ada selisih stok yang terdeteksi. Apakah Anda yakin ingin menutup sesi opname?`;

    if (!window.confirm(confirmMsg)) return;

    setFinalizing(true);
    try {
      // If dirty, save draft first
      if (isDirty) {
        const payloadItems = Object.keys(localChanges).map(prodId => ({
          productId: prodId,
          physicalStock: localChanges[prodId].physicalStock,
          notes: localChanges[prodId].notes
        }));

        await api.put(`/cooperative/toko/opname/${session.id}/items`, {
          items: payloadItems
        });
      }

      await api.post(`/cooperative/toko/opname/${session.id}/finalize`);
      toast.success('Sesi Stock Opname berhasil difinalisasi!');
      onFinalizeSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Gagal memfinalisasi sesi opname');
    } finally {
      setFinalizing(false);
    }
  };

  // Cancel Session
  const handleCancelSession = async () => {
    if (!session) return;
    if (!window.confirm('Apakah Anda yakin ingin membatalkan sesi opname ini? Semua draft yang belum disimpan permanen akan dibuang.')) return;

    setCancelling(true);
    try {
      await api.delete(`/cooperative/toko/opname/${session.id}`);
      toast.success('Sesi opname telah dibatalkan');
      onBack();
    } catch (err) {
      console.error(err);
      toast.error('Gagal membatalkan sesi opname');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
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
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
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
            <h2 className="font-black text-slate-800 text-xl tracking-tight">Sesi: {session.opnameNumber}</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
              session.status === 'DRAFT' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
              session.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border border-green-200' :
              'bg-slate-50 text-slate-400 border border-slate-200'
            }`}>
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
          icon={<AlertTriangle size={18} />}
          gradient="from-rose-500 to-red-600"
          subtitle="Kerugian nilai dari pengurangan stok fisik"
        />
      </div>

      {/* Scanning Indicator Banner */}
      {isDraft && canUpdate && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center space-x-3 text-blue-800 text-sm">
          <Barcode size={24} className="text-blue-600 animate-pulse shrink-0" />
          <div>
            <p className="font-bold">Mode Scan Aktif</p>
            <p className="text-xs text-blue-600/80">Cukup arahkan barcode scanner dan scan barang. Stok fisik barang akan bertambah +1 otomatis.</p>
          </div>
        </div>
      )}

      {/* Items list card */}
      <Card title="Lembar Hitung Fisik Barang">
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cari barang berdasarkan nama / kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            />
          </div>

          {/* Table */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Tidak ada produk yang cocok dengan pencarian Anda.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Barang</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-28">Harga Modal</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase w-24">Stok Sistem</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase w-44">Stok Fisik</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase w-28">Selisih</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Keterangan</th>
                    {isDraft && canUpdate && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase w-16"></th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredItems.map(item => {
                    const local = localChanges[item.productId];
                    const physical = local ? local.physicalStock : item.physicalStock;
                    const noteText = local ? local.notes : (item.notes || '');
                    const difference = physical - item.systemStock;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-slate-800 leading-tight">{item.Product.name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{item.Product.code}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-medium text-slate-600 whitespace-nowrap">
                          Rp {Number(item.costPrice).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3.5 text-center text-sm font-bold text-slate-500">
                          {item.systemStock} pcs
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center">
                            {isDraft && canUpdate ? (
                              <div className="flex items-center space-x-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(item.productId, physical - 1)}
                                  className="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-colors"
                                  aria-label="Kurangi"
                                >
                                  <Minus size={14} />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={physical}
                                  onChange={(e) => handleQtyChange(item.productId, parseInt(e.target.value) || 0)}
                                  className="w-14 text-center py-0.5 text-sm font-bold bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  aria-label={`Stok fisik ${item.Product.name}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(item.productId, physical + 1)}
                                  className="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-800 transition-colors"
                                  aria-label="Tambah"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm font-black text-slate-800">{physical} pcs</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-black border ${
                            difference === 0 
                              ? 'bg-slate-50 text-slate-400 border-slate-100' 
                              : difference > 0 
                              ? 'bg-green-50 text-green-600 border-green-200' 
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {difference === 0 ? '0' : difference > 0 ? `+${difference}` : difference} pcs
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {isDraft && canUpdate ? (
                            <input
                              type="text"
                              placeholder="E.g. rusak, hilang..."
                              value={noteText}
                              onChange={(e) => handleNoteChange(item.productId, e.target.value)}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 bg-white"
                              aria-label={`Keterangan ${item.Product.name}`}
                            />
                          ) : (
                            <span className="text-xs text-slate-500">{noteText || '-'}</span>
                          )}
                        </td>
                        {isDraft && canUpdate && (
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            {physical !== item.systemStock && (
                              <button
                                type="button"
                                onClick={() => handleResetToSystem(item.productId, item.systemStock)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-all"
                                aria-label="Reset ke stok sistem"
                              >
                                Reset
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OpnameDetail;
