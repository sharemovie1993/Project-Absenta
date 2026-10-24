import React from 'react';
import { cn } from '@/lib/utils';
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
  const ItemIcon = item.icon;
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isHighlighted = isSelected || isFlyoutOpen;

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-all duration-150 select-none flex-1 cursor-pointer relative min-w-0',
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
        <ItemIcon size={19} className="stroke-[2.2]" />
        {item.badge && (
          <span className="absolute -top-1 -right-1.5 text-[7.5px] font-black px-1 py-0.2 rounded-full bg-rose-500 text-white shadow-xs leading-none">
            {item.badge}
          </span>
        )}
        {hasChildren && (
          <span className={cn("absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full animate-pulse", theme.dotColorClass)} />
        )}
      </div>
      <span className="truncate max-w-[58px] text-center tracking-tight text-[9.5px] sm:text-[10px] leading-tight">
        {item.shortLabel}
      </span>
    </button>
  );
});

BottomNavTabItem.displayName = 'BottomNavTabItem';
export default BottomNavTabItem;
