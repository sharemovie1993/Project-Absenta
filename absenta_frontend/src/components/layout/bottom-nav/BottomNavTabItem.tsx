import React from 'react';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { MobileBottomTabItem, EcosystemTheme } from '@/config/bottomNavEcosystems.config';

export interface BottomNavTabItemProps {
  item: MobileBottomTabItem;
  isSelected: boolean;
  isFlyoutOpen: boolean;
  theme: EcosystemTheme;
  onClick: (item: MobileBottomTabItem) => void;
  isCenterElevated?: boolean;
}

export const BottomNavTabItem: React.FC<BottomNavTabItemProps> = React.memo(({
  item,
  isSelected,
  isFlyoutOpen,
  theme,
  onClick,
  isCenterElevated = false,
}) => {
  const user = useAuthStore((state) => state.user);
  const ItemIcon = item.icon;
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isHighlighted = isSelected || isFlyoutOpen;

  // ── VARIAN 1: TOMBOL MENU SENTRAL ELEVASI (GAYA 1: NOTCH CRADLE FLOATING FAB) ──
  if (isCenterElevated) {
    return (
      <button
        type="button"
        onClick={() => onClick(item)}
        className="w-[96px] sm:w-[104px] shrink-0 h-full flex flex-col items-center justify-end pb-2 select-none cursor-pointer relative group focus:outline-none z-20"
        aria-label={item.label}
      >
        <div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 relative active:scale-95 shadow-lg -translate-y-2.5",
            isHighlighted
              ? theme.isLayer2
                ? "bg-white text-indigo-700 ring-4 ring-white/50 shadow-xl shadow-black/40 scale-105"
                : "bg-indigo-600 dark:bg-indigo-500 text-white ring-4 ring-indigo-50 dark:ring-indigo-950/70 shadow-xl shadow-indigo-600/40 scale-105"
              : theme.isLayer2
                ? "bg-white text-slate-900 ring-4 ring-white/30 shadow-md shadow-black/20 hover:scale-105"
                : "bg-indigo-600 dark:bg-indigo-500 text-white ring-4 ring-white dark:ring-slate-900 shadow-md shadow-indigo-600/35 hover:scale-105"
          )}
        >
          <ItemIcon size={21} className="stroke-[2.2] transition-transform duration-200 group-hover:rotate-6" />

          {item.badge && (
            <span className="absolute -top-1 -right-1 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow-md leading-none ring-2 ring-white dark:ring-slate-900">
              {item.badge}
            </span>
          )}
        </div>

        <span
          className={cn(
            "text-center tracking-tight text-[9.5px] sm:text-[10px] font-bold leading-none line-clamp-1",
            isHighlighted ? theme.activeTextClass : theme.inactiveTextClass
          )}
        >
          {item.shortLabel}
        </span>
      </button>
    );
  }

  // ── VARIAN 2: TOMBOL NAVIGASI SAMPING REGULER (PILL CAPSULE HIGHLIGHT - ZERO CLUTTER) ──
  // Deteksi Tab Profil "Saya" ala Shopee (Menampilkan avatar profil bulat di pojok kanan bawah)
  const isProfileTab = item.id === 'saya' || item.id === 'base_profil';
  const rawPhoto = user?.profile_photo_url || (user as any)?.avatar || (user?.guru_profile as any)?.foto_url;
  const userPhoto = rawPhoto ? resolveProfilePhotoUrl(rawPhoto) : null;
  const initial = (user?.name || (user as any)?.nama || 'S').slice(0, 1).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 transition-all duration-200 select-none flex-1 min-w-0 h-full cursor-pointer relative group',
        isHighlighted
          ? theme.activeTextClass
          : theme.inactiveTextClass
      )}
    >
      <div
        className={cn(
          'px-2.5 py-1 rounded-full transition-all duration-200 relative flex items-center justify-center',
          isHighlighted
            ? theme.isLayer2
              ? 'bg-white/25 text-white ring-1 ring-white/50 shadow-2xs backdrop-blur-xs scale-105'
              : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200/80 dark:ring-indigo-800/80 shadow-2xs scale-105'
            : 'bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        )}
      >
        {isProfileTab ? (
          userPhoto ? (
            <img
              src={userPhoto}
              alt="Saya"
              className={cn(
                "w-[21px] h-[21px] rounded-full object-cover ring-1.5 transition-all",
                isHighlighted
                  ? "ring-indigo-600 dark:ring-indigo-400 scale-105"
                  : "ring-slate-300 dark:ring-slate-600 opacity-80"
              )}
            />
          ) : (
            <div
              className={cn(
                "w-[21px] h-[21px] rounded-full text-[9.5px] font-bold flex items-center justify-center transition-all",
                isHighlighted
                  ? "bg-indigo-600 text-white ring-1.5 ring-indigo-300 shadow-xs scale-105"
                  : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ring-1 ring-slate-200 dark:ring-slate-700"
              )}
            >
              {initial}
            </div>
          )
        ) : (
          <ItemIcon 
            size={19} 
            className={cn(
              "transition-all duration-150",
              isHighlighted ? "stroke-[2.4]" : "stroke-[1.8]"
            )} 
          />
        )}

        {item.badge && (
          <span className="absolute -top-1 -right-1.5 text-[7.5px] font-black px-1 py-0.2 rounded-full bg-rose-500 text-white shadow-xs leading-none">
            {item.badge}
          </span>
        )}
      </div>

      <span 
        className={cn(
          "max-w-[64px] text-center tracking-tight text-[9.5px] sm:text-[10px] leading-tight line-clamp-1 transition-colors duration-150 mt-0.5",
          isHighlighted ? "font-extrabold" : "font-semibold opacity-85"
        )}
      >
        {item.shortLabel}
      </span>
    </button>
  );
});

BottomNavTabItem.displayName = 'BottomNavTabItem';
export default BottomNavTabItem;
