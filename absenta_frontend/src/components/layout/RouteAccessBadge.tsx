import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { cn } from '@/lib/utils';

export interface RouteInfo {
  route: 'LOCAL' | 'TUNNEL';
  label: string;
  name?: string;
}

export function useAccessRoute() {
  return useQuery({
    queryKey: ['network-access-route'],
    queryFn: async (): Promise<RouteInfo> => {
      try {
        const res = await axiosInstance.get('/auth/tenant-info');
        const data = res.data?.data;
        return {
          route: (data?.access_route as 'LOCAL' | 'TUNNEL') || 'LOCAL',
          label: data?.access_label || (data?.access_route === 'TUNNEL' ? 'Tunnel' : 'Lokal'),
          name: data?.name,
        };
      } catch {
        return {
          route: 'LOCAL',
          label: 'Lokal',
        };
      }
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

interface RouteAccessBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

export const RouteAccessBadge: React.FC<RouteAccessBadgeProps> = ({
  className,
  showTooltip = true,
}) => {
  const { data } = useAccessRoute();

  if (!data?.route) return null;

  const isLocal = data.route === 'LOCAL';

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-tight border select-none transition-colors",
        isLocal
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
          : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
        className
      )}
      title={
        showTooltip
          ? isLocal
            ? 'Terhubung langsung via Jaringan Fisik (Wi-Fi / LAN Lokal)'
            : 'Terhubung melalui Terowongan (Easy Tunnel Cloud)'
          : undefined
      }
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isLocal ? "bg-emerald-500 animate-pulse" : "bg-indigo-500"
        )}
      />
      <span>{data.label || (isLocal ? 'Lokal' : 'Tunnel')}</span>
    </div>
  );
};
