import { useState, useEffect, useContext } from 'react';
import { useLocation, useInRouterContext } from 'react-router-dom';
import { getSidebarMenu, MENU_QUERY_KEY, type SidebarMenuItem } from '@/api/menu.api';
import { useAuthStore } from '@/store/authStore';
import { useQuery, QueryClientContext, QueryClient } from '@tanstack/react-query';

const fallbackQueryClient = new QueryClient();

/**
 * Hook to check if the current page is in locked/preview mode based on sidebar menu data.
 * Returns true if the current path is marked as 'locked' in the menu.
 */
export function usePreviewMode() {
  const [isLocked, setIsLocked] = useState(false);
  const inRouterContext = useInRouterContext();
  const location = inRouterContext ? useLocation() : { pathname: '' };
  const { token } = useAuthStore();
  const queryClientContext = useContext(QueryClientContext);

  const { data: menuData } = useQuery<SidebarMenuItem[], Error>({
    queryKey: MENU_QUERY_KEY,
    enabled: !!token && inRouterContext && !!queryClientContext,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => (await getSidebarMenu()).sidebar,
  }, queryClientContext || fallbackQueryClient);

  useEffect(() => {
    if (!menuData) return;

    const findInTree = (items: SidebarMenuItem[]): boolean => {
      for (const item of items) {
        if (item.path === location.pathname) {
          return !!item.locked;
        }
        if (item.children && item.children.length > 0) {
          if (findInTree(item.children as SidebarMenuItem[])) return true;
        }
      }
      return false;
    };

    setIsLocked(findInTree(menuData));
  }, [location.pathname, menuData]);

  return isLocked;
}
