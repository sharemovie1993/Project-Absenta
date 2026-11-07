import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, GraduationCap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { useBottomNavTabs } from './bottom-nav/useBottomNavTabs';
import { BottomNavTabItem } from './bottom-nav/BottomNavTabItem';
import { MobileAccountSheet } from './bottom-nav/MobileAccountSheet';
import { BottomNavNotchBackground } from './bottom-nav/BottomNavNotchBackground';
import { 
  useMobileSubtabSidebarStore, 
  normalizeRoleToScope,
  UniversalMobileSubtabSidebar,
  type UniversalSubtabItem 
} from '@/components/dashboard/roles/common';
import { 
  type MobileBottomSubItem, 
  type MobileBottomTabItem, 
  type EcosystemType, 
  type EcosystemTheme,
  getEcosystemLabel 
} from '@/config/bottomNavEcosystems.config';
import { KAPROG_CATEGORIES } from '@/components/dashboard/roles/kaprog/kaprogNavigation.config';

export type { MobileBottomSubItem, MobileBottomTabItem, EcosystemType, EcosystemTheme };

export const BottomNavigation: React.FC = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
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
  const registeredScopes = useMobileSubtabSidebarStore((state) => state.registeredScopes);

  // Tutup subtab sidebar saat rute atau parameter berubah (mencegah sidebar menggantung)
  useEffect(() => {
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

  // Cek apakah halaman aktif saat ini sudah memiliki drawer dedicated di DOM
  const normalizedTargetScope = useMemo(() => {
    const target = isKepsek ? 'kepsek' : isSiswa ? 'siswa' : activeEcosystem;
    return normalizeRoleToScope(undefined, target);
  }, [isKepsek, isSiswa, activeEcosystem]);

  const hasMountedDrawer = registeredScopes.includes(normalizedTargetScope);

  const handleTabClick = useCallback((item: MobileBottomTabItem) => {
    // 👤 Shopee-Style Tab "Saya" / Akun: Buka Mobile Account Sheet instan
    const isProfileTab = item.id === 'saya' || item.id === 'base_profil' || item.id === 'profil' || item.id === 'admin_profil';
    if (isProfileTab) {
      useMobileSubtabSidebarStore.getState().close();
      setIsAccountSheetOpen(true);
      return;
    }

    if (item.children && item.children.length > 0) {
      const targetScope = isKepsek ? 'kepsek' : isSiswa ? 'siswa' : activeEcosystem;
      // 🚀 Buka / Tutup Drawer Sisi Kiri (Universal Mobile Subtab Sidebar Drawer)
      useMobileSubtabSidebarStore.getState().toggle(targetScope);
      return;
    }

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
  }, [isKepsek, isSiswa, activeEcosystem, setPillar, location.pathname, currentTab, navigate]);

  // Tabs fallback untuk drawer sisi kiri pada halaman mandiri (misal /hubin/absensi, /hubin/penempatan)
  const fallbackDrawerTabs = useMemo<UniversalSubtabItem[]>(() => {
    const list: UniversalSubtabItem[] = [];
    const seen = new Set<string>();

    const getKaprogCategory = (id: string) => {
      if (['beranda', 'siswa', 'guru', 'sarana'].includes(id)) return 'jurusan';
      if (['kehadiran', 'pelanggaran', 'prestasi'].includes(id)) return 'pembinaan';
      if (['pkl', 'sidang_pkl', 'ploting_pkl', 'presensi_pkl', 'nilai_pkl', 'ploting_penguji'].includes(id)) return 'pkl';
      if (['ukk', 'rapor'].includes(id)) return 'asesmen';
      return undefined;
    };

    // 1. Jika ada tab eksplisit dengan children (misal Menu Kaprog / Menu TU), prioritaskan seluruh children-nya
    const menuTab = activeTabsList.find((t) => t.children && t.children.length > 0);
    if (menuTab && menuTab.children) {
      menuTab.children.forEach((child) => {
        const key = child.id;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: child.id,
            label: child.label,
            shortLabel: child.shortLabel || child.label,
            icon: child.icon,
            badge: child.badge,
            category: (child as any).category || (activeEcosystem === 'kaprog' ? getKaprogCategory(child.id) : undefined),
          });
        }
      });
      return list;
    }

    // 2. Fallback standar jika tidak ada tab ber-children
    activeTabsList.forEach((tab) => {
      if (tab.id.includes('back')) return;
      const key = tab.id;
      if (!seen.has(key) && tab.id !== 'base_divisi_more' && tab.id !== 'lensa_more') {
        seen.add(key);
        list.push({
          id: tab.id,
          label: tab.label,
          shortLabel: tab.shortLabel || tab.label,
          icon: tab.icon,
          badge: tab.badge,
          category: (tab as any).category,
        });
      }
    });
    return list;
  }, [activeTabsList, activeEcosystem]);

  const fallbackCategories = useMemo(() => {
    if (activeEcosystem === 'kaprog') {
      return KAPROG_CATEGORIES;
    }
    return undefined;
  }, [activeEcosystem]);

  const handleSelectFallbackTab = useCallback((tabId: string) => {
    useMobileSubtabSidebarStore.getState().close();
    for (const tab of activeTabsList) {
      if (tab.children) {
        const foundChild = tab.children.find((c) => c.id === tabId);
        if (foundChild) {
          navigate(foundChild.targetPath);
          return;
        }
      }
      if (tab.id === tabId) {
        navigate(tab.targetPath);
        return;
      }
    }
  }, [activeTabsList, navigate]);

  const user = useAuthStore((s) => s.user);

  // Resolusi Header Cerdas untuk Fallback Drawer (Bebas Truncation & Kaya Logo/Avatar)
  const fallbackHeader = useMemo(() => {
    if (activeEcosystem === 'kaprog') {
      const jur = user?.kaprog_jurusan;
      return {
        title: jur?.nama || 'Program Keahlian',
        subtitle: jur?.singkatan ? `${jur.singkatan} • Kejuruan` : 'Manajemen Jurusan',
        roleBadge: 'KAPROG',
        logoUrl: jur?.logo_url || (user as any)?.tenant?.logo_url || null,
        roleIcon: Briefcase,
      };
    }
    if (activeEcosystem === 'walas') {
      const kelasNama = user?.guru_profile?.wali_kelas_di?.nama_kelas || (user as any)?.walikelas_kelas?.nama_kelas;
      return {
        title: kelasNama || 'Wali Kelas',
        subtitle: 'Manajemen Kelas Binaan',
        roleBadge: 'WALAS',
        logoUrl: (user as any)?.tenant?.logo_url || null,
        roleIcon: GraduationCap,
      };
    }
    const label = getEcosystemLabel(activeEcosystem);
    return {
      title: label,
      subtitle: 'Menu Ekosistem & Layanan',
      roleBadge: label.toUpperCase(),
      logoUrl: (user as any)?.tenant?.logo_url || null,
      roleIcon: undefined,
    };
  }, [activeEcosystem, user]);

  if (shouldHideNav) {
    return null;
  }

  return (
    <>
      {/* ── SUBKOMPONEN 1: DRAWER SISI KIRI UNIVERSAL FALLBACK (JIKA HALAMAN TIDAK MEMILIKI DRAWER MANDIRI) ── */}
      {!hasMountedDrawer && (
        <UniversalMobileSubtabSidebar
          isOpen={isSidebarOpen}
          onClose={() => useMobileSubtabSidebarStore.getState().close()}
          title={fallbackHeader.title}
          subtitle={fallbackHeader.subtitle}
          roleBadge={fallbackHeader.roleBadge}
          roleIcon={fallbackHeader.roleIcon}
          logoUrl={fallbackHeader.logoUrl}
          scope={activeEcosystem}
          side="left"
          isFallback={true}
          tabs={fallbackDrawerTabs}
          categories={fallbackCategories}
          activeTab={currentSubtab || ''}
          onSelectTab={handleSelectFallbackTab}
        />
      )}

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
              const isSelected = item.isActive(location.pathname, currentTab) || (isCenterItem && isSidebarOpen);
              return (
                <BottomNavTabItem
                  key={item.id}
                  item={item}
                  isSelected={isSelected}
                  isFlyoutOpen={false}
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