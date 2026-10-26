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
}

export const BottomNavTabItem: React.FC<BottomNavTabItemProps> = React.memo(({
  item,
  isSelected,
  isFlyoutOpen,
  theme,
  onClick,
}) => {
  const user = useAuthStore((state) => state.user);
  const ItemIcon = item.icon;
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isHighlighted = isSelected || isFlyoutOpen;

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
        'flex flex-col items-center justify-start gap-0.5 py-1 px-0.5 rounded-xl transition-all duration-150 select-none flex-1 cursor-pointer relative min-w-0 min-h-[48px]',
        isHighlighted
          ? theme.activeTextClass
          : theme.inactiveTextClass
      )}
    >
      <div
        className={cn(
          'p-1 sm:p-1.5 rounded-xl transition-all relative flex items-center justify-center',
          isHighlighted
            ? theme.activePillClass
            : 'bg-transparent'
        )}
      >
        {isProfileTab ? (
          userPhoto ? (
            <img
              src={userPhoto}
              alt="Saya"
              className={cn(
                "w-[20px] h-[20px] rounded-full object-cover ring-1.5 transition-all",
                isHighlighted
                  ? "ring-indigo-600 dark:ring-indigo-400 scale-105"
                  : "ring-slate-300 dark:ring-slate-600 opacity-80"
              )}
            />
          ) : (
            <div
              className={cn(
                "w-[20px] h-[20px] rounded-full text-[9.5px] font-bold flex items-center justify-center transition-all",
                isHighlighted
                  ? "bg-indigo-600 text-white ring-1.5 ring-indigo-300 shadow-xs scale-105"
                  : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ring-1 ring-slate-200 dark:ring-slate-700"
              )}
            >
              {initial}
            </div>
          )
        ) : (
          <ItemIcon size={19} className="stroke-[2.2]" />
        )}

        {item.badge && (
          <span className="absolute -top-1 -right-1.5 text-[7.5px] font-black px-1 py-0.2 rounded-full bg-rose-500 text-white shadow-xs leading-none">
            {item.badge}
          </span>
        )}
        {hasChildren && (
          <span className={cn("absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full animate-pulse", theme.dotColorClass)} />
        )}
      </div>
      <span className="max-w-[62px] text-center tracking-tight text-[8.5px] sm:text-[9.5px] leading-[1.1] line-clamp-2 break-words">
        {item.shortLabel}
      </span>
    </button>
  );
});

BottomNavTabItem.displayName = 'BottomNavTabItem';
export default BottomNavTabItem;
