import React from 'react';
import { Eye, Activity, FileText, AlertTriangle } from 'lucide-react';
import { Button, StatusBadge } from '../ui';
import type { PaymentRecord } from '../../types/payments';
import { formatCurrency, formatDate } from '../../utils/layoutUtils';

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
      <span className="font-medium text-slate-900 dark:text-slate-100 font-mono text-xs">
        {payment.invoice_number || 'N/A'}
      </span>
    )
  },
  {
    key: 'tenant_name',
    label: 'Tenant (Sekolah)',
    render: (_value: unknown, payment: ExtendedPaymentRecord) => (
      <span className="text-slate-900 dark:text-slate-100 text-xs">
        {payment.tenant_name || 'N/A'}
      </span>
    )
  },
  {
    key: 'status',
    label: 'Status',
    render: (_value: unknown, row: ExtendedPaymentRecord) => {
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
    key: 'gross_amount',
    label: 'Jumlah',
    render: (_value: unknown, payment: ExtendedPaymentRecord) => (
      <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
        {formatCurrency(payment.gross_amount)}
      </span>
    )
  },
  {
    key: 'payment_type',
    label: 'Metode',
    render: (_value: unknown, payment: ExtendedPaymentRecord) => (
      <span className="text-xs uppercase text-slate-600 dark:text-slate-400 font-mono">
        {payment.payment_type || 'N/A'}
      </span>
    )
  },
  {
    key: 'payment_date',
    label: 'Tanggal Bayar',
    render: (_value: unknown, payment: ExtendedPaymentRecord) => (
      <span className="text-xs text-slate-600 dark:text-slate-400">
        {payment.payment_date ? formatDate(new Date(payment.payment_date)) : '-'}
      </span>
    )
  },
  {
    key: 'actions',
    label: 'Aksi',
    render: (_value: unknown, payment: ExtendedPaymentRecord) => (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          aria-label="Lihat detail pembayaran"
          variant="toolbarOutline"
          size="toolbar"
          onClick={() => callbacks.onViewDetails(payment)}
          className="rounded-xl"
        >
          <Eye className="w-3.5 h-3.5 mr-1" /> Detail
        </Button>
        {payment.billing_id && callbacks.canManagePayments && (
          <Button
            type="button"
            aria-label="Lihat log audit"
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => callbacks.onViewLogs(payment.billing_id!)}
            className="rounded-xl"
          >
            <Activity className="w-3.5 h-3.5 mr-1" /> Log
          </Button>
        )}
      </div>
    )
  }
];
