import React from 'react';
import { CreditCard, History, Calendar } from 'lucide-react';
import { SectionCard, Badge, Card, CardContent } from '@/components/ui';
import { formatDateTime, formatDateShort, formatCurrency } from '@/utils/layoutUtils';

import type { BillingData } from '@/api/tenant-detail.api';

interface TenantBillingTabProps {
  billingData: BillingData | null;
  billingLoading: boolean;
}

export const TenantBillingTab: React.FC<TenantBillingTabProps> = ({
  billingData,
  billingLoading
}) => {
  if (billingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Memuat data billing...</span>
      </div>
    );
  }

  if (!billingData) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Data Billing Tidak Tersedia</p>
            <p className="text-sm">Gagal memuat data billing untuk tenant ini</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Subscription */}
      <SectionCard title="Langganan Aktif" icon={CreditCard} fullWidth>
        {billingData.activeSubscription ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Paket</h4>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {billingData.activeSubscription.plan_name || billingData.activeSubscription.plan?.name || '-'}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 dark:text-green-100">Status</h4>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {billingData.activeSubscription.status || '-'}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 dark:text-purple-100">Harga</h4>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                Rp {billingData.activeSubscription.plan?.price_monthly?.toLocaleString('id-ID') || '0'}
              </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-orange-900 dark:text-orange-100">Berakhir</h4>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {billingData.activeSubscription.end_date ? formatDateTime(billingData.activeSubscription.end_date) : '-'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 w-full">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Tidak ada langganan aktif</p>
          </div>
        )}
      </SectionCard>

      {/* Payment History */}
      <SectionCard title="Riwayat Pembayaran (20 Terakhir)" icon={History} fullWidth noPadding>
        <div className="p-4 w-full">
          {billingData.paymentHistory && billingData.paymentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Tanggal</th>
                    <th className="text-left py-2">Jumlah</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Metode</th>
                    <th className="text-left py-2">Referensi</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.paymentHistory
                    .slice()
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((payment: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-2">{payment.created_at ? formatDateTime(payment.created_at) : '-'}</td>
                      <td className="py-2 font-medium">
                        Rp {(payment.amount ?? 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2">
                        <Badge 
                          variant={
                            payment.status === 'SUCCESS' ? 'success' : 
                            payment.status === 'PENDING' ? 'warning' : 'destructive'
                          }
                        >
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-2">{payment.payment_method || '-'}</td>
                      <td className="py-2 text-xs text-gray-500">{payment.external_id || payment.gateway_transaction_id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Belum ada riwayat pembayaran</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Subscription History */}
      <SectionCard title="Riwayat Langganan" icon={Calendar} fullWidth>
        <div className="w-full space-y-4">
          {billingData.subscriptionHistory && billingData.subscriptionHistory.length > 0 ? (
            <div className="space-y-4 w-full">
              {billingData.subscriptionHistory
                .slice()
                .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                .map((subscription: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 w-full">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{subscription.plan_name}</h4>
                      <p className="text-sm text-gray-500 font-sans">
                        {subscription.start_date ? formatDateTime(subscription.start_date) : '-'} - {subscription.end_date ? formatDateTime(subscription.end_date) : '-'}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        subscription.status === 'ACTIVE' ? 'success' : 
                        subscription.status === 'EXPIRED' ? 'destructive' : 'secondary'
                      }
                    >
                      {subscription.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Harga: Rp {(subscription.plan?.price_monthly ?? 0).toLocaleString('id-ID')}/bulan</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 w-full">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Belum ada riwayat langganan</p>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
};
