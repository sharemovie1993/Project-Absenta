import React, { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Sparkles, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';

export const PremiumFeatureGateContext = createContext<boolean>(false);

interface PremiumFeatureGateProps {
  children: React.ReactNode;
  isLocked?: boolean; // Now optional, will be calculated internally if not provided
  featureName: string;
  moduleName: string; // Now required for internal logic
  description?: string;
}

console.log('--- PremiumFeatureGate imports ---', { Button });

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
  const hasParentGate = useContext(PremiumFeatureGateContext);

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

  if (hasParentGate) {
    return (
      <PremiumFeatureGateContext.Provider value={true}>
        {children}
      </PremiumFeatureGateContext.Provider>
    );
  }

  return (
    <PremiumFeatureGateContext.Provider value={true}>
      <div className="flex flex-col w-full gap-6">
        {/* Premium Service Banner (Clean, Modern, Low-Noise) */}
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
                    • {moduleName}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                  Uji Coba: Fitur {featureName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isAdmin ? (
                    <>
                      Penyimpanan dibatasi maks. 10 data. Upgrade modul untuk akses tanpa batas.
                    </>
                  ) : (
                    <>
                      Penyimpanan dibatasi maks. 10 data. Hubungi admin sekolah Anda untuk akses penuh.
                    </>
                  )}
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
          </div>
        </motion.div>
   
        {/* Page Content (Fully Visible & Interactive in Trial Mode) */}
        <div className="relative">
          {children}
        </div>
      </div>
    </PremiumFeatureGateContext.Provider>
  );
}

