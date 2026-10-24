import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface ShopeeQuickActionItem {
  id?: string | number;
  title: string;
  icon: React.ElementType;
  color?: string;
  badge?: string | number | null;
  onClick: () => void;
}

export interface ShopeeQuickActionSliderProps {
  items: ShopeeQuickActionItem[];
  className?: string;
}

/**
 * 🛍️ ShopeeQuickActionSlider
 * Komponen Quick Action Berstandar Shopee UX:
 * 1. Mobile: Horizontal scroll container dengan peeking affordance (item ke-5/6 terpotong sebagian di kanan layar).
 * 2. Mobile: Capsule scroll indicator track (───[🔴]───) yang bergerak dinamis mengikuti posisi scroll jari.
 * 3. Desktop: Grid responsif rapi.
 * 4. Micro-typography ultra-compact (icon 20px, label 10px 2-line clamp).
 */
export const ShopeeQuickActionSlider: React.FC<ShopeeQuickActionSliderProps> = React.memo(({
  items,
  className,
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

  // Lebar track kapsul 44px, lebar kapsul aktif 16px -> jarak geser maksimum 28px
  const trackWidth = 44;
  const capsuleWidth = 16;
  const maxTranslate = trackWidth - capsuleWidth;
  const capsuleTranslateX = scrollProgress * maxTranslate;

  return (
    <div className={cn('w-full space-y-2 select-none', className)}>
      {/* ── Scrollable Track (Peeking Affordance on Mobile, Auto-Grid on Desktop) ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex sm:grid sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-3 overflow-x-auto sm:overflow-x-visible no-scrollbar py-1 px-0.5 scroll-smooth"
      >
        {items.map((item, idx) => {
          const Icon = item.icon;
          const colorClass = item.color || 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400';

          return (
            <button
              key={item.id ?? idx}
              type="button"
              onClick={item.onClick}
              className="group flex flex-col items-center justify-start p-1 rounded-2xl hover:bg-slate-100/70 dark:hover:bg-slate-800/50 active:scale-95 transition-all duration-150 cursor-pointer text-center w-[68px] sm:w-auto shrink-0"
            >
              {/* Squircle Tile (Shopee Size 44x44px) */}
              <div
                className={cn(
                  'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-xs transition-all duration-150 border border-slate-200/50 dark:border-slate-800/60 group-hover:shadow-md group-hover:scale-105 mb-1.5 relative',
                  colorClass
                )}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />

                {/* Badge Notifikasi */}
                {item.badge !== undefined && item.badge !== null && (
                  <span className="absolute -top-1 -right-1 text-[8.5px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow-xs leading-none">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label Teks Shopee Style (Ultra-compact 2-line clamp) */}
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-tight line-clamp-2 text-center break-words px-0.5 transition-colors">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Shopee Capsule Scroll Indicator Bar (Hanya tampil di Mobile saat item melebihi layar) ── */}
      {canScroll && (
        <div className="flex sm:hidden justify-center items-center pt-1 pb-0.5">
          <div
            style={{ width: `${trackWidth}px` }}
            className="h-1 bg-slate-200 dark:bg-slate-700/80 rounded-full relative overflow-hidden shadow-inner"
          >
            <div
              style={{
                width: `${capsuleWidth}px`,
                transform: `translateX(${capsuleTranslateX}px)`,
              }}
              className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-transform duration-75 ease-out shadow-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
});

ShopeeQuickActionSlider.displayName = 'ShopeeQuickActionSlider';
