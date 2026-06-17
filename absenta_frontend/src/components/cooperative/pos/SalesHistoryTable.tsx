import React from 'react';
import { Search, Eye, Printer } from 'lucide-react';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { SectionCard } from '../../ui/SectionCard';
import { StrukBadge } from './StrukBadge';
import type { SaleRecord } from './usePOSState';

interface SalesHistoryTableProps {
  salesLoading: boolean;
  paginatedSalesHistory: SaleRecord[];
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  onSort: (key: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  historySearch: string;
  setHistorySearch: (search: string) => void;
  processedSalesHistory: SaleRecord[];
  setSelectedSale: (sale: SaleRecord | null) => void;
  setShowReceiptModal: (show: boolean) => void;
  printReceipt: (sale: SaleRecord) => void;
}

export const SalesHistoryTable: React.FC<SalesHistoryTableProps> = ({
  salesLoading,
  paginatedSalesHistory,
  sortKey,
  sortDirection,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  historySearch,
  setHistorySearch,
  processedSalesHistory,
  setSelectedSale,
  setShowReceiptModal,
  printReceipt
}) => {
  return (
    <div className="mt-8">
      <SectionCard title="Riwayat Belanja Saya" fullWidth>
        <Table
          data={paginatedSalesHistory}
          keyField="id"
          isLoading={salesLoading}
          emptyMessage="Anda belum memiliki riwayat transaksi belanja."
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={onSort}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          limit={limit}
          onLimitChange={onLimitChange}
          toolbarLeft={
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total: {processedSalesHistory.length} Transaksi
            </span>
          }
          toolbarRight={
            <div className="relative w-64">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Cari ID Struk / Voucher..."
                value={historySearch}
                aria-label="Cari riwayat belanja"
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-850 dark:text-slate-105"
              />
            </div>
          }
          columns={[
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
          ]}
        />
      </SectionCard>
    </div>
  );
};
