export type SubscriptionStatusKey =
  | 'ACTIVE'
  | 'TRIAL'
  | 'UPGRADE_PENDING'
  | 'PENDING_PAYMENT'
  | 'EXPIRED'
  | 'SUSPENDED';

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatusKey, string> = {
  ACTIVE: 'Aktif',
  TRIAL: 'Masa Percobaan',
  UPGRADE_PENDING: 'Upgrade Menunggu Pembayaran',
  PENDING_PAYMENT: 'Menunggu Pembayaran',
  EXPIRED: 'Langganan Berakhir',
  SUSPENDED: 'Layanan Ditangguhkan',
};

export const getSubscriptionStatusLabel = (status?: string | null): string => {
  if (!status) return '-';
  const key = status.toUpperCase() as SubscriptionStatusKey;
  return SUBSCRIPTION_STATUS_LABELS[key] || status;
};

