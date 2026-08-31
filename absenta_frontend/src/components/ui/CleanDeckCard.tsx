import React from 'react';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { cn } from '@/lib/utils';

export interface CleanDeckCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  avatar?: React.ReactNode;
  avatarColor?: string;
  onDetail?: (e: React.MouseEvent) => void;
  detailLabel?: string;
  onClick?: (e: React.MouseEvent) => void;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
  showDetailButton?: boolean;
}

export const CleanDeckCard = React.memo<CleanDeckCardProps>(function CleanDeckCard({
  title,
  subtitle,
  badge,
  avatar,
  avatarColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  onDetail,
  detailLabel = 'Detail',
  onClick,
  selected = false,
  onSelect,
  className,
  children,
  showDetailButton = true,
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    } else if (onDetail) {
      onDetail(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) {
        onClick(e as any);
      } else if (onDetail) {
        onDetail(e as any);
      }
    }
  };

  // Generate avatar initial if avatar is a string
  const renderAvatar = () => {
    if (!avatar) {
      if (typeof title === 'string' && title.trim().length > 0) {
        const initial = title.trim().charAt(0).toUpperCase();
        return (
          <div className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm border shadow-2xs",
            avatarColor
          )}>
            {initial}
          </div>
        );
      }
      return null;
    }

    if (typeof avatar === 'string') {
      return (
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm border shadow-2xs",
          avatarColor
        )}>
          {avatar}
        </div>
      );
    }

    return (
      <div className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs",
        avatarColor
      )}>
        {avatar}
      </div>
    );
  };

  const isInteractive = Boolean(onClick || onDetail);

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={cn(
        "p-3.5 bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-xs flex items-center justify-between gap-3 select-none",
        selected
          ? "border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-500/30"
          : "border-slate-200/70 dark:border-slate-800",
        isInteractive && "hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] cursor-pointer",
        className
      )}
    >
      {/* Left: Checkbox + Avatar + Title & Subtitle */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onSelect && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelect(!!checked)}
              aria-label="Pilih item"
            />
          </div>
        )}

        {renderAvatar()}

        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Right: Badge + Detail Button / Custom Children */}
      <div className="flex items-center gap-2 shrink-0">
        {badge && (
          <div className="shrink-0">
            {badge}
          </div>
        )}

        {children}

        {showDetailButton && (onDetail || onClick) && (
          <Button
            size="xs"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              if (onDetail) onDetail(e);
              else if (onClick) onClick(e);
            }}
            aria-label={typeof title === 'string' ? `Detail ${title}` : 'Detail'}
            className="rounded-xl px-3 py-1.5 font-bold text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {detailLabel}
          </Button>
        )}
      </div>
    </div>
  );
});

export default CleanDeckCard;
