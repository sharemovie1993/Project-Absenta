import React, { useEffect, useState } from 'react';
import { ErrorAlert, WarningAlert } from '@/components/ui/Alert';
import { useAuthStore } from '@/store/authStore';
import { isSystemSuperAdmin, isPlatformUser } from '@/utils/rbac';
import { Button } from '@/components/ui';
import { Loader } from '@/components/ui/Loader';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDateShort } from '@/utils/layoutUtils';
import { getMySubscription, getPublicInvoiceLink } from '@/api/mySubscription.api';
import { getSubscriptionStatusLabel } from '@/utils/subscriptionStatusDictionary';
import { openInvoicePublic } from '@/utils/invoiceLink';
import { getSidebarMenu, MENU_QUERY_KEY } from '@/api/menu.api';
import { useQuery } from '@tanstack/react-query';
import { Lock, Rocket } from 'lucide-react';

function getDaysLeftFromDate(end: Date | null): number | null {
  if (!end || isNaN(end.getTime())) return null;
  const today = new Date();
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function computeTrialEnd(subscription: any): Date | null {
  // STRICT RULE: Only use subscription.end_date as Source of Truth
  // Do NOT use Plan.trial_days or other assumptions
  const endDateStr: string | undefined = subscription?.end_date;
  
  if (endDateStr) {
    const end = new Date(endDateStr);
    return isNaN(end.getTime()) ? null : end;
  }
  return null;
}

export default function SubscriptionStateBanner() {
  const { user, subscription, isLoading, token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mySubscription, setMySubscription] = useState<any | null>(null);
  const [loadingMySubscription, setLoadingMySubscription] = useState(false);
  const [redirectingInvoiceId, setRedirectingInvoiceId] = useState<string | null>(null);

  const [lockedFeature, setLockedFeature] = useState<string | null>(null);

  const actualRoleName = user?.role?.name || (user as any)?.roleName || '';
  const isPlatform = user?.tenant_id === 'system' || isPlatformUser(actualRoleName, user?.tenant_id);

  const { data: menuData } = useQuery({
    queryKey: MENU_QUERY_KEY,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => (await getSidebarMenu()).sidebar,
  });

  useEffect(() => {
    if (!menuData) return;
    
    const findLocked = (items: any[]): any => {
      for (const item of items) {
        if (item.path === location.pathname && item.locked) return item;
        if (item.children) {
          const found = findLocked(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const lockedItem = findLocked(menuData);
    setLockedFeature(lockedItem ? lockedItem.name : null);
  }, [location.pathname, menuData]);

  useEffect(() => {
    if (isPlatform) return;
    let active = true;
    const load = async () => {
      try {
        setLoadingMySubscription(true);
        const res = await getMySubscription();
        if (!active) return;
        if (res.success && res.data) {
          setMySubscription(res.data);
        } else {
          setMySubscription(null);
        }
      } catch {
        if (!active) return;
        setMySubscription(null);
      } finally {
        if (active) {
          setLoadingMySubscription(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const effectiveSubscription = mySubscription || subscription;

  if (isLoading) {
    return <Loader size="sm" />;
  }

  // Jangan tampilkan untuk SUPERADMIN sistem atau user platform
  if (isPlatform || isSystemSuperAdmin(user?.role?.name, user?.tenant_id)) return null;

  if (!effectiveSubscription || loadingMySubscription) return null;

  const status = effectiveSubscription.status;

  const handleUpgradePaymentRedirect = async (mode: 'pay' | 'view') => {
    const upgradeInvoiceId =
      (effectiveSubscription as any).upgrade_invoice_id || null;
    if (!upgradeInvoiceId) {
      navigate('/billing?tab=invoice');
      return;
    }
    try {
      setRedirectingInvoiceId(upgradeInvoiceId);
      const res = await getPublicInvoiceLink(upgradeInvoiceId);
      const token = res.success && res.data?.token ? res.data.token : null;
      if (!token) {
        navigate('/billing?tab=invoice');
        return;
      }
      if (mode === 'pay') {
        navigate(`/payment/public/${token}`);
      } else {
        navigate(`/invoice/public/${token}`);
      }
    } finally {
      setRedirectingInvoiceId(null);
    }
  };

  // MAPPING PERILAKU
  switch (status) {
    case 'TRIAL': {
      const trialEnd = computeTrialEnd(subscription);
      const daysLeft = getDaysLeftFromDate(trialEnd);
      
      // Jika sudah lewat masa trial, biarkan handle oleh case EXPIRED atau logic lain jika status berubah
      // Tapi jika status masih TRIAL tapi daysLeft < 0, mungkin backend belum update status.
      // Kita tetap tampilkan info banner tapi mungkin dengan text warning, tapi user minta "TRIAL -> showInfoBanner" dan "Tidak boleh ada throw error".
      
      const endLabel = trialEnd ? formatDateShort(trialEnd) : '-';
      
      return (
        <div className="mb-4 p-4 rounded-md border border-blue-200 bg-blue-50 text-blue-900 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="font-medium flex items-center gap-2">
              <span className="text-xl">🟡</span> Status Layanan: Masa Uji Coba
            </p>
            <p className="text-sm mt-1">
              Anda masih dapat menggunakan seluruh fitur. Tidak ada kewajiban pembayaran saat ini.
              {daysLeft !== null && (
                <span className="ml-1 font-semibold">
                  (Trial aktif hingga {endLabel})
                </span>
              )}
            </p>
          </div>
          <div className="shrink-0">
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate('/service-center?tab=status')}
            >
              Upgrade Sekarang
            </Button>
          </div>
        </div>
      );
    }

    case 'PENDING_PAYMENT':
      return (
        <WarningAlert 
          title={getSubscriptionStatusLabel(status)} 
          description={undefined} 
          dismissible={false}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm">Kami sedang menunggu konfirmasi pembayaran Anda. Layanan akan aktif otomatis setelah pembayaran terverifikasi.</p>
            </div>
            <div className="shrink-0">
              <Button size="sm" variant="warning" onClick={() => navigate('/billing?tab=invoice')}>
                Bayar Tagihan
              </Button>
            </div>
          </div>
        </WarningAlert>
      );

    case 'UPGRADE_PENDING': {
      const targetPlan =
        (effectiveSubscription as any).target_upgrade_plan ||
        (effectiveSubscription as any).Plan ||
        null;
      const targetName = targetPlan?.name || 'Paket baru';

      return (
        <WarningAlert
          title={getSubscriptionStatusLabel(status)}
          description={undefined}
          dismissible={false}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm">
                Upgrade ke {targetName} akan aktif setelah pembayaran dikonfirmasi.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                size="sm"
                variant="warning"
                onClick={() => handleUpgradePaymentRedirect('pay')}
                disabled={!!redirectingInvoiceId}
              >
                Bayar Upgrade
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpgradePaymentRedirect('view')}
                disabled={!!redirectingInvoiceId}
              >
                Lihat Detail Invoice
              </Button>
            </div>
          </div>
        </WarningAlert>
      );
    }

    case 'EXPIRED':
      return (
        <div className="mb-4 p-4 rounded-md border border-red-200 bg-red-50 text-red-900 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
             <p className="font-medium flex items-center gap-2">
              <span className="text-xl">🔴</span> Status Layanan: Masa Aktif Telah Berakhir
            </p>
            <p className="text-sm mt-1">
              Akses fitur premium dihentikan. Silakan lakukan pembayaran untuk mengaktifkan kembali layanan.
            </p>
          </div>
          <div className="shrink-0">
            <Button
              size="sm"
              variant="danger"
              onClick={() => navigate('/billing?tab=invoice')}
            >
              Bayar & Aktifkan
            </Button>
          </div>
        </div>
      );

    case 'SUSPENDED':
    case 'BLOCKED':
      return (
        <ErrorAlert 
          title={getSubscriptionStatusLabel(status)}
          description="Akun Anda telah ditangguhkan. Silakan hubungi support untuk informasi lebih lanjut." 
          dismissible={false}
        />
      );

    case 'ACTIVE':
    default: {
      return null;
    }
  }
}
