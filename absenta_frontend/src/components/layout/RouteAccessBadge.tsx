import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { cn } from '@/lib/utils';
import { useSocketPing } from '@/hooks/useSocketPing';
import { SignalBars } from './SignalBars';

export interface RouteInfo {
  route: 'LOCAL' | 'TUNNEL';
  label: string;
  name?: string;
  latencyMs?: number; // RTT dari browser ke server (diukur client-side, nol beban server)
}

const ROUTE_QUERY_KEY = ['network-access-route'];

async function fetchAccessRoute(): Promise<RouteInfo> {
  try {
    const t0 = Date.now();
    const res = await axiosInstance.get('/auth/tenant-info');
    const latencyMs = Date.now() - t0; // RTT round-trip time, diukur di sisi klien
    const data = res.data?.data;
    const resObj: RouteInfo = {
      route: (data?.access_route as 'LOCAL' | 'TUNNEL') || 'LOCAL',
      label: data?.access_label || (data?.access_route === 'TUNNEL' ? 'Tunnel' : 'Lokal'),
      name: data?.name,
      latencyMs,
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
  const { data } = useAccessRoute();
  const ping = useSocketPing(2000); // Update tiap 2 detik, seperti ML

  if (!data?.route) return null;

  const isLocal = data.route === 'LOCAL';

  // Tooltip informatif
  const routeDesc = isLocal ? 'Jaringan Lokal (LAN/Wi-Fi Sekolah)' : 'Terowongan Cloud (Easy Tunnel)';
  const pingDesc = !ping.isConnected
    ? 'WebSocket terputus'
    : ping.latencyMs !== null
      ? `Ping: ${ping.latencyMs}ms`
      : 'Mengukur latensi...';
  const tooltipText = `${routeDesc} · ${pingDesc}`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-tight border select-none transition-colors',
        isLocal
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
        className,
      )}
      title={showTooltip ? tooltipText : undefined}
    >
      {/* Label Lokal / Tunnel */}
      <span>{data.label || (isLocal ? 'Lokal' : 'Tunnel')}</span>

      {/* Pemisah */}
      <span className="opacity-25 font-normal">|</span>

      {/* Signal bars + latensi — update tiap 2 detik */}
      <SignalBars
        level={ping.signalLevel}
        latencyMs={ping.latencyMs}
        isConnected={ping.isConnected}
        isLocal={isLocal}
      />
    </div>
  );
};
