import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../lib/axiosInstance';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import toast from 'react-hot-toast';
import {
  Package,
  BarChart2,
  ShoppingCart,
  Download,
  Printer,
  RefreshCw,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  TrendingDown,
  Filter,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StockItem {
  id: string; code: string; name: string; category: string;
  stock: number; costPrice: number; price: number;
  nilaiPersediaan: number; status: 'NORMAL' | 'RENDAH' | 'HABIS';
}
interface StockSummary {
  totalSKU: number; totalItems: number; totalNilaiPersediaan: number;
  jumlahHabis: number; jumlahRendah: number;
}
interface ValuationRow { category: string; sku: number; totalStock: number; totalValue: number; }
interface ValuationGrand { totalSKU: number; totalStock: number; totalValue: number; }
interface PurchaseRow {
  id: string; date: string; supplier: string; paymentMethod: string;
  notes: string; nilaiBarang: number; shippingFee: number; totalBayar: number;
  itemCount: number; skuCount: number;
}
interface PurchaseGrand {
  totalTransaksi: number; totalNilaiBarang: number;
  totalShippingFee: number; totalPembayaran: number; totalItemDibeli: number;
}

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

// ─── Component ───────────────────────────────────────────────────────────────

const LaporanInventori: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stock' | 'valuation' | 'purchases'>('stock');

  // — Stok Barang state
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // — Nilai Persediaan state
  const [valuationRows, setValuationRows] = useState<ValuationRow[]>([]);
  const [valuationGrand, setValuationGrand] = useState<ValuationGrand | null>(null);
  const [valuationLoading, setValuationLoading] = useState(false);

  // — Rekap Barang Masuk state
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([]);
  const [purchaseGrand, setPurchaseGrand] = useState<PurchaseGrand | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // — Derived category list for filter
  const categories = useMemo(() => {
    const cats = Array.from(new Set(stockItems.map(i => i.category).filter(Boolean)));
    return cats.sort();
  }, [stockItems]);

  const filteredStockItems = useMemo(() => {
    return stockItems.filter(item => {
      const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchLow = !lowStockOnly || item.status !== 'NORMAL';
      return matchCat && matchLow;
    });
  }, [stockItems, categoryFilter, lowStockOnly]);

  // ─── Fetchers ────────────────────────────────────────────────────────────

  const fetchStock = useCallback(async () => {
    setStockLoading(true);
    try {
      const res = await api.get('/cooperative/reports/inventory/stock');
      setStockItems(res.data.items || []);
      setStockSummary(res.data.summary || null);
    } catch (e) {
      toast.error('Gagal mengambil laporan stok barang');
    } finally { setStockLoading(false); }
  }, []);

  const fetchValuation = useCallback(async () => {
    setValuationLoading(true);
    try {
      const res = await api.get('/cooperative/reports/inventory/valuation');
      setValuationRows(res.data.rows || []);
      setValuationGrand(res.data.grandTotal || null);
    } catch (e) {
      toast.error('Gagal mengambil laporan nilai persediaan');
    } finally { setValuationLoading(false); }
  }, []);

  const fetchPurchases = useCallback(async () => {
    setPurchaseLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (supplierFilter) params.supplier = supplierFilter;
      const res = await api.get('/cooperative/reports/inventory/purchases', { params });
      setPurchaseRows(res.data.rows || []);
      setPurchaseGrand(res.data.grandTotal || null);
    } catch (e) {
      toast.error('Gagal mengambil rekap barang masuk');
    } finally { setPurchaseLoading(false); }
  }, [startDate, endDate, supplierFilter]);

  useEffect(() => {
    if (activeTab === 'stock') fetchStock();
    else if (activeTab === 'valuation') fetchValuation();
    else fetchPurchases();
  }, [activeTab]);

  // ─── Export Excel ────────────────────────────────────────────────────────

  const exportStockExcel = () => {
    const rows = filteredStockItems.map((item, idx) => ({
      'No': idx + 1, 'Kode': item.code, 'Nama Produk': item.name,
      'Kategori': item.category, 'Stok (pcs)': item.stock,
      'Harga Modal (Rp)': item.costPrice, 'Harga Jual (Rp)': item.price,
      'Nilai Persediaan (Rp)': item.nilaiPersediaan, 'Status': item.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Barang');
    ws['!cols'] = [6,12,30,18,12,18,18,22,10].map(w => ({ wch: w }));
    XLSX.writeFile(wb, `Laporan_Stok_Koperasi_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Laporan stok berhasil diekspor ke Excel');
  };

  const exportValuationExcel = () => {
    const rows = valuationRows.map((r, idx) => ({
      'No': idx + 1, 'Kategori': r.category, 'Jumlah SKU': r.sku,
      'Total Stok (pcs)': r.totalStock, 'Total Nilai Modal (Rp)': r.totalValue,
    }));
    if (valuationGrand) rows.push({ 'No': '' as any, 'Kategori': 'TOTAL', 'Jumlah SKU': valuationGrand.totalSKU, 'Total Stok (pcs)': valuationGrand.totalStock, 'Total Nilai Modal (Rp)': valuationGrand.totalValue });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai Persediaan');
    ws['!cols'] = [6, 25, 12, 18, 22].map(w => ({ wch: w }));
    XLSX.writeFile(wb, `Laporan_Nilai_Persediaan_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Laporan nilai persediaan berhasil diekspor');
  };

  const exportPurchasesExcel = () => {
    const rows = purchaseRows.map((r, idx) => ({
      'No': idx + 1,
      'Tanggal': new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
      'Supplier': r.supplier, 'Metode': r.paymentMethod,
      'Jumlah Item': r.itemCount, 'Jumlah SKU': r.skuCount,
      'Nilai Barang (Rp)': r.nilaiBarang, 'Ongkos Kirim (Rp)': r.shippingFee,
      'Total Pembayaran (Rp)': r.totalBayar,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Barang Masuk');
    ws['!cols'] = [6, 22, 25, 10, 12, 12, 20, 20, 22].map(w => ({ wch: w }));
    XLSX.writeFile(wb, `Rekap_Barang_Masuk_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Rekap barang masuk berhasil diekspor');
  };

  const handlePrint = () => {
    window.print();
  };

  const breadcrumbs = [
    { label: 'Koperasi', path: '/cooperative/dashboard' },
    { label: 'Inventori & Barang Masuk', path: '/cooperative/products' },
    { label: 'Laporan Persediaan' },
  ];

  // ─── Status badge helper ──────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'HABIS') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
        <XCircle size={10} /> Habis
      </span>
    );
    if (status === 'RENDAH') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
        <AlertTriangle size={10} /> Rendah
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
        <CheckCircle2 size={10} /> Normal
      </span>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PremiumFeatureGate moduleName="KOPERASI" featureName="Laporan Inventori">
      <AcademicPageLayout
        title="Laporan Persediaan Koperasi"
        description="Laporan stok barang, nilai persediaan, dan rekap transaksi barang masuk."
        hardeningModuleKey="coop_laporaninventori"
        breadcrumbs={breadcrumbs}
        instruction={{
          title: 'Panduan Laporan Persediaan',
          description: 'Gunakan laporan ini untuk memantau kondisi stok, nilai modal persediaan, dan riwayat pengadaan barang koperasi.',
          items: [
            { text: 'Tab Stok Barang: snapshot semua produk dengan status kondisi stok.' },
            { text: 'Tab Nilai Persediaan: total nilai modal per kategori untuk rekonsiliasi akuntansi (akun 1030).' },
            { text: 'Tab Rekap Barang Masuk: riwayat pembelian dengan rincian ongkos kirim dan total pembayaran.' },
          ]
        }}
      >
        <div className="space-y-6 print:space-y-4">

          {/* Back shortcut */}
          <div className="flex items-center">
            <button
              onClick={() => navigate('/cooperative/products')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={16} />
              Kembali ke Katalog Barang
            </button>
          </div>

          {/* Summary Cards — always visible */}
          {activeTab === 'stock' && stockSummary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:gap-2">
              {[
                { label: 'Total SKU', value: stockSummary.totalSKU.toLocaleString('id-ID'), color: 'blue', icon: <Package size={18} /> },
                { label: 'Total Item', value: stockSummary.totalItems.toLocaleString('id-ID'), color: 'indigo', icon: <BarChart2 size={18} /> },
                { label: 'Nilai Persediaan', value: fmt(stockSummary.totalNilaiPersediaan), color: 'emerald', icon: <TrendingDown size={18} /> },
                { label: 'Stok Rendah', value: stockSummary.jumlahRendah.toLocaleString('id-ID'), color: 'amber', icon: <AlertTriangle size={18} /> },
                { label: 'Stok Habis', value: stockSummary.jumlahHabis.toLocaleString('id-ID'), color: 'red', icon: <XCircle size={18} /> },
              ].map(card => (
                <div key={card.label} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3`}>
                  <div className={`p-2 rounded-lg bg-${card.color}-50 text-${card.color}-600`}>
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                    <p className="font-black text-gray-900 text-sm">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'valuation' && valuationGrand && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Total SKU Produk', value: valuationGrand.totalSKU.toLocaleString('id-ID') + ' produk' },
                { label: 'Total Stok Tersimpan', value: valuationGrand.totalStock.toLocaleString('id-ID') + ' pcs' },
                { label: 'Total Nilai Modal Persediaan', value: fmt(valuationGrand.totalValue), highlight: true },
              ].map(card => (
                <div key={card.label} className={`rounded-xl p-5 border ${card.highlight ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <p className={`text-xs font-medium ${card.highlight ? 'text-emerald-100' : 'text-gray-500'}`}>{card.label}</p>
                  <p className={`text-xl font-black mt-1 ${card.highlight ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'purchases' && purchaseGrand && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Jumlah Transaksi', value: purchaseGrand.totalTransaksi.toString() + ' transaksi' },
                { label: 'Nilai Barang', value: fmt(purchaseGrand.totalNilaiBarang) },
                { label: 'Total Ongkos Kirim', value: fmt(purchaseGrand.totalShippingFee), orange: true },
                { label: 'Total Pembayaran', value: fmt(purchaseGrand.totalPembayaran), highlight: true },
              ].map(card => (
                <div key={card.label} className={`rounded-xl p-5 border ${card.highlight ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : card.orange ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <p className={`text-xs font-medium ${card.highlight ? 'text-blue-100' : card.orange ? 'text-orange-600' : 'text-gray-500'}`}>{card.label}</p>
                  <p className={`text-lg font-black mt-1 ${card.highlight ? 'text-white' : card.orange ? 'text-orange-700' : 'text-gray-900'}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Main panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

            {/* Tab bar + Actions */}
            <div className="flex items-center justify-between px-6 pt-4 pb-0 border-b border-gray-100 flex-wrap gap-3">
              <div className="flex gap-1">
                {[
                  { key: 'stock',     label: 'Stok Barang',       icon: <Package size={14} /> },
                  { key: 'valuation', label: 'Nilai Persediaan',  icon: <BarChart2 size={14} /> },
                  { key: 'purchases', label: 'Rekap Barang Masuk',icon: <ShoppingCart size={14} /> },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center gap-2 py-3 px-5 border-b-2 font-semibold text-sm transition-all ${
                      activeTab === tab.key
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pb-3 print:hidden">
                <button
                  onClick={activeTab === 'stock' ? fetchStock : activeTab === 'valuation' ? fetchValuation : fetchPurchases}
                  className="h-9 px-3 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
                <button
                  onClick={handlePrint}
                  className="h-9 px-3 text-xs font-bold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Printer size={13} /> Cetak
                </button>
                <button
                  onClick={activeTab === 'stock' ? exportStockExcel : activeTab === 'valuation' ? exportValuationExcel : exportPurchasesExcel}
                  className="h-9 px-4 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Download size={13} /> Export Excel
                </button>
              </div>
            </div>

            {/* ── TAB: STOK BARANG ── */}
            {activeTab === 'stock' && (
              <div>
                {/* Filters */}
                <div className="px-6 py-4 border-b border-gray-50 bg-slate-50/50 flex flex-wrap items-center gap-4 print:hidden">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    <select
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="ALL">Semua Kategori</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lowStockOnly}
                      onChange={e => setLowStockOnly(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    Tampilkan hanya stok rendah/habis
                  </label>
                  <span className="text-xs text-gray-400 ml-auto">
                    Menampilkan {filteredStockItems.length} dari {stockItems.length} produk
                  </span>
                </div>

                {stockLoading ? (
                  <div className="py-16 text-center text-gray-400 text-sm">Memuat laporan stok...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {['No', 'Kode', 'Nama Produk', 'Kategori', 'Stok', 'Harga Modal', 'Harga Jual', 'Nilai Persediaan', 'Status'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {filteredStockItems.length === 0 ? (
                          <tr><td colSpan={9} className="py-12 text-center text-gray-400">Tidak ada data produk.</td></tr>
                        ) : filteredStockItems.map((item, idx) => (
                          <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${item.status === 'HABIS' ? 'bg-red-50/30' : item.status === 'RENDAH' ? 'bg-amber-50/30' : ''}`}>
                            <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{item.name}</td>
                            <td className="px-4 py-3 text-gray-500">{item.category}</td>
                            <td className={`px-4 py-3 font-bold ${item.status === 'HABIS' ? 'text-red-600' : item.status === 'RENDAH' ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {item.stock} pcs
                            </td>
                            <td className="px-4 py-3 text-gray-600">{fmt(item.costPrice)}</td>
                            <td className="px-4 py-3 text-gray-600">{fmt(item.price)}</td>
                            <td className="px-4 py-3 font-bold text-gray-800">{fmt(item.nilaiPersediaan)}</td>
                            <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                      {filteredStockItems.length > 0 && (
                        <tfoot className="bg-slate-100">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-xs font-black text-gray-600 uppercase">Total</td>
                            <td className="px-4 py-3 text-xs font-black text-gray-800">
                              {filteredStockItems.reduce((s, i) => s + i.stock, 0).toLocaleString('id-ID')} pcs
                            </td>
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3 text-xs font-black text-emerald-700">
                              {fmt(filteredStockItems.reduce((s, i) => s + i.nilaiPersediaan, 0))}
                            </td>
                            <td className="px-4 py-3" />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: NILAI PERSEDIAAN ── */}
            {activeTab === 'valuation' && (
              <div>
                {valuationLoading ? (
                  <div className="py-16 text-center text-gray-400 text-sm">Memuat laporan nilai persediaan...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {['No', 'Kategori Produk', 'Jumlah SKU', 'Total Stok (pcs)', 'Total Nilai Modal', 'Komposisi (%)'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {valuationRows.length === 0 ? (
                          <tr><td colSpan={6} className="py-12 text-center text-gray-400">Tidak ada data.</td></tr>
                        ) : valuationRows.map((row, idx) => {
                          const pct = valuationGrand && valuationGrand.totalValue > 0
                            ? ((row.totalValue / valuationGrand.totalValue) * 100).toFixed(1)
                            : '0.0';
                          const barWidth = valuationGrand && valuationGrand.totalValue > 0
                            ? Math.round((row.totalValue / valuationGrand.totalValue) * 100)
                            : 0;
                          return (
                            <tr key={row.category} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-4 text-gray-400 text-xs">{idx + 1}</td>
                              <td className="px-5 py-4 font-semibold text-gray-800">{row.category}</td>
                              <td className="px-5 py-4 text-gray-600 text-center">{row.sku}</td>
                              <td className="px-5 py-4 text-gray-600 text-right">{row.totalStock.toLocaleString('id-ID')}</td>
                              <td className="px-5 py-4 font-bold text-gray-800 text-right">{fmt(row.totalValue)}</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                                    <div
                                      className="bg-emerald-500 h-2 rounded-full transition-all"
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-gray-600 w-12 text-right">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {valuationGrand && (
                        <tfoot className="bg-emerald-50">
                          <tr>
                            <td colSpan={2} className="px-5 py-4 text-sm font-black text-emerald-800">TOTAL KESELURUHAN</td>
                            <td className="px-5 py-4 font-black text-emerald-800 text-center">{valuationGrand.totalSKU}</td>
                            <td className="px-5 py-4 font-black text-emerald-800 text-right">{valuationGrand.totalStock.toLocaleString('id-ID')}</td>
                            <td className="px-5 py-4 font-black text-emerald-800 text-right text-base">{fmt(valuationGrand.totalValue)}</td>
                            <td className="px-5 py-4 text-xs font-bold text-emerald-600">100%</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: REKAP BARANG MASUK ── */}
            {activeTab === 'purchases' && (
              <div>
                {/* Filters */}
                <div className="px-6 py-4 border-b border-gray-50 bg-slate-50/50 flex flex-wrap items-center gap-4 print:hidden">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Dari tanggal"
                    />
                    <span className="text-gray-400 text-xs">s/d</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={supplierFilter}
                      onChange={e => setSupplierFilter(e.target.value)}
                      placeholder="Nama supplier..."
                      className="h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 w-40"
                    />
                  </div>
                  <button
                    onClick={fetchPurchases}
                    className="h-8 px-4 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 transition-colors"
                  >
                    <Filter size={12} /> Terapkan Filter
                  </button>
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); setSupplierFilter(''); setTimeout(fetchPurchases, 50); }}
                    className="h-8 px-3 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {purchaseLoading ? (
                  <div className="py-16 text-center text-gray-400 text-sm">Memuat rekap barang masuk...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {['No', 'Tanggal', 'Supplier', 'Metode', 'Jml. Item', 'Nilai Barang', 'Ongkos Kirim', 'Total Pembayaran'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {purchaseRows.length === 0 ? (
                          <tr><td colSpan={8} className="py-12 text-center text-gray-400">Tidak ada data transaksi barang masuk.</td></tr>
                        ) : purchaseRows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                              {new Date(row.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{row.supplier}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${row.paymentMethod === 'CREDIT' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-sky-50 text-sky-600 border border-sky-200'}`}>
                                {row.paymentMethod}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-center">{row.itemCount.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-gray-700 text-right">{fmt(row.nilaiBarang)}</td>
                            <td className="px-4 py-3 text-right">
                              {row.shippingFee > 0
                                ? <span className="font-semibold text-orange-600">{fmt(row.shippingFee)}</span>
                                : <span className="text-gray-300">—</span>
                              }
                            </td>
                            <td className="px-4 py-3 font-black text-gray-900 text-right">{fmt(row.totalBayar)}</td>
                          </tr>
                        ))}
                      </tbody>
                      {purchaseGrand && purchaseRows.length > 0 && (
                        <tfoot className="bg-blue-50">
                          <tr>
                            <td colSpan={4} className="px-4 py-4 text-sm font-black text-blue-800">
                              TOTAL ({purchaseGrand.totalTransaksi} transaksi)
                            </td>
                            <td className="px-4 py-4 font-black text-blue-800 text-center">
                              {purchaseGrand.totalItemDibeli.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-4 font-black text-blue-800 text-right">
                              {fmt(purchaseGrand.totalNilaiBarang)}
                            </td>
                            <td className="px-4 py-4 font-black text-orange-700 text-right">
                              {purchaseGrand.totalShippingFee > 0 ? fmt(purchaseGrand.totalShippingFee) : '—'}
                            </td>
                            <td className="px-4 py-4 font-black text-blue-800 text-right text-base">
                              {fmt(purchaseGrand.totalPembayaran)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Print styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .print\\:hidden { display: none !important; }
            body { background: white !important; font-size: 11px; }
          }
        ` }} />
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default LaporanInventori;
