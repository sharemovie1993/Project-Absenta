import React, { createContext, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Zap, RefreshCw, CalendarX2, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { toast } from 'react-hot-toast';

export const PremiumFeatureGateContext = createContext<boolean>(false);

interface PremiumFeatureGateProps {
  children?: React.ReactNode;
  isLocked?: boolean;
  featureName?: string;
  moduleName?: string;
  feature?: string;
  description?: string;
}

export default function PremiumFeatureGate({
  children,
  isLocked: propIsLocked,
  featureName,
  moduleName,
  feature,
  description = 'Upgrade paket Anda untuk mulai menggunakan fitur ini secara penuh.',
}: PremiumFeatureGateProps) {
  const navigate = useNavigate();
  const { user, subscription, refreshSubscription } = useAuthStore();
  const { isAdmin } = useCapabilities();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const hasParentGate = useContext(PremiumFeatureGateContext);

  const targetModule = String(moduleName || feature || '').toUpperCase();
  const displayModuleName = moduleName || feature || 'PREMIUM';
  const displayFeatureName = featureName || moduleName || feature || 'Fitur';

  const features =
    user?.features ||
    (subscription as any)?.features ||
    subscription?.Plan?.features_json ||
    subscription?.plan?.features_json ||
    [];

  const subStatus: string = (
    (subscription as any)?.status ??
    user?.subscription_status ??
    ''
  ).toUpperCase();
  const expiredStatuses = ['EXPIRED', 'CANCELLED', 'CANCELED', 'SUSPENDED', 'INACTIVE'];
  const isStatusExpired = expiredStatuses.includes(subStatus);
  const isPastEndDate = Boolean(
    (subscription as any)?.end_date && new Date((subscription as any).end_date) < new Date()
  );

  // Cek child subscriptions yang punya modul ini tapi expired
  const subs: any[] =
    (subscription as any)?.subscriptions ??
    (user as any)?.subscriptions ??
    [];
  const hasExpiredChildSub = Boolean(
    targetModule &&
    subs.some((s: any) => {
      const planFeatures: string[] =
        s?.Plan?.features_json ?? s?.plan?.features_json ?? [];
      const planFeaturesUpper = Array.isArray(planFeatures)
        ? planFeatures.map(f => String(f).toUpperCase())
        : [];
      return (
        planFeaturesUpper.includes(targetModule) &&
        expiredStatuses.includes(String(s?.status ?? '').toUpperCase())
      );
    })
  );

  const isModuleAllowed = targetModule
    ? Array.isArray(features) && features.some(f => String(f).toUpperCase() === targetModule)
    : true;

  // isLocked jika modul tidak ada di paket ATAU status langganan sudah kedaluwarsa/tidak aktif
  const isLocked =
    propIsLocked !== undefined
      ? propIsLocked
      : !isModuleAllowed || isStatusExpired || isPastEndDate || hasExpiredChildSub;

  // Detect EXPIRED (pernah berlangganan tapi habis / status expired) vs TRIAL (belum pernah)
  const isExpired = useMemo(() => {
    if (!isLocked) return false;
    return isStatusExpired || isPastEndDate || hasExpiredChildSub;
  }, [isLocked, isStatusExpired, isPastEndDate, hasExpiredChildSub]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSubscription();
      toast.success('Status langganan diperbarui');
    } catch {
      toast.error('Gagal memperbarui status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpgradeClick = () => {
    const categoryParam = targetModule ? `&cat=${targetModule}` : '';
    navigate(`/service-center?tab=catalog${categoryParam}`);
  };

  // Konten tidak perlu gate
  if (!isLocked) return <>{children}</>;

  // Sudah ada parent gate — render children saja tanpa duplikasi
  if (hasParentGate) {
    return (
      <PremiumFeatureGateContext.Provider value={true}>
        {children}
      </PremiumFeatureGateContext.Provider>
    );
  }

  // ── Banner EXPIRED ─────────────────────────────────────────────────────────
  if (isExpired) {
    return (
      <PremiumFeatureGateContext.Provider value={true}>
        <div className="flex flex-col w-full gap-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/15 shadow-sm"
          >
            {/* Stripe kiri */}
            <div className="absolute inset-y-0 left-0 w-1 bg-rose-500 dark:bg-rose-600 rounded-l-xl" />

            <div className="pl-6 pr-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                  <CalendarX2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded">
                      Langganan Berakhir
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      • {displayModuleName}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                    Modul {displayFeatureName} Tidak Aktif
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAdmin
                      ? 'Masa berlaku modul ini telah habis. Perpanjang langganan untuk memulihkan akses penuh.'
                      : 'Masa berlaku modul ini telah habis. Hubungi admin sekolah Anda untuk memperpanjang.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
                <Button
                  variant="ghost"
                  onClick={handleRefresh}
                  isLoading={isRefreshing}
                  className="flex-1 md:flex-none text-rose-700 dark:text-rose-400 font-bold text-xs hover:bg-rose-100/50 dark:hover:bg-rose-900/20 px-3.5 py-2 h-9 rounded-lg gap-1.5 border border-rose-200/50 dark:border-rose-900/30 bg-white/50 dark:bg-slate-900/50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Cek Status
                </Button>
                {isAdmin && (
                  <Button
                    onClick={handleUpgradeClick}
                    className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4 py-2 h-9 font-bold text-xs shadow-sm shadow-rose-600/10 border-none gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Perpanjang Sekarang
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Konten di-blur — bukan interaktif saat expired */}
          <div className="relative pointer-events-none select-none">
            <div className="absolute inset-0 z-10 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px]" />
            <div className="opacity-40">{children}</div>
          </div>
        </div>
      </PremiumFeatureGateContext.Provider>
    );
  }

  // ── Banner TRIAL (belum pernah berlangganan) ───────────────────────────────
  return (
    <PremiumFeatureGateContext.Provider value={true}>
      <div className="flex flex-col w-full gap-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl border border-amber-200/60 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm"
        >
          <div className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                    Preview Mode
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    • {displayModuleName}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                  Uji Coba: Fitur {displayFeatureName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isAdmin
                    ? 'Penyimpanan dibatasi maks. 10 data. Upgrade modul untuk akses tanpa batas.'
                    : 'Penyimpanan dibatasi maks. 10 data. Hubungi admin sekolah Anda untuk akses penuh.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
              <Button
                variant="ghost"
                onClick={handleRefresh}
                isLoading={isRefreshing}
                className="flex-1 md:flex-none text-amber-700 dark:text-amber-500 font-bold text-xs hover:bg-amber-100/50 dark:hover:bg-amber-900/20 px-3.5 py-2 h-9 rounded-lg gap-1.5 border border-amber-200/40 dark:border-amber-900/20 bg-white/50 dark:bg-slate-900/50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Cek Status
              </Button>
              <Button
                onClick={handleUpgradeClick}
                className="flex-1 md:flex-none bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-2 h-9 font-bold text-xs shadow-sm shadow-amber-600/10 border-none gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Upgrade Modul
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Konten tetap interaktif di mode Trial */}
        <div className="relative">{children}</div>
      </div>
    </PremiumFeatureGateContext.Provider>
  );
}
