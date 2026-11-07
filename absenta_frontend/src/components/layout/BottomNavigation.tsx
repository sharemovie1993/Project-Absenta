import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useBottomNavTabs } from './bottom-nav/useBottomNavTabs';
import { BottomNavTabItem } from './bottom-nav/BottomNavTabItem';
import { BottomNavCrescentSpeedDial } from './bottom-nav/BottomNavCrescentSpeedDial';
import { MobileAccountSheet } from './bottom-nav/MobileAccountSheet';
import { useMobileSubtabSidebarStore } from '@/components/dashboard/roles/common';
import type { 
  MobileBottomSubItem, 
  MobileBottomTabItem, 
  EcosystemType, 
  EcosystemTheme 
} from '@/config/bottomNavEcosystems.config';

export type { MobileBottomSubItem, MobileBottomTabItem, EcosystemType, EcosystemTheme };

export const BottomNavigation: React.FC = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);

  const {
    activeTabsList,
    currentTheme,
    activeEcosystem,
    currentTab,
    currentSubtab,
    isKepsek,
    setPillar,
    shouldHideNav,
  } = useBottomNavTabs();

  const isSidebarOpen = useMobileSubtabSidebarStore((state) => state.isOpen);

  // 1. Tutup menu melayang & subtab sidebar saat rute atau parameter berubah (mencegah sidebar menggantung)
  useEffect(() => {
    setOpenFlyoutId(null);
    useMobileSubtabSidebarStore.getState().close();
  }, [location.pathname, location.search]);

  // Hitung index tombol sentral (elevasi mengambang ala Notch / FAB di tengah)
  const centerIndex = useMemo(() => {
    const explicitMenuIdx = activeTabsList.findIndex(
      (item) => item.id.includes('menu') || item.id === 'base_divisi_more' || item.id === 'lensa_more' || (item.children && item.children.length > 0)
    );
    if (explicitMenuIdx !== -1) return explicitMenuIdx;
    return Math.floor(activeTabsList.length / 2);
  }, [activeTabsList]);

  const handleTabClick = useCallback((item: MobileBottomTabItem) => {
    // 👤 Shopee-Style Tab "Saya" / Akun: Buka Mobile Account Sheet instan
    const isProfileTab = item.id === 'saya' || item.id === 'base_profil' || item.id === 'profil' || item.id === 'admin_profil';
    if (isProfileTab) {
      setOpenFlyoutId(null);
      useMobileSubtabSidebarStore.getState().close();
      setIsAccountSheetOpen(true);
      return;
    }

    if (item.children && item.children.length > 0) {
      // 🚀 Buka Universal Mobile Subtab Sidebar Drawer (Posisi jangkauan jempol di tengah)
      const targetScope = isKepsek ? 'kepsek' : activeEcosystem;
      useMobileSubtabSidebarStore.getState().open(targetScope);
      setOpenFlyoutId(null);
      return;
    }
    setOpenFlyoutId(null);
    useMobileSubtabSidebarStore.getState().close();

    // Khusus Kepala Sekolah: Switching 6 pilar instan tanpa reload rute
    if (isKepsek && ['kbm', 'kesiswaan', 'bk', 'sarpras', 'hubin', 'tu'].includes(item.id)) {
      setPillar(item.id as any);
      if (location.pathname !== '/dashboard' || currentTab === 'profil') {
        navigate('/dashboard');
      }
      return;
    }
    navigate(item.targetPath);
  }, [openFlyoutId, isKepsek, activeEcosystem, setPillar, location.pathname, currentTab, navigate]);

  const handleSubItemClick = useCallback((subItem: MobileBottomSubItem) => {
    setOpenFlyoutId(null);
    useMobileSubtabSidebarStore.getState().close();
    if (subItem.id === 'profil' || subItem.id === 'saya') {
      setIsAccountSheetOpen(true);
      return;
    }
    navigate(subItem.targetPath);
  }, [navigate]);

  if (shouldHideNav) {
    return null;
  }

  const openFlyoutItem = activeTabsList.find(item => item.id === openFlyoutId);

  return (
    <>
      {/* ── SUBKOMPONEN 1: MENU LANJUTAN MELAYANG BUSUR BULAN SABIT ── */}
      <BottomNavCrescentSpeedDial
        openFlyoutItem={openFlyoutItem}
        currentSubtab={currentSubtab}
        onClose={() => setOpenFlyoutId(null)}
        onSelectSubItem={handleSubItemClick}
      />

      {/* ── SUBKOMPONEN 2: BILAH NAVIGASI BAWAH SELULER (CENTER PROMOTED DOCKED ELEVATION) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col pointer-events-auto overflow-visible">
        <nav
          aria-label="Navigasi Bawah Seluler"
          className={cn(
            "w-full backdrop-blur-lg px-1 pt-1 pb-[calc(0.4rem+env(safe-area-inset-bottom))] flex items-center shadow-2xl transition-all duration-200 relative overflow-visible",
            currentTheme.navBarClass
          )}
        >
          <div className="flex items-end justify-around w-full relative">
            {activeTabsList.map((item, index) => {
              const isCenterItem = index === centerIndex;
              const isSelected = item.isActive(location.pathname, currentTab) || (isCenterItem && isSidebarOpen);
              return (
                <BottomNavTabItem
                  key={item.id}
                  item={item}
                  isSelected={isSelected}
                  isFlyoutOpen={openFlyoutId === item.id}
                  theme={currentTheme}
                  onClick={handleTabClick}
                  isCenterElevated={isCenterItem}
                />
              );
            })}
          </div>
        </nav>
      </div>

      {/* ── SUBKOMPONEN 3: SHOPEE-GRADE MOBILE USER ACCOUNT SHEET (SAYA) ── */}
      <MobileAccountSheet
        isOpen={isAccountSheetOpen}
        onClose={() => setIsAccountSheetOpen(false)}
      />
    </>
  );
});

BottomNavigation.displayName = 'BottomNavigation';
export default BottomNavigation;
