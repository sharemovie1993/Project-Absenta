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
        className="flex flex-col items-center justify-end -translate-y-3.5 flex-1 select-none cursor-pointer relative min-w-0 group focus:outline-none z-20"
        aria-label={item.label}
      >
        <div
          className={cn(
            "w-[50px] h-[50px] rounded-full flex items-center justify-center transition-all duration-200 relative active:scale-95 shadow-lg",
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

          {hasChildren && (
            <span
              className={cn(
                "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full animate-pulse",
                theme.isLayer2 ? "bg-indigo-600" : "bg-white"
              )}
            />
          )}
        </div>

        <span
          className={cn(
            "max-w-[66px] text-center tracking-tight text-[9px] sm:text-[10px] font-bold leading-tight line-clamp-1 mt-1",
            isHighlighted ? theme.activeTextClass : theme.inactiveTextClass
          )}
        >
          {item.shortLabel}
        </span>
      </button>
    );
  }

  // ── VARIAN 2: TOMBOL NAVIGASI SAMPING REGULER (FLANKING KIRI & KANAN DENGAN TITIK AKTIF GAYA 1) ──
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
        'flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 transition-all duration-150 select-none flex-1 cursor-pointer relative min-w-0 h-[56px]',
        isHighlighted
          ? theme.activeTextClass
          : theme.inactiveTextClass
      )}
    >
      <div
        className={cn(
          'p-1 rounded-xl transition-all relative flex items-center justify-center',
          theme.isLayer2 && isHighlighted ? 'bg-white/20' : 'bg-transparent'
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
          <ItemIcon size={20} className="stroke-[2.2]" />
        )}

        {item.badge && (
          <span className="absolute -top-1 -right-1.5 text-[7.5px] font-black px-1 py-0.2 rounded-full bg-rose-500 text-white shadow-xs leading-none">
            {item.badge}
          </span>
        )}
        {/* Titik indikator aktif di bawah ikon persis seperti Gaya 1 di gambar referensi */}
        {isHighlighted && (
          <span className={cn("absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-xs", theme.dotColorClass)} />
        )}
      </div>
      <span className="max-w-[62px] text-center tracking-tight text-[9px] sm:text-[10px] font-bold leading-tight line-clamp-1 mt-0.5">
        {item.shortLabel}
      </span>
    </button>
  );
});

BottomNavTabItem.displayName = 'BottomNavTabItem';
export default BottomNavTabItem;
