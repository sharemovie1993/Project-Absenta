import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useBottomNavTabs } from './bottom-nav/useBottomNavTabs';
import { BottomNavTabItem } from './bottom-nav/BottomNavTabItem';
import { BottomNavCrescentSpeedDial } from './bottom-nav/BottomNavCrescentSpeedDial';
import { MobileAccountSheet } from './bottom-nav/MobileAccountSheet';
import { BottomNavNotchBackground } from './bottom-nav/BottomNavNotchBackground';
import { useMobileSubtabSidebarStore, normalizeRoleToScope } from '@/components/dashboard/roles/common';
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
    isSiswa,
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
      const targetScope = isKepsek ? 'kepsek' : isSiswa ? 'siswa' : activeEcosystem;
      const normalizedTarget = normalizeRoleToScope(undefined, targetScope);
      const store = useMobileSubtabSidebarStore.getState();
      const hasMountedDrawer = store.registeredScopes.includes(normalizedTarget);

      if (hasMountedDrawer) {
        // 🚀 Drawer subtab terpasang di DOM -> Toggle Universal Subtab Sidebar Drawer!
        store.toggle(targetScope);
        setOpenFlyoutId(null);
      } else {
        // 🌙 Halaman mandiri tanpa drawer -> Toggle Crescent Speed Dial (Busur Cepat)!
        store.close();
        setOpenFlyoutId((prev) => (prev === item.id ? null : item.id));
      }
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
  }, [openFlyoutId, isKepsek, isSiswa, activeEcosystem, setPillar, location.pathname, currentTab, navigate]);

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

      {/* ── SUBKOMPONEN 2: BILAH NAVIGASI BAWAH SELULER (EDGE-TO-EDGE DOCKED NOTCH WITH ELEVATED FAB) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col pointer-events-auto overflow-visible">
        <nav
          aria-label="Navigasi Bawah Seluler"
          className="w-full relative flex flex-col justify-start h-[calc(64px+env(safe-area-inset-bottom))] sm:h-[calc(68px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] overflow-visible"
        >
          {/* Background Shape Lekukan Cekung S-Curve Lebar & Bernapas Menempel Penuh ke Tepi Layar */}
          <BottomNavNotchBackground
            theme={currentTheme}
            ecosystem={activeEcosystem}
            notchWidth={100}
            notchDepth={24}
            height={68}
          />

          <div className="flex items-center w-full h-[64px] sm:h-[68px] relative z-10 px-1">
            {activeTabsList.map((item, index) => {
              const isCenterItem = index === centerIndex;
              const isSelected = item.isActive(location.pathname, currentTab) || (isCenterItem && (isSidebarOpen || openFlyoutId === item.id));
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
