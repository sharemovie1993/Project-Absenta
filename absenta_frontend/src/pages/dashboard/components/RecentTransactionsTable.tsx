import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface RecentTransactionRow {
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

const RecentTransactionsTable = ({ data }: RecentTransactionsTableProps) => {
  const toBadgeVariant = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'PAID' || s === 'SUCCESS') return 'success';
    if (s === 'OVERDUE' || s === 'FAILED' || s === 'CANCELLED' || s === 'CANCELED') return 'error';
    return 'warning';
  };

  const columns = [
    {
      key: 'billing_id',
      label: 'Billing ID',
      render: (_: any, row: RecentTransactionRow) => row.billing_id
    },
    {
      key: 'tenant_name',
      label: 'Tenant',
      render: (_: any, row: RecentTransactionRow) => row.tenant_name || '-'
    },
    {
      key: 'plan_name',
      label: 'Plan',
      render: (_: any, row: RecentTransactionRow) => row.plan_name || '-'
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (_: any, row: RecentTransactionRow) => `Rp ${row.amount.toLocaleString('id-ID')}`
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, row: RecentTransactionRow) => (
        <Badge 
          variant={toBadgeVariant(row.status)}
        >
          {row.status}
        </Badge>
      )
    },
    {
      key: 'paid_at',
      label: 'Paid At',
      render: (_: any, row: RecentTransactionRow) => {
        if (!row.paid_at) return '-';
        const d = new Date(row.paid_at);
        if (Number.isNaN(d.getTime())) return '-';
        return d.toLocaleString('id-ID', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
  ];

  return (
    <Card>
      <div className="p-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Transaksi Terbaru</h3>
        {data.length > 0 ? (
          <Table columns={columns} data={data} divider={false} />
        ) : (
          <div className="text-center py-4 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
            Tidak ada transaksi terbaru
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecentTransactionsTable;
