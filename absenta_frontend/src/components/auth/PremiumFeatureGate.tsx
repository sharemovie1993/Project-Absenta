import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Sparkles, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { Button } from '../ui';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';

interface PremiumFeatureGateProps {
  children: React.ReactNode;
  isLocked?: boolean; // Now optional, will be calculated internally if not provided
  featureName: string;
  moduleName: string; // Now required for internal logic
  description?: string;
}

export default function PremiumFeatureGate({ 
  children, 
  isLocked: propIsLocked, 
  featureName, 
  moduleName,
  description = "Upgrade paket Anda untuk mulai menggunakan fitur ini secara penuh."
}: PremiumFeatureGateProps) {
  const navigate = useNavigate();
  const { user, subscription, refreshSubscription } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Centralized feature check logic
  // Priority 1: user.features (aggregated from all active subscriptions)
  // Priority 2: subscription features (direct check)
  const features = user?.features || (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  
  const isLocked = propIsLocked !== undefined 
    ? propIsLocked 
    : (!Array.isArray(features) || !features.includes(moduleName.toUpperCase()));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSubscription();
      toast.success('Status langganan diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpgradeClick = () => {
    const categoryParam = moduleName ? `&cat=${moduleName.toUpperCase()}` : '';
    navigate(`/service-center?tab=catalog${categoryParam}`);
  };

  if (!isLocked) return <>{children}</>;

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Premium Service Banner (Non-Intrusive) */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-50 via-white to-amber-50 dark:from-amber-950/20 dark:via-slate-900 dark:to-amber-950/20 shadow-sm"
      >
        {/* Decorative background sparkles */}
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-24 h-24 text-amber-500" />
        </div>

        <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 shadow-inner">
              <Lock className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                  Layanan {moduleName}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  • Preview Mode
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                Fitur {featureName} Belum Aktif
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {user?.role?.name === 'ADMIN' ? (
                  <>
                    {description} Hubungi Admin atau <span className="font-bold text-amber-600">Upgrade Modul {moduleName}</span> untuk akses penuh.
                  </>
                ) : (
                  <>
                    {description} Silakan hubungi Administrator Sekolah Anda untuk mengaktifkan modul {moduleName}.
                  </>
                )}
              </p>
            </div>
          </div>

          {user?.role?.name === 'ADMIN' && (
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button 
                variant="ghost"
                onClick={handleRefresh}
                isLoading={isRefreshing}
                className="flex-1 md:flex-none text-amber-600 font-bold text-xs hover:bg-amber-50 dark:hover:bg-amber-900/20 gap-2"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                Cek Status
              </Button>
              <Button 
                variant="ghost"
                onClick={handleUpgradeClick}
                className="flex-1 md:flex-none text-slate-500 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Lihat Detail
              </Button>
              <Button 
                onClick={handleUpgradeClick}
                className="flex-1 md:flex-none bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-6 font-bold shadow-lg shadow-amber-600/20 border-none h-11"
              >
                <Zap className="w-4 h-4 mr-2 fill-current" />
                Upgrade Sekarang <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Page Content (Fully Visible) */}
      <div className="relative">
        {children}
        
        {/* Subtle non-intrusive interaction blocker (Optional) */}
        <div className="absolute inset-0 z-0 bg-transparent" />
      </div>
    </div>
  );
}
