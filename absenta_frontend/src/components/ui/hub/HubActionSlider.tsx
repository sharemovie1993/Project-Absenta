import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { HubActionItem } from './HubActionGrid';

export interface HubActionSliderProps {
  items: HubActionItem[];
  className?: string;
  itemWidth?: number;
  trackWidth?: number;
  capsuleWidth?: number;
  capsuleColorClass?: string;
}

/**
 * HubActionSlider - Quick Action 1-Baris Horizontal Berstandar Shopee UX
 * Fitur Utama:
 * 1. Single-row horizontal scroll container dengan Content Peeking Affordance
 *    (item ke-5/6 sengaja terpotong sebagian di tepi kanan layar agar pengguna sadar menu bisa digeser).
 * 2. Dynamic Capsule Scroll Indicator Bar di tengah bawah track yang bergerak halus mengikuti scroll jari.
 * 3. Squircle tile 44px ringan dengan border hairline halus dan line-art icon berwarna.
 * 4. Micro-typography Capitalize rapi maksimal 2 baris.
 */
export const HubActionSlider: React.FC<HubActionSliderProps> = React.memo(({
  items,
  className,
  itemWidth = 66,
  trackWidth = 36,
  capsuleWidth = 14,
  capsuleColorClass = 'bg-orange-500 dark:bg-orange-400',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScroll, setCanScroll] = useState(false);

  // Periksa apakah kontainer memiliki overflow scroll
  const checkScrollable = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const isScrollable = el.scrollWidth > el.clientWidth + 4;
      setCanScroll(isScrollable);
      if (isScrollable) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        setScrollProgress(maxScroll > 0 ? el.scrollLeft / maxScroll : 0);
      }
    }
  }, []);

  useEffect(() => {
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [checkScrollable, items.length]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll > 0) {
        setScrollProgress(Math.min(1, Math.max(0, el.scrollLeft / maxScroll)));
      }
    }
  };

  const maxTranslate = Math.max(0, trackWidth - capsuleWidth);
  const capsuleTranslateX = scrollProgress * maxTranslate;

  return (
    <div className={cn('w-full space-y-1.5 select-none', className)}>
      {/* ── Scrollable Track (Peeking Affordance di Ponsel, Auto-Grid di Layar Lebar) ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        className="flex sm:grid sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-2.5 overflow-x-auto sm:overflow-x-visible no-scrollbar scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 py-1 px-0.5 scroll-smooth"
      >
        {items.map((item) => {
          const IconComponent = item.icon;
          const isInteractive = Boolean(item.onClick);

          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled || !isInteractive}
              onClick={item.onClick}
              className={cn(
                'group flex flex-col items-center justify-start py-1 px-0.5 rounded-2xl transition-all duration-150 text-center shrink-0',
                'w-[66px] sm:w-auto',
                isInteractive
                  ? 'cursor-pointer active:scale-95'
                  : 'cursor-default',
                item.disabled && 'opacity-50 pointer-events-none'
              )}
            >
              {/* Squircle Tile Ala Shopee (44x44px dengan hairline border tipis dan latar bersih) */}
              <div
                className={cn(
                  'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-150 relative mb-1.5',
                  'bg-slate-50/90 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
                  'group-hover:border-slate-200 dark:group-hover:border-slate-700 group-hover:scale-105 group-hover:shadow-xs',
                  item.iconColorClass || 'text-slate-700 dark:text-slate-200'
                )}
              >
                <IconComponent size={21} className="stroke-[1.8] transition-transform group-hover:scale-105" />

                {/* Red Counter Badge ala Shopee */}
                {item.badge !== undefined && item.badge !== null && item.badge !== 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[8.5px] font-black bg-rose-500 text-white shadow-xs flex items-center justify-center leading-none z-10 animate-in zoom-in-75">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label Teks Shopee Style (Capitalize Ramping 2-baris rapi) */}
              <span className="text-[10px] sm:text-[10.5px] font-medium text-slate-700 dark:text-slate-300 leading-tight block text-center line-clamp-2 max-w-[64px] break-words group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {item.label}
              </span>

              {/* Nilai / Sub-label Bawah */}
              {item.value && (
                <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-900 dark:text-slate-100 leading-tight block truncate mt-0.5 max-w-[64px]">
                  {item.value}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Shopee Dynamic Capsule Scroll Indicator Bar (Hanya tampil saat item meluap melebihi layar ponsel) ── */}
      {canScroll && (
        <div className="flex sm:hidden justify-center items-center pt-1 pb-0.5">
          <div
            style={{ width: `${trackWidth}px` }}
            className="h-1 bg-slate-200 dark:bg-slate-700/80 rounded-full relative overflow-hidden"
          >
            <div
              style={{
                width: `${capsuleWidth}px`,
                transform: `translateX(${capsuleTranslateX}px)`,
              }}
              className={cn(
                'h-full rounded-full transition-transform duration-75 ease-out',
                capsuleColorClass
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
});

HubActionSlider.displayName = 'HubActionSlider';
