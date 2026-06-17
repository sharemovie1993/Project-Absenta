import React from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedBillingLayout from '../../components/billing/UnifiedBillingLayout';
import { Button, Loader, EnhancedAlert } from '../../components/ui';
import { Badge } from '../../components/ui/Badge';
import { Switch } from '../../components/ui/Switch';
import type { FilteredSubscriptionItem } from '../../api/subscription.api';
import type { SubscriptionUIState } from '../../utils/subscriptionMapper';

type SubscriptionRow = FilteredSubscriptionItem & {
  has_payment_success?: boolean;
  uiState: SubscriptionUIState;
};

interface SubscriptionTenantViewProps {
  pageTitle: string;
  pageSubtitle: string;
  loading: boolean;
  error: string | null;
  success: string | null;
  onDismissError: () => void;
  onDismissSuccess: () => void;
  activeSubscription: SubscriptionRow | null;
  onToggleAutoRenew: (next: boolean) => Promise<void>;
}

export const SubscriptionTenantView: React.FC<SubscriptionTenantViewProps> = ({
  pageTitle,
  pageSubtitle,
  loading,
  error,
  success,
  onDismissError,
  onDismissSuccess,
  activeSubscription: active,
  onToggleAutoRenew,
}) => {
  const navigate = useNavigate();

  return (
    <UnifiedBillingLayout pageKey="subscriptions" title={pageTitle} subtitle={pageSubtitle} showOverview={false}>
      {loading && <Loader text="Memuat data langganan..." />}
      {error && (
        <EnhancedAlert
          variant="destructive"
          title="Terjadi kesalahan"
          description={error}
          dismissible
          onDismiss={onDismissError}
        />
      )}
      {success && (
        <EnhancedAlert
          variant="success"
          title="Berhasil"
          description={success}
          dismissible
          onDismiss={onDismissSuccess}
        />
      )}

      {!active ? (
        <div className="p-6 border rounded-md bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Tidak ada langganan aktif</h3>
          <p className="text-gray-600 mb-3">
            Jika Anda ADMIN, minta SUPERADMIN mengaktifkan langganan atau pilih paket yang tersedia.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/billing/plans')} variant="outline">Lihat Paket</Button>
            <Button onClick={() => navigate('/billing/billings')} variant="primary">Kelola Pembayaran</Button>
          </div>
        </div>
      ) : (
        <div className="p-6 border rounded-md bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Langganan Saat Ini</h3>
              <p className="text-sm text-gray-600">Paket: {active.uiState?.displayPlanName || '-'}</p>
            </div>
            <Badge
              variant={
                active.uiState?.displayStatusBadge?.includes('green') ? 'success'
                  : active.uiState?.displayStatusBadge?.includes('red') ? 'destructive'
                    : active.uiState?.displayStatusBadge?.includes('yellow') ? 'warning'
                      : 'default'
              }
              className={active.uiState?.displayStatusBadge}
            >
              {active.uiState?.displayStatus}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Berakhir pada</p>
              <p className="font-medium">{active.uiState?.displayEndDate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Tagihan berikutnya</p>
              <p className="font-medium">{active.uiState?.displayNextBilling}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Auto Renew</p>
              <div className="flex items-center gap-2">
                <Switch
                  id="tenant-auto-renew"
                  checked={!!active.uiState?.isAutoRenewOn}
                  disabled={!active.uiState?.canAutoRenew}
                  onCheckedChange={(val: boolean) => onToggleAutoRenew(val)}
                  aria-label="Toggle auto renew langganan aktif"
                />
                <label htmlFor="tenant-auto-renew" className="text-sm text-gray-600">
                  {active.uiState?.autoRenewLabel}
                </label>
              </div>
            </div>
          </div>

          {active.uiState?.effectiveStatus === 'TRIAL' && (
            <div className="mt-4 p-3 rounded-md border border-blue-200 bg-blue-50 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Masa Percobaan</div>
                  <div>Sisa {active.uiState?.displayDaysLeft} hari</div>
                </div>
                <Button onClick={() => navigate('/billing/billings')} variant="primary">
                  Aktifkan Paket Sekarang
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate('/billing/billings')} variant="primary">
              Kelola Pembayaran
            </Button>
          </div>
        </div>
      )}
    </UnifiedBillingLayout>
  );
};
