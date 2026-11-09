import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  GraduationCap, 
  LayoutGrid, 
  User, 
  Clock, 
  CheckCircle2, 
  FileText, 
  FolderOpen, 
  Laptop, 
  CheckSquare,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { useBottomNavTabs } from './bottom-nav/useBottomNavTabs';
import { useMyPengawasCbt } from '@/hooks/useMyPengawasCbt';
import { BottomNavTabItem } from './bottom-nav/BottomNavTabItem';
import { MobileAccountSheet } from './bottom-nav/MobileAccountSheet';
import { BottomNavNotchBackground } from './bottom-nav/BottomNavNotchBackground';
import { useMobileAccountSheetStore } from '@/store/mobileAccountSheetStore';
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
import { KURIKULUM_CATEGORIES } from '@/components/dashboard/roles/kurikulum/kurikulumNavigation.config';
import { KESISWAAN_CATEGORIES } from '@/components/dashboard/roles/kesiswaan/kesiswaanNavigation.config';
import { WALAS_CATEGORIES } from '@/components/dashboard/roles/walikelas/walasNavigation.config';
import { HUBIN_CATEGORIES } from '@/components/dashboard/roles/hubin/hubinNavigation.config';
import { SARPRAS_CATEGORIES } from '@/components/dashboard/roles/sarpras/sarprasNavigation.config';
import { BPBK_CATEGORIES } from '@/components/dashboard/roles/bpbk/bpbkNavigation.config';
import { BKK_CATEGORIES } from '@/components/dashboard/roles/bkk/bkkNavigation.config';
import { TU_CATEGORIES } from '@/components/dashboard/roles/tu/tuNavigation.config';

export type { MobileBottomSubItem, MobileBottomTabItem, EcosystemType, EcosystemTheme };

export const BottomNavigation: React.FC = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAccountSheetOpen = useMobileAccountSheetStore((state) => state.isOpen);

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

  // 🔍 Deteksi Status Penugasan Pengawas CBT (SSOT useMyPengawasCbt)
  const { isPengawasCbt, pengawasCbtActiveCount } = useMyPengawasCbt();

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

  // Khusus Layer 1 Base Portal ('portal'): Selalu gunakan drawer BottomNavigation agar menampilkan launcher seluruh jabatan (teacherDashboards) & layanan KBM
  const isLayer1Portal = activeEcosystem === 'portal' && !isKepsek && !isSiswa;
  const hasMountedDrawer = isLayer1Portal ? false : registeredScopes.includes(normalizedTargetScope);

  const handleTabClick = useCallback((item: MobileBottomTabItem) => {
    // 👤 Shopee-Style Tab "Saya" / Akun: Buka Mobile Account Sheet instan
    const isProfileTab = item.id === 'saya' || item.id === 'base_profil' || item.id === 'profil' || item.id === 'admin_profil';
    if (isProfileTab) {
      useMobileSubtabSidebarStore.getState().close();
      useMobileAccountSheetStore.getState().open();
      return;
    }

    // Deteksi apakah tab yang diklik adalah trigger Menu FAB sentral atau memiliki sub-menu
    const isMenuTrigger = Boolean(
      (item.children && item.children.length > 0) ||
      item.id.includes('menu') ||
      item.id === 'base_divisi_more' ||
      item.id === 'lensa_more'
    );

    if (isMenuTrigger) {
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
            category: child.category || (activeEcosystem === 'portal' ? 'jabatan' : undefined),
            targetPath: child.targetPath,
          });
        }
      });

      // Untuk Layer 1 Guru/Portal: Tambahkan juga pintasan KBM operasional agar komprehensif
      if (activeEcosystem === 'portal') {
        const kbmOps: UniversalSubtabItem[] = [
          { id: 'jadwal', label: 'Jadwal Mengajar', shortLabel: 'KBM', icon: Clock, category: 'operasional', targetPath: '/dashboard?tab=jadwal' },
          { id: 'manual_presensi', label: 'Presensi KBM Harian', shortLabel: 'Presensi', icon: CheckCircle2, category: 'operasional', targetPath: '/dashboard?tab=manual_presensi' },
          { id: 'jurnal', label: 'Jurnal Mengajar Guru', shortLabel: 'Jurnal', icon: FileText, category: 'operasional', targetPath: '/kurikulum/jurnal' },
          { id: 'perangkat', label: 'Perangkat Ajar Saya', shortLabel: 'Perangkat', icon: FolderOpen, category: 'operasional', targetPath: '/dashboard?tab=ringkasan&subtab=perangkat' },
          { id: 'cbt', label: 'Bank Soal CBT Online', shortLabel: 'CBT', icon: Laptop, category: 'operasional', targetPath: '/dashboard?tab=ringkasan&subtab=cbt' },
          ...(isPengawasCbt ? [
            {
              id: 'pengawas_cbt',
              label: 'Pengawas Ujian CBT',
              shortLabel: 'Pengawas CBT',
              icon: Eye,
              badge: pengawasCbtActiveCount > 0 ? pengawasCbtActiveCount : undefined,
              badgeColor: 'bg-emerald-500 text-white',
              category: 'operasional',
              targetPath: '/dashboard?tab=ringkasan&subtab=pengawas_cbt',
            }
          ] : []),
          { id: 'nilai', label: 'Buku Nilai Guru', shortLabel: 'Nilai', icon: GraduationCap, category: 'operasional', targetPath: '/rapor/input-nilai' },
          { id: 'tugas', label: 'Pusat Tugas & Peringatan', shortLabel: 'Tugas', icon: CheckSquare, category: 'operasional', targetPath: '/dashboard?tab=action_hub' },
        ];
        kbmOps.forEach((op) => {
          if (!seen.has(op.id)) {
            seen.add(op.id);
            list.push(op);
          }
        });
      }

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
          targetPath: tab.targetPath,
        });
      }
    });

    // Selalu pastikan akses Pengawas CBT tersedia di drawer jika user terdaftar sebagai pengawas
    if (isPengawasCbt && !seen.has('pengawas_cbt')) {
      seen.add('pengawas_cbt');
      list.push({
        id: 'pengawas_cbt',
        label: 'Pengawas Ujian CBT',
        shortLabel: 'Pengawas CBT',
        icon: Eye,
        badge: pengawasCbtActiveCount > 0 ? pengawasCbtActiveCount : undefined,
        badgeColor: 'bg-emerald-500 text-white',
        category: (activeEcosystem === 'tu' ? 'persuratan' : 'operasional') as any,
        targetPath: '/dashboard?tab=ringkasan&subtab=pengawas_cbt',
      });
    }

    return list;
  }, [activeTabsList, activeEcosystem, isPengawasCbt, pengawasCbtActiveCount]);

  const fallbackCategories = useMemo(() => {
    if (activeEcosystem === 'kaprog') {
      return KAPROG_CATEGORIES;
    }
    if (activeEcosystem === 'kurikulum') {
      return KURIKULUM_CATEGORIES;
    }
    if (activeEcosystem === 'kesiswaan') {
      return KESISWAAN_CATEGORIES;
    }
    if (activeEcosystem === 'walas') {
      return WALAS_CATEGORIES;
    }
    if (activeEcosystem === 'hubin') {
      return HUBIN_CATEGORIES;
    }
    if (activeEcosystem === 'sarpras') {
      return SARPRAS_CATEGORIES;
    }
    if (activeEcosystem === 'bpbk') {
      return BPBK_CATEGORIES;
    }
    if (activeEcosystem === 'bkk') {
      return BKK_CATEGORIES;
    }
    if (activeEcosystem === 'tu') {
      return TU_CATEGORIES;
    }
    if (activeEcosystem === 'portal') {
      return [
        { id: 'jabatan', label: 'Ekosistem Jabatan & Peran', shortLabel: 'Jabatan' },
        { id: 'operasional', label: 'Operasional KBM & Mengajar', shortLabel: 'KBM' },
      ];
    }
    if (isSiswa || activeEcosystem === 'siswa') {
      return [
        { id: 'operasional', label: 'Operasional Siswa', shortLabel: 'Operasional' },
        { id: 'akademik', label: 'Akademik & Penilaian', shortLabel: 'Akademik' },
        { id: 'layanan', label: 'Layanan & Informasi', shortLabel: 'Layanan' },
      ];
    }
    return undefined;
  }, [activeEcosystem, isSiswa]);

  const handleSelectFallbackTab = useCallback((tabId: string) => {
    useMobileSubtabSidebarStore.getState().close();
    // 1. Cek langsung pada fallbackDrawerTabs yang sedang aktif
    const foundFallback = fallbackDrawerTabs.find((t) => t.id === tabId);
    if (foundFallback && (foundFallback as any).targetPath) {
      navigate((foundFallback as any).targetPath);
      return;
    }
    // 2. Cek pada activeTabsList dan children
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
  }, [fallbackDrawerTabs, activeTabsList, navigate]);

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
    if (activeEcosystem === 'portal') {
      return {
        title: 'Pusat Layanan & Menu',
        subtitle: 'Ekosistem Peran & Aksi Cepat',
        roleBadge: 'PORTAL',
        logoUrl: (user as any)?.tenant?.logo_url || null,
        roleIcon: LayoutGrid,
      };
    }
    if (isSiswa || activeEcosystem === 'siswa') {
      return {
        title: (user as any)?.siswa_profile?.nama_lengkap || user?.full_name || 'Portal Siswa',
        subtitle: 'Menu Layanan & Akademik Siswa',
        roleBadge: 'SISWA',
        logoUrl: (user as any)?.tenant?.logo_url || null,
        roleIcon: User,
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
  }, [activeEcosystem, user, isSiswa]);

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
          activeTab={
            currentSubtab ||
            (currentTab === 'action_hub'
              ? 'tugas'
              : currentTab === 'jadwal'
              ? 'jadwal'
              : currentTab === 'manual_presensi'
              ? 'manual_presensi'
              : activeEcosystem === 'kaprog'
              ? 'beranda'
              : 'ringkasan')
          }
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
            notchWidth={activeTabsList.length >= 7 ? 82 : 100}
            notchDepth={activeTabsList.length >= 7 ? 22 : 24}
            height={68}
          />

          <div className="flex items-center w-full h-[64px] sm:h-[68px] relative z-10 px-1 overflow-visible">
            {activeTabsList.map((item, index) => {
              const isCenterItem = index === centerIndex;
              const isSelected = item.isActive(location.pathname, currentTab) || (isCenterItem && isSidebarOpen);
              return (
                <BottomNavTabItem
                  key={item.id ? `nav-${item.id}` : `nav-idx-${index}`}
                  item={item}
                  isSelected={isSelected}
                  isFlyoutOpen={false}
                  theme={currentTheme}
                  onClick={handleTabClick}
                  isCenterElevated={isCenterItem}
                  is7Tabs={activeTabsList.length >= 7}
                />
              );
            })}
          </div>
        </nav>
      </div>

      {/* ── SUBKOMPONEN 3: SHOPEE-GRADE MOBILE USER ACCOUNT SHEET (SAYA) ── */}
      <MobileAccountSheet
        isOpen={isAccountSheetOpen}
        onClose={() => useMobileAccountSheetStore.getState().close()}
      />
    </>
  );
});

BottomNavigation.displayName = 'BottomNavigation';
export default BottomNavigation;