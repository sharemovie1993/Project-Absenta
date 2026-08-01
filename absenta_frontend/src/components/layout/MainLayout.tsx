import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig, applyBrandingFromConfig } from '@/services/systemConfig';
import { Topbar } from './Topbar';
// Sidebar is lazy loaded below
import { useAuthStore } from '@/store/authStore';
import SubscriptionStateBanner from '@/components/common/SubscriptionStateBanner';
import { useSmartMenu } from '@/hooks/useSmartMenu';
import { iconForName } from '@/lib/iconForName';
import { ChevronRight, HelpCircle } from 'lucide-react';
// InstructionPanel is lazy loaded below
import { InstructionProvider, useInstruction } from '@/contexts/InstructionContext';
import { BottomNavigation } from './BottomNavigation';
import { useTvStore } from '@/store/tvStore';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui';
import { useIsMobile } from '@/hooks/useIsMobile';
import { PendingPaymentBlocker } from '../billing/PendingPaymentBlocker';

// Lazy load heavy layout components to improve TBT
const Sidebar = React.lazy(() => import('./Sidebar').then(module => ({ default: module.Sidebar })));
const CommandPalette = React.lazy(() => import('./CommandPalette').then(module => ({ default: module.CommandPalette })));
const InstructionPanel = React.lazy(() => import('@/components/dashboard/shared/InstructionPanel').then(module => ({ default: module.InstructionPanel })));

import FloatingMessenger from '@/components/support/FloatingMessenger';

export default function MainLayout() {
  return (
    <InstructionProvider>
      <MainLayoutContent />
    </InstructionProvider>
  );
}

function MainLayoutContent() {
  const { status, user, subscription } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { menu: groupedMenu } = useSmartMenu();
  const { instructionData } = useInstruction();
  const [showInstruction, setShowInstruction] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isTvMode } = useTvStore();
  const isMobile = useIsMobile(1024);
  const isSmallDesktop = useIsMobile(1367); // 1366 and below

  const [dashboardMode, setDashboardModeState] = useState<'portal' | 'desktop'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('absenta_dashboard_mode') as 'portal' | 'desktop') || 'portal';
    }
    return 'portal';
  });

  useEffect(() => {
    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setDashboardModeState(customEvent.detail);
      }
    };
    window.addEventListener('absenta-dashboard-mode-change', handleModeChange);
    return () => window.removeEventListener('absenta-dashboard-mode-change', handleModeChange);
  }, []);

  const isPortalMode = dashboardMode === 'portal';
  const isHideSidebarForPortal = isPortalMode;

  const configQuery = useQuery({
    queryKey: ['system-config','active'],
    queryFn: fetchActiveSystemConfig,
  });
  const systemConfig = configQuery.data || null;

  useEffect(() => {
    if (systemConfig) {
      applyBrandingFromConfig(systemConfig);
    }
  }, [systemConfig]);

  // Sync instruction drawer visibility with context data & screen size
  useEffect(() => {
    // Selalu default tertutup saat data instruksi berubah atau ketika dimuat
    setShowInstruction(false);
  }, [instructionData]);

  // Body Scroll Lock for Mobile Menu
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-[#020617]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent shadow-lg shadow-blue-500/20" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Inisialisasi Absenta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-all duration-500 selection:bg-blue-100 selection:text-blue-700">
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
      
      <div className="flex flex-col min-h-screen">
        {/* Topbar fixed at top */}
        {!isTvMode && (
          <Topbar 
            onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            isSidebarOpen={isMobileMenuOpen} 
          />
        )}

        {/* Mobile Sidebar Drawer Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && !isTvMode && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
              />
              {/* Drawer */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-[280px] sm:w-[320px] bg-white dark:bg-slate-900 z-[70] lg:hidden shadow-2xl flex flex-col"
              >
                <div className="flex-1 overflow-y-auto overscroll-contain pb-24">
                  <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader /></div>}>
                    <Sidebar 
                      isOpen={true} 
                      onClose={() => setIsMobileMenuOpen(false)} 
                      onToggle={() => {}} 
                      isInline={true}
                    />
                  </Suspense>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
        
        {/* Main Content Area - Below Topbar */}
        <div className={cn(
          "flex-1 w-full pb-20 lg:pb-12 px-4 relative transition-all duration-300",
          isTvMode ? "pt-4" : "pt-[72px]"
        )}>
          <div className={cn(
            "w-full gap-4 items-start transition-all duration-500",
            isTvMode || isHideSidebarForPortal
              ? "grid grid-cols-1"
              : `grid grid-cols-1 lg:grid-cols-[320px_1fr] ${showInstruction ? 'xl:grid-cols-[320px_1fr_300px]' : 'xl:grid-cols-[320px_1fr_0px]'}`
          )}>
            
            {/* Sidebar Kiri (Grid-Integrated) - Sembunyikan Saat Portal Launcher Mode */}
            {!isMobile && !isTvMode && !isHideSidebarForPortal && (
              <aside className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-20">
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.08)] bg-white dark:bg-slate-900 mb-8 flex flex-col min-h-[calc(100vh-160px)]">
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader /></div>}>
                      <Sidebar 
                        isOpen={true} 
                        onClose={() => {}} 
                        onToggle={() => {}} 
                        isInline={true}
                      />
                    </Suspense>
                  </div>
                </div>
              </aside>
            )}

            {/* Area Konten Utama */}
            <main className="min-w-0 relative">
              <PendingPaymentBlocker />
              
              {/* Global Subscription Banner */}
              <div className="empty:hidden mb-2">
                <SubscriptionStateBanner />
              </div>

                <div key={location.pathname}>
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader /></div>}>
                    <Outlet />
                  </Suspense>
                </div>

              {/* Floating Toggle Button for Instruction Panel (When Closed) */}
              {instructionData && !showInstruction && (
                <button
                  onClick={() => setShowInstruction(true)}
                  className="fixed right-0 top-32 z-40 bg-white dark:bg-slate-900 border-y border-l border-slate-200 dark:border-slate-800 p-2.5 rounded-l-xl shadow-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group animate-in slide-in-from-right-full duration-500"
                  title="Buka Panduan Modul"
                >
                  <HelpCircle className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Buka Panduan
                  </div>
                </button>
              )}
            </main>

            {/* Area Petunjuk Kanan (Standard MyASN - 300px) */}
            <AnimatePresence>
              {showInstruction && (
                <motion.aside 
                  initial={{ opacity: 0, x: 20, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 300 }}
                  exit={{ opacity: 0, x: 20, width: 0 }}
                  className="hidden xl:block overflow-hidden flex-shrink-0 relative"
                >
                  <div className="sticky top-20 w-[300px]">
                    <div className="flex justify-end mb-2">
                      <button 
                        onClick={() => setShowInstruction(false)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title="Tutup Panduan"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <Suspense fallback={<div className="p-4"><Loader /></div>}>
                      <InstructionPanel 
                        title={instructionData?.title}
                        description={instructionData?.description}
                        items={instructionData?.items}
                        tips={instructionData?.tips}
                      />
                    </Suspense>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

          </div>
        </div>

        <footer className="px-4 md:px-10 py-6 border-t border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-[#020617]/50 backdrop-blur-sm min-h-[64px]">
          <div className="w-full">
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">
                {!systemConfig ? (
                  <div className="h-2 w-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
                ) : (
                  systemConfig?.app_name ? (
                    systemConfig?.footer_text ? `${systemConfig.app_name} — ${systemConfig.footer_text}` : systemConfig.app_name
                  ) : (
                    systemConfig?.footer_text || 'Absenta.id'
                  )
                )}
              </div>
          </div>
        </footer>
      </div>

      {/* Navigasi Bawah untuk Mobile ALA MyASN */}
      <BottomNavigation onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      {/* Floating Support Messenger Widget */}
      <FloatingMessenger />
    </div>
  );
}
