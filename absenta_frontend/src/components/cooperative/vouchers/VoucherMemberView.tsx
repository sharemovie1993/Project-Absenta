import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';
import { Card } from '../ui/Card';
import { Award, Copy, Check, Ticket, Sparkles, HelpCircle, ShoppingCart, Eye, Printer, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Voucher, PointTransaction, SaleRecord, MemberInfo } from '../../../pages/cooperative/Vouchers';

const StrukBadge = React.memo<{ id: string }>(({ id }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success('ID Struk disalin!');
  };

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      onClick={handleCopy}
      className="font-mono text-[11px] text-slate-655 dark:text-slate-400 bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all inline-flex items-center gap-1 shadow-sm font-semibold"
    >
      <span>#{id.slice(0, 8)}</span>
      {copied ? <Check size={11} className="text-emerald-505 animate-bounce" /> : <Copy size={11} className="opacity-40" />}
    </button>
  );
});

StrukBadge.displayName = 'StrukBadge';

interface VoucherMemberViewProps {
  user: { full_name?: string } | null;
  vouchers: Voucher[];
  loading: boolean;
  mySavingsSum: number;
  myPoints: number;
  pointHistory: PointTransaction[];
  pointsLoading: boolean;
  redeemLoading: boolean;
  salesHistory: SaleRecord[];
  salesLoading: boolean;
  memberInfo: MemberInfo | null;
  handleRedeemPoints: (points: number) => Promise<void>;
  printReceipt: (sale: SaleRecord) => void;
  setSelectedSale: (sale: SaleRecord) => void;
  setShowReceiptModal: (show: boolean) => void;
}

export const VoucherMemberView = React.memo<VoucherMemberViewProps>(({
  user,
  vouchers,
  loading,
  mySavingsSum,
  myPoints,
  pointHistory,
  pointsLoading,
  redeemLoading,
  salesHistory,
  salesLoading,
  memberInfo,
  handleRedeemPoints,
  printReceipt,
  setSelectedSale,
  setShowReceiptModal
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Pagination states
  const [pointPage, setPointPage] = useState(1);
  const [pointLimit, setPointLimit] = useState(10);
  const [salesPage, setSalesPage] = useState(1);
  const [salesLimit, setSalesLimit] = useState(10);

  // Sorting states
  const [pointSortKey, setPointSortKey] = useState<string>('createdAt');
  const [pointSortDirection, setPointSortDirection] = useState<'asc' | 'desc'>('desc');
  const [salesSortKey, setSalesSortKey] = useState<string>('date');
  const [salesSortDirection, setSalesSortDirection] = useState<'asc' | 'desc'>('desc');

  // Search filter
  const [searchVoucher, setSearchVoucher] = useState('');

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Kode voucher ${code} disalin ke clipboard!`);
  }, []);

  useEffect(() => {
    if (!copiedCode) return;
    const timer = setTimeout(() => setCopiedCode(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedCode]);

  // Points and tier calculations
  const currentTier = useMemo(() => {
    if (myPoints >= 1000) return { name: 'Emas (Gold)', color: 'from-amber-500 to-yellow-600', text: 'text-amber-600' };
    if (myPoints >= 500) return { name: 'Perak (Silver)', color: 'from-slate-400 to-slate-500', text: 'text-slate-650' };
    return { name: 'Perunggu (Bronze)', color: 'from-orange-400 to-amber-700', text: 'text-orange-700' };
  }, [myPoints]);

  const nextTierPoints = useMemo(() => {
    if (myPoints < 500) return 500;
    if (myPoints < 1000) return 1000;
    return null;
  }, [myPoints]);

  // Handle pointHistory sorting
  const handlePointSort = useCallback((key: string) => {
    setPointSortDirection(prev => {
      if (pointSortKey === key) {
        return prev === 'asc' ? 'desc' : 'asc';
      }
      return 'desc';
    });
    setPointSortKey(key);
  }, [pointSortKey]);

  // Handle salesHistory sorting
  const handleSalesSort = useCallback((key: string) => {
    setSalesSortDirection(prev => {
      if (salesSortKey === key) {
        return prev === 'asc' ? 'desc' : 'asc';
      }
      return 'desc';
    });
    setSalesSortKey(key);
  }, [salesSortKey]);

  // Process sorted and paginated pointHistory
  const sortedPointHistory = useMemo(() => {
    const sorted = [...(pointHistory || [])];
    sorted.sort((a, b) => {
      let valA = a[pointSortKey as keyof PointTransaction] ?? '';
      let valB = b[pointSortKey as keyof PointTransaction] ?? '';
      if (pointSortKey === 'createdAt') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }
      if (valA < valB) return pointSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return pointSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [pointHistory, pointSortKey, pointSortDirection]);

  const totalPointPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedPointHistory.length / pointLimit));
  }, [sortedPointHistory, pointLimit]);

  const paginatedPointHistory = useMemo(() => {
    const startIndex = (pointPage - 1) * pointLimit;
    return sortedPointHistory.slice(startIndex, startIndex + pointLimit);
  }, [sortedPointHistory, pointPage, pointLimit]);

  // Process sorted and paginated salesHistory
  const sortedSalesHistory = useMemo(() => {
    const sorted = [...(salesHistory || [])];
    sorted.sort((a, b) => {
      let valA = a[salesSortKey as keyof SaleRecord] ?? '';
      let valB = b[salesSortKey as keyof SaleRecord] ?? '';
      if (salesSortKey === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }
      if (valA < valB) return salesSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return salesSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [salesHistory, salesSortKey, salesSortDirection]);

  const totalSalesPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedSalesHistory.length / salesLimit));
  }, [sortedSalesHistory, salesLimit]);

  const paginatedSalesHistory = useMemo(() => {
    const startIndex = (salesPage - 1) * salesLimit;
    return sortedSalesHistory.slice(startIndex, startIndex + salesLimit);
  }, [sortedSalesHistory, salesPage, salesLimit]);

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    return (vouchers || []).filter(v => 
      v.code.toLowerCase().includes(searchVoucher.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(searchVoucher.toLowerCase()))
    );
  }, [vouchers, searchVoucher]);

  const pointHistoryColumns = useMemo(() => [
    { 
      header: 'Tanggal', 
      accessor: (row: PointTransaction) => new Date(row.createdAt).toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      sortable: true,
      sortKey: 'createdAt'
    },
    { header: 'Keterangan', accessor: 'description' as keyof PointTransaction, sortable: true, sortKey: 'description' },
    { 
      header: 'Jenis', 
      accessor: (row: PointTransaction) => {
        if (row.type === 'EARN_SHOPPING') return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">Belanja Toko</span>;
        if (row.type === 'EARN_SAVING') return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">Setoran Simpanan</span>;
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">Penukaran Voucher</span>;
      }
    },
    { 
      header: 'Jumlah Poin', 
      accessor: (row: PointTransaction) => (
        <span className={`font-bold ${row.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {row.amount > 0 ? `+${row.amount}` : row.amount} Poin
        </span>
      ),
      sortable: true,
      sortKey: 'amount'
    }
  ], []);

  const salesColumns = useMemo(() => [
    {
      header: 'Tanggal',
      accessor: (row: SaleRecord) => new Date(row.date).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      sortable: true,
      sortKey: 'date'
    },
    {
      header: 'ID Struk',
      accessor: (row: SaleRecord) => <StrukBadge id={row.id} />,
    },
    {
      header: 'Metode Pembayaran',
      accessor: (row: SaleRecord) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          row.paymentMethod === 'SAVING' 
            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30' 
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
        }`}>
          {row.paymentMethod === 'SAVING' ? 'Tabungan' : 'Tunai'}
        </span>
      ),
      sortable: true,
      sortKey: 'paymentMethod'
    },
    {
      header: 'Diskon',
      accessor: (row: SaleRecord) => row.discount > 0 ? (
        <span className="text-red-655 dark:text-red-400 font-bold">
          -Rp {Number(row.discount).toLocaleString('id-ID')}
        </span>
      ) : '-',
      sortable: true,
      sortKey: 'discount'
    },
    {
      header: 'Total Belanja',
      accessor: (row: SaleRecord) => (
        <span className="font-extrabold text-slate-800 dark:text-slate-100">
          Rp {Number(row.total).toLocaleString('id-ID')}
        </span>
      ),
      sortable: true,
      sortKey: 'total'
    },
    {
      header: 'Aksi',
      accessor: (row: SaleRecord) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="hover:scale-105 active:scale-95 transition-all py-1 px-2.5 text-xs"
            icon={<Eye size={13} />}
            onClick={() => {
              setSelectedSale(row);
              setShowReceiptModal(true);
            }}
          >
            Detail
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 transition-all py-1 px-2.5 text-xs shadow-sm hover:shadow-blue-500/10"
            icon={<Printer size={13} />}
            onClick={() => printReceipt(row)}
          >
            Cetak
          </Button>
        </div>
      ),
    }
  ], [printReceipt, setSelectedSale, setShowReceiptModal]);

  return (
    <div className="space-y-8">
      {/* ── Ringkasan Poin & Keanggotaan ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kartu Poin Dinamis */}
        <div className={`lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br ${currentTier.color} p-6 shadow-lg shadow-indigo-500/10 text-white flex flex-col justify-between h-48`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8 pointer-events-none" />
          
          <div className="flex justify-between items-start z-10">
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/77">Loyalty Member</span>
              <h3 className="text-xl font-bold mt-0.5">{user?.full_name || 'Anggota Koperasi'}</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-bold border border-white/10 shadow-sm">
              <Award className="w-3.5 h-3.5" />
              <span>{currentTier.name}</span>
            </div>
          </div>

          <div className="z-10 mt-4 flex items-end justify-between">
            <div>
              <span className="text-white/75 text-[10px] font-bold uppercase tracking-wider block">Saldo Poin Anda</span>
              <span className="text-4xl font-extrabold tracking-tight flex items-center gap-1">
                {myPoints.toLocaleString('id-ID')}
                <span className="text-xs font-semibold text-white/80 tracking-normal mb-1">Poin</span>
              </span>
            </div>
            
            {nextTierPoints && (
              <div className="text-right max-w-xs">
                <span className="text-[10px] text-white/80 font-bold block mb-1">
                  Kumpulkan {(nextTierPoints - myPoints).toLocaleString('id-ID')} poin lagi ke tier berikutnya
                </span>
                <div className="w-40 bg-white/20 h-1.5 rounded-full overflow-hidden inline-block border border-white/5">
                  <div 
                    className="bg-white h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (myPoints / nextTierPoints) * 100)}%` }} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ringkasan Saldo Penjelas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-48">
          <div>
            <h4 className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Aturan Perolehan Poin
            </h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-3 leading-relaxed">
              Setiap simpanan tabungan aktif kelipatan <strong className="text-slate-700 dark:text-slate-200">Rp 10.000</strong> akan secara otomatis menghasilkan <strong className="text-slate-700 dark:text-slate-200">1 Poin</strong> loyalitas.
            </p>
          </div>
          
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-bold">Total Tabungan Anda</span>
            <span className="font-extrabold text-slate-800 dark:text-slate-100">
              Rp {mySavingsSum.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Klaim Voucher Belanja ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award className="text-amber-500 w-5 h-5" />
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Klaim Voucher Belanja</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { points: 500, discount: 5000, desc: 'Voucher potongan diskon Rp 5.000 di toko/kasir koperasi.' },
            { points: 1000, discount: 10000, desc: 'Voucher potongan diskon Rp 10.000 di toko/kasir koperasi.' },
            { points: 2000, discount: 20000, desc: 'Voucher potongan diskon Rp 20.000 di toko/kasir koperasi.' }
          ].map((pkg) => {
            const canRedeem = myPoints >= pkg.points;
            return (
              <div 
                key={pkg.points} 
                className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/5 rounded-full flex items-center justify-center pointer-events-none">
                  <Award className="text-amber-500/20 w-8 h-8" />
                </div>
                
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black px-2.5 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 rounded-lg">
                      {pkg.points} Poin
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg mt-3">
                    Voucher Rp {pkg.discount.toLocaleString('id-ID')}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                    {pkg.desc}
                  </p>
                </div>

                <div className="mt-5">
                  <Button
                    onClick={() => handleRedeemPoints(pkg.points)}
                    disabled={!canRedeem || redeemLoading}
                    isLoading={redeemLoading}
                    className={`w-full py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                      canRedeem 
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10' 
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-650 cursor-not-allowed'
                    }`}
                  >
                    {canRedeem ? 'Tukar Poin' : 'Poin Tidak Cukup'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Katalog Voucher & Promo Aktif ─────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Ticket className="text-blue-500 w-5 h-5" />
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Katalog Promo Voucher</h3>
        </div>

        <div className="mb-4 relative">
          <input
            type="text"
            value={searchVoucher}
            onChange={(e) => setSearchVoucher(e.target.value)}
            placeholder="Cari voucher berdasarkan kode atau deskripsi..."
            className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            aria-label="Cari voucher"
          />
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 text-slate-500">Loading vouchers...</div>
        ) : filteredVouchers.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 max-w-lg mx-auto">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="font-bold text-sm">Tidak ada promo voucher aktif saat ini.</p>
            <p className="text-xs mt-1">Nantikan terus promo-promo menarik dari Koperasi Sekolah!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(filteredVouchers || []).map((v) => (
              <div 
                key={v.id} 
                className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Desain Kupon Sobek */}
                <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-50 dark:bg-slate-950 border-r border-slate-150 dark:border-slate-800 rounded-full transform -translate-y-1/2 pointer-events-none" />
                <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-50 dark:bg-slate-950 border-l border-slate-150 dark:border-slate-800 rounded-full transform -translate-y-1/2 pointer-events-none" />

                <div className="p-5 flex gap-4 items-start border-b border-dashed border-slate-150 dark:border-slate-800">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Ticket size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/25 px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Hemat Rp {Number(v.discount).toLocaleString('id-ID')}
                    </span>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-2 font-mono uppercase tracking-tight">{v.code}</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1.5 leading-relaxed">{v.description || 'Gunakan kode promo ini saat checkout belanja di kasir koperasi.'}</p>
                  </div>
                </div>

                <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-900/10 flex justify-between items-center gap-4">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">
                    {v.validUntil ? `S/D: ${new Date(v.validUntil).toLocaleDateString('id-ID')}` : 'Promo Permanen'}
                  </span>
                  
                  <button
                    onClick={() => handleCopyCode(v.code)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      copiedCode === v.code
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-100 text-slate-655 hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {copiedCode === v.code ? (
                      <>
                        <Check size={13} />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Salin Kode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Riwayat Transaksi Poin ────────────────────────────────────────── */}
      <div>
        <Table 
          data={paginatedPointHistory}
          columns={pointHistoryColumns}
          keyField="id"
          isLoading={pointsLoading}
          emptyMessage="Belum ada riwayat transaksi poin."
          sortKey={pointSortKey}
          sortDirection={pointSortDirection}
          onSort={handlePointSort}
          currentPage={pointPage}
          totalPages={totalPointPages}
          onPageChange={setPointPage}
          limit={pointLimit}
          onLimitChange={setPointLimit}
          toolbarLeft={
            <div className="flex items-center gap-2">
              <Sparkles className="text-blue-500 w-5 h-5" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Riwayat Transaksi Poin</h3>
            </div>
          }
        />
      </div>

      {/* ── Riwayat Belanja Saya ────────────────────────────────────────── */}
      <div>
        <Table
          data={paginatedSalesHistory}
          keyField="id"
          isLoading={salesLoading}
          emptyMessage="Anda belum memiliki riwayat transaksi belanja."
          sortKey={salesSortKey}
          sortDirection={salesSortDirection}
          onSort={handleSalesSort}
          currentPage={salesPage}
          totalPages={totalSalesPages}
          onPageChange={setSalesPage}
          limit={salesLimit}
          onLimitChange={setSalesLimit}
          toolbarLeft={
            <div className="flex items-center gap-2">
              <ShoppingCart className="text-indigo-500 w-5 h-5" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Riwayat Belanja Saya</h3>
            </div>
          }
          columns={salesColumns}
        />
      </div>

      {/* ── Keuntungan Tingkatan Anggota ───────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="text-blue-500 w-5 h-5" />
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Keuntungan Tingkat Keanggotaan</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bronze Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl relative">
            <div className="absolute top-4 right-4 text-orange-700/20 font-black text-5xl font-mono uppercase tracking-tighter">01</div>
            <h4 className="font-extrabold text-orange-700 text-sm">Tier Perunggu (Bronze)</h4>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">&lt; 500 Poin</span>
            <ul className="text-slate-500 dark:text-slate-400 text-xs mt-4 space-y-2.5">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                <span>Pembayaran cashless dengan saldo simpanan sukarela.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                <span>Akses ke semua pengumuman resmi koperasi.</span>
              </li>
            </ul>
          </div>

          {/* Silver Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl relative ring-2 ring-slate-100 dark:ring-slate-800">
            <div className="absolute top-4 right-4 text-slate-500/25 font-black text-5xl font-mono uppercase tracking-tighter">02</div>
            <h4 className="font-extrabold text-slate-650 text-sm">Tier Perak (Silver)</h4>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">500 - 999 Poin</span>
            <ul className="text-slate-500 dark:text-slate-400 text-xs mt-4 space-y-2.5">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                <span>Semua keuntungan tier Perunggu.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                <span>Potongan belanja diskon khusus s/d 5%.</span>
              </li>
            </ul>
          </div>

          {/* Gold Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl relative ring-2 ring-amber-500/30">
            <div className="absolute top-4 right-4 text-amber-500/20 font-black text-5xl font-mono uppercase tracking-tighter">03</div>
            <h4 className="font-extrabold text-amber-600 text-sm">Tier Emas (Gold)</h4>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">1.000+ Poin</span>
            <ul className="text-slate-500 dark:text-slate-400 text-xs mt-4 space-y-2.5">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                <span>Semua keuntungan tier Perak.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                <span>Bonus cashback belanja s/d 2% bulanan.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                <span>Prioritas utama program undian koperasi.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});

VoucherMemberView.displayName = 'VoucherMemberView';
