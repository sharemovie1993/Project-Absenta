import React, { useState, useMemo } from 'react';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatDate, formatCurrency } from '@/utils/layoutUtils';

export interface RecentTransactionRow {
  billing_id: string;
  tenant_name: string;
  plan_name: string;
  amount: number;
  status: string;
  paid_at: string | null;
}

interface RecentTransactionsTableProps {
  data: RecentTransactionRow[];
}

export const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = React.memo(({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const toBadgeVariant = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'PAID' || s === 'SUCCESS') return 'success';
    if (s === 'OVERDUE' || s === 'FAILED' || s === 'CANCELLED' || s === 'CANCELED') return 'destructive';
    return 'warning';
  };

  const columns: Column[] = useMemo(() => [
    {
      key: 'billing_id',
      label: 'Billing ID',
      render: (_: unknown, row: RecentTransactionRow) => (
        <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
          {row.billing_id}
        </span>
      )
    },
    {
      key: 'tenant_name',
      label: 'Tenant Sekolah',
      render: (_: unknown, row: RecentTransactionRow) => (
        <span className="font-bold text-xs text-slate-900 dark:text-white">
          {row.tenant_name || '-'}
        </span>
      )
    },
    {
      key: 'plan_name',
      label: 'Paket Layanan',
      render: (_: unknown, row: RecentTransactionRow) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.plan_name || '-'}
        </span>
      )
    },
    {
      key: 'amount',
      label: 'Nominal',
      render: (_: unknown, row: RecentTransactionRow) => (
        <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
          {formatCurrency(row.amount)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: unknown, row: RecentTransactionRow) => (
        <Badge 
          variant={toBadgeVariant(row.status)}
          className="text-[10px] font-bold uppercase px-2 py-0.5"
        >
          {row.status}
        </Badge>
      )
    },
    {
      key: 'paid_at',
      label: 'Waktu Pembayaran',
      render: (_: unknown, row: RecentTransactionRow) => {
        if (!row.paid_at) return '-';
        return (
          <span className="text-xs text-slate-500">
            {formatDate(row.paid_at, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      }
    }
  ], []);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return (data ?? []).slice(start, start + itemsPerPage);
  }, [data, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil((data ?? []).length / itemsPerPage));

  return (
    <Card className="border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
          Transaksi Penagihan Terbaru
        </h3>
        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
          Aktivitas penerimaan invoice dan status pembayaran tenant sekolah
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
        <Table
          columns={columns}
          data={paginatedData}
          emptyMessage="Tidak ada transaksi terbaru yang tercatat."
          pagination={{
            currentPage,
            totalPages,
            totalItems: data.length,
            itemsPerPage,
            onPageChange: setCurrentPage,
            onLimitChange: (limit) => {
              setItemsPerPage(limit);
              setCurrentPage(1);
            }
          }}
        />
      </div>
    </Card>
  );
});

export default RecentTransactionsTable;
