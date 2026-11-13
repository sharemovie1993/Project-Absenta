import React from 'react';
import { cn } from '@/lib/utils';
import type { SignalLevel } from '@/hooks/useSocketPing';

interface SignalBarsProps {
  level: SignalLevel;        // 0–4
  latencyMs: number | null;
  isConnected: boolean;
  isLocal: boolean;
  className?: string;
}

/**
 * Komponen visual 4-bar sinyal, mirip indikator jaringan Mobile Legends.
 * Bar 1 = kiri bawah (pendek), Bar 4 = kanan atas (tinggi).
 * Warna menyesuaikan kualitas: hijau → kuning → oranye → merah → abu (disconnected).
 */
export const SignalBars: React.FC<SignalBarsProps> = ({
  level,
  latencyMs,
  isConnected,
  isLocal,
  className,
}) => {
  const bars = [1, 2, 3, 4] as const;

  // Warna aktif berdasarkan level kualitas
  const activeColor = !isConnected
    ? 'bg-gray-400 dark:bg-gray-600'
    : level === 4
      ? isLocal ? 'bg-emerald-500' : 'bg-indigo-500'
      : level === 3
        ? 'bg-yellow-400'
        : level === 2
          ? 'bg-orange-400'
          : 'bg-red-500';

  const inactiveColor = isLocal
    ? 'bg-emerald-200/50 dark:bg-emerald-900/30'
    : 'bg-indigo-200/50 dark:bg-indigo-900/30';

  // Format latensi
  const msLabel = !isConnected
    ? '–'
    : latencyMs === null
      ? '...'
      : latencyMs >= 1000
        ? `${(latencyMs / 1000).toFixed(1)}s`
        : `${latencyMs}ms`;

  // Warna label ms
  const msColor = !isConnected || latencyMs === null
    ? 'text-gray-400'
    : latencyMs < 50
      ? isLocal ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
      : latencyMs < 100
        ? 'text-yellow-500 dark:text-yellow-400'
        : latencyMs < 200
          ? 'text-orange-500 dark:text-orange-400'
          : 'text-red-500 dark:text-red-400';

  return (
    <span className={cn('inline-flex items-end gap-[2px]', className)}>
      {bars.map((bar) => {
        const isActive = level >= bar;
        // Tinggi bar: 4px, 6px, 8px, 10px
        const heights = { 1: 'h-[4px]', 2: 'h-[6px]', 3: 'h-[8px]', 4: 'h-[10px]' };
        return (
          <span
            key={bar}
            className={cn(
              'w-[3px] rounded-[1px] transition-all duration-300',
              heights[bar],
              isActive ? activeColor : inactiveColor,
            )}
          />
        );
      })}
      <span className={cn('ml-1 font-mono text-[10px] font-semibold leading-none', msColor)}>
        {msLabel}
      </span>
    </span>
  );
};
