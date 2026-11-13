import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { cn } from '@/lib/utils';

export interface RouteInfo {
  route: 'LOCAL' | 'TUNNEL';
  label: string;
  name?: string;
}

const ROUTE_QUERY_KEY = ['network-access-route'];

async function fetchAccessRoute(): Promise<RouteInfo> {
  try {
    const res = await axiosInstance.get('/auth/tenant-info');
    const data = res.data?.data;
    const resObj: RouteInfo = {
      route: (data?.access_route as 'LOCAL' | 'TUNNEL') || 'LOCAL',
      label: data?.access_label || (data?.access_route === 'TUNNEL' ? 'Tunnel' : 'Lokal'),
      name: data?.name,
    };
    // Tidak disimpan ke localStorage lagi — hindari cache stale antar sesi/jaringan
    return resObj;
  } catch {
    // Jangan fallback ke cache lama; biarkan data sebelumnya tetap tampil
    throw new Error('fetch-failed');
  }
}

export function useAccessRoute() {
  const queryClient = useQueryClient();

  // ── Deteksi perubahan jaringan: langsung invalidate cache ──
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ROUTE_QUERY_KEY });
    };

    // Browser event: koneksi kembali online (misal dari offline → online)
    window.addEventListener('online', invalidate);

    // Network Information API: type/effectiveType berubah (LAN ↔ WiFi ↔ 4G)
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', invalidate);
    }

    return () => {
      window.removeEventListener('online', invalidate);
      if (conn) conn.removeEventListener('change', invalidate);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ROUTE_QUERY_KEY,
    queryFn: fetchAccessRoute,
    // staleTime 0 → selalu stale, refetch tiap kali window fokus / mount
    staleTime: 0,
    // gcTime: tetap simpan data lama di cache sebagai placeholder selagi refetch berjalan
    gcTime: 5 * 60 * 1000,
    // Refetch saat tab kembali difokuskan (pindah jaringan lalu alt-tab kembali)
    refetchOnWindowFocus: true,
    // Refetch saat koneksi kembali ada setelah offline
    refetchOnReconnect: true,
    // Refetch setiap 60 detik (auto-detect saat jaringan berganti tanpa event)
    refetchInterval: 60 * 1000,
    // Jangan hentikan polling meskipun window tidak fokus
    refetchIntervalInBackground: false,
    // Tidak ada initialData dari localStorage — hindari data stale cross-sesi
    retry: 1,
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
  const { data, isFetching } = useAccessRoute();

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
          ? isFetching
            ? 'Memeriksa jalur jaringan...'
            : isLocal
              ? 'Terhubung langsung via Jaringan Fisik (Wi-Fi / LAN Lokal)'
              : 'Terhubung melalui Terowongan (Easy Tunnel Cloud)'
          : undefined
      }
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isFetching
            ? "bg-gray-400 animate-ping"
            : isLocal
              ? "bg-emerald-500 animate-pulse"
              : "bg-indigo-500"
        )}
      />
      <span>{data.label || (isLocal ? 'Lokal' : 'Tunnel')}</span>
    </div>
  );
};
