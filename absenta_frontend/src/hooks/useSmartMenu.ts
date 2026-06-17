import { useQuery } from '@tanstack/react-query';
import { getSidebarMenu, MENU_QUERY_KEY } from '../api/menu.api';
import type { SidebarMenuItem } from '../api/menu.api';
import { useAuthStore } from '../store/authStore';
import { useNavStore, type HubType } from '../store/navStore';
import { useMemo } from 'react';
import { getHubByLabel } from '../config/navigation.config';

export interface SmartNavItem extends SidebarMenuItem {
  categoryLabel?: string;
  isFlattened?: boolean;
  premiumInfo?: {
    isPremium: boolean;
    moduleName: string;
    state: 'LOCKED' | 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  };
}

export interface GroupedMenu {
  label: string;
  hubId?: HubType;
  items: SmartNavItem[];
}

export const useSmartMenu = () => {
  const { user, token } = useAuthStore();
  const navStore = useNavStore();
  const activeHub = navStore.activeHub;
  const setActiveHub = navStore.setActiveHub;
  
  const { data, isLoading, isError } = useQuery({
    queryKey: MENU_QUERY_KEY,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await getSidebarMenu();
      return res.sidebar;
    },
  });

  const groupedMenu = useMemo(() => {
    if (!data) return [];

    const rawItems = data as SidebarMenuItem[];
    
    // Helper info premium 
    const getPremiumInfo = (it: SidebarMenuItem) => {
      const rawFeatures = (it as any).required_features || [];
      const features = Array.isArray(rawFeatures) ? rawFeatures.map(f => String(f).toUpperCase()) : [];
      const premiumKeys = ['ABSENSI', 'KOPERASI', 'SARPRAS', 'HUBIN', 'INVENTORY', 'KEUANGAN', 'SPP'];
      const mainFeature = features.find(f => premiumKeys.some(k => f.includes(k)));
      
      if (!mainFeature) return undefined;

      return {
        isPremium: true,
        moduleName: mainFeature.charAt(0).toUpperCase() + mainFeature.slice(1).toLowerCase(),
        state: (it as any).feature_state || ((it as any).locked ? 'LOCKED' : 'ACTIVE')
      };
    };

    // Simply map the top-level items (the 7 groups) to GroupedMenu format
    return rawItems.map(root => ({
      label: root.name,
      hubId: getHubByLabel(root.name),
      items: (root.children || []).map(child => ({
        ...child,
        premiumInfo: getPremiumInfo(child),
        categoryLabel: root.name
      }))
    }));
  }, [data]);

  return {
    menu: groupedMenu,
    isLoading,
    isError,
    activeHub,
    setActiveHub
  };
};
