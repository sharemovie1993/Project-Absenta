import React, { useRef, useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
} from '@/components/ui';
import { CoopDocumentKop } from '../shared/CoopDocumentKop';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import { exportPrintSheetsToPdf } from '../../../utils/print/exportPrintSheetsToPdf';
import { formatDate } from '../../../utils/layoutUtils';
import toast from 'react-hot-toast';

export interface StockItem {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  costPrice: number;
  price: number;
  nilaiPersediaan: number;
  status: 'NORMAL' | 'RENDAH' | 'HABIS';
}

export interface StockSummary {
  totalSKU: number;
  totalItems: number;
  totalNilaiPersediaan: number;
  jumlahHabis: number;
  jumlahRendah: number;
}

export interface ValuationRow {
  category: string;
  sku: number;
  totalStock: number;
  totalValue: number;
}

export interface ValuationGrand {
  totalSKU: number;
  totalStock: number;
  totalValue: number;
}

export interface PurchaseRow {
  id: string;
  date: string;
  supplier: string;
  paymentMethod: string;
  notes: string;
  nilaiBarang: number;
  shippingFee: number;
  totalBayar: number;
  itemCount: number;
  skuCount: number;
}

export interface PurchaseGrand {
  totalTransaksi: number;
  totalNilaiBarang: number;
  totalShippingFee: number;
  totalPembayaran: number;
  totalItemDibeli: number;
}

export type InventoryReportTab = 'stock' | 'valuation' | 'purchases';

export interface LaporanInventoriPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: InventoryReportTab;
  stockItems?: StockItem[];
  stockSummary?: StockSummary | null;
  categoryFilter?: string;
  lowStockOnly?: boolean;
  valuationRows?: ValuationRow[];
  valuationGrand?: ValuationGrand | null;
  purchaseRows?: PurchaseRow[];
  purchaseGrand?: PurchaseGrand | null;
  startDate?: string;
  endDate?: string;
  supplierFilter?: string;
}

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

const TAB_CONFIG: Record<
  InventoryReportTab,
  { modalTitle: string; reportTitle: string; filePrefix: string; orientation: 'portrait' | 'landscape' }
> = {
  stock: {
    modalTitle: 'Cetak Laporan Stok Barang',
    reportTitle: 'LAPORAN STOK BARANG KOPERASI',
    filePrefix: 'Laporan_Stok_Barang_Koperasi',
    orientation: 'landscape',
  },
  valuation: {
    modalTitle: 'Cetak Laporan Nilai Persediaan',
    reportTitle: 'LAPORAN NILAI PERSEDIAAN KOPERASI',
    filePrefix: 'Laporan_Nilai_Persediaan_Koperasi',
    orientation: 'portrait',
  },
  purchases: {
    modalTitle: 'Cetak Rekap Barang Masuk',
    reportTitle: 'REKAP TRANSAKSI BARANG MASUK KOPERASI',
    filePrefix: 'Rekap_Barang_Masuk_Koperasi',
    orientation: 'landscape',
  },
};

export const LaporanInventoriPrintModal: React.FC<LaporanInventoriPrintModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  stockItems = [],
  stockSummary = null,
  categoryFilter = 'ALL',
  lowStockOnly = false,
  valuationRows = [],
  valuationGrand = null,
  purchaseRows = [],
  purchaseGrand = null,
  startDate = '',
  endDate = '',
  supplierFilter = '',
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const signers = useDocumentSigners();

  const config = TAB_CONFIG[activeTab];
  const orientation = config.orientation;
  const printDate = formatDate(new Date().toISOString(), {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const fileName = `${config.filePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`;

  const buildSubtext = () => {
    if (activeTab === 'stock') {
      const catText = categoryFilter === 'ALL' ? 'Semua Kategori' : `Kategori: ${categoryFilter}`;
      const statusText = lowStockOnly ? ' • Filter: Stok Rendah/Habis' : '';
      return `${catText}${statusText} • Dicetak: ${printDate}`;
    }
    if (activeTab === 'valuation') {
      return `Rekapitulasi Nilai Modal Persediaan per Kategori (IDR) • Dicetak: ${printDate}`;
    }
    const periodText =
      startDate || endDate
        ? `Periode: ${startDate ? formatDate(startDate, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Awal'} s/d ${endDate ? formatDate(endDate, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sekarang'}`
        : 'Semua Periode';
    const supText = supplierFilter ? ` • Supplier: ${supplierFilter}` : '';
    return `${periodText}${supText} • Dicetak: ${printDate}`;
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const container = sheetContainerRef.current;
    if (!container) {
      toast.error('Lembar dokumen belum siap untuk diekspor');
      return;
    }

    const sheets = container.querySelectorAll<HTMLElement>('.print-sheet');
    if (sheets.length === 0) {
      toast.error('Tidak ada lembar laporan untuk diekspor');
      return;
    }

    const toastId = toast.loading('Mempersiapkan PDF Laporan Persediaan...');
    try {
      setIsExportingPdf(true);
      await exportPrintSheetsToPdf(container, fileName, orientation);
      toast.success('File PDF Laporan berhasil diunduh', { id: toastId });
    } catch (err) {
      console.error('[LaporanInventoriPrintModal PDF Error]', err);
      toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Dokumen', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={config.modalTitle}
      subtitle={`Standar Universal Document Printing • True WYSIWYG A4 ${orientation === 'landscape' ? 'Landscape' : 'Portrait'}`}
      orientation={orientation}
      allowOrientationToggle={false}
      allowLogoToggles={false}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF (A4)'}
      printButtonText="Cetak Laporan"
      size="5xl"
    >
      <div ref={sheetContainerRef} className="space-y-6 flex flex-col items-center">
        <PrintDocumentSheet orientation={orientation} className="flex flex-col justify-between text-slate-900">
          <div>
            {/* 1. Kop Resmi Koperasi */}
            <CoopDocumentKop subtitle={config.reportTitle} subtext={buildSubtext()} />

            {/* 2. Ringkasan KPI sesuai Sub-Tab */}
            {activeTab === 'stock' && stockSummary && (
              <div className="grid grid-cols-4 gap-2.5 mb-4 break-inside-avoid">
                <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total SKU</div>
                  <div className="text-sm font-black text-slate-900">{stockSummary.totalSKU}</div>
                </div>
                <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Unit Stok</div>
                  <div className="text-sm font-black text-slate-900">
                    {stockSummary.totalItems.toLocaleString('id-ID')} pcs
                  </div>
                </div>
                <div className="border border-slate-200 rounded-md px-3 py-2 bg-emerald-50/70">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Nilai Persediaan</div>
                  <div className="text-sm font-black text-emerald-800">{fmt(stockSummary.totalNilaiPersediaan)}</div>
                </div>
                <div className="border border-slate-200 rounded-md px-3 py-2 bg-amber-50/70">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Perlu Perhatian</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {stockSummary.jumlahHabis} Habis • {stockSummary.jumlahRendah} Rendah
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'valuation' && valuationGrand && (
              <div className="grid grid-cols-3 gap-2.5 mb-4 break-inside-avoid">
                <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total SKU</div>
                  <div className="text-sm font-black text-slate-900">{valuationGrand.totalSKU}</div>
                </div>
                <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Stok</div>
                  <div className="text-sm font-black text-slate-900">
                    {valuationGrand.totalStock.toLocaleString('id-ID')} pcs
                  </div>
                </div>
                <div className="border border-slate-200 rounded-md px-3 py-2 bg-emerald-50/70">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Total Nilai Modal</div>
                  <div className="text-sm font-black text-emerald-800">{fmt(valuationGrand.totalValue)}</div>
                </div>
              </div>
            )}

            {activeTab === 'purchases' && purchaseGrand && (
              <div className="grid grid-cols-4 gap-2.5 mb-4 break-inside-avoid">
                <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Transaksi</div>
                  <div className="text-sm font-black text-slate-900">{purchaseGrand.totalTransaksi}</div>
                </div>
                <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Item Dibeli</div>
                  <div className="text-sm font-black text-slate-900">
                    {purchaseGrand.totalItemDibeli.toLocaleString('id-ID')} pcs
                  </div>
                </div>
                <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Nilai Barang & Ongkir</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {fmt(purchaseGrand.totalNilaiBarang)} (+{fmt(purchaseGrand.totalShippingFee)})
                  </div>
                </div>
                <div className="border border-slate-200 rounded-md px-3 py-2 bg-blue-50/70">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-blue-700">Total Pembayaran</div>
                  <div className="text-sm font-black text-blue-800">{fmt(purchaseGrand.totalPembayaran)}</div>
                </div>
              </div>
            )}

            {/* 3. Tabel Data Laporan */}
            {activeTab === 'stock' && (
              <table className="w-full border-collapse text-[10px] leading-tight">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 uppercase">
                    <th className="py-1.5 px-2 text-left font-bold">No</th>
                    <th className="py-1.5 px-2 text-left font-bold">Kode</th>
                    <th className="py-1.5 px-2 text-left font-bold">Nama Produk</th>
                    <th className="py-1.5 px-2 text-left font-bold">Kategori</th>
                    <th className="py-1.5 px-2 text-right font-bold">Stok</th>
                    <th className="py-1.5 px-2 text-right font-bold">Harga Modal</th>
                    <th className="py-1.5 px-2 text-right font-bold">Harga Jual</th>
                    <th className="py-1.5 px-2 text-right font-bold">Nilai Persediaan</th>
                    <th className="py-1.5 px-2 text-center font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stockItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        Tidak ada data produk.
                      </td>
                    </tr>
                  ) : (
                    stockItems.map((item, idx) => (
                      <tr key={item.id} className="break-inside-avoid">
                        <td className="py-1.5 px-2 text-slate-500">{idx + 1}</td>
                        <td className="py-1.5 px-2 font-mono text-slate-600">{item.code}</td>
                        <td className="py-1.5 px-2 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-1.5 px-2 text-slate-600">{item.category}</td>
                        <td className="py-1.5 px-2 text-right font-bold">{item.stock} pcs</td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{fmt(item.costPrice)}</td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{fmt(item.price)}</td>
                        <td className="py-1.5 px-2 text-right font-bold text-slate-900">{fmt(item.nilaiPersediaan)}</td>
                        <td className="py-1.5 px-2 text-center font-bold">{item.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {stockItems.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-400 font-black">
                      <td colSpan={4} className="py-2 px-2 uppercase text-slate-800">
                        Total ({stockItems.length} Produk)
                      </td>
                      <td className="py-2 px-2 text-right text-slate-900">
                        {stockItems.reduce((s, i) => s + i.stock, 0).toLocaleString('id-ID')} pcs
                      </td>
                      <td colSpan={2} />
                      <td className="py-2 px-2 text-right text-emerald-800">
                        {fmt(stockItems.reduce((s, i) => s + i.nilaiPersediaan, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}

            {activeTab === 'valuation' && (
              <table className="w-full border-collapse text-[11px] leading-tight">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 uppercase">
                    <th className="py-2 px-2.5 text-left font-bold">No</th>
                    <th className="py-2 px-2.5 text-left font-bold">Kategori Produk</th>
                    <th className="py-2 px-2.5 text-center font-bold">Jumlah SKU</th>
                    <th className="py-2 px-2.5 text-right font-bold">Total Stok (pcs)</th>
                    <th className="py-2 px-2.5 text-right font-bold">Total Nilai Modal</th>
                    <th className="py-2 px-2.5 text-right font-bold">Komposisi (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {valuationRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Tidak ada data nilai persediaan.
                      </td>
                    </tr>
                  ) : (
                    valuationRows.map((row, idx) => {
                      const pct =
                        valuationGrand && valuationGrand.totalValue > 0
                          ? ((row.totalValue / valuationGrand.totalValue) * 100).toFixed(1)
                          : '0.0';
                      return (
                        <tr key={row.category} className="break-inside-avoid">
                          <td className="py-2 px-2.5 text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-900">{row.category}</td>
                          <td className="py-2 px-2.5 text-center text-slate-700">{row.sku}</td>
                          <td className="py-2 px-2.5 text-right text-slate-700">
                            {row.totalStock.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-slate-900">{fmt(row.totalValue)}</td>
                          <td className="py-2 px-2.5 text-right font-semibold text-slate-700">{pct}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {valuationGrand && (
                  <tfoot>
                    <tr className="bg-emerald-50 border-t-2 border-emerald-400 font-black text-emerald-900">
                      <td colSpan={2} className="py-2.5 px-2.5 uppercase">
                        Total Keseluruhan
                      </td>
                      <td className="py-2.5 px-2.5 text-center">{valuationGrand.totalSKU}</td>
                      <td className="py-2.5 px-2.5 text-right">
                        {valuationGrand.totalStock.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right">{fmt(valuationGrand.totalValue)}</td>
                      <td className="py-2.5 px-2.5 text-right">100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}

            {activeTab === 'purchases' && (
              <table className="w-full border-collapse text-[10px] leading-tight">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 uppercase">
                    <th className="py-1.5 px-2 text-left font-bold">No</th>
                    <th className="py-1.5 px-2 text-left font-bold">Tanggal</th>
                    <th className="py-1.5 px-2 text-left font-bold">Supplier</th>
                    <th className="py-1.5 px-2 text-center font-bold">Metode</th>
                    <th className="py-1.5 px-2 text-center font-bold">Jml. Item</th>
                    <th className="py-1.5 px-2 text-right font-bold">Nilai Barang</th>
                    <th className="py-1.5 px-2 text-right font-bold">Ongkos Kirim</th>
                    <th className="py-1.5 px-2 text-right font-bold">Total Pembayaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {purchaseRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        Tidak ada data transaksi barang masuk.
                      </td>
                    </tr>
                  ) : (
                    purchaseRows.map((row, idx) => (
                      <tr key={row.id} className="break-inside-avoid">
                        <td className="py-1.5 px-2 text-slate-500">{idx + 1}</td>
                        <td className="py-1.5 px-2 whitespace-nowrap text-slate-700">
                          {formatDate(row.date, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-1.5 px-2 font-semibold text-slate-900">{row.supplier}</td>
                        <td className="py-1.5 px-2 text-center font-bold text-slate-700">{row.paymentMethod}</td>
                        <td className="py-1.5 px-2 text-center text-slate-700">
                          {row.itemCount.toLocaleString('id-ID')}
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-700">{fmt(row.nilaiBarang)}</td>
                        <td className="py-1.5 px-2 text-right text-slate-700">
                          {row.shippingFee > 0 ? fmt(row.shippingFee) : '—'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-slate-900">{fmt(row.totalBayar)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {purchaseGrand && purchaseRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-blue-50 border-t-2 border-blue-400 font-black text-blue-900">
                      <td colSpan={4} className="py-2 px-2 uppercase">
                        Total ({purchaseGrand.totalTransaksi} Transaksi)
                      </td>
                      <td className="py-2 px-2 text-center">
                        {purchaseGrand.totalItemDibeli.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-2 text-right">{fmt(purchaseGrand.totalNilaiBarang)}</td>
                      <td className="py-2 px-2 text-right">
                        {purchaseGrand.totalShippingFee > 0 ? fmt(purchaseGrand.totalShippingFee) : '—'}
                      </td>
                      <td className="py-2 px-2 text-right">{fmt(purchaseGrand.totalPembayaran)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>

          {/* 4. Tanda Tangan Standar UniversalDocumentSignatures */}
          <div className="mt-8 pt-2 break-inside-avoid">
            <UniversalDocumentSignatures
              layout="triangle_2tier"
              fontFamilyClass="font-sans"
              spacingHeightMm={16}
              signerLeft={signers.ketuaKoperasi}
              signerRight={signers.bendaharaKoperasi}
              signerBottom={signers.kepsek}
              verifierLabel="Diperiksa & Disetujui,"
              makerLabel="Disiapkan Oleh,"
              notesOrApprovalLabel="Mengetahui / Menyetujui,"
            />
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
