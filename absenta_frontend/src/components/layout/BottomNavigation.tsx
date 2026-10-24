import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useBottomNavTabs } from './bottom-nav/useBottomNavTabs';
import { BottomNavTabItem } from './bottom-nav/BottomNavTabItem';
import { BottomNavCrescentSpeedDial } from './bottom-nav/BottomNavCrescentSpeedDial';
import { MobileAccountSheet } from './bottom-nav/MobileAccountSheet';
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
    currentTab,
    currentSubtab,
    isKepsek,
    setPillar,
    shouldHideNav,
  } = useBottomNavTabs();

  // Tutup menu melayang saat rute atau parameter berubah
  useEffect(() => {
    setOpenFlyoutId(null);
  }, [location.pathname, location.search]);

  const handleTabClick = useCallback((item: MobileBottomTabItem) => {
    // 👤 Shopee-Style Tab "Saya" / Akun: Buka Mobile Account Sheet instan
    const isProfileTab = item.id === 'saya' || item.id === 'base_profil' || item.id === 'profil' || item.id === 'admin_profil';
    if (isProfileTab) {
      setOpenFlyoutId(null);
      setIsAccountSheetOpen(true);
      return;
    }

    if (item.children && item.children.length > 0) {
      if (openFlyoutId === item.id) {
        setOpenFlyoutId(null);
      } else {
        setOpenFlyoutId(item.id);
        if (!item.isActive(location.pathname, currentTab)) {
          try {
            const targetUrl = new URL(item.targetPath, window.location.origin);
            const targetTab = targetUrl.searchParams.get('tab');
            if (!targetTab || targetTab !== currentTab) {
              navigate(item.targetPath);
            }
          } catch {
            navigate(item.targetPath);
          }
        }
      }
      return;
    }
    setOpenFlyoutId(null);

    // Khusus Kepala Sekolah: Switching 6 pilar instan tanpa reload rute
    if (isKepsek && ['kbm', 'kesiswaan', 'bk', 'sarpras', 'hubin', 'tu'].includes(item.id)) {
      setPillar(item.id as any);
      if (location.pathname !== '/dashboard' || currentTab === 'profil') {
        navigate('/dashboard');
      }
      return;
    }
    navigate(item.targetPath);
  }, [openFlyoutId, isKepsek, setPillar, location.pathname, currentTab, navigate]);

  const handleSubItemClick = useCallback((subItem: MobileBottomSubItem) => {
    setOpenFlyoutId(null);
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

      {/* ── SUBKOMPONEN 2: BILAH NAVIGASI BAWAH SELULER (SHOPEE STYLE - MAX 6 TOMBOL) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col pointer-events-auto">
        <nav
          aria-label="Navigasi Bawah Seluler"
          className={cn(
            "w-full backdrop-blur-lg px-1 pt-1 pb-[calc(0.4rem+env(safe-area-inset-bottom))] flex items-center shadow-2xl transition-all duration-200",
            currentTheme.navBarClass
          )}
        >
          <div className="flex items-center justify-around w-full">
            {activeTabsList.map(item => (
              <BottomNavTabItem
                key={item.id}
                item={item}
                isSelected={item.isActive(location.pathname, currentTab)}
                isFlyoutOpen={openFlyoutId === item.id}
                theme={currentTheme}
                onClick={handleTabClick}
              />
            ))}
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
