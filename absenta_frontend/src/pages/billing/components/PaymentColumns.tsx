import React from 'react';
import { Eye, Activity, FileText, AlertTriangle } from 'lucide-react';
import { Button, StatusBadge } from '../../../components/ui';
import type { PaymentRecord } from '../../../types/payments';
import { formatCurrency, formatDate } from '../../../utils/layoutUtils';

export interface ExtendedPaymentRecord extends PaymentRecord {
  tenant_name?: string;
  _hasMetadata?: boolean;
}

interface ColumnCallbacks {
  onViewDetails: (payment: ExtendedPaymentRecord) => void;
  onViewLogs: (billingId: string) => void;
  canManagePayments: boolean;
}

export const getPaymentColumns = (callbacks: ColumnCallbacks) => [
  {
    key: 'invoice_number',
    label: 'Invoice Number',
    render: (_value: unknown, payment: ExtendedPaymentRecord) => (
      <span className="font-medium text-gray-900 dark:text-gray-100 font-mono">
        {payment.invoice_number || 'N/A'}
      </span>
    )
  },
  {
    key: 'tenant_name',
    label: 'Tenant (Sekolah)',
    render: (_value: unknown, payment: ExtendedPaymentRecord) => (
      <span className="text-gray-900 dark:text-gray-100">
        {payment.tenant_name || 'N/A'}
      </span>
    )
  },
  {
    key: 'status',
    label: 'Status',
    render: (_value: unknown, row: any) => {
      const s = String(row?.status || '').toUpperCase();
      let badge: 'completed' | 'pending' | 'cancelled' = 'pending';
      let label = 'Menunggu';
      
      if (s === 'PAID' || s === 'SUCCESS' || s === 'COMPLETED' || s === 'SETTLEMENT') {
        badge = 'completed';
        label = 'Sukses';
      } else if (s === 'FAILED' || s === 'CANCELLED' || s === 'EXPIRED') {
        badge = 'cancelled';
        label = s === 'FAILED' ? 'Gagal' : s === 'EXPIRED' ? 'Kedaluwarsa' : 'Batal';
      }
      
      return (
        <div className="flex flex-col gap-1">
          <StatusBadge status={badge}>{label}</StatusBadge>
          {s === 'PROCESSING' && <span className="text-[10px] text-blue-500 animate-pulse font-bold uppercase ml-1">Diproses</span>}
        </div>
      );
    }
  },
  {
    key: 'invoice_status',
    label: 'Status Invoice',
    render: (_value: unknown, row: any) => {
      const s = String(row?.invoice_status || '').toUpperCase();
      const label =
        s === 'PAID' ? 'Lunas' :
        s === 'OVERDUE' ? 'Terlambat' :
        s === 'CANCELLED' ? 'Dibatalkan' :
        s === 'SENT' ? 'Terkirim' :
        s === 'VIEWED' ? 'Dilihat' : 'Draft';
      return <span className={`text-xs px-2 py-1 rounded-full ${
        s === 'PAID' ? 'bg-green-100 text-green-800' : 
        s === 'OVERDUE' ? 'bg-red-100 text-red-800' : 
        'bg-gray-100 text-gray-800'
      }`}>{label}</span>;
    }
  },
  {
    key: 'payment_method',
    label: 'Metode Bayar',
    render: (_value: unknown, row: any) => (
      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm uppercase font-mono">
        {row?.payment_method || '-'}
      </span>
    )
  },
  {
    key: 'amount',
    label: 'Total Tagihan',
    render: (_value: unknown, payment: PaymentRecord) => (
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {formatCurrency(payment.amount || 0)}
      </span>
    )
  },
  {
    key: 'paid_at',
    label: 'Tanggal Dibayar',
    render: (_value: unknown, payment: PaymentRecord) => (
      <span className="text-gray-900 dark:text-gray-100">
        {formatDate(payment.paid_at || '')}
      </span>
    )
  },
  {
    key: 'gateway',
    label: 'Gateway',
    render: (_value: unknown, row: any) => (
      <span className="text-gray-900 dark:text-gray-100 uppercase font-mono text-xs">
        {row?.gateway || '-'}
      </span>
    )
  },
  {
    key: 'actions',
    label: 'Aksi',
    render: (_value: unknown, payment: ExtendedPaymentRecord) => (
      <div className="flex gap-2">
        {!payment._hasMetadata && (
          <span className="text-yellow-600 self-center" title="Metadata invoice tidak tersedia">
            <AlertTriangle className="w-3.5 h-3.5" />
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => callbacks.onViewDetails(payment)}
          title="Lihat Detail"
          className="gap-1"
        >
          <Eye className="w-3 h-3" />
        </Button>
        {callbacks.canManagePayments && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const bid = payment.billing_id || '';
              callbacks.onViewLogs(bid);
            }}
            title="Audit Log"
            className="gap-1"
          >
            <Activity className="w-3 h-3" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const invNum = payment.invoice_number;
            window.location.href = `/invoice/list?search=${encodeURIComponent(invNum || '')}`;
          }}
          title="Cari Invoice"
          className="gap-1"
        >
          <FileText className="w-3 h-3" />
        </Button>
      </div>
    )
  }
];
